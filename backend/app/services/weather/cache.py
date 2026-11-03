"""
Simple in-process TTL cache for weather API responses with safe eviction.

Stored per (endpoint, params) key. Entries expire after settings.cache_ttl_seconds.
Automatically prunes expired keys and enforces a configurable max_size with LRU eviction.
This avoids hammering the free-tier OpenWeather API on repeated identical requests while
preventing memory leaks.
"""

import time
from typing import Any, Dict, Optional, Tuple


class _CacheEntry:
    __slots__ = ("value", "expires_at", "last_accessed")

    def __init__(self, value: Any, ttl: int, access_seq: int):
        self.value = value
        self.expires_at = time.monotonic() + ttl
        self.last_accessed = access_seq


class TTLCache:
    """Thread-safe-enough (GIL) in-memory TTL cache with bounded capacity and LRU eviction."""

    def __init__(self, ttl_seconds: int = 300, max_size: int = 1000):
        self._ttl = ttl_seconds
        self._max_size = max(1, max_size)
        self._store: Dict[Tuple, _CacheEntry] = {}
        self._access_seq: int = 0

    def _next_seq(self) -> int:
        self._access_seq += 1
        return self._access_seq

    # ── Public API ────────────────────────────────────────

    def get(self, key: Tuple) -> Optional[Any]:
        entry = self._store.get(key)
        if entry is None:
            return None
        now = time.monotonic()
        if now > entry.expires_at:
            del self._store[key]
            return None
        entry.last_accessed = self._next_seq()
        return entry.value

    def set(self, key: Tuple, value: Any) -> None:
        now = time.monotonic()
        seq = self._next_seq()
        if key in self._store:
            entry = self._store[key]
            entry.value = value
            entry.expires_at = now + self._ttl
            entry.last_accessed = seq
            return

        # If at max capacity, prune all expired keys first
        if len(self._store) >= self._max_size:
            expired_keys = [k for k, v in self._store.items() if now > v.expires_at]
            for k in expired_keys:
                del self._store[k]

        # If still at max capacity, evict the least-recently-accessed entry (LRU)
        if len(self._store) >= self._max_size:
            oldest_key = min(self._store, key=lambda k: self._store[k].last_accessed)
            del self._store[oldest_key]

        self._store[key] = _CacheEntry(value, self._ttl, seq)

    def prune_expired(self) -> int:
        """Explicitly prune all expired keys. Returns count of pruned entries."""
        now = time.monotonic()
        expired_keys = [k for k, v in self._store.items() if now > v.expires_at]
        for k in expired_keys:
            del self._store[k]
        return len(expired_keys)

    def invalidate(self, key: Tuple) -> None:
        self._store.pop(key, None)

    def clear(self) -> None:
        self._store.clear()

    @property
    def size(self) -> int:
        return len(self._store)

    @property
    def max_size(self) -> int:
        return self._max_size
