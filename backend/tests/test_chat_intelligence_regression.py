"""
Regression test suite for ClimateSphere AI Production Chat Intelligence Fixes.

Covers exact user regression scenarios:
1. "Explain global warming in simple terms." → Climate explanation; no weather lookup.
2. "What causes the greenhouse effect?" → Climate explanation; no city extraction.
3. "What is the current weather in Chennai?" → Current Chennai weather.
4. Follow-up: "What about tomorrow?" → Chennai forecast.
5. Follow-up: "What about humidity?" → Resolve Chennai context if appropriate.
6. Start a new chat and ask "What about tomorrow?" → Ask for a location instead of reusing an unrelated session's city.
7. "What are the latest findings about AMOC stability?" → Scientific research route, not weather lookup.
8. Image analysis → Separate visible facts from possible causes.
"""

import pytest
import respx
import httpx

import app.core.config as _cfg
from app.api.chat import (
    _clean_city_candidate,
    _extract_city_and_intent,
    _extract_last_weather_city_from_history,
    _resolve_query_context,
    chat_interaction,
)
from app.schemas.chat import ChatHistoryMessage, ChatRequest, AttachmentPayload
from app.services.ai.router import is_complex_research_query, select_provider, AIProvider
from app.services.gemini.client import _build_gemini_payload, IMAGE_ANALYSIS_INSTRUCTION, RESEARCH_INSTRUCTION
from app.services.weather import client as wc
from tests.test_weather import MOCK_CURRENT, MOCK_FORECAST


