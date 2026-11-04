"""
Centralised configuration using pydantic-settings.
All values are read from environment variables or a .env file in backend/.
"""

from functools import lru_cache
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),  # loaded relative to CWD or project root
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App meta ─────────────────────────────────────────
    app_title: str = "ClimateSphere AI API"
    app_version: str = "1.0.0"
    environment: str = Field(
        default="development",
        description="Deployment environment: 'development' | 'production' | 'test'",
    )
    debug: bool = False
    log_level: str = "INFO"

    # ── Security & Safeguards ────────────────────────────
    rate_limiting_enabled: bool = Field(
        default=True,
        description="Enable or disable IP rate limiting on API endpoints",
    )
    max_request_body_bytes: int = Field(
        default=1_048_576,  # 1 MB (protects standard JSON endpoints against memory DoS)
        description="Maximum request payload body size in bytes for standard endpoints",
    )
    max_file_size_bytes: int = Field(
        default=10_485_760,  # 10 MB per attachment
        description="Maximum allowed size per uploaded file in bytes",
    )
    max_attachments_per_message: int = Field(
        default=5,
        description="Maximum number of attachments allowed per chat inquiry",
    )
    allowed_upload_extensions: List[str] = Field(
        default=[".png", ".jpg", ".jpeg", ".webp", ".pdf", ".docx", ".txt", ".csv", ".xlsx"],
        description="Permitted file extensions for user uploads",
    )

    # ── CORS ─────────────────────────────────────────────
    allowed_origins: List[str] = Field(
        default=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "https://sandhiyatechstar.github.io",
        ],
        description="Frontend origins allowed by CORS",
    )

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def _parse_origins(cls, v):
        """
        Accept JSON array, Python list, or comma-separated string from env.
        Normalizes trailing slashes and always preserves localhost origins for development.
        """
        parsed_origins: List[str] = []
        if isinstance(v, str):
            import json
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    parsed_origins = [str(o).strip().rstrip("/") for o in parsed if str(o).strip()]
            except Exception:
                pass
            if not parsed_origins:
                parsed_origins = [o.strip().rstrip("/") for o in v.split(",") if o.strip()]
        elif isinstance(v, (list, tuple)):
            parsed_origins = [str(o).strip().rstrip("/") for o in v if str(o).strip()]

        # Retain standard development origins for seamless local developer workflows
        dev_origins = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "https://sandhiyatechstar.github.io",
        ]
        for dev in dev_origins:
            if dev not in parsed_origins:
                parsed_origins.append(dev)

        return parsed_origins

    # ── OpenWeather ───────────────────────────────────────
    openweather_api_key: str = Field(
        default="",
        description="OpenWeatherMap API key — required for weather endpoints",
    )
    openweather_base_url: str = "https://api.openweathermap.org/data/2.5"

    # ── Groq AI ───────────────────────────────────────────
    groq_api_key: str = Field(
        default="",
        description="Groq API key — primary provider for fast conversational interactions",
    )
    groq_model: str = Field(
        default="openai/gpt-oss-20b",
        description="Groq model name to use for generation (default: openai/gpt-oss-20b)",
    )
    groq_timeout_seconds: float = Field(
        default=15.0,
        description="Total timeout for standard Groq API calls in seconds",
    )
    groq_research_timeout_seconds: float = Field(
        default=15.0,
        description="Timeout for Groq when processing research fallback queries in seconds",
    )
    groq_fallback_models: List[str] = Field(
        default=[
            "llama-3.3-70b-versatile",
            "llama-3.1-8b-instant",
        ],
        description="Fallback Groq models if primary model is unavailable or encounters limits",
    )
    ai_provider: str = Field(
        default="auto",
        description="AI routing mode: 'auto' | 'groq' | 'gemini'",
    )

    # ── Google Gemini ─────────────────────────────────────
    gemini_api_key: str = Field(
        default="",
        description="Google Gemini API key — required for AI chat endpoint",
    )
    gemini_model: str = Field(
        default="gemini-3.8-flash",
        description="Gemini model name to use for generation (default: gemini-3.8-flash)",
    )
    gemini_base_url: str = Field(
        default="https://generativelanguage.googleapis.com/v1beta/models",
        description="Base URL for Gemini API calls",
    )

    # ── Cache ─────────────────────────────────────────────
    cache_ttl_seconds: int = Field(
        default=300,
        description="How long (seconds) weather responses are cached in-memory",
    )
    cache_max_size: int = Field(
        default=1000,
        description="Maximum number of entries held in weather in-memory cache",
    )

    # ── HTTP client ───────────────────────────────────────
    http_timeout_seconds: float = Field(
        default=10.0,
        description="Timeout for outgoing HTTP requests to weather APIs",
    )
    gemini_timeout_seconds: float = Field(
        default=20.0,
        description="Read timeout for standard Gemini AI conversational generation (default: 20s)",
    )
    gemini_research_timeout_seconds: float = Field(
        default=25.0,
        description="Read timeout for complex scientific research questions (default: 25s)",
    )
    gemini_connect_timeout_seconds: float = Field(
        default=10.0,
        description="Connect timeout for Gemini API calls",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a singleton Settings instance."""
    return Settings()
