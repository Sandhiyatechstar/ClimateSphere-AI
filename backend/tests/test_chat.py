"""
Unit and integration tests for the Gemini AI chat service and endpoint logic.

Tests:
  - ChatRequest and ChatResponse schemas
  - City and intent extraction from prompts and multi-turn history
  - Gemini payload formatting (system instruction, multi-turn history, telemetry grounding)
  - Handling of missing GEMINI_API_KEY (GeminiAPIKeyMissingError)
  - Error responses (rate limiting 429, gateway errors 502, timeout 504)
  - Mocked Gemini generation via respx
"""

import asyncio
import pytest
import respx
import httpx

import app.core.config as _cfg
from app.core.exceptions import (
    GeminiAPIKeyMissingError,
    GeminiServiceError,
)
from app.schemas.chat import ChatHistoryMessage, ChatRequest, ChatResponse
from app.services.gemini.client import (
    _build_gemini_payload,
    generate_gemini_response,
)
from app.api.chat import (
    _extract_city_and_intent,
    _format_current_context,
    _format_forecast_context,
    _resolve_query_context,
    chat_interaction,
)
from app.services.weather import client as wc
from tests.test_weather import MOCK_CURRENT, MOCK_FORECAST


# ── Canonical Gemini Mock Response ─────────────────────────────────────────────

MOCK_GEMINI_REPLY = {
    "candidates": [
        {
            "content": {
                "parts": [
                    {
                        "text": (
                            "### 1. Everyday Explanation\n"
                            "Chennai is experiencing pleasant, sunny tropical conditions today with clear blue skies.\n\n"
                            "### 2. Key Environmental Measurements\n"
                            "- **Temperature:** 32.0°C (89.6°F)\n"
                            "- **Feels Like:** 33.9°C (93.0°F)\n"
                            "- **Relative Humidity:** 65%\n"
                            "- **Atmospheric Pressure:** 1008 hPa\n"
                            "- **Wind Speed:** 4.5 m/s (16.2 km/h)\n\n"
                            "### 3. Advanced Meteorological Analysis\n"
                            "The synoptic surface high over the Bay of Bengal maintains boundary layer stability, "
                            "suppressing convective cloud formation while onshore thermal circulation generates light sea breezes."
                        )
                    }
                ],
                "role": "model",
            },
            "finishReason": "STOP",
        }
    ]
}


def _set_gemini_key(monkeypatch, key: str = "test_gemini_key_abc123"):
    monkeypatch.setenv("GEMINI_API_KEY", key)
    monkeypatch.setenv("OPENWEATHER_API_KEY", "test_weather_key_456")
    _cfg.get_settings.cache_clear()


# ── 1. Schema Validation Tests ────────────────────────────────────────────────

def test_chat_request_schema():
    req = ChatRequest(prompt="What is global warming?")
    assert req.prompt == "What is global warming?"
    assert req.history is None
    assert req.city is None

    req_with_history = ChatRequest(
        prompt="Tell me about Chennai",
        history=[
            ChatHistoryMessage(role="user", content="Hello"),
            ChatHistoryMessage(role="assistant", content="Hi! How can I assist?"),
        ],
        city="Chennai",
    )
    assert len(req_with_history.history) == 2
    assert req_with_history.city == "Chennai"


def test_chat_response_schema():
    resp = ChatResponse(
        content="Sample scientific response",
        data_sources=["Google Gemini", "WMO"],
        suggested_follow_ups=["Follow up 1"],
        model_identifier="Gemini 2.5 Flash",
    )
    assert resp.content == "Sample scientific response"
    assert len(resp.data_sources) == 2
    assert resp.weather_telemetry is None
    assert resp.forecast_telemetry is None
    assert resp.retrieved_at is not None


# ── 2. City & Intent Extraction Tests ─────────────────────────────────────────

def test_extract_city_explicit():
    city, intent = _extract_city_and_intent(
        prompt="Tell me the weather",
        history=None,
        explicit_city="Mumbai",
    )
    assert city == "Mumbai"
    assert intent == "current"


def test_extract_city_from_prompt():
    cases = [
        ("What is the weather in Chennai?", "Chennai", "current"),
        ("Weather for London today", "London", "current"),
        ("Temperature in Tokyo", "Tokyo", "current"),
        ("5-day forecast for Paris", "Paris", "forecast"),
        ("Will it rain in New York tomorrow?", "New York", "forecast"),
        ("Is it raining in Berlin?", "Berlin", "current"),
    ]
    for prompt, expected_city, expected_intent in cases:
        city, intent = _extract_city_and_intent(prompt)
        assert city is not None and city.lower() == expected_city.lower(), (
            f"Expected city '{expected_city}', got '{city}' for prompt: {prompt!r}"
        )
        assert intent == expected_intent, (
            f"Expected intent '{expected_intent}', got '{intent}' for prompt: {prompt!r}"
        )


