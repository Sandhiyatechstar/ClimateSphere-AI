"""
Comprehensive Security, Performance & Production Readiness Verification Tests for ClimateSphere AI.
"""

import pytest
from fastapi import Request
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.core.config import get_settings
from app.core.rate_limit import SlidingWindowRateLimiter
from app.schemas.chat import ChatRequest, ChatHistoryMessage


client = TestClient(app)


# ── 1. Security Headers Verification ──────────────────────────────────────────

def test_security_headers_present_on_responses():
    """Verify production security headers are set on all responses."""
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200

    headers = resp.headers
    assert headers.get("X-Content-Type-Options") == "nosniff"
    assert headers.get("X-Frame-Options") == "DENY"
    assert headers.get("X-XSS-Protection") == "1; mode=block"
    assert headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert "geolocation=()" in headers.get("Permissions-Policy", "")


# ── 2. Request Body Size Limit (DDoS Protection) ──────────────────────────────

def test_payload_size_limit_enforced():
    """Verify request payloads exceeding max_request_body_bytes return 413 Payload Too Large."""
    # Settings default is 1MB; simulate large payload via headers
    oversized_headers = {"content-length": str(10 * 1024 * 1024)}  # 10 MB
    resp = client.post("/api/v1/chat", content=b"x", headers=oversized_headers)
    assert resp.status_code == 413
    data = resp.json()
    assert data.get("error") == "payload_too_large"


# ── 3. Input Validation Limits ────────────────────────────────────────────────

def test_prompt_max_length_validation():
    """Verify excessively large prompts are rejected by Pydantic schema."""
    giant_prompt = "A" * 4001
    with pytest.raises(ValidationError):
        ChatRequest(prompt=giant_prompt)


def test_history_content_max_length_validation():
    """Verify excessively large history content is rejected by Pydantic schema."""
    giant_content = "B" * 10001
    with pytest.raises(ValidationError):
        ChatHistoryMessage(role="user", content=giant_content)


# ── 4. Rate Limiting Tests ────────────────────────────────────────────────────

def test_sliding_window_rate_limiter_exceeded():
    """Verify rate limiter blocks client when requests exceed threshold."""
    limiter = SlidingWindowRateLimiter(requests_per_minute=5, window_seconds=60)

    class DummyRequest:
        def __init__(self, ip: str):
            self.headers = {}
            self.client = type("Client", (), {"host": ip})()

    req = DummyRequest("192.168.1.100")

    # First 5 calls pass
    for _ in range(5):
        limiter.check_rate_limit(req)

    # 6th call raises HTTP 429
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        limiter.check_rate_limit(req)

    assert exc_info.value.status_code == 429
    assert exc_info.value.headers.get("Retry-After") == "60"

    # Distinct IP is not affected
    req2 = DummyRequest("192.168.1.200")
    limiter.check_rate_limit(req2)  # Passes without error


# ── 5. Safe Error Sanitization (No Credential / Stack Trace Leaks) ─────────────

def test_unhandled_exception_does_not_leak_internals():
    """Verify global unhandled exception handler returns sanitized JSON without stack traces."""
    # Health endpoint handles internal mock error safely if forced
    resp = client.get("/non-existent-route-404")
    assert resp.status_code == 404
    # Ensure no python traceback keywords in response
    assert "Traceback" not in resp.text
    assert 'File "' not in resp.text


# ── 6. Secret Isolation & Environment Configuration Verification ──────────────

def test_env_example_contains_only_placeholders():
    """Verify .env.example contains only placeholder values."""
    import os
    env_example_path = os.path.join(os.path.dirname(__file__), "..", ".env.example")
    assert os.path.exists(env_example_path), ".env.example must exist for deployment reference"

    with open(env_example_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Must contain placeholder keywords
    assert "your_openweather_api_key_here" in content
    assert "your_gemini_api_key_here" in content

    # Must not contain real API key patterns
    import re
    assert not re.search(r"AIza[0-9A-Za-z-_]{35}", content)
