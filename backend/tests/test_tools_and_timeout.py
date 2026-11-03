"""
Tests for ClimateSphere AI - Tools Endpoints & Timeout/Resilience Handlers.
"""

import pytest
from fastapi.testclient import TestClient
import respx
import httpx

from app.main import app
from app.core.config import get_settings
from app.services.gemini.client import _is_research_query

client = TestClient(app)


# ── 1. Air Pollution Endpoint ─────────────────────────────────────────────────

@respx.mock
def test_air_pollution_by_city(monkeypatch):
    monkeypatch.setenv("OPENWEATHER_API_KEY", "test_key_12345")
    get_settings.cache_clear()

    # Mock Current Weather to get coordinates
    respx.get("https://api.openweathermap.org/data/2.5/weather").respond(
        status_code=200,
        json={
            "name": "Chennai",
            "sys": {"country": "IN", "sunrise": 1700000000, "sunset": 1700040000},
            "coord": {"lat": 13.0827, "lon": 80.2707},
            "main": {
                "temp": 302.15,
                "feels_like": 308.15,
                "temp_min": 300.15,
                "temp_max": 304.15,
                "humidity": 75,
                "pressure": 1012,
            },
            "weather": [{"id": 801, "main": "Clouds", "description": "few clouds", "icon": "02d"}],
            "wind": {"speed": 4.1, "deg": 80},
            "clouds": {"all": 20},
            "dt": 1700010000,
        },
    )

    # Mock Air Pollution API
    respx.get("https://api.openweathermap.org/data/2.5/air_pollution").respond(
        status_code=200,
        json={
            "coord": {"lat": 13.0827, "lon": 80.2707},
            "list": [
                {
                    "main": {"aqi": 3},
                    "components": {
                        "co": 320.5,
                        "no": 0.0,
                        "no2": 12.4,
                        "o3": 95.2,
                        "so2": 5.8,
                        "pm2_5": 28.5,
                        "pm10": 34.0,
                        "nh3": 1.1,
                    },
                    "dt": 1700010000,
                }
            ],
        },
    )

    resp = client.get("/api/v1/weather/air-pollution?city=Chennai")
    assert resp.status_code == 200
    data = resp.json()
    assert data["city"] == "Chennai"
    assert data["aqi"] == 3
    assert data["aqi_label"] == "Moderate"
    assert data["components"]["pm2_5"] == 28.5
    assert data["components"]["pm10"] == 34.0
    assert data["components"]["o3"] == 95.2


# ── 2. Dual-City Comparison Endpoint ─────────────────────────────────────────

@respx.mock
def test_compare_locations_endpoint(monkeypatch):
    monkeypatch.setenv("OPENWEATHER_API_KEY", "test_key_12345")
    get_settings.cache_clear()

    # Chennai mock
    respx.get(
        "https://api.openweathermap.org/data/2.5/weather",
        params={"q": "Chennai", "units": "standard", "appid": "test_key_12345"},
    ).respond(
        status_code=200,
        json={
            "name": "Chennai",
            "sys": {"country": "IN", "sunrise": 1700000000, "sunset": 1700040000},
            "coord": {"lat": 13.0827, "lon": 80.2707},
            "main": {"temp": 305.15, "feels_like": 312.15, "humidity": 80, "pressure": 1010},
            "weather": [{"id": 800, "main": "Clear", "description": "clear sky", "icon": "01d"}],
            "wind": {"speed": 3.0, "deg": 90},
            "clouds": {"all": 5},
            "dt": 1700010000,
        },
    )

    # London mock
    respx.get(
        "https://api.openweathermap.org/data/2.5/weather",
        params={"q": "London", "units": "standard", "appid": "test_key_12345"},
    ).respond(
        status_code=200,
        json={
            "name": "London",
            "sys": {"country": "GB", "sunrise": 1700000000, "sunset": 1700040000},
            "coord": {"lat": 51.5074, "lon": -0.1278},
            "main": {"temp": 285.15, "feels_like": 284.15, "humidity": 65, "pressure": 1018},
            "weather": [{"id": 500, "main": "Rain", "description": "light rain", "icon": "10d"}],
            "wind": {"speed": 5.5, "deg": 240},
            "clouds": {"all": 80},
            "dt": 1700010000,
        },
    )

    resp = client.get("/api/v1/weather/compare?city1=Chennai&city2=London")
    assert resp.status_code == 200
    data = resp.json()
    assert data["location_a"]["city"] == "Chennai"
    assert data["location_b"]["city"] == "London"
    assert data["temp_delta_c"] == 20.0
    assert data["humidity_delta_pct"] == 15


# ── 3. Research Query Classifier ──────────────────────────────────────────────

def test_research_query_detection():
    assert _is_research_query("Summarize the latest findings on Atlantic Meridional Overturning Circulation (AMOC) stability.") is True
    assert _is_research_query("What does IPCC say about cryosphere tipping points?") is True
    assert _is_research_query("Explain CMIP6 SSP scenarios") is True
    assert _is_research_query("What is the weather in Chennai?") is False
    assert _is_research_query("Hello there") is False


# ── 4. Gemini Timeout and Error Handling ─────────────────────────────────────

@respx.mock
def test_gemini_504_timeout_handling(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test_gemini_key")
    get_settings.cache_clear()

    # Mock timeout on generateContent
    respx.post(url__regex=r".*/models/.*:generateContent").mock(
        side_effect=httpx.TimeoutException("Read timed out")
    )

    resp = client.post(
        "/api/v1/chat",
        json={"prompt": "Summarize the latest findings on Atlantic Meridional Overturning Circulation (AMOC) stability."},
    )
    assert resp.status_code == 504
    data = resp.json()
    assert data["error"] == "gemini_timeout"
    assert "took longer than expected" in data["message"]


@respx.mock
def test_gemini_429_rate_limit_handling(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test_gemini_key")
    get_settings.cache_clear()

    # Mock 429 on generateContent
    respx.post(url__regex=r".*/models/.*:generateContent").respond(
        status_code=429,
        json={"error": {"code": 429, "message": "Resource exhausted"}},
    )

    resp = client.post(
        "/api/v1/chat",
        json={"prompt": "Explain the greenhouse effect."},
    )
    assert resp.status_code == 429
    data = resp.json()
    assert data["error"] == "gemini_rate_limited"


@respx.mock
def test_gemini_503_high_demand_handling(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test_gemini_key")
    get_settings.cache_clear()

    # Mock 503 on generateContent
    respx.post(url__regex=r".*/models/.*:generateContent").respond(
        status_code=503,
        json={"error": {"code": 503, "message": "The model is overloaded. Please try again later."}},
    )

    resp = client.post(
        "/api/v1/chat",
        json={"prompt": "Explain atmospheric circulation cells."},
    )
    assert resp.status_code == 503
    data = resp.json()
    assert data["error"] == "gemini_high_demand"