def test_extract_city_from_history_follow_up():
    history = [
        ChatHistoryMessage(role="user", content="How is the weather in Chennai?"),
        ChatHistoryMessage(role="assistant", content="It is 32°C and sunny in Chennai."),
    ]
    # Follow-up weather question without re-mentioning city
    city, intent = _extract_city_and_intent(
        prompt="What is the forecast for tomorrow?",
        history=history,
    )
    assert city is not None and city.lower() == "chennai", f"Expected 'Chennai', got: {city}"
    assert intent == "forecast"


def test_extract_general_science_no_city():
    non_city_prompts = [
        "Explain the Coriolis effect",
        "What causes the greenhouse effect?",
        "Tell me about global warming",
        "How do ocean currents work?",
        "Hello, what can you do?",
    ]
    for prompt in non_city_prompts:
        city, intent = _extract_city_and_intent(prompt)
        assert city is None, f"Expected no city for prompt {prompt!r}, got: {city!r}"
        assert intent == "none", f"Expected intent 'none' for prompt {prompt!r}, got: {intent!r}"


# ── 3. Payload Building Tests ─────────────────────────────────────────────────

def test_build_gemini_payload():
    payload = _build_gemini_payload(
        prompt="Explain greenhouse gases",
        history=[
            ChatHistoryMessage(role="user", content="Hi"),
            ChatHistoryMessage(role="assistant", content="Hello! How can I help you?"),
        ],
        weather_context=None,
    )
    assert "system_instruction" in payload
    assert len(payload["contents"]) == 3
    assert payload["contents"][0]["role"] == "user"
    assert payload["contents"][1]["role"] == "model"
    assert payload["contents"][2]["role"] == "user"
    assert "greenhouse gases" in payload["contents"][2]["parts"][0]["text"]


def test_build_gemini_payload_with_weather_context():
    context = "Location: Chennai, IN | Temp: 32°C"
    payload = _build_gemini_payload(
        prompt="What's the weather like?",
        weather_context=context,
    )
    user_turn = payload["contents"][0]["parts"][0]["text"]
    assert "[VERIFIED METEOROLOGICAL TELEMETRY FROM OPENWEATHER GATEWAY]:" in user_turn
    assert "Location: Chennai, IN | Temp: 32°C" in user_turn
    assert "[USER INQUIRY]:" in user_turn


# ── 4. Formatting Context Helpers ─────────────────────────────────────────────

def test_format_current_context():
    current_data = wc._normalise_current(MOCK_CURRENT)
    ctx = _format_current_context(current_data)
    assert "Location: Chennai, IN" in ctx
    assert "32.0°C" in ctx
    assert "1008 hPa" in ctx
    assert "65%" in ctx


def test_format_forecast_context():
    forecast_data = wc._normalise_forecast(MOCK_FORECAST)
    ctx = _format_forecast_context(forecast_data)
    assert "Location: Chennai, IN" in ctx
    assert "5-Day / 3-Hour Interval Synoptic Model" in ctx
    assert "32.0°C" in ctx


# ── 5. Missing API Key Exception ──────────────────────────────────────────────

def test_gemini_missing_api_key_raises(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "")
    _cfg.get_settings.cache_clear()

    with pytest.raises(GeminiAPIKeyMissingError):
        asyncio.run(generate_gemini_response(prompt="Hello"))


# ── 6. Mocked HTTP Interaction via respx ──────────────────────────────────────

import re

@respx.mock
def test_gemini_generate_success(monkeypatch):
    _set_gemini_key(monkeypatch)
    pattern = re.compile(r"https://generativelanguage\.googleapis\.com/v1beta/models/.*:generateContent")

    route = respx.post(pattern).respond(
        status_code=200,
        json=MOCK_GEMINI_REPLY,
    )

    result = asyncio.run(generate_gemini_response(prompt="Weather in Chennai"))
    assert route.called
    assert "Chennai is experiencing pleasant" in result
    assert "Key Environmental Measurements" in result


@respx.mock
def test_gemini_rate_limit_429(monkeypatch):
    _set_gemini_key(monkeypatch)
    pattern = re.compile(r"https://generativelanguage\.googleapis\.com/v1beta/models/.*:generateContent")

    respx.post(pattern).respond(status_code=429, json={"error": {"message": "Rate limit exceeded"}})

    with pytest.raises(GeminiServiceError) as exc_info:
        asyncio.run(generate_gemini_response(prompt="Hello"))
    assert exc_info.value.status_code == 429
    assert "rate limit" in exc_info.value.message.lower()


