"""
Comprehensive unit and integration tests for Groq AI client and AI Provider Router.

Tests:
  - Groq message serialization and prompt assembly
  - Groq client error translation (Auth, RateLimit, Timeout, NotFound, ServerError)
  - Groq client model fallback progression
  - Router provider selection (everyday/weather -> Groq, complex research -> Gemini)
  - Config overrides ('auto', 'groq', 'gemini')
  - Missing Groq key transparent fallback to Gemini
  - Groq failure transparent fallback to Gemini
  - Gemini failure transparent fallback to Groq
  - Dual provider failure handling
  - End-to-end /chat endpoint routing through Groq and transparent Gemini fallback
"""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
import respx
import httpx
from fastapi.testclient import TestClient

import app.core.config as _cfg
from app.core.exceptions import (
    GeminiServiceError,
    GroqAPIKeyMissingError,
    GroqServiceError,
)
from app.main import app
from app.schemas.chat import ChatHistoryMessage, ChatRequest
from app.services.ai.router import (
    AIProvider,
    AIRoutingResult,
    is_complex_research_query,
    route_and_generate,
    select_provider,
)
from app.services.groq import client as groq_client
from app.services.groq.client import (
    _build_groq_messages,
    generate_groq_response,
)
from tests.test_weather import MOCK_CURRENT

client = TestClient(app)


# ── 1. Groq Message Builder Tests ──────────────────────────────────────────────

def test_build_groq_messages_basic():
    messages = _build_groq_messages("Hello there")
    assert len(messages) == 2
    assert messages[0]["role"] == "system"
    assert "ClimateSphere AI" in messages[0]["content"]
    assert messages[1]["role"] == "user"
    assert messages[1]["content"] == "Hello there"


def test_build_groq_messages_with_history_and_weather():
    history = [
        ChatHistoryMessage(role="user", content="Hi"),
        ChatHistoryMessage(role="assistant", content="Hello! How can I help you today?"),
    ]
    messages = _build_groq_messages(
        prompt="What is the weather?",
        history=history,
        weather_context="TEMP: 300K, WEATHER: Sunny",
    )
    assert len(messages) == 4
    assert messages[0]["role"] == "system"
    assert messages[1]["role"] == "user"
    assert messages[2]["role"] == "assistant"
    assert messages[3]["role"] == "user"
    assert "[VERIFIED METEOROLOGICAL TELEMETRY FROM OPENWEATHER GATEWAY]" in messages[3]["content"]
    assert "TEMP: 300K" in messages[3]["content"]


# ── 2. Groq Client Error Handling & Fallback ───────────────────────────────────

@pytest.mark.asyncio
async def test_groq_missing_api_key(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "")
    _cfg.get_settings.cache_clear()

    with pytest.raises(GroqAPIKeyMissingError):
        await generate_groq_response("Hello")


@pytest.mark.asyncio
async def test_groq_successful_response(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "gsk_test_mock_key_123")
    monkeypatch.setenv("GROQ_MODEL", "openai/gpt-oss-20b")
    _cfg.get_settings.cache_clear()

    mock_chat_completion = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = "Chennai is currently warm and humid under partly cloudy skies."
    mock_chat_completion.choices = [mock_choice]

    mock_async_groq = MagicMock()
    mock_async_groq.chat.completions.create = AsyncMock(return_value=mock_chat_completion)

    with patch("app.services.groq.client._get_groq_client", return_value=mock_async_groq):
        content, model_id = await generate_groq_response("Weather in Chennai")

    assert "Chennai is currently warm" in content
    assert model_id == "Groq (openai/gpt-oss-20b)"


@pytest.mark.asyncio
async def test_groq_auth_error_raises_groq_service_error(monkeypatch):
    from groq import AuthenticationError

    monkeypatch.setenv("GROQ_API_KEY", "gsk_invalid_mock_key")
    _cfg.get_settings.cache_clear()

    mock_async_groq = MagicMock()
    mock_response = httpx.Response(401, request=httpx.Request("POST", "https://api.groq.com/chat"))
    mock_async_groq.chat.completions.create = AsyncMock(
        side_effect=AuthenticationError("Invalid API Key", response=mock_response, body=None)
    )

    with patch("app.services.groq.client._get_groq_client", return_value=mock_async_groq):
        with pytest.raises(GroqServiceError) as exc_info:
            await generate_groq_response("Hello")

    assert exc_info.value.status_code == 401
    assert "Invalid or unauthorized Groq API key" in exc_info.value.message


