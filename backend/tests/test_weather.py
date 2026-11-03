"""
Unit tests for the weather service layer.

All tests are purely synchronous — they test normalisation, cache logic,
schema validation, and exception types directly without running any
async event loop (async I/O is blocked in the CI sandbox).
"""

import time
import pytest

import app.core.config as _cfg
from app.core.exceptions import APIKeyMissingError, CityNotFoundError, WeatherServiceError
from app.services.weather import client as wc
from app.schemas.weather import CurrentWeatherResponse, ForecastResponse


# ── Canonical mock payloads ────────────────────────────────────────────────────

MOCK_CURRENT = {
    "coord": {"lon": 80.2707, "lat": 13.0827},
    "weather": [{"id": 800, "main": "Clear", "description": "clear sky", "icon": "01d"}],
    "main": {
        "temp": 305.15, "feels_like": 307.0,
        "temp_min": 303.0, "temp_max": 307.0,
        "pressure": 1008, "humidity": 65,
    },
    "visibility": 10000,
    "wind": {"speed": 4.5, "deg": 200, "gust": 6.0},
    "clouds": {"all": 5},
    "dt": 1700000000,
    "sys": {"country": "IN", "sunrise": 1699999000, "sunset": 1700040000},
    "name": "Chennai",
}

MOCK_FORECAST = {
    "city": {
        "name": "Chennai", "country": "IN",
        "coord": {"lat": 13.0827, "lon": 80.2707},
        "timezone": 19800,
    },
    "list": [{
        "dt": 1700000000,
        "main": {
            "temp": 305.15, "feels_like": 307.0,
            "temp_min": 303.0, "temp_max": 307.0,
            "pressure": 1008, "humidity": 65,
        },
        "weather": [{"id": 800, "description": "clear sky", "icon": "01d"}],
        "clouds": {"all": 5},
        "wind": {"speed": 4.5, "deg": 200},
        "pop": 0.1,
        "rain": {"3h": 0.0},
    }],
}


def _set_key(monkeypatch, key: str = "test_key_12345"):
    monkeypatch.setenv("OPENWEATHER_API_KEY", key)
    _cfg.get_settings.cache_clear()


# ── Normalisation tests (pure functions, zero I/O) ────────────────────────────

class TestNormalisation:

    def test_normalise_current_weather(self):
        result = wc._normalise_current(MOCK_CURRENT)
        assert isinstance(result, CurrentWeatherResponse)
        assert result.city == "Chennai"
        assert result.country == "IN"
        assert result.temperature_k == pytest.approx(305.15)
        assert result.humidity_pct == 65
        assert result.pressure_hpa == 1008
        assert result.clouds_pct == 5
        assert result.icon_code == "01d"
        assert result.wind.speed_mps == pytest.approx(4.5)
        assert result.wind.direction_deg == 200
        assert result.wind.gust_mps == pytest.approx(6.0)
        assert result.data_source == "OpenWeatherMap Current Weather API"

    def test_normalise_forecast(self):
        result = wc._normalise_forecast(MOCK_FORECAST)
        assert isinstance(result, ForecastResponse)
        assert result.city == "Chennai"
        assert result.country == "IN"
        assert result.timezone_offset_seconds == 19800
        assert len(result.slots) == 1
        slot = result.slots[0]
        assert slot.temperature_k == pytest.approx(305.15)
        assert slot.rain_probability == pytest.approx(0.1)
        assert slot.humidity_pct == 65
        # data_source is a class-level default on ForecastResponse
        assert "OpenWeatherMap" in result.data_source

    def test_description_capitalised(self):
        raw = dict(MOCK_CURRENT)
        raw["weather"] = [{"id": 800, "description": "scattered clouds", "icon": "03d"}]
        result = wc._normalise_current(raw)
        assert result.description == "Scattered clouds"

    def test_missing_gust_is_none(self):
        raw = dict(MOCK_CURRENT)
        raw["wind"] = {"speed": 3.0, "deg": 90}
        result = wc._normalise_current(raw)
        assert result.wind.gust_mps is None

    def test_missing_visibility_is_none(self):
        raw = {k: v for k, v in MOCK_CURRENT.items() if k != "visibility"}
        result = wc._normalise_current(raw)
        assert result.visibility_m is None

    def test_forecast_slot_pop_is_none_when_absent(self):
        raw = dict(MOCK_FORECAST)
        raw["list"] = [{**MOCK_FORECAST["list"][0]}]
        del raw["list"][0]["pop"]
        result = wc._normalise_forecast(raw)
        assert result.slots[0].rain_probability is None


# ── Cache tests (pure in-memory, zero I/O) ────────────────────────────────────