@respx.mock
def test_gemini_invalid_key_401(monkeypatch):
    _set_gemini_key(monkeypatch)
    pattern = re.compile(r"https://generativelanguage\.googleapis\.com/v1beta/models/.*:generateContent")

    respx.post(pattern).respond(status_code=401, json={"error": {"message": "API key not valid"}})

    with pytest.raises(GeminiServiceError) as exc_info:
        asyncio.run(generate_gemini_response(prompt="Hello"))
    assert exc_info.value.status_code == 502
    assert "invalid or unauthorized" in exc_info.value.message.lower()


# ── 7. End-to-End Endpoint Logic Mock Test ────────────────────────────────────

@respx.mock
def test_chat_interaction_weather_grounding(monkeypatch):
    _set_gemini_key(monkeypatch)

    # 1. Mock OpenWeather /weather endpoint
    respx.get("https://api.openweathermap.org/data/2.5/weather").respond(
        status_code=200,
        json=MOCK_CURRENT,
    )

    # 2. Mock Gemini API
    pattern = re.compile(r"https://generativelanguage\.googleapis\.com/v1beta/models/.*:generateContent")
    respx.post(pattern).respond(
        status_code=200,
        json=MOCK_GEMINI_REPLY,
    )

    req = ChatRequest(prompt="What is the weather in Chennai?")
    response = asyncio.run(chat_interaction(req))

    assert response.weather_telemetry is not None
    assert response.weather_telemetry.city == "Chennai"
    assert response.forecast_telemetry is None
    assert "Chennai is experiencing pleasant" in response.content
    assert len(response.data_sources) > 0
    assert any("OpenWeatherMap" in ds for ds in response.data_sources)
    assert any("Gemini" in ds for ds in response.data_sources)
    assert len(response.suggested_follow_ups) > 0


@respx.mock
def test_chat_interaction_general_science(monkeypatch):
    _set_gemini_key(monkeypatch)

    pattern = re.compile(r"https://generativelanguage\.googleapis\.com/v1beta/models/.*:generateContent")
    respx.post(pattern).respond(
        status_code=200,
        json={
            "candidates": [
                {
                    "content": {
                        "parts": [{"text": "The greenhouse effect traps solar radiation in the troposphere."}],
                        "role": "model",
                    },
                    "finishReason": "STOP",
                }
            ]
        },
    )

    req = ChatRequest(prompt="Explain the greenhouse effect")
    response = asyncio.run(chat_interaction(req))

    assert response.weather_telemetry is None
    assert response.forecast_telemetry is None
    assert "greenhouse effect" in response.content
    assert any("Gemini" in ds for ds in response.data_sources)


# ── 8. Context Handling & Follow-Up Tests ─────────────────────────────────────

def test_resolve_context_tomorrow_from_history():
    history = [
        ChatHistoryMessage(role="user", content="What is the weather in Chennai?"),
        ChatHistoryMessage(role="assistant", content="Currently in **Chennai, IN**, the temperature is 32°C."),
    ]
    cities, intent = _resolve_query_context("What about tomorrow?", history)
    assert cities == ["Chennai"]
    assert intent == "forecast"


def test_resolve_context_explain_more():
    history = [
        ChatHistoryMessage(role="user", content="Explain the Coriolis effect"),
        ChatHistoryMessage(role="assistant", content="The Coriolis effect deflects moving air to the right in the Northern Hemisphere."),
    ]
    cities, intent = _resolve_query_context("Explain more", history)
    assert cities == []
    assert intent == "none"


def test_resolve_context_compare_it_with_mumbai():
    history = [
        ChatHistoryMessage(role="user", content="How is the weather in Chennai?"),
        ChatHistoryMessage(role="assistant", content="Location: Chennai, IN | Temp: 32°C, Humidity: 65%"),
    ]
    cities, intent = _resolve_query_context("Compare it with Mumbai", history)
    assert len(cities) == 2
    assert cities[0] == "Chennai"
    assert cities[1] == "Mumbai"
    assert intent == "compare"


def test_resolve_context_compare_two_cities_in_prompt():
    cities, intent = _resolve_query_context("Compare Tokyo and Paris", history=[])
    assert cities == ["Tokyo", "Paris"]
    assert intent == "compare"


