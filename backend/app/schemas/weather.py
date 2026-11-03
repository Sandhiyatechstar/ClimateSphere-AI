"""
Pydantic response schemas for the weather endpoints.
These define the normalised JSON structure returned to the frontend —
independent of the raw OpenWeather API shape.
"""

from datetime import datetime, timezone
from typing import List, Optional

from pydantic import BaseModel, Field


# ── Sub-models ────────────────────────────────────────────────────────────────

class WindInfo(BaseModel):
    speed_mps: float = Field(..., description="Wind speed in metres per second")
    direction_deg: Optional[int] = Field(None, description="Wind direction in degrees (meteorological)")
    gust_mps: Optional[float] = Field(None, description="Wind gust in metres per second")


class SunInfo(BaseModel):
    sunrise_utc: datetime
    sunset_utc: datetime


# ── Current weather ───────────────────────────────────────────────────────────

class CurrentWeatherResponse(BaseModel):
    # Location
    city: str
    country: str
    latitude: float
    longitude: float

    # Temperature (Kelvin from source; labelled so the frontend knows)
    temperature_k: float = Field(..., description="Temperature in Kelvin (source units)")
    feels_like_k: float = Field(..., description="Feels-like temperature in Kelvin")
    temp_min_k: Optional[float] = None
    temp_max_k: Optional[float] = None

    # Atmosphere
    humidity_pct: int = Field(..., description="Relative humidity, 0–100 %")
    pressure_hpa: int = Field(..., description="Atmospheric pressure in hPa")
    visibility_m: Optional[int] = Field(None, description="Visibility in metres")
    clouds_pct: int = Field(..., description="Cloud coverage, 0–100 %")

    # Weather condition
    description: str
    icon_code: str = Field(..., description="OpenWeather icon code, e.g. '10d'")
    condition_id: int = Field(..., description="OpenWeather condition ID")

    # Wind
    wind: WindInfo

    # Sun
    sun: SunInfo

    # Meta
    data_source: str = "OpenWeatherMap Current Weather API"
    retrieved_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    observation_time_utc: datetime


# ── Forecast slot ─────────────────────────────────────────────────────────────

class ForecastSlot(BaseModel):
    forecast_time_utc: datetime
    temperature_k: float
    feels_like_k: float
    temp_min_k: float
    temp_max_k: float
    humidity_pct: int
    pressure_hpa: int
    description: str
    icon_code: str
    condition_id: int
    wind: WindInfo
    clouds_pct: int
    rain_probability: Optional[float] = Field(
        None, description="Probability of precipitation, 0.0–1.0"
    )
    rain_volume_3h_mm: Optional[float] = Field(
        None, description="Rain volume over last 3 hours in mm"
    )


class ForecastResponse(BaseModel):
    city: str
    country: str
    latitude: float
    longitude: float
    timezone_offset_seconds: int
    slots: List[ForecastSlot]

    data_source: str = "OpenWeatherMap 5-Day / 3-Hour Forecast API"
    retrieved_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ── Health check ──────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    version: str
    service: str
    weather_api_configured: bool


# ── Air Pollution ─────────────────────────────────────────────────────────────

class AirPollutionComponents(BaseModel):
    co: float = Field(..., description="Carbon monoxide, μg/m3")
    no: Optional[float] = Field(None, description="Nitrogen monoxide, μg/m3")
    no2: float = Field(..., description="Nitrogen dioxide, μg/m3")
    o3: float = Field(..., description="Ozone, μg/m3")
    so2: float = Field(..., description="Sulphur dioxide, μg/m3")
    pm2_5: float = Field(..., description="Fine particles matter, μg/m3")
    pm10: float = Field(..., description="Coarse particulate matter, μg/m3")
    nh3: Optional[float] = Field(None, description="Ammonia, μg/m3")


class AirPollutionResponse(BaseModel):
    city: str
    country: str
    latitude: float
    longitude: float
    aqi: int = Field(..., ge=1, le=5, description="Air Quality Index: 1=Good, 2=Fair, 3=Moderate, 4=Poor, 5=Very Poor")
    aqi_label: str = Field(..., description="Textual category of AQI")
    components: AirPollutionComponents
    data_source: str = "OpenWeatherMap Air Pollution API"
    retrieved_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ── Location Comparison ───────────────────────────────────────────────────────

class WeatherComparisonResponse(BaseModel):
    location_a: CurrentWeatherResponse
    location_b: CurrentWeatherResponse
    temp_delta_c: float
    humidity_delta_pct: int
    data_source: str = "OpenWeatherMap Dual Station Comparison"
    retrieved_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
