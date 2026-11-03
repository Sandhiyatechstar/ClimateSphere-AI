"""
OpenWeather API client.

Handles:
  - current weather  (by city name or lat/lon)
  - 5-day / 3-hour forecast  (by city name or lat/lon)
  - HTTP timeouts, retries-on-network-error, rate-limit detection
  - In-memory TTL caching
  - Normalisation of raw API responses into our Pydantic schemas
"""

import logging
from datetime import datetime, timezone
from typing import Optional

import httpx

from app.core.config import get_settings
from app.core.exceptions import APIKeyMissingError, CityNotFoundError, WeatherServiceError
from app.schemas.weather import (
    AirPollutionComponents,
    AirPollutionResponse,
    CurrentWeatherResponse,
    ForecastResponse,
    ForecastSlot,
    SunInfo,
    WindInfo,
)
from app.services.weather.cache import TTLCache

logger = logging.getLogger(__name__)

# Module-level cache shared across all requests
_cache: Optional[TTLCache] = None


def _get_cache() -> TTLCache:
    global _cache
    if _cache is None:
        settings = get_settings()
        _cache = TTLCache(
            ttl_seconds=settings.cache_ttl_seconds,
            max_size=settings.cache_max_size,
        )
    return _cache


# ── Internal helpers ──────────────────────────────────────────────────────────

def _utc_from_ts(ts: int) -> datetime:
    return datetime.fromtimestamp(ts, tz=timezone.utc)


def _parse_wind(data: dict) -> WindInfo:
    wind = data.get("wind", {})
    return WindInfo(
        speed_mps=wind.get("speed", 0.0),
        direction_deg=wind.get("deg"),
        gust_mps=wind.get("gust"),
    )


def _normalise_current(raw: dict) -> CurrentWeatherResponse:
    """Map the raw OpenWeather /weather JSON into our schema."""
    main = raw["main"]
    weather_list = raw.get("weather", [{}])
    weather = weather_list[0] if weather_list else {}
    sys = raw.get("sys", {})
    clouds = raw.get("clouds", {})

    return CurrentWeatherResponse(
        city=raw.get("name", "Unknown"),
        country=sys.get("country", ""),
        latitude=raw["coord"]["lat"],
        longitude=raw["coord"]["lon"],
        temperature_k=main["temp"],
        feels_like_k=main["feels_like"],
        temp_min_k=main.get("temp_min"),
        temp_max_k=main.get("temp_max"),
        humidity_pct=main["humidity"],
        pressure_hpa=main["pressure"],
        visibility_m=raw.get("visibility"),
        clouds_pct=clouds.get("all", 0),
        description=weather.get("description", "").capitalize(),
        icon_code=weather.get("icon", "01d"),
        condition_id=weather.get("id", 800),
        wind=_parse_wind(raw),
        sun=SunInfo(
            sunrise_utc=_utc_from_ts(sys.get("sunrise", 0)),
            sunset_utc=_utc_from_ts(sys.get("sunset", 0)),
        ),
        observation_time_utc=_utc_from_ts(raw.get("dt", 0)),
    )


def _normalise_forecast(raw: dict) -> ForecastResponse:
    """Map the raw OpenWeather /forecast JSON into our schema."""
    city_info = raw.get("city", {})
    coord = city_info.get("coord", {})

    slots = []
    for item in raw.get("list", []):
        main = item["main"]
        weather_list = item.get("weather", [{}])
        weather = weather_list[0] if weather_list else {}
        clouds = item.get("clouds", {})
        rain = item.get("rain", {})

        slots.append(
            ForecastSlot(
                forecast_time_utc=_utc_from_ts(item["dt"]),
                temperature_k=main["temp"],
                feels_like_k=main["feels_like"],
                temp_min_k=main.get("temp_min", main["temp"]),
                temp_max_k=main.get("temp_max", main["temp"]),
                humidity_pct=main["humidity"],
                pressure_hpa=main["pressure"],
                description=weather.get("description", "").capitalize(),
                icon_code=weather.get("icon", "01d"),
                condition_id=weather.get("id", 800),
                wind=_parse_wind(item),
                clouds_pct=clouds.get("all", 0),
                rain_probability=item.get("pop"),
                rain_volume_3h_mm=rain.get("3h"),
            )
        )

    return ForecastResponse(
        city=city_info.get("name", "Unknown"),
        country=city_info.get("country", ""),
        latitude=coord.get("lat", 0.0),
        longitude=coord.get("lon", 0.0),
        timezone_offset_seconds=city_info.get("timezone", 0),
        slots=slots,
    )