def test_conversation_isolation_between_sessions():
    """
    Ensure separate conversation sessions are isolated:
    Session A asking about Chennai does not leak Chennai into Session B which has no history
    or has different history.
    """
    session_a_history = [
        ChatHistoryMessage(role="user", content="Weather in Chennai"),
        ChatHistoryMessage(role="assistant", content="Currently in **Chennai, IN**, it is sunny."),
    ]
    session_b_history = []  # Fresh new session

    # Session A: Follow-up resolves to Chennai
    cities_a, intent_a = _resolve_query_context("What about tomorrow?", session_a_history)
    assert cities_a == ["Chennai"]
    assert intent_a == "forecast"

    # Session B: Fresh session asking "What about tomorrow?" has no prior location
    cities_b, intent_b = _resolve_query_context("What about tomorrow?", session_b_history)
    assert cities_b == []
    assert intent_b == "none"

    # Session C: Session with London history resolves to London
    session_c_history = [
        ChatHistoryMessage(role="user", content="Weather in London"),
        ChatHistoryMessage(role="assistant", content="Currently in **London, UK**, it is rainy."),
    ]
    cities_c, intent_c = _resolve_query_context("What about tomorrow?", session_c_history)
    assert cities_c == ["London"]
    assert intent_c == "forecast"


# ── 9. Mocked Multi-City Comparison & Follow-Up Endpoints ──────────────────────

MOCK_MUMBAI = {
    **MOCK_CURRENT,
    "name": "Mumbai",
    "sys": {"country": "IN", "sunrise": 1700000000, "sunset": 1700040000},
    "coord": {"lat": 19.0760, "lon": 72.8777},
    "main": {
        "temp": 305.15,
        "feels_like": 310.15,
        "temp_min": 303.15,
        "temp_max": 306.15,
        "pressure": 1012,
        "humidity": 70,
    },
    "weather": [{"id": 801, "main": "Clouds", "description": "few clouds", "icon": "02d"}],
}


@respx.mock
def test_chat_interaction_comparison(monkeypatch):
    _set_gemini_key(monkeypatch)

    def weather_side_effect(request: httpx.Request):
        url_str = str(request.url)
        if "chennai" in url_str.lower():
            return httpx.Response(200, json=MOCK_CURRENT)
        elif "mumbai" in url_str.lower():
            return httpx.Response(200, json=MOCK_MUMBAI)
        return httpx.Response(200, json=MOCK_CURRENT)

    respx.get("https://api.openweathermap.org/data/2.5/weather").mock(side_effect=weather_side_effect)

    pattern = re.compile(r"https://generativelanguage\.googleapis\.com/v1beta/models/.*:generateContent")
    respx.post(pattern).respond(
        status_code=200,
        json={
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {
                                "text": (
                                    "### 1. Everyday Explanation\n"
                                    "Chennai is warmer with clear skies while Mumbai is slightly more humid.\n\n"
                                    "### 2. Side-by-Side Measurements\n"
                                    "| Metric | Chennai | Mumbai |\n"
                                    "|---|---|---|\n"
                                    "| Temp | 32°C | 32°C |\n\n"
                                    "### 3. Dynamics\n"
                                    "Both are coastal cities influenced by the Arabian Sea and Bay of Bengal."
                                )
                            }
                        ],
                        "role": "model",
                    },
                    "finishReason": "STOP",
                }
            ]
        },
    )

    history = [
        ChatHistoryMessage(role="user", content="Weather in Chennai"),
        ChatHistoryMessage(role="assistant", content="Currently in **Chennai, IN**, it is 32°C."),
    ]
    req = ChatRequest(prompt="Compare it with Mumbai", history=history)
    response = asyncio.run(chat_interaction(req))

    assert response.weather_telemetry is not None
    assert response.weather_telemetry.city in ("Chennai", "Mumbai")
    assert len(response.data_sources) >= 3
    assert any("Chennai" in ds for ds in response.data_sources)
    assert any("Mumbai" in ds for ds in response.data_sources)
    assert any("Gemini" in ds for ds in response.data_sources)
    assert "Chennai" in response.content
    assert "Mumbai" in response.content


@respx.mock
def test_chat_interaction_comparison_fallback_when_gemini_fails(monkeypatch):
    """When Gemini returns 503 during a comparison inquiry, OpenWeather telemetry is formatted directly."""
    _set_gemini_key(monkeypatch)

    def weather_side_effect(request: httpx.Request):
        url_str = str(request.url)
        if "chennai" in url_str.lower():
            return httpx.Response(200, json=MOCK_CURRENT)
        elif "mumbai" in url_str.lower():
            return httpx.Response(200, json=MOCK_MUMBAI)
        return httpx.Response(200, json=MOCK_CURRENT)

    respx.get("https://api.openweathermap.org/data/2.5/weather").mock(side_effect=weather_side_effect)

    pattern = re.compile(r"https://generativelanguage\.googleapis\.com/v1beta/models/.*:generateContent")
    respx.post(pattern).respond(status_code=503, json={"error": {"message": "Service unavailable"}})

    history = [
        ChatHistoryMessage(role="user", content="Weather in Chennai"),
        ChatHistoryMessage(role="assistant", content="Currently in **Chennai, IN**, it is 32°C."),
    ]
    req = ChatRequest(prompt="Compare it with Mumbai", history=history)
    response = asyncio.run(chat_interaction(req))

    assert response.weather_telemetry is not None
    assert "Real-Time Weather Comparison" in response.content
    assert "Chennai" in response.content
    assert "Mumbai" in response.content
    assert "OpenWeatherMap Live Gateway" in response.model_identifier


