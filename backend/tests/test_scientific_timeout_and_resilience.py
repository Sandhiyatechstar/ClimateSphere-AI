"""
Focused test suite verifying resolution of HTTP 504 Scientific Analysis Generation Timeout,
provider fallback resilience, timeout allocation, and multimodal isolation.
"""

from unittest.mock import AsyncMock, patch
import pytest
import respx
import httpx
from fastapi.testclient import TestClient

import app.core.config as _cfg
from app.core.exceptions import GeminiServiceError, GroqServiceError
from app.main import app
from app.services.ai.router import (
    AIProvider,
    is_complex_research_query,
    route_and_generate,
    select_provider,
)
from app.services.gemini.client import _is_research_query, _build_gemini_payload
from app.services.groq.client import _build_groq_messages

client = TestClient(app)


# ── 1. Query Classification & Timeout Allocation ─────────────────────────────

def test_amoc_and_complex_research_detection():
    """Verify complex climate research keywords trigger deep research classification."""
    amoc_query = "What is the current scientific consensus on the Atlantic Meridional Overturning Circulation (AMOC) collapse?"
    assert is_complex_research_query(amoc_query) is True
    assert _is_research_query(amoc_query) is True
    assert select_provider(amoc_query) == AIProvider.GEMINI

    weather_query = "What is the weather in Chennai today?"
    assert is_complex_research_query(weather_query) is False
    assert select_provider(weather_query) == AIProvider.GROQ


def test_research_timeout_configuration():
    """Verify research timeout allocates 60 seconds while standard timeout remains 30 seconds."""
    settings = _cfg.get_settings()
    assert settings.gemini_timeout_seconds == 30.0
    assert settings.gemini_research_timeout_seconds == 60.0
    assert settings.gemini_connect_timeout_seconds == 10.0


# ── 2. Focused Prompt Assembly & History Pruning ─────────────────────────────

def test_history_pruning_for_research_payload():
    """Verify payload prunes long past history to last 8 turns to avoid prompt bloating and latency."""
    from app.schemas.chat import ChatHistoryMessage
    long_history = [
        ChatHistoryMessage(role="user" if i % 2 == 0 else "assistant", content=f"Turn message {i}")
        for i in range(20)
    ]

    gemini_payload = _build_gemini_payload("Summarize AMOC dynamics", history=long_history)
    # System instruction + user turns; should not contain early turns 0 through 11
    combined_texts = " ".join(
        p.get("text", "") for c in gemini_payload["contents"] for p in c["parts"]
    )
    assert "Turn message 0" not in combined_texts
    assert "Turn message 19" in combined_texts

    groq_messages = _build_groq_messages("Summarize AMOC dynamics", history=long_history)
    groq_combined = " ".join(m["content"] for m in groq_messages)
    assert "Turn message 0" not in groq_combined
    assert "Turn message 19" in groq_combined


# ── 3. Gemini Timeout & Text Fallback to Groq ─────────────────────────────────

@pytest.mark.asyncio
async def test_gemini_timeout_falls_back_to_groq_for_text_research(monkeypatch):
    """When Gemini times out on a text research query, router transparently falls back to Groq."""
    monkeypatch.setenv("AI_PROVIDER", "auto")
    monkeypatch.setenv("GEMINI_API_KEY", "test_gemini_key")
    monkeypatch.setenv("GROQ_API_KEY", "test_groq_key")
    _cfg.get_settings.cache_clear()

    timeout_err = GeminiServiceError(
        "The Gemini AI service took longer than expected to synthesize a response.",
        status_code=504,
        error_code="gemini_timeout",
    )

    with patch("app.services.ai.router.generate_gemini_response", new=AsyncMock(side_effect=timeout_err)), \
         patch("app.services.ai.router.generate_groq_response", new=AsyncMock(return_value=("Groq scientific fallback summary.", "Groq (llama-3.3-70b-versatile)"))):
        result = await route_and_generate("Summarize latest findings on AMOC collapse tipping points.")

    assert result.provider == "Groq"
    assert result.fallback_occurred is True
    assert "Gemini AI service took longer than expected" in (result.fallback_reason or "")
    assert "Groq scientific fallback summary." in result.content


# ── 4. Image Vision Isolation (Never Fall Back to Groq) ───────────────────────

@pytest.mark.asyncio
async def test_multimodal_vision_never_falls_back_to_groq(monkeypatch):
    """Multimodal image tasks require vision and MUST NOT fall back to text-only Groq."""
    monkeypatch.setenv("AI_PROVIDER", "auto")
    monkeypatch.setenv("GEMINI_API_KEY", "test_gemini_key")
    monkeypatch.setenv("GROQ_API_KEY", "test_groq_key")
    _cfg.get_settings.cache_clear()

    timeout_err = GeminiServiceError(
        "The Gemini AI service took longer than expected.",
        status_code=504,
        error_code="gemini_timeout",
    )

    mock_images = [{"mime_type": "image/png", "data": "base64data"}]

    with patch("app.services.ai.router.generate_gemini_response", new=AsyncMock(side_effect=timeout_err)), \
         patch("app.services.ai.router.generate_groq_response", new=AsyncMock()) as mock_groq:
        with pytest.raises(GeminiServiceError) as exc_info:
            await route_and_generate(
                prompt="Analyze this satellite ice map",
                images=mock_images,
            )
        assert exc_info.value.status_code == 504
        # Groq must NOT be invoked for images
        mock_groq.assert_not_awaited()


# ── 5. Dual Failure Returns Clean 504 Without Exposing Internals ─────────────

@pytest.mark.asyncio
async def test_dual_failure_returns_clean_error(monkeypatch):
    """When both Gemini and Groq fail, raises clean service error without exposing internal keys."""
    monkeypatch.setenv("AI_PROVIDER", "auto")
    monkeypatch.setenv("GEMINI_API_KEY", "test_gemini_key")
    monkeypatch.setenv("GROQ_API_KEY", "test_groq_key")
    _cfg.get_settings.cache_clear()

    gemini_timeout = GeminiServiceError("Gemini timed out", status_code=504, error_code="gemini_timeout")
    groq_err = GroqServiceError("Groq service unavailable", status_code=502, error_code="groq_service_error")

    with patch("app.services.ai.router.generate_gemini_response", new=AsyncMock(side_effect=gemini_timeout)), \
         patch("app.services.ai.router.generate_groq_response", new=AsyncMock(side_effect=groq_err)):
        with pytest.raises(GeminiServiceError) as exc_info:
            await route_and_generate("Explain AMOC stability")
        assert exc_info.value.status_code == 504


# ── 6. End-to-End Chat Endpoint Timeout Behavior ──────────────────────────────

@respx.mock
def test_chat_endpoint_504_timeout_response(monkeypatch):
    """Verify /api/v1/chat returns HTTP 504 with sanitized error code when Gemini times out and Groq is unavailable."""
    monkeypatch.setenv("GEMINI_API_KEY", "test_gemini_key")
    monkeypatch.setenv("GROQ_API_KEY", "")
    _cfg.get_settings.cache_clear()

    respx.post(url__regex=r".*/models/.*:generateContent").mock(
        side_effect=httpx.TimeoutException("Read timed out after 60s")
    )

    resp = client.post(
        "/api/v1/chat",
        json={"prompt": "Explain the AMOC circulation dynamics and potential tipping points."},
    )
    assert resp.status_code == 504
    data = resp.json()
    assert data["error"] == "gemini_timeout"
    assert "took longer than expected" in data["message"]