# ── HTTP helpers ──────────────────────────────────────────────────────────────

_client: Optional[httpx.AsyncClient] = None


def _get_http_client() -> httpx.AsyncClient:
    """Return a pooled singleton AsyncClient with keep-alive connection reuse."""
    global _client
    if _client is None or _client.is_closed:
        settings = get_settings()
        _client = httpx.AsyncClient(
            base_url=settings.openweather_base_url,
            timeout=httpx.Timeout(settings.http_timeout_seconds),
            limits=httpx.Limits(max_keepalive_connections=20, max_connections=50),
        )
    return _client


async def close_weather_client() -> None:
    """Gracefully close the pooled HTTP client."""
    global _client
    if _client is not None and not _client.is_closed:
        await _client.aclose()
        _client = None


def _build_client() -> httpx.AsyncClient:
    """Compatibility wrapper returning client."""
    return _get_http_client()


async def _fetch(params: dict, endpoint: str) -> dict:
    """
    Perform a GET request to `endpoint` with `params`.
    Raises structured exceptions instead of letting raw httpx errors surface.
    """
    settings = get_settings()

    if not settings.openweather_api_key:
        raise APIKeyMissingError()

    params = {**params, "appid": settings.openweather_api_key}

    try:
        client = _get_http_client()
        response = await client.get(endpoint, params=params)
    except httpx.TimeoutException as exc:
        logger.error("Timeout calling OpenWeather %s: %s", endpoint, exc)
        raise WeatherServiceError(
            "The weather service did not respond in time. Please try again shortly.",
            status_code=504,
        ) from exc
    except httpx.NetworkError as exc:
        logger.error("Network error calling OpenWeather %s: %s", endpoint, exc)
        raise WeatherServiceError(
            "Could not reach the weather service. Check your internet connection.",
            status_code=502,
        ) from exc

    # ── Interpret status codes ────────────────────────────
    if response.status_code == 401:
        raise WeatherServiceError(
            "Invalid OpenWeather API key. Please check your OPENWEATHER_API_KEY.",
            status_code=502,
        )
    if response.status_code == 404:
        # Extract the city from params if present
        city = params.get("q", params.get("lat", "unknown"))
        raise CityNotFoundError(str(city))
    if response.status_code == 429:
        raise WeatherServiceError(
            "OpenWeather API rate limit reached. Please wait a moment and try again.",
            status_code=429,
        )
    if response.status_code >= 500:
        raise WeatherServiceError(
            f"OpenWeather API returned a server error ({response.status_code}). "
            "Please try again later.",
            status_code=502,
        )
    if response.status_code != 200:
        raise WeatherServiceError(
            f"Unexpected response from OpenWeather API: HTTP {response.status_code}",
            status_code=502,
        )

    return response.json()


# ── Public service functions ──────────────────────────────────────────────────

async def get_current_weather_by_city(city: str) -> CurrentWeatherResponse:
    """Fetch current weather for a city name."""
    cache = _get_cache()
    key = ("current", "city", city.lower().strip())

    cached = cache.get(key)
    if cached:
        logger.debug("Cache hit: current weather for city=%r", city)
        return cached

    logger.info("Fetching current weather for city=%r", city)
    raw = await _fetch({"q": city, "units": "standard"}, "/weather")
    result = _normalise_current(raw)
    cache.set(key, result)
    return result