@respx.mock
def test_chat_interaction_follow_up_forecast(monkeypatch):
    """'What about tomorrow?' with Chennai in history fetches Chennai's 5-day forecast."""
    _set_gemini_key(monkeypatch)

    respx.get("https://api.openweathermap.org/data/2.5/forecast").respond(
        status_code=200,
        json=MOCK_FORECAST,
    )

    pattern = re.compile(r"https://generativelanguage\.googleapis\.com/v1beta/models/.*:generateContent")
    respx.post(pattern).respond(
        status_code=200,
        json=MOCK_GEMINI_REPLY,
    )

    history = [
        ChatHistoryMessage(role="user", content="Weather in Chennai"),
        ChatHistoryMessage(role="assistant", content="Currently in **Chennai, IN**, it is 32°C."),
    ]
    req = ChatRequest(prompt="What about tomorrow?", history=history)
    response = asyncio.run(chat_interaction(req))

    assert response.forecast_telemetry is not None
    assert response.forecast_telemetry.city == "Chennai"
    assert any("Forecast" in ds for ds in response.data_sources)


# ── 10. Weather Intelligence & Natural Language Understanding Tests ────────────

def test_natural_language_intent_and_city_extraction():
    """Verify natural language weather questions map to correct cities and intents."""
    cases = [
        ("Will it rain tomorrow in Chennai?", "Chennai", "forecast"),
        ("How hot is it today in Chennai?", "Chennai", "current"),
        ("Should I carry an umbrella in Chennai?", "Chennai", "forecast"),
        ("Is it getting warmer in Chennai?", "Chennai", "forecast"),
        ("What is the humidity and pressure in Chennai?", "Chennai", "current"),
        ("What is the wind speed in London?", "London", "current"),
        ("5-day forecast for Tokyo", "Tokyo", "forecast"),
        ("Will it snow in Denver this weekend?", "Denver", "forecast"),
    ]
    for prompt, expected_city, expected_intent in cases:
        city, intent = _extract_city_and_intent(prompt)
        assert city is not None and city.lower() == expected_city.lower(), (
            f"Expected city '{expected_city}', got '{city}' for prompt: {prompt!r}"
        )
        assert intent == expected_intent, (
            f"Expected intent '{expected_intent}', got '{intent}' for prompt: {prompt!r}"
        )


def test_natural_language_comparison_extraction():
    """Verify natural language comparisons extract both cities accurately."""
    cases = [
        "Compare Chennai and Mumbai.",
        "Compare the weather in Chennai with Mumbai",
        "Compare weather of Chennai and Mumbai",
        "Difference between Chennai and Mumbai",
        "Chennai versus Mumbai",
    ]
    for prompt in cases:
        cities, intent = _resolve_query_context(prompt)
        assert len(cities) == 2, f"Expected 2 cities for {prompt!r}, got: {cities}"
        assert cities[0] == "Chennai"
        assert cities[1] == "Mumbai"
        assert intent == "compare"


def test_follow_up_natural_language_resolution():
    """Verify natural language follow-up queries without a city resolve using context."""
    history = [
        ChatHistoryMessage(role="user", content="What is the current weather in Chennai?"),
        ChatHistoryMessage(
            role="assistant",
            content="It is currently raining lightly in Chennai under completely overcast skies. Temperature is 28.8°C.",
        ),
    ]

    # Umbrella inquiry -> resolves to Chennai, intent forecast
    c_umbrella, intent_umbrella = _resolve_query_context("Should I carry an umbrella?", history)
    assert c_umbrella == ["Chennai"]
    assert intent_umbrella == "forecast"

    # Temperature inquiry -> resolves to Chennai, intent current
    c_hot, intent_hot = _resolve_query_context("How hot is it today?", history)
    assert c_hot == ["Chennai"]
    assert intent_hot == "current"

    # Tomorrow inquiry -> resolves to Chennai, intent forecast
    c_tmrw, intent_tmrw = _resolve_query_context("What about tomorrow?", history)
    assert c_tmrw == ["Chennai"]
    assert intent_tmrw == "forecast"

    # Warming trend inquiry -> resolves to Chennai, intent forecast
    c_warm, intent_warm = _resolve_query_context("Is the weather getting warmer?", history)
    assert c_warm == ["Chennai"]
    assert intent_warm == "forecast"

    # Comparison follow-up -> resolves to [Chennai, Mumbai], intent compare
    c_comp, intent_comp = _resolve_query_context("Compare with Mumbai", history)
    assert c_comp == ["Chennai", "Mumbai"]
    assert intent_comp == "compare"


