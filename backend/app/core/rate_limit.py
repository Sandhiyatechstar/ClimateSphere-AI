"""
In-memory sliding window rate limiter for ClimateSphere AI endpoints.
Provides production DDoS protection and abuse prevention without requiring Redis.

Single-Instance Architecture Note:
- Scope: In-process memory (defaultdict).
- Production Context: Designed for single-instance / single-worker web service deployments
  (such as Render free or starter tiers).
- Horizontal Scaling Limitation: If multiple web service instances (or multiple Uvicorn worker
  processes) are deployed, rate limit counters are not shared across processes. A client's
  effective limit will be multiplied by the number of active worker processes.
- Migration Path for Multi-Node Scaling: Replace or augment this module with a Redis-backed
  limiter (e.g. redis-py with a sliding log or token bucket script via Upstash or AWS ElastiCache).
"""

import time
import logging
from collections import defaultdict
from typing import Dict, List, Optional
from fastapi import Request, HTTPException, status

from app.core.config import get_settings

logger = logging.getLogger(__name__)

class SlidingWindowRateLimiter:
    """
    Thread-safe, high-performance in-memory sliding window rate limiter.
    Tracks request timestamps per client IP and purges entries older than the window.
    """
    def __init__(self, requests_per_minute: int = 60, window_seconds: int = 60):
        self.requests_per_minute = requests_per_minute
        self.window_seconds = window_seconds
        self._clients: Dict[str, List[float]] = defaultdict(list)
        self._last_cleanup = time.monotonic()

    def _get_client_ip(self, request: Request) -> str:
        """Extract the originating client IP, respecting X-Forwarded-For if present."""
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            # Client IP is the first entry in X-Forwarded-For list
            return forwarded.split(",")[0].strip()
        if request.client and request.client.host:
            return request.client.host
        return "127.0.0.1"

    def _cleanup_stale_clients(self, now: float) -> None:
        """Remove inactive client buckets every 5 minutes to prevent memory leaks."""
        if now - self._last_cleanup < 300:
            return
        self._last_cleanup = now
        stale_cutoff = now - self.window_seconds
        stale_keys = [
            ip for ip, timestamps in self._clients.items()
            if not timestamps or timestamps[-1] < stale_cutoff
        ]
        for key in stale_keys:
            self._clients.pop(key, None)

    def check_rate_limit(self, request: Request) -> None:
        """
        Evaluate if the client has exceeded the allowed request quota.
        Raises HTTP 429 Too Many Requests if the limit is exceeded.
        """
        settings = get_settings()
        if not getattr(settings, "rate_limiting_enabled", True):
            return

        now = time.monotonic()
        client_ip = self._get_client_ip(request)
        cutoff = now - self.window_seconds

        # Clean timestamps older than the sliding window
        timestamps = [ts for ts in self._clients[client_ip] if ts > cutoff]
        self._clients[client_ip] = timestamps

        if len(timestamps) >= self.requests_per_minute:
            logger.warning("Rate limit exceeded for IP: %s (limit: %d/min)", client_ip, self.requests_per_minute)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please wait a moment before sending another inquiry.",
                headers={"Retry-After": str(self.window_seconds)},
            )

        # Record this request timestamp
        self._clients[client_ip].append(now)
        self._cleanup_stale_clients(now)

    def reset(self) -> None:
        """Clear all tracked client state (useful for test isolation)."""
        self._clients.clear()
        self._last_cleanup = time.monotonic()


# Global limiter singletons for different endpoint tiers
chat_limiter = SlidingWindowRateLimiter(requests_per_minute=60, window_seconds=60)
weather_limiter = SlidingWindowRateLimiter(requests_per_minute=120, window_seconds=60)
