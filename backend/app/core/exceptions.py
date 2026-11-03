"""
Centralised FastAPI exception handlers.
Converts common error conditions into consistent JSON error responses.
"""

import logging

from fastapi import Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


class WeatherServiceError(Exception):
    """Raised when the OpenWeather service returns an unexpected error."""

    def __init__(self, message: str, status_code: int = 502):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class CityNotFoundError(Exception):
    """Raised when the requested city cannot be found in the weather API."""

    def __init__(self, city: str):
        self.city = city
        super().__init__(f"City not found: {city!r}")


class APIKeyMissingError(Exception):
    """Raised when the OPENWEATHER_API_KEY is absent from the environment."""


class GeminiAPIKeyMissingError(Exception):
    """Raised when the GEMINI_API_KEY is absent from the environment."""


class GeminiServiceError(Exception):
    """Raised when the Gemini API returns an error or encounters network/timeout issues."""

    def __init__(self, message: str, status_code: int = 502, error_code: str = "gemini_service_error"):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        super().__init__(message)


class GroqAPIKeyMissingError(Exception):
    """Raised when the GROQ_API_KEY is absent from the environment."""


class GroqServiceError(Exception):
    """Raised when the Groq API returns an error or encounters network/timeout issues."""

    def __init__(self, message: str, status_code: int = 502, error_code: str = "groq_service_error"):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        super().__init__(message)


# ── Handler functions ─────────────────────────────────────────────────────────

async def weather_service_error_handler(
    request: Request, exc: WeatherServiceError
) -> JSONResponse:
    logger.error("WeatherServiceError on %s: %s", request.url, exc.message)
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": "weather_service_error",
            "message": exc.message,
        },
    )


async def city_not_found_handler(
    request: Request, exc: CityNotFoundError
) -> JSONResponse:
    logger.warning("City not found: %r", exc.city)
    return JSONResponse(
        status_code=404,
        content={
            "error": "city_not_found",
            "message": f"The city '{exc.city}' could not be found. "
                       "Please check the spelling or try coordinates instead.",
        },
    )


async def api_key_missing_handler(
    request: Request, exc: APIKeyMissingError
) -> JSONResponse:
    logger.critical("OPENWEATHER_API_KEY is not configured!")
    return JSONResponse(
        status_code=503,
        content={
            "error": "api_key_missing",
            "message": "The weather service is not configured. "
                       "Please set OPENWEATHER_API_KEY in the backend/.env file.",
        },
    )


async def gemini_api_key_missing_handler(
    request: Request, exc: GeminiAPIKeyMissingError
) -> JSONResponse:
    logger.critical("GEMINI_API_KEY is not configured!")
    return JSONResponse(
        status_code=503,
        content={
            "error": "gemini_api_key_missing",
            "message": "The AI conversational intelligence service is not configured. "
                       "Please set GEMINI_API_KEY in the backend/.env file.",
        },
    )


async def gemini_service_error_handler(
    request: Request, exc: GeminiServiceError
) -> JSONResponse:
    logger.error("GeminiServiceError on %s: %s (status %d, code %s)", request.url, exc.message, exc.status_code, exc.error_code)
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.error_code,
            "message": exc.message,
        },
    )


async def groq_api_key_missing_handler(
    request: Request, exc: GroqAPIKeyMissingError
) -> JSONResponse:
    logger.warning("GROQ_API_KEY is not configured!")
    return JSONResponse(
        status_code=503,
        content={
            "error": "groq_api_key_missing",
            "message": "The Groq AI conversational service is not configured. Please set GROQ_API_KEY in backend/.env.",
        },
    )


async def groq_service_error_handler(
    request: Request, exc: GroqServiceError
) -> JSONResponse:
    logger.error("GroqServiceError on %s: %s (status %d, code %s)", request.url, exc.message, exc.status_code, exc.error_code)
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.error_code,
            "message": exc.message,
        },
    )


class FileValidationError(Exception):
    """Raised when an uploaded file fails security, format, or size validation."""

    def __init__(self, message: str, status_code: int = 400, error_code: str = "file_validation_error"):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        super().__init__(message)


class FileProcessingError(Exception):
    """Raised when an uploaded file cannot be parsed or processed."""

    def __init__(self, message: str, status_code: int = 422, error_code: str = "file_processing_error"):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        super().__init__(message)


async def file_validation_error_handler(request: Request, exc: FileValidationError) -> JSONResponse:
    logger.warning("File validation error on %s: %s", request.url, exc.message)
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.error_code, "message": exc.message},
    )


async def file_processing_error_handler(request: Request, exc: FileProcessingError) -> JSONResponse:
    logger.warning("File processing error on %s: %s", request.url, exc.message)
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.error_code, "message": exc.message},
    )