@respx.mock
def test_chat_interaction_rain_umbrella_question(monkeypatch):
    """'Will it rain tomorrow in Chennai?' triggers forecast telemetry and Gemini synthesis."""
    _set_gemini_key(monkeypatch)

    respx.get("https://api.openweathermap.org/data/2.5/forecast").respond(
        status_code=200,
        json=MOCK_FORECAST,
    )

    pattern = re.compile(r"https://generativelanguage\.googleapis\.com/v1beta/models/.*:generateContent")
    respx.post(pattern).respond(
        status_code=200,
        json={
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {
                                "text": "Yes, rain is expected tomorrow in Chennai with high humidity. An umbrella is recommended."
                            }
                        ],
                        "role": "model",
                    },
                    "finishReason": "STOP",
                }
            ]
        },
    )

    req = ChatRequest(prompt="Will it rain tomorrow in Chennai?")
    response = asyncio.run(chat_interaction(req))

    assert response.forecast_telemetry is not None
    assert response.forecast_telemetry.city == "Chennai"
    assert "rain is expected tomorrow in chennai" in response.content.lower()
    assert any("Forecast" in ds for ds in response.data_sources)


@respx.mock
def test_chat_interaction_invalid_city_graceful_handling(monkeypatch):
    """When a city is not found in OpenWeather, the endpoint passes context to Gemini without failing."""
    _set_gemini_key(monkeypatch)

    respx.get("https://api.openweathermap.org/data/2.5/weather").respond(
        status_code=404,
        json={"cod": "404", "message": "city not found"},
    )

    pattern = re.compile(r"https://generativelanguage\.googleapis\.com/v1beta/models/.*:generateContent")
    respx.post(pattern).respond(
        status_code=200,
        json={
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {
                                "text": "I couldn't locate 'AtlantisCity' in the weather station registry. Please check the spelling or country."
                            }
                        ],
                        "role": "model",
                    },
                    "finishReason": "STOP",
                }
            ]
        },
    )

    req = ChatRequest(prompt="What is the weather in AtlantisCity?")
    response = asyncio.run(chat_interaction(req))

    assert response.weather_telemetry is None
    assert "couldn't locate" in response.content.lower() or "atlantiscity" in response.content.lower()


def test_format_forecast_context_enhanced():
    """Verify _format_forecast_context produces 48-hour slots and 5-day daily summaries."""
    forecast_data = wc._normalise_forecast(MOCK_FORECAST)
    ctx = _format_forecast_context(forecast_data)
    assert "Location: Chennai, IN" in ctx
    assert "Upcoming 48-Hour Chronological Intervals:" in ctx
    assert "Daily 5-Day Synoptic Overview" in ctx
    assert "Rain Prob:" in ctx


# ── 11. Scientific Accuracy & Source Transparency Tests ────────────────────────

def test_scientific_sources_selection():
    """Verify appropriate authoritative sources (IPCC, NASA, NOAA, WMO) are assigned based on topic."""
    from app.utils.reference import determine_scientific_sources

    # Climate change / global warming inquiry
    gw_sources = determine_scientific_sources("Explain global warming and IPCC greenhouse emissions scenarios")
    assert any("IPCC" in s for s in gw_sources)
    assert any("NASA" in s for s in gw_sources)
    assert any("WMO" in s for s in gw_sources)

    # Ocean dynamics & El Niño inquiry
    ocean_sources = determine_scientific_sources("How does El Niño alter ocean currents and extreme storm patterns?")
    assert any("NOAA" in s for s in ocean_sources)
    assert any("WMO" in s for s in ocean_sources)

    # Polar cryosphere & Arctic ice inquiry
    ice_sources = determine_scientific_sources("What are the observed satellite measurements of Arctic sea ice?")
    assert any("NASA" in s for s in ice_sources)
    assert any("NOAA" in s for s in ice_sources)

    # Casual query / greeting should NOT attach fake scientific sources
    casual_sources = determine_scientific_sources("Hello! Can you help me write a greeting?")
    assert len(casual_sources) == 0


