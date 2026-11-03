"""
ClimateSphere AI – FastAPI application entry point.
"""

from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import attachments, chat, health, weather
from app.core.config import get_settings
from app.core.exceptions import (
    APIKeyMissingError,
    CityNotFoundError,
    FileProcessingError,
    FileValidationError,
    GeminiAPIKeyMissingError,
    GeminiServiceError,
    GroqAPIKeyMissingError,
    GroqServiceError,
    WeatherServiceError,
    api_key_missing_handler,
    city_not_found_handler,
    file_processing_error_handler,
    file_validation_error_handler,
    gemini_api_key_missing_handler,
    gemini_service_error_handler,
    groq_api_key_missing_handler,
    groq_service_error_handler,
    weather_service_error_handler,
)

# ── Logging ───────────────────────────────────────────────────────────────────
settings = get_settings()
logging.basicConfig(
    level=settings.log_level.upper(),
    format="%(asctime)s  %(levelname)-8s  %(name)s – %(message)s",
)
logger = logging.getLogger(__name__)


# ── Application Lifespan ──────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    from app.services.groq.client import close_groq_client
    await close_groq_client()
    logger.info("ClimateSphere AI background resources shut down gracefully.")


# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.app_title,
    version=settings.app_version,
    description=(
        "Backend API for ClimateSphere AI – a global weather forecasting "
        "and climate research assistant.\n\n"
        "All weather data originates from **OpenWeatherMap**. "
        "Temperatures are returned in **Kelvin** (source units) so the frontend "
        "can convert to °C or °F as needed."
    ),
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ── Security & Payload Size Middleware ────────────────────────────────────────
@app.middleware("http")
async def security_and_payload_middleware(request: Request, call_next):
    # Enforce request payload size limit (protect against memory exhaustion DoS)
    content_length = request.headers.get("content-length")
    # File upload endpoint supports multi-file payloads up to configured per-file * max count
    allowed_limit = (
        getattr(settings, "max_file_size_bytes", 10_485_760) * getattr(settings, "max_attachments_per_message", 5)
        if request.url.path.endswith("/attachments/upload")
        else settings.max_request_body_bytes
    )
    if content_length and int(content_length) > allowed_limit:
        return JSONResponse(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            content={
                "error": "payload_too_large",
                "message": f"Request body exceeds maximum allowed size ({allowed_limit} bytes).",
            },
        )

    response = await call_next(request)

    # Production HTTP Security Headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=()"

    return response

# ── CORS middleware ───────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# ── Exception handlers ────────────────────────────────────────────────────────
app.add_exception_handler(WeatherServiceError, weather_service_error_handler)          # type: ignore[arg-type]
app.add_exception_handler(CityNotFoundError, city_not_found_handler)                   # type: ignore[arg-type]
app.add_exception_handler(APIKeyMissingError, api_key_missing_handler)                 # type: ignore[arg-type]
app.add_exception_handler(GeminiAPIKeyMissingError, gemini_api_key_missing_handler)   # type: ignore[arg-type]
app.add_exception_handler(GeminiServiceError, gemini_service_error_handler)           # type: ignore[arg-type]
app.add_exception_handler(GroqAPIKeyMissingError, groq_api_key_missing_handler)       # type: ignore[arg-type]
app.add_exception_handler(GroqServiceError, groq_service_error_handler)               # type: ignore[arg-type]
app.add_exception_handler(FileValidationError, file_validation_error_handler)         # type: ignore[arg-type]
app.add_exception_handler(FileProcessingError, file_processing_error_handler)         # type: ignore[arg-type]

# Global unhandled exception handler: sanitize and never leak internal stack traces or paths
@app.exception_handler(Exception)
async def global_unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled server exception on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "internal_server_error",
            "message": "An unexpected internal server error occurred. Please try again.",
        },
    )

# ── Routers ───────────────────────────────────────────────────────────────────
API_PREFIX = "/api/v1"

app.include_router(health.router, prefix=API_PREFIX)
app.include_router(weather.router, prefix=API_PREFIX)
app.include_router(chat.router, prefix=API_PREFIX)
app.include_router(attachments.router, prefix=API_PREFIX)

# ── Root redirect info ────────────────────────────────────────────────────────
@app.get("/", include_in_schema=False)
async def root():
    return {
        "service": settings.app_title,
        "version": settings.app_version,
        "docs": "/api/docs",
        "health": "/api/v1/health",
    }


logger.info("%s v%s started -- CORS origins: %s",
            settings.app_title, settings.app_version, settings.allowed_origins)