class TestCache:

    def test_cache_miss_returns_none(self):
        from app.services.weather.cache import TTLCache
        cache = TTLCache(ttl_seconds=60)
        assert cache.get(("current", "city", "chennai")) is None

    def test_cache_set_and_get(self):
        from app.services.weather.cache import TTLCache
        cache = TTLCache(ttl_seconds=60)
        key = ("current", "city", "chennai")
        cache.set(key, {"city": "Chennai"})
        assert cache.get(key) == {"city": "Chennai"}

    def test_cache_expires_after_ttl(self):
        from app.services.weather.cache import TTLCache
        cache = TTLCache(ttl_seconds=60)
        key = ("current", "city", "chennai")
        cache.set(key, "value")
        # Wind back the expiry timestamp without sleeping
        cache._store[key].expires_at = time.monotonic() - 1
        assert cache.get(key) is None

    def test_cache_clear(self):
        from app.services.weather.cache import TTLCache
        cache = TTLCache(ttl_seconds=60)
        cache.set(("k1",), "v1")
        cache.set(("k2",), "v2")
        cache.clear()
        assert cache.size == 0

    def test_cache_invalidate(self):
        from app.services.weather.cache import TTLCache
        cache = TTLCache(ttl_seconds=60)
        key = ("k",)
        cache.set(key, "value")
        cache.invalidate(key)
        assert cache.get(key) is None

    def test_cache_size_counter(self):
        from app.services.weather.cache import TTLCache
        cache = TTLCache(ttl_seconds=60)
        assert cache.size == 0
        cache.set(("a",), 1)
        cache.set(("b",), 2)
        assert cache.size == 2

    def test_cache_max_size_evicts_lru(self):
        from app.services.weather.cache import TTLCache
        cache = TTLCache(ttl_seconds=60, max_size=2)
        cache.set(("k1",), "v1")
        cache.set(("k2",), "v2")
        # Access k1 to make k2 least recently used
        assert cache.get(("k1",)) == "v1"
        # Add k3, which should evict k2
        cache.set(("k3",), "v3")
        assert cache.size == 2
        assert cache.get(("k1",)) == "v1"
        assert cache.get(("k2",)) is None
        assert cache.get(("k3",)) == "v3"

    def test_cache_prunes_expired_when_capacity_reached(self):
        from app.services.weather.cache import TTLCache
        cache = TTLCache(ttl_seconds=60, max_size=2)
        cache.set(("k1",), "v1")
        cache.set(("k2",), "v2")
        # Expire k1 manually
        cache._store[("k1",)].expires_at = time.monotonic() - 1
        # Adding k3 should prune k1 first
        cache.set(("k3",), "v3")
        assert cache.size == 2
        assert cache.get(("k1",)) is None
        assert cache.get(("k2",)) == "v2"
        assert cache.get(("k3",)) == "v3"


# ── API key guard (no async I/O) ──────────────────────────────────────────────

class TestAPIKeyGuard:

    def test_empty_key_detected_by_settings(self, monkeypatch):
        """When the env var is empty, settings correctly reports an empty key."""
        _set_key(monkeypatch, key="")
        s = _cfg.get_settings()
        assert s.openweather_api_key == ""

    def test_valid_key_detected_by_settings(self, monkeypatch):
        """When the env var is set, settings picks it up."""
        _set_key(monkeypatch, key="abc123xyz")
        s = _cfg.get_settings()
        assert s.openweather_api_key == "abc123xyz"

    def test_api_key_missing_error_is_exception(self):
        exc = APIKeyMissingError()
        assert isinstance(exc, Exception)


# ── Exception schema tests ────────────────────────────────────────────────────

class TestExceptions:

    def test_weather_service_error_attributes(self):
        exc = WeatherServiceError("something broke", status_code=502)
        assert exc.message == "something broke"
        assert exc.status_code == 502

    def test_weather_service_error_default_code(self):
        exc = WeatherServiceError("bad")
        assert exc.status_code == 502

    def test_city_not_found_message(self):
        exc = CityNotFoundError("Xyzzy")
        assert "Xyzzy" in str(exc)

    def test_city_not_found_attribute(self):
        exc = CityNotFoundError("Atlantis")
        assert exc.city == "Atlantis"


# ── Response schema validation ────────────────────────────────────────────────

class TestSchemas:

    def test_current_weather_model_dump(self):
        result = wc._normalise_current(MOCK_CURRENT)
        dumped = result.model_dump()
        required = {"city", "country", "temperature_k", "humidity_pct",
                    "wind", "sun", "retrieved_at", "data_source"}
        assert required.issubset(dumped.keys())

    def test_forecast_model_dump(self):
        result = wc._normalise_forecast(MOCK_FORECAST)
        dumped = result.model_dump()
        assert "slots" in dumped
        assert len(dumped["slots"]) == 1
        assert "rain_probability" in dumped["slots"][0]

    def test_wind_info_optional_fields(self):
        from app.schemas.weather import WindInfo
        w = WindInfo(speed_mps=3.0)
        assert w.direction_deg is None
        assert w.gust_mps is None

    def test_forecast_slot_optional_rain(self):
        from app.schemas.weather import ForecastSlot, WindInfo
        from datetime import datetime, timezone
        s = ForecastSlot(
            forecast_time_utc=datetime.now(timezone.utc),
            temperature_k=300.0, feels_like_k=302.0,
            temp_min_k=298.0, temp_max_k=305.0,
            humidity_pct=70, pressure_hpa=1010,
            description="Clear sky", icon_code="01d", condition_id=800,
            wind=WindInfo(speed_mps=2.0),
            clouds_pct=0,
            rain_probability=None, rain_volume_3h_mm=None,
        )
        assert s.rain_probability is None
        assert s.rain_volume_3h_mm is None

    def test_health_response_schema(self):
        from app.schemas.weather import HealthResponse
        h = HealthResponse(
            status="ok", version="1.0.0",
            service="ClimateSphere AI API",
            weather_api_configured=True,
        )
        assert h.status == "ok"
        assert h.weather_api_configured is True