def test_reference_formatting_and_prevention_of_fabricated_citations():
    """Verify canonical URLs for genuine sources, and prevention of fabricated URLs or model descriptors."""
    from app.utils.reference import append_references, get_canonical_source_url

    # Canonical verified URLs
    assert get_canonical_source_url("IPCC AR6") == "https://www.ipcc.ch"
    assert get_canonical_source_url("NASA Climate") == "https://climate.nasa.gov"
    assert get_canonical_source_url("NOAA") == "https://www.noaa.gov"
    assert get_canonical_source_url("World Meteorological Organization") == "https://wmo.int"
    assert get_canonical_source_url("Copernicus Climate Change Service") == "https://climate.copernicus.eu"

    # Arbitrary / unverified source returns None to prevent fabricated links
    assert get_canonical_source_url("Fabricated University Blog 2026") is None
    assert get_canonical_source_url("Unknown Journal of Speculation") is None

    # Normal prose containing the word 'source' must NOT disable reference generation
    content = "The main source of carbon dioxide is fossil fuel combustion."
    sources = [
        "Intergovernmental Panel on Climate Change (IPCC AR6)",
        "NASA Climate (Global Climate Change)",
        "Google Gemini (gemini-3.5-flash)",  # Should be omitted from References block
        "Fabricated Research Lab",  # Should be omitted because it has no verified canonical URL
    ]
    formatted = append_references(content, sources)
    assert "### References" in formatted
    assert "[Intergovernmental Panel on Climate Change (IPCC AR6)](https://www.ipcc.ch)" in formatted
    assert "[NASA Climate (Global Climate Change)](https://climate.nasa.gov)" in formatted
    # Model and ungrounded entities are omitted from References block
    assert "Gemini" not in formatted.split("### References")[1]
    assert "Fabricated Research Lab" not in formatted.split("### References")[1]

    # Pre-existing References heading prevents duplication
    already_has_refs = "Some climate summary.\n\n### References\n- [IPCC](https://www.ipcc.ch)"
    assert append_references(already_has_refs, sources) == already_has_refs


def test_clean_conversational_references_trigger():
    """Verify references are omitted for normal queries and included only on explicit request."""
    from app.utils.reference import append_references, should_include_references

    sources = [
        "Intergovernmental Panel on Climate Change (IPCC AR6)",
        "NASA Climate (Global Climate Change)",
    ]
    content = "It is currently 28°C with light rain in Chennai."

    # Normal queries do NOT trigger references when require_explicit_request=True
    assert not should_include_references("what is the current weather in Chennai?")
    assert not should_include_references("How hot is it today?")
    assert not should_include_references("Should I carry an umbrella?")
    assert not should_include_references("Compare Chennai and Mumbai")
    assert not should_include_references("Explain global warming")

    normal_resp = append_references(
        content,
        sources,
        user_prompt="what is the current weather in Chennai?",
        require_explicit_request=True,
    )
    assert "### References" not in normal_resp
    assert normal_resp == content

    # Explicit requests DO trigger references
    assert should_include_references("What are your sources for this?")
    assert should_include_references("Please provide scientific citations and references.")
    assert should_include_references("What is the peer-reviewed evidence for global warming?")

    explicit_resp = append_references(
        content,
        sources,
        user_prompt="What are your sources for this?",
        require_explicit_request=True,
    )
    assert "### References" in explicit_resp
    assert "[Intergovernmental Panel on Climate Change (IPCC AR6)](https://www.ipcc.ch)" in explicit_resp
    assert "[NASA Climate (Global Climate Change)](https://climate.nasa.gov)" in explicit_resp


def test_weather_vs_climate_system_instruction():
    """Verify SYSTEM_INSTRUCTION explicitly codifies scientific accuracy standards."""
    from app.services.gemini.client import SYSTEM_INSTRUCTION

    instruction_lower = SYSTEM_INSTRUCTION.lower()
    # Distinguish weather vs climate
    assert "weather" in instruction_lower and "climate" in instruction_lower
    assert "30+ years" in instruction_lower or "statistical" in instruction_lower

    # Distinguish observations vs forecasts vs projections
    assert "observation" in instruction_lower or "observed" in instruction_lower
    assert "forecast" in instruction_lower
    assert "projection" in instruction_lower or "projections" in instruction_lower

    # Scientific uncertainty and confidence
    assert "uncertainty" in instruction_lower or "confidence" in instruction_lower

    # Avoid correlation as causation
    assert "causation" in instruction_lower or "correlation" in instruction_lower
    assert "radiative forcing" in instruction_lower or "mechanism" in instruction_lower

    # Prevention of fabricated citations / URLs
    assert "never invent" in instruction_lower
    assert "citation" in instruction_lower or "url" in instruction_lower

    # Prioritizes authoritative sources
    assert "ipcc" in instruction_lower
    assert "nasa" in instruction_lower
    assert "noaa" in instruction_lower
    assert "wmo" in instruction_lower


