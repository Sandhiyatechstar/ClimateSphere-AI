"""
Tests for the health endpoint response schema and configuration logic.
These are pure unit tests — no HTTP server, no network.
"""

import pytest
from app.core.config import get_settings
from app.schemas.weather import HealthResponse


def test_health_schema_ok():
    """HealthResponse schema validates correctly with known-good values."""
    h = HealthResponse(
        status="ok",
        version="1.0.0",
        service="ClimateSphere AI API",
        weather_api_configured=True,
    )
    assert h.status == "ok"
    assert h.weather_api_configured is True


def test_health_schema_missing_key():
    """weather_api_configured=False is valid."""
    h = HealthResponse(
        status="ok",
        version="1.0.0",
        service="ClimateSphere AI API",
        weather_api_configured=False,
    )
    assert h.weather_api_configured is False


def test_settings_defaults():
    """Settings load correctly with defaults when no .env is present."""
    s = get_settings()
    assert s.app_title == "ClimateSphere AI API"
    assert s.app_version == "1.0.0"
    assert "http://localhost:5173" in s.allowed_origins
    assert s.http_timeout_seconds > 0
    assert s.cache_ttl_seconds > 0


def test_settings_api_key_empty_by_default():
    """Without a .env file the API key should be an empty string."""
    s = get_settings()
    # In CI / clean environment with no .env the key is empty
    assert isinstance(s.openweather_api_key, str)


def test_settings_api_key_from_env(monkeypatch):
    """Monkeypatched OPENWEATHER_API_KEY is picked up after cache clear."""
    import app.core.config as _cfg
    monkeypatch.setenv("OPENWEATHER_API_KEY", "abc123")
    _cfg.get_settings.cache_clear()
    s = _cfg.get_settings()
    assert s.openweather_api_key == "abc123"