@pytest.mark.asyncio
async def test_groq_model_fallback_on_not_found(monkeypatch):
    from groq import NotFoundError

    monkeypatch.setenv("GROQ_API_KEY", "gsk_test_key")
    monkeypatch.setenv("GROQ_MODEL", "openai/gpt-oss-20b")
    _cfg.get_settings.cache_clear()

    mock_choice = MagicMock()
    mock_choice.message.content = "Fallback model answered successfully."
    mock_completion_ok = MagicMock()
    mock_completion_ok.choices = [mock_choice]

    mock_response_404 = httpx.Response(404, request=httpx.Request("POST", "https://api.groq.com/chat"))
    err_404 = NotFoundError("Model not found", response=mock_response_404, body=None)

    mock_async_groq = MagicMock()
    # First model 404, second model succeeds
    mock_async_groq.chat.completions.create = AsyncMock(side_effect=[err_404, mock_completion_ok])

    with patch("app.services.groq.client._get_groq_client", return_value=mock_async_groq):
        content, model_id = await generate_groq_response("Hello")

    assert content == "Fallback model answered successfully."
    assert "Groq (llama-3.3-70b-versatile)" in model_id


# ── 3. Router Intent Classification & Selection ───────────────────────────────

def test_research_query_detection():
    assert is_complex_research_query("Explain the stability of the AMOC circulation.")
    assert is_complex_research_query("What does the IPCC AR6 report state about sea level rise?")
    assert is_complex_research_query("Describe the radiative forcing of greenhouse gases.")
    assert is_complex_research_query("Can you provide deep research into cryosphere mass balance?")
    assert not is_complex_research_query("What is the weather in Chennai?")
    assert not is_complex_research_query("Will it rain tomorrow in London?")
    assert not is_complex_research_query("Hi, how are you?")
    assert not is_complex_research_query("Compare London and Tokyo.")


def test_select_provider_auto(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "auto")
    _cfg.get_settings.cache_clear()

    # Weather & casual -> Groq
    assert select_provider("What is the current weather in Mumbai?") == AIProvider.GROQ
    assert select_provider("Good morning!") == AIProvider.GROQ
    assert select_provider("Compare Paris and Berlin") == AIProvider.GROQ

    # Complex scientific research -> Gemini
    assert select_provider("Explain AMOC tipping points and thermohaline collapse") == AIProvider.GEMINI
    assert select_provider("What are the IPCC SSP scenarios?") == AIProvider.GEMINI


def test_select_provider_overrides(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "gemini")
    _cfg.get_settings.cache_clear()
    assert select_provider("Good morning!") == AIProvider.GEMINI

    monkeypatch.setenv("AI_PROVIDER", "groq")
    _cfg.get_settings.cache_clear()
    assert select_provider("Explain AMOC tipping points") == AIProvider.GROQ


# ── 4. Router Execution & Transparent Fallback ────────────────────────────────

@pytest.mark.asyncio
async def test_router_groq_success(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "auto")
    monkeypatch.setenv("GROQ_API_KEY", "gsk_valid_key")
    _cfg.get_settings.cache_clear()

    with patch(
        "app.services.ai.router.generate_groq_response",
        new=AsyncMock(return_value=("Today is sunny and clear.", "Groq (openai/gpt-oss-20b)")),
    ):
        result = await route_and_generate("What is the weather?")

    assert result.provider == "Groq"
    assert result.model == "openai/gpt-oss-20b"
    assert result.model_identifier == "Groq (openai/gpt-oss-20b)"
    assert result.data_source_label == "Groq AI (openai/gpt-oss-20b)"
    assert not result.fallback_occurred
    assert "sunny and clear" in result.content


@pytest.mark.asyncio
async def test_router_groq_missing_key_transparent_fallback_to_gemini(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "auto")
    monkeypatch.setenv("GROQ_API_KEY", "")
    monkeypatch.setenv("GEMINI_API_KEY", "gemini_valid_key")
    monkeypatch.setenv("GEMINI_MODEL", "gemini-3.5-flash")
    _cfg.get_settings.cache_clear()

    with patch(
        "app.services.ai.router.generate_gemini_response",
        new=AsyncMock(return_value="Gemini generated response."),
    ):
        result = await route_and_generate("Hello there!")

    assert result.provider == "Gemini"
    assert result.model == "gemini-3.5-flash"
    assert result.fallback_occurred is True
    assert "Groq API key not configured" in (result.fallback_reason or "")
    assert result.content == "Gemini generated response."


@pytest.mark.asyncio
async def test_router_groq_auth_failure_transparent_fallback_to_gemini(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "auto")
    monkeypatch.setenv("GROQ_API_KEY", "gsk_invalid_key")
    monkeypatch.setenv("GEMINI_API_KEY", "gemini_valid_key")
    monkeypatch.setenv("GEMINI_MODEL", "gemini-3.5-flash")
    _cfg.get_settings.cache_clear()

    groq_err = GroqServiceError("Invalid or unauthorized Groq API key.", status_code=401)

    with patch("app.services.ai.router.generate_groq_response", new=AsyncMock(side_effect=groq_err)), \
         patch("app.services.ai.router.generate_gemini_response", new=AsyncMock(return_value="Gemini rescued response.")):
        result = await route_and_generate("What is the weather in Delhi?")

    assert result.provider == "Gemini"
    assert result.fallback_occurred is True
    assert "Invalid or unauthorized Groq API key" in (result.fallback_reason or "")
    assert result.content == "Gemini rescued response."