async def get_current_weather_by_coords(lat: float, lon: float) -> CurrentWeatherResponse:
    """Fetch current weather for geographic coordinates."""
    cache = _get_cache()
    key = ("current", "coords", round(lat, 4), round(lon, 4))

    cached = cache.get(key)
    if cached:
        logger.debug("Cache hit: current weather for lat=%.4f lon=%.4f", lat, lon)
        return cached

    logger.info("Fetching current weather for lat=%.4f lon=%.4f", lat, lon)
    raw = await _fetch({"lat": lat, "lon": lon, "units": "standard"}, "/weather")
    result = _normalise_current(raw)
    cache.set(key, result)
    return result


async def get_forecast_by_city(city: str) -> ForecastResponse:
    """Fetch 5-day / 3-hour forecast for a city name."""
    cache = _get_cache()
    key = ("forecast", "city", city.lower().strip())

    cached = cache.get(key)
    if cached:
        logger.debug("Cache hit: forecast for city=%r", city)
        return cached

    logger.info("Fetching forecast for city=%r", city)
    raw = await _fetch({"q": city, "units": "standard"}, "/forecast")
    result = _normalise_forecast(raw)
    cache.set(key, result)
    return result


async def get_forecast_by_coords(lat: float, lon: float) -> ForecastResponse:
    """Fetch 5-day / 3-hour forecast for geographic coordinates."""
    cache = _get_cache()
    key = ("forecast", "coords", round(lat, 4), round(lon, 4))

    cached = cache.get(key)
    if cached:
        logger.debug("Cache hit: forecast for lat=%.4f lon=%.4f", lat, lon)
        return cached

    logger.info("Fetching forecast for lat=%.4f lon=%.4f", lat, lon)
    raw = await _fetch({"lat": lat, "lon": lon, "units": "standard"}, "/forecast")
    result = _normalise_forecast(raw)
    cache.set(key, result)
    return result


# ── Air Pollution ─────────────────────────────────────────────────────────────

AQI_LABELS = {
    1: "Good",
    2: "Fair",
    3: "Moderate",
    4: "Poor",
    5: "Very Poor",
}


def _normalise_air_pollution(raw: dict, city: str, country: str, lat: float, lon: float) -> AirPollutionResponse:
    entry = raw["list"][0]
    aqi_num = entry["main"]["aqi"]
    comps = entry["components"]
    return AirPollutionResponse(
        city=city,
        country=country,
        latitude=lat,
        longitude=lon,
        aqi=aqi_num,
        aqi_label=AQI_LABELS.get(aqi_num, "Unknown"),
        components=AirPollutionComponents(
            co=comps.get("co", 0.0),
            no=comps.get("no"),
            no2=comps.get("no2", 0.0),
            o3=comps.get("o3", 0.0),
            so2=comps.get("so2", 0.0),
            pm2_5=comps.get("pm2_5", 0.0),
            pm10=comps.get("pm10", 0.0),
            nh3=comps.get("nh3"),
        ),
    )


async def get_air_pollution_by_city(city: str) -> AirPollutionResponse:
    """Fetch air pollution telemetry for a city name."""
    cache = _get_cache()
    key = ("air_pollution", "city", city.lower().strip())
    cached = cache.get(key)
    if cached:
        logger.debug("Cache hit: air pollution for city=%r", city)
        return cached

    curr = await get_current_weather_by_city(city)
    raw = await _fetch({"lat": curr.latitude, "lon": curr.longitude}, "/air_pollution")
    result = _normalise_air_pollution(raw, curr.city, curr.country, curr.latitude, curr.longitude)
    cache.set(key, result)
    return result


async def get_air_pollution_by_coords(
    lat: float, lon: float, city: str = "Target Coordinates", country: str = ""
) -> AirPollutionResponse:
    """Fetch air pollution telemetry for geographic coordinates."""
    cache = _get_cache()
    key = ("air_pollution", "coords", round(lat, 4), round(lon, 4))
    cached = cache.get(key)
    if cached:
        logger.debug("Cache hit: air pollution for coords lat=%.4f lon=%.4f", lat, lon)
        return cached

    raw = await _fetch({"lat": lat, "lon": lon}, "/air_pollution")
    result = _normalise_air_pollution(raw, city, country, lat, lon)
    cache.set(key, result)
    return result
