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
    """Verify research timeout allocates 25 seconds while standard timeout remains 20 seconds for safe cloud proxy margins."""
    _cfg.get_settings.cache_clear()
    settings = _cfg.get_settings()
    assert settings.gemini_timeout_seconds == 20.0
    assert settings.gemini_research_timeout_seconds == 25.0
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


# ── 7. Regression Suite for AMOC Research and Fallback ────────────────────────

@respx.mock
def test_successful_amoc_research_response(monkeypatch):
    """Regression test: Successful AMOC research response via Gemini returns 200 with scientific sources."""
    monkeypatch.setenv("GEMINI_API_KEY", "test_gemini_key")
    monkeypatch.setenv("GROQ_API_KEY", "")
    _cfg.get_settings.cache_clear()

    respx.post(url__regex=r".*/models/.*:generateContent").mock(
        return_value=httpx.Response(
            200,
            json={
                "candidates": [{
                    "content": {
                        "parts": [{"text": "The Atlantic Meridional Overturning Circulation (AMOC) is a major oceanic conveyor belt. Published assessments from IPCC AR6 and observational studies indicate weakening under warming scenarios."}],
                        "role": "model",
                    },
                    "finishReason": "STOP",
                }]
            },
        )
    )

    resp = client.post(
        "/api/v1/chat",
        json={"prompt": "What are the latest findings about AMOC stability?"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "AMOC" in data["content"] or "Atlantic" in data["content"]
    assert any("NOAA" in src or "IPCC" in src or "WMO" in src for src in data["data_sources"])


@respx.mock
def test_gemini_timeout_with_groq_fallback_e2e(monkeypatch):
    """Regression test: Gemini research timeout transparently falls back to Groq and returns 200."""
    monkeypatch.setenv("GEMINI_API_KEY", "test_gemini_key")
    monkeypatch.setenv("GROQ_API_KEY", "test_groq_key")
    _cfg.get_settings.cache_clear()

    # Gemini times out
    respx.post(url__regex=r".*/models/.*:generateContent").mock(
        side_effect=httpx.TimeoutException("Read timed out")
    )

    with patch(
        "app.services.ai.router.generate_groq_response",
        new=AsyncMock(return_value=(
            "Based on published scientific assessments, the AMOC exhibits decadal variability with observed measurements from the RAPID array.",
            "Groq (llama-3.3-70b-versatile)"
        )),
    ):
        resp = client.post(
            "/api/v1/chat",
            json={"prompt": "What are the latest findings about AMOC stability?"},
        )

    assert resp.status_code == 200
    data = resp.json()
    assert "AMOC" in data["content"]
    assert "Groq" in data["model_identifier"]


@respx.mock
def test_both_providers_fail_returns_clean_504(monkeypatch):
    """Regression test: When Gemini research times out and Groq also fails, returns clean HTTP 504."""
    monkeypatch.setenv("GEMINI_API_KEY", "test_gemini_key")
    monkeypatch.setenv("GROQ_API_KEY", "test_groq_key")
    _cfg.get_settings.cache_clear()

    # Gemini times out
    respx.post(url__regex=r".*/models/.*:generateContent").mock(
        side_effect=httpx.TimeoutException("Read timed out")
    )

    with patch(
        "app.services.ai.router.generate_groq_response",
        new=AsyncMock(side_effect=GroqServiceError("Groq gateway error", status_code=502, error_code="groq_server_error")),
    ):
        resp = client.post(
            "/api/v1/chat",
            json={"prompt": "What are the latest findings about AMOC stability?"},
        )

    assert resp.status_code == 504
    data = resp.json()
    assert data["error"] == "gemini_timeout"
    assert "took longer than expected" in data["message"]


@respx.mock
def test_ordinary_weather_and_climate_continue_working(monkeypatch):
    """Regression test: Ordinary weather questions and climate explanations continue working properly."""
    monkeypatch.setenv("GEMINI_API_KEY", "test_gemini_key")
    monkeypatch.setenv("GROQ_API_KEY", "test_groq_key")
    monkeypatch.setenv("OPENWEATHER_API_KEY", "test_weather_key")
    _cfg.get_settings.cache_clear()

    # 1. Weather query for Chennai
    respx.get(url__regex=r"https://api\.openweathermap\.org/data/2\.5/weather.*").mock(
        return_value=httpx.Response(
            200,
            json={
                "name": "Chennai",
                "sys": {"country": "IN"},
                "coord": {"lat": 13.0827, "lon": 80.2707},
                "weather": [{"id": 800, "main": "Clear", "description": "clear sky", "icon": "01d"}],
                "main": {"temp": 303.15, "feels_like": 306.15, "temp_min": 301.15, "temp_max": 305.15, "pressure": 1012, "humidity": 65},
                "wind": {"speed": 4.5, "deg": 90},
                "clouds": {"all": 10},
                "visibility": 10000,
                "dt": 1700000000,
            },
        )
    )

    with patch(
        "app.services.ai.router.generate_groq_response",
        new=AsyncMock(return_value=(
            "The current weather in Chennai is 30°C with clear skies and 65% humidity.",
            "Groq (openai/gpt-oss-20b)"
        )),
    ):
        resp_weather = client.post(
            "/api/v1/chat",
            json={"prompt": "What is the current weather in Chennai?"},
        )

    assert resp_weather.status_code == 200
    weather_data = resp_weather.json()
    assert weather_data["weather_telemetry"] is not None
    assert weather_data["weather_telemetry"]["city"] == "Chennai"
    assert "Chennai" in weather_data["content"]

    # 2. General climate explanation
    with patch(
        "app.services.ai.router.generate_groq_response",
        new=AsyncMock(return_value=(
            "Global warming refers to the long-term heating of Earth's climate system observed since the pre-industrial period.",
            "Groq (openai/gpt-oss-20b)"
        )),
    ):
        resp_climate = client.post(
            "/api/v1/chat",
            json={"prompt": "Explain global warming in simple terms."},
        )

    assert resp_climate.status_code == 200
    climate_data = resp_climate.json()
    assert climate_data["weather_telemetry"] is None
    assert "Global warming" in climate_data["content"]