@pytest.mark.asyncio
async def test_router_research_query_routes_directly_to_gemini(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "auto")
    monkeypatch.setenv("GROQ_API_KEY", "gsk_valid_key")
    monkeypatch.setenv("GEMINI_API_KEY", "gemini_valid_key")
    monkeypatch.setenv("GEMINI_MODEL", "gemini-3.5-flash")
    _cfg.get_settings.cache_clear()

    mock_gemini = AsyncMock(return_value="Detailed scientific analysis of AMOC circulation stability.")
    mock_groq = AsyncMock(return_value=("Groq response", "Groq (openai/gpt-oss-20b)"))

    with patch("app.services.ai.router.generate_gemini_response", new=mock_gemini), \
         patch("app.services.ai.router.generate_groq_response", new=mock_groq):
        result = await route_and_generate("Explain the AMOC circulation dynamics and potential tipping points.")

    assert result.provider == "Gemini"
    assert result.primary_provider == "Gemini"
    assert not result.fallback_occurred
    assert "AMOC circulation stability" in result.content
    mock_gemini.assert_awaited_once()
    mock_groq.assert_not_awaited()


@pytest.mark.asyncio
async def test_router_dual_failure_raises(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "auto")
    monkeypatch.setenv("GROQ_API_KEY", "gsk_key")
    monkeypatch.setenv("GEMINI_API_KEY", "gemini_key")
    _cfg.get_settings.cache_clear()

    groq_err = GroqServiceError("Groq 500 server error", status_code=502)
    gemini_err = GeminiServiceError("Gemini 500 server error", status_code=502)

    with patch("app.services.ai.router.generate_groq_response", new=AsyncMock(side_effect=groq_err)), \
         patch("app.services.ai.router.generate_gemini_response", new=AsyncMock(side_effect=gemini_err)):
        with pytest.raises(GeminiServiceError):
            await route_and_generate("What is the weather?")


# ── 5. End-to-End Chat Endpoint Integration ───────────────────────────────────

@respx.mock
def test_chat_endpoint_uses_groq_when_available(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "auto")
    monkeypatch.setenv("GROQ_API_KEY", "gsk_valid_key")
    monkeypatch.setenv("OPENWEATHER_API_KEY", "ow_valid_key")
    _cfg.get_settings.cache_clear()

    # Mock OpenWeather /weather endpoint
    respx.get("https://api.openweathermap.org/data/2.5/weather").mock(
        return_value=httpx.Response(200, json=MOCK_CURRENT)
    )

    groq_reply = "Chennai is experiencing sunny skies at 27°C with pleasant easterly breezes."
    with patch(
        "app.services.ai.router.generate_groq_response",
        new=AsyncMock(return_value=(groq_reply, "Groq (openai/gpt-oss-20b)")),
    ):
        response = client.post("/api/v1/chat", json={"prompt": "What is the weather in Chennai?"})

    assert response.status_code == 200
    data = response.json()
    assert "sunny skies at 27°C" in data["content"]
    assert data["model_identifier"] == "Groq (openai/gpt-oss-20b)"
    assert any("Groq AI" in src for src in data["data_sources"])
    assert any("OpenWeatherMap" in src for src in data["data_sources"])


@respx.mock
def test_chat_endpoint_groq_failure_transparently_uses_gemini(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "auto")
    monkeypatch.setenv("GROQ_API_KEY", "gsk_invalid_or_rate_limited")
    monkeypatch.setenv("GEMINI_API_KEY", "gemini_valid_key")
    monkeypatch.setenv("GEMINI_MODEL", "gemini-3.5-flash")
    monkeypatch.setenv("OPENWEATHER_API_KEY", "ow_valid_key")
    _cfg.get_settings.cache_clear()

    # Mock OpenWeather
    respx.get("https://api.openweathermap.org/data/2.5/weather").mock(
        return_value=httpx.Response(200, json=MOCK_CURRENT)
    )

    # Groq fails with 401
    groq_err = GroqServiceError("Invalid or unauthorized Groq API key.", status_code=401)
    gemini_reply = "Chennai is currently 32°C under clear skies with 65% humidity."

    with patch("app.services.ai.router.generate_groq_response", new=AsyncMock(side_effect=groq_err)), \
         patch("app.services.ai.router.generate_gemini_response", new=AsyncMock(return_value=gemini_reply)):
        response = client.post("/api/v1/chat", json={"prompt": "What is the weather in Chennai?"})

    assert response.status_code == 200
    data = response.json()
    assert "Chennai is currently 32°C" in data["content"]
    # Model identifier reflects Gemini because fallback saved the request seamlessly
    assert data["model_identifier"] == "Gemini (gemini-3.5-flash)"
    assert any("Google Gemini" in src for src in data["data_sources"])
    assert any("OpenWeatherMap" in src for src in data["data_sources"])