def _setup_env(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test_gemini_key_789")
    monkeypatch.setenv("OPENWEATHER_API_KEY", "test_weather_key_456")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.setenv("AI_PROVIDER", "gemini")
    _cfg.get_settings.cache_clear()


# ── Scenario 1: "Explain global warming in simple terms." ─────────────────────

def test_scenario_1_explain_global_warming_in_simple_terms():
    """
    1. 'Explain global warming in simple terms.' → Climate explanation; no weather lookup.
    Never interpret 'Simple Terms' as a city.
    """
    prompt = "Explain global warming in simple terms."
    cities, intent = _resolve_query_context(prompt)
    assert cities == [], f"Expected no cities, got {cities}"
    assert intent == "none", f"Expected intent 'none', got {intent}"

    city, compat_intent = _extract_city_and_intent(prompt)
    assert city is None, f"Expected city to be None, got {city}"
    assert compat_intent == "none"

    # Verify "simple terms" is rejected as candidate
    cand = _clean_city_candidate("simple terms")
    assert cand is None, f"Expected 'simple terms' to be rejected, got {cand}"


@pytest.mark.asyncio
async def test_scenario_1_chat_interaction_no_weather_lookup(monkeypatch, respx_mock):
    """Ensure chat endpoint does not call OpenWeather for 'Explain global warming in simple terms.'"""
    _setup_env(monkeypatch)

    # Mock Gemini
    respx_mock.post(url__startswith="https://generativelanguage.googleapis.com/v1beta/models/").mock(
        return_value=httpx.Response(
            200,
            json={
                "candidates": [{
                    "content": {
                        "parts": [{"text": "Global warming is the gradual heating of Earth's climate driven by greenhouse gas emissions."}],
                        "role": "model",
                    },
                    "finishReason": "STOP",
                }]
            },
        )
    )

    req = ChatRequest(prompt="Explain global warming in simple terms.")
    resp = await chat_interaction(req)

    assert resp.weather_telemetry is None
    assert resp.forecast_telemetry is None
    assert "Global warming" in resp.content or "warming" in resp.content.lower()


# ── Scenario 2: "What causes the greenhouse effect?" ──────────────────────────

def test_scenario_2_what_causes_the_greenhouse_effect():
    """
    2. 'What causes the greenhouse effect?' → Climate explanation; no city extraction.
    """
    prompt = "What causes the greenhouse effect?"
    cities, intent = _resolve_query_context(prompt)
    assert cities == []
    assert intent == "none"

    city, compat_intent = _extract_city_and_intent(prompt)
    assert city is None
    assert compat_intent == "none"


# ── Scenario 3: "What is the current weather in Chennai?" ─────────────────────

def test_scenario_3_current_weather_in_chennai():
    """
    3. 'What is the current weather in Chennai?' → Current Chennai weather.
    """
    prompt = "What is the current weather in Chennai?"
    cities, intent = _resolve_query_context(prompt)
    assert cities == ["Chennai"]
    assert intent == "current"


@pytest.mark.asyncio
async def test_scenario_3_chat_interaction_chennai_weather(monkeypatch, respx_mock):
    """Ensure OpenWeather current weather is fetched for Chennai."""
    _setup_env(monkeypatch)
    wc._cache.clear()

    # Mock OpenWeather
    respx_mock.get(url__startswith="https://api.openweathermap.org/data/2.5/weather").mock(
        return_value=httpx.Response(200, json=MOCK_CURRENT)
    )
    # Mock Gemini
    respx_mock.post(url__startswith="https://generativelanguage.googleapis.com/v1beta/models/").mock(
        return_value=httpx.Response(
            200,
            json={
                "candidates": [{
                    "content": {
                        "parts": [{"text": "In Chennai, it is currently 32°C and sunny."}],
                        "role": "model",
                    },
                    "finishReason": "STOP",
                }]
            },
        )
    )

    req = ChatRequest(prompt="What is the current weather in Chennai?")
    resp = await chat_interaction(req)

    assert resp.weather_telemetry is not None
    assert resp.weather_telemetry.city == "Chennai"
    assert resp.forecast_telemetry is None


# ── Scenario 4: Follow-up: "What about tomorrow?" → Chennai forecast ──────────

def test_scenario_4_followup_what_about_tomorrow():
    """
    4. Follow-up: 'What about tomorrow?' → Chennai forecast.
    """
    history = [
        ChatHistoryMessage(role="user", content="What is the current weather in Chennai?"),
        ChatHistoryMessage(role="assistant", content="In Chennai, it is currently 32°C with clear skies."),
    ]
    cities, intent = _resolve_query_context("What about tomorrow?", history=history)
    assert cities == ["Chennai"]
    assert intent == "forecast"


@pytest.mark.asyncio
async def test_scenario_4_chat_interaction_chennai_forecast(monkeypatch, respx_mock):
    """Ensure OpenWeather forecast endpoint is fetched for tomorrow follow-up."""
    _setup_env(monkeypatch)
    wc._cache.clear()

    # Mock OpenWeather forecast
    respx_mock.get(url__startswith="https://api.openweathermap.org/data/2.5/forecast").mock(
        return_value=httpx.Response(200, json=MOCK_FORECAST)
    )
    # Mock Gemini
    respx_mock.post(url__startswith="https://generativelanguage.googleapis.com/v1beta/models/").mock(
        return_value=httpx.Response(
            200,
            json={
                "candidates": [{
                    "content": {
                        "parts": [{"text": "Tomorrow in Chennai, temperatures will reach 33°C with a 20% chance of rain."}],
                        "role": "model",
                    },
                    "finishReason": "STOP",
                }]
            },
        )
    )

    history = [
        ChatHistoryMessage(role="user", content="What is the current weather in Chennai?"),
        ChatHistoryMessage(role="assistant", content="In Chennai, it is currently 32°C with clear skies."),
    ]
    req = ChatRequest(prompt="What about tomorrow?", history=history)
    resp = await chat_interaction(req)

    assert resp.forecast_telemetry is not None
    assert resp.forecast_telemetry.city == "Chennai"
    assert resp.weather_telemetry is None


# ── Scenario 5: Follow-up: "What about humidity?" → Chennai context ───────────

def test_scenario_5_followup_what_about_humidity():
    """
    5. Follow-up: 'What about humidity?' → Resolve Chennai context if appropriate.
    """
    history = [
        ChatHistoryMessage(role="user", content="What is the current weather in Chennai?"),
        ChatHistoryMessage(role="assistant", content="In Chennai, it is currently 32°C with clear skies."),
    ]
    cities, intent = _resolve_query_context("What about humidity?", history=history)
    assert cities == ["Chennai"]
    assert intent == "current"


@pytest.mark.asyncio
async def test_scenario_5_chat_interaction_chennai_humidity(monkeypatch, respx_mock):
    """Ensure OpenWeather current telemetry (including humidity) is retrieved for Chennai."""
    _setup_env(monkeypatch)
    wc._cache.clear()

    respx_mock.get(url__startswith="https://api.openweathermap.org/data/2.5/weather").mock(
        return_value=httpx.Response(200, json=MOCK_CURRENT)
    )
    respx_mock.post(url__startswith="https://generativelanguage.googleapis.com/v1beta/models/").mock(
        return_value=httpx.Response(
            200,
            json={
                "candidates": [{
                    "content": {
                        "parts": [{"text": "In Chennai, the relative humidity is currently 65%."}],
                        "role": "model",
                    },
                    "finishReason": "STOP",
                }]
            },
        )
    )

    history = [
        ChatHistoryMessage(role="user", content="What is the current weather in Chennai?"),
        ChatHistoryMessage(role="assistant", content="In Chennai, it is currently 32°C with clear skies."),
    ]
    req = ChatRequest(prompt="What about humidity?", history=history)
    resp = await chat_interaction(req)

    assert resp.weather_telemetry is not None
    assert resp.weather_telemetry.city == "Chennai"
    assert resp.weather_telemetry.humidity_pct == 65


# ── Scenario 6: Start new chat and ask "What about tomorrow?" ─────────────────

def test_scenario_6_new_chat_what_about_tomorrow():
    """
    6. Start a new chat and ask 'What about tomorrow?' → Ask for a location instead of reusing an unrelated session's city.
    """
    # No history (fresh new session)
    cities, intent = _resolve_query_context("What about tomorrow?", history=[])
    assert cities == []
    assert intent == "weather_missing_location"

    cities_none, intent_none = _resolve_query_context("What about tomorrow?", history=None)
    assert cities_none == []
    assert intent_none == "weather_missing_location"


@pytest.mark.asyncio
async def test_scenario_6_chat_interaction_asks_for_location(monkeypatch):
    """Ensure fresh session asking 'What about tomorrow?' politely asks the user for a city."""
    _setup_env(monkeypatch)

    req = ChatRequest(prompt="What about tomorrow?", history=[])
    resp = await chat_interaction(req)

    assert resp.weather_telemetry is None
    assert resp.forecast_telemetry is None
    # Must ask for city/location
    assert "city" in resp.content.lower() or "location" in resp.content.lower()
    assert "forecast" in resp.content.lower() or "weather" in resp.content.lower()


# ── Scenario 7: "What are the latest findings about AMOC stability?" ──────────

def test_scenario_7_amoc_stability_research_route():
    """
    7. 'What are the latest findings about AMOC stability?' → Scientific research route, not weather lookup.
    """
    prompt = "What are the latest findings about AMOC stability?"
    cities, intent = _resolve_query_context(prompt)
    assert cities == []
    assert intent == "none"

    # Must be classified as complex research query
    assert is_complex_research_query(prompt) is True

    # Must route to Gemini (deep reasoning & scientific synthesis)
    provider = select_provider(prompt)
    assert provider == AIProvider.GEMINI


@pytest.mark.asyncio
async def test_scenario_7_chat_interaction_amoc_synthesis(monkeypatch, respx_mock):
    """Ensure AMOC stability routes to Gemini research synthesis with authoritative data sources."""
    _setup_env(monkeypatch)

    respx_mock.post(url__startswith="https://generativelanguage.googleapis.com/v1beta/models/").mock(
        return_value=httpx.Response(
            200,
            json={
                "candidates": [{
                    "content": {
                        "parts": [{
                            "text": (
                                "Based on published scientific assessments and peer-reviewed literature, "
                                "the Atlantic Meridional Overturning Circulation (AMOC) has shown evidence of weakening. "
                                "Direct observational programs such as the RAPID array at 26.5°N demonstrate significant decadal variability. "
                                "While complex climate models (CMIP6 / IPCC AR6) project continued weakening across the 21st century with low confidence in abrupt collapse before 2100, "
                                "recent statistical early-warning studies (e.g., Ditlevsen & Ditlevsen 2023) suggest potential tipping behavior under high freshwater forcing."
                            )
                        }],
                        "role": "model",
                    },
                    "finishReason": "STOP",
                }]
            },
        )
    )

    req = ChatRequest(prompt="What are the latest findings about AMOC stability?")
    resp = await chat_interaction(req)

    assert resp.weather_telemetry is None
    assert resp.forecast_telemetry is None
    # Verify authoritative scientific sources are present
    assert any("NOAA" in src or "IPCC" in src or "WMO" in src for src in resp.data_sources)
    assert "AMOC" in resp.content


# ── Scenario 8: Image analysis → Separate visible facts from possible causes ──

def test_scenario_8_image_analysis_separates_facts_and_causes():
    """
    8. Image analysis → Separate visible facts from possible causes.
    Verifies that Gemini image prompt payload includes the strict directive
    to distinguish visible empirical evidence from inferred/hypothetical causes
    and never claim definitive disaster causation from a photo alone.
    """
    payload = _build_gemini_payload(
        prompt="Explain what is happening in this flooded road photo.",
        images=[{"mime_type": "image/jpeg", "data": "base64mockimagedata"}],
    )

    # Check system instruction contains image directives
    sys_instruction = payload["system_instruction"]["parts"][0]["text"]
    assert "Visible Evidence" in sys_instruction or "visible" in sys_instruction.lower()
    assert "cautious" in sys_instruction.lower() or "inferred" in sys_instruction.lower()
    assert "never claim to establish" in sys_instruction.lower() or "never claim" in sys_instruction.lower()

    # Check that current turn prompt reinforces visual precision
    user_prompt_text = payload["contents"][-1]["parts"][-1]["text"]
    assert "IMAGE ANALYSIS DIRECTIVE" in user_prompt_text or "VISUAL" in user_prompt_text
    assert "visible" in user_prompt_text.lower()