@respx.mock
def test_chat_interaction_distinguishes_casual_from_scientific(monkeypatch):
    """Ensure casual queries do NOT attach IPCC/WMO, while climate questions do."""
    _set_gemini_key(monkeypatch)

    pattern = re.compile(r"https://generativelanguage\.googleapis\.com/v1beta/models/.*:generateContent")
    respx.post(pattern).respond(
        status_code=200,
        json={
            "candidates": [
                {
                    "content": {
                        "parts": [{"text": "Hello! I am ClimateSphere AI, ready to assist you."}],
                        "role": "model",
                    },
                    "finishReason": "STOP",
                }
            ]
        },
    )

    # Casual greeting query
    req_casual = ChatRequest(prompt="Hello, what can you do?")
    resp_casual = asyncio.run(chat_interaction(req_casual))

    # Should only cite the conversational model, NOT IPCC or NOAA
    assert not any("IPCC" in ds for ds in resp_casual.data_sources)
    assert not any("NOAA" in ds for ds in resp_casual.data_sources)
    assert "### References" not in resp_casual.content


# ── 12. Interaction, Regeneration & User Experience Reliability Tests ─────────

def test_chat_request_rejects_empty_prompt():
    """Verify ChatRequest schema rejects empty or whitespace-only prompts."""
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        ChatRequest(prompt="")


def test_chat_regeneration_context_resolution():
    """
    Verify that regenerating an assistant response using sliced history preserves
    earlier conversational context while omitting the discarded turn.
    """
    # Multi-turn history:
    # 1. User: Weather in Chennai
    # 2. Assistant: Chennai is 28°C
    # 3. User: What about tomorrow?
    # 4. Assistant: (being regenerated)
    history_prior_to_prompt = [
        ChatHistoryMessage(role="user", content="What is the weather in Chennai?"),
        ChatHistoryMessage(role="assistant", content="The weather in Chennai is currently 28°C."),
    ]

    # When regenerating "What about tomorrow?", history up to Chennai resolves to Chennai forecast
    cities, intent = _resolve_query_context("What about tomorrow?", history_prior_to_prompt)
    assert cities == ["Chennai"]
    assert intent == "forecast"


@respx.mock
def test_chat_error_handling_sanitizes_internal_details(monkeypatch):
    """Verify error responses never expose API keys or internal stack traces."""
    _set_gemini_key(monkeypatch, key="secret_api_key_xyz_do_not_leak")

    # Mock Gemini 500 error
    pattern = re.compile(r"https://generativelanguage\.googleapis\.com/v1beta/models/.*:generateContent")
    respx.post(pattern).respond(
        status_code=500,
        text="Internal Server Error: /var/secrets/key=secret_api_key_xyz_do_not_leak",
    )

    req = ChatRequest(prompt="Explain climate feedback loops")
    with pytest.raises(GeminiServiceError) as exc_info:
        asyncio.run(generate_gemini_response(prompt=req.prompt))

    # Error message should not expose key
    assert "secret_api_key" not in exc_info.value.message


def test_multi_turn_session_isolation_extended():
    """
    Ensure distinct sessions (Session A: London, Session B: Tokyo, Session C: Climate)
    remain completely isolated without cross-session memory leaks.
    """
    history_a = [
        ChatHistoryMessage(role="user", content="Weather in London"),
        ChatHistoryMessage(role="assistant", content="London is currently 15°C with drizzle."),
    ]
    history_b = [
        ChatHistoryMessage(role="user", content="Weather in Tokyo"),
        ChatHistoryMessage(role="assistant", content="Tokyo is currently 22°C and clear."),
    ]
    history_c = [
        ChatHistoryMessage(role="user", content="Explain IPCC scenarios"),
        ChatHistoryMessage(role="assistant", content="IPCC AR6 details SSP pathways."),
    ]

    # Follow-up "What about tomorrow?" in Session A -> London
    cities_a, intent_a = _resolve_query_context("What about tomorrow?", history_a)
    assert cities_a == ["London"]
    assert intent_a == "forecast"

    # Follow-up "What about tomorrow?" in Session B -> Tokyo
    cities_b, intent_b = _resolve_query_context("What about tomorrow?", history_b)
    assert cities_b == ["Tokyo"]
    assert intent_b == "forecast"

    # Follow-up "What about tomorrow?" in Session C -> No city found, intent 'none'
    cities_c, intent_c = _resolve_query_context("What about tomorrow?", history_c)
    assert cities_c == []
    assert intent_c == "none"
