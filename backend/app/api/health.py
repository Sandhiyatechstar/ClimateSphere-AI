"""
Health-check router.

GET /api/v1/health
"""

from fastapi import APIRouter

from app.core.config import get_settings
from app.schemas.weather import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse, summary="Backend health check")
async def health_check() -> HealthResponse:
    """
    Returns the API status and basic configuration info.
    Use this to confirm the backend is running before making weather requests.
    """
    settings = get_settings()
    return HealthResponse(
        status="ok",
        version=settings.app_version,
        service=settings.app_title,
        weather_api_configured=bool(settings.openweather_api_key),
    )
