"""
Weather router.

GET /api/v1/weather/current   – current weather by city or coordinates
GET /api/v1/weather/forecast  – 5-day / 3-hour forecast by city or coordinates
"""

import asyncio
import logging
from typing import Optional

from fastapi import APIRouter, Query, HTTPException

from app.schemas.weather import (
    AirPollutionResponse,
    CurrentWeatherResponse,
    ForecastResponse,
    WeatherComparisonResponse,
)
from app.services.weather import client as weather_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/weather", tags=["Weather"])


# ── /weather/current ──────────────────────────────────────────────────────────

@router.get(
    "/current",
    response_model=CurrentWeatherResponse,
    summary="Current weather conditions",
    description=(
        "Returns real-time weather data for a location.\n\n"
        "Supply **either** `city` **or** both `lat` + `lon`."
    ),
)
async def current_weather(
    city: Optional[str] = Query(
        default=None,
        description="City name, e.g. 'Chennai' or 'London,UK'",
        min_length=1,
        max_length=100,
    ),
    lat: Optional[float] = Query(
        default=None,
        description="Latitude (decimal degrees, -90 to 90)",
        ge=-90,
        le=90,
    ),
    lon: Optional[float] = Query(
        default=None,
        description="Longitude (decimal degrees, -180 to 180)",
        ge=-180,
        le=180,
    ),
) -> CurrentWeatherResponse:
    _validate_location_params(city, lat, lon)

    if city:
        return await weather_client.get_current_weather_by_city(city)
    return await weather_client.get_current_weather_by_coords(lat, lon)  # type: ignore[arg-type]


# ── /weather/forecast ─────────────────────────────────────────────────────────

@router.get(
    "/forecast",
    response_model=ForecastResponse,
    summary="5-day weather forecast (3-hour intervals)",
    description=(
        "Returns a 5-day forecast in 3-hour intervals for a location.\n\n"
        "Supply **either** `city` **or** both `lat` + `lon`."
    ),
)
async def weather_forecast(
    city: Optional[str] = Query(
        default=None,
        description="City name, e.g. 'Chennai' or 'London,UK'",
        min_length=1,
        max_length=100,
    ),
    lat: Optional[float] = Query(
        default=None,
        description="Latitude (decimal degrees, -90 to 90)",
        ge=-90,
        le=90,
    ),
    lon: Optional[float] = Query(
        default=None,
        description="Longitude (decimal degrees, -180 to 180)",
        ge=-180,
        le=180,
    ),
) -> ForecastResponse:
    _validate_location_params(city, lat, lon)

    if city:
        return await weather_client.get_forecast_by_city(city)
    return await weather_client.get_forecast_by_coords(lat, lon)  # type: ignore[arg-type]


# ── /weather/air-pollution ────────────────────────────────────────────────────

@router.get(
    "/air-pollution",
    response_model=AirPollutionResponse,
    summary="Real-time air pollution telemetry and AQI",
    description="Returns AQI score and gas concentrations (PM2.5, PM10, O3, NO2, SO2, CO, NH3).",
)
async def air_pollution(
    city: Optional[str] = Query(
        default=None,
        description="City name, e.g. 'Chennai' or 'London,UK'",
        min_length=1,
        max_length=100,
    ),
    lat: Optional[float] = Query(
        default=None,
        description="Latitude (decimal degrees, -90 to 90)",
        ge=-90,
        le=90,
    ),
    lon: Optional[float] = Query(
        default=None,
        description="Longitude (decimal degrees, -180 to 180)",
        ge=-180,
        le=180,
    ),
) -> AirPollutionResponse:
    _validate_location_params(city, lat, lon)

    if city:
        return await weather_client.get_air_pollution_by_city(city)
    return await weather_client.get_air_pollution_by_coords(lat, lon)  # type: ignore[arg-type]


# ── /weather/compare ──────────────────────────────────────────────────────────

@router.get(
    "/compare",
    response_model=WeatherComparisonResponse,
    summary="Dual-city meteorological comparison",
    description="Returns concurrent weather observations and differential deltas for two cities.",
)
async def compare_weather(
    city1: str = Query(..., min_length=1, max_length=100, description="Primary city name"),
    city2: str = Query(..., min_length=1, max_length=100, description="Comparison city name"),
) -> WeatherComparisonResponse:
    res1, res2 = await asyncio.gather(
        weather_client.get_current_weather_by_city(city1),
        weather_client.get_current_weather_by_city(city2),
    )
    temp_delta = round((res1.temperature_k - res2.temperature_k), 1)
    humidity_delta = res1.humidity_pct - res2.humidity_pct
    return WeatherComparisonResponse(
        location_a=res1,
        location_b=res2,
        temp_delta_c=temp_delta,
        humidity_delta_pct=humidity_delta,
    )


# ── Shared validation helper ──────────────────────────────────────────────────

def _validate_location_params(
    city: Optional[str],
    lat: Optional[float],
    lon: Optional[float],
) -> None:
    """
    Enforce that the caller supplies exactly one of:
      - `city`
      - `lat` and `lon` together
    """
    has_city = city is not None
    has_coords = lat is not None and lon is not None
    partial_coords = (lat is None) != (lon is None)  # only one of lat/lon given

    if partial_coords:
        raise HTTPException(
            status_code=422,
            detail="Both 'lat' and 'lon' must be provided together.",
        )
    if not has_city and not has_coords:
        raise HTTPException(
            status_code=422,
            detail="Provide either 'city' or both 'lat' and 'lon' as query parameters.",
        )
    if has_city and has_coords:
        raise HTTPException(
            status_code=422,
            detail="Provide either 'city' or 'lat'/'lon', not both.",
        )
