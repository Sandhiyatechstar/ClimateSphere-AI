"""
AI Provider Routing and Orchestration Engine for ClimateSphere AI.

Provides an intelligent, resilient multi-provider AI pipeline:
- Groq AI: Primary provider for everyday conversational queries, greetings,
  weather synthesis, forecasts, comparisons, and simple climate explanations.
- Google Gemini: Preferred provider for complex climate science research,
  multi-dataset synthesis, tipping point dynamics, and deep reasoning.
- OpenWeather: Authoritative meteorological gateway for verified observations.

Features:
- Transparent, automatic fallback from Groq to Gemini (and Gemini to Groq where viable).
- Strict error isolation with zero unhandled exceptions leaking raw keys.
- Comprehensive observability: logging selected provider, active provider, model,
  latency in milliseconds, and fallback reasons.
"""

from dataclasses import dataclass
from enum import Enum
import logging
import re
import time
from typing import Dict, List, Optional

from app.core.config import get_settings
from app.core.exceptions import (
    GeminiAPIKeyMissingError,
    GeminiServiceError,
    GroqAPIKeyMissingError,
    GroqServiceError,
)
from app.schemas.chat import ChatHistoryMessage
from app.services.gemini.client import (
    generate_gemini_response,
    get_last_active_gemini_model,
    set_last_active_gemini_model,
)
from app.services.groq.client import generate_groq_response

logger = logging.getLogger(__name__)


class AIProvider(str, Enum):
    GROQ = "groq"
    GEMINI = "gemini"


@dataclass
class AIRoutingResult:
    """Encapsulates the result and telemetry of an AI generation request."""
    content: str
    provider: str                  # "Groq" | "Gemini"
    model: str                     # e.g., "openai/gpt-oss-20b" | "gemini-3.5-flash"
    model_identifier: str          # e.g., "Groq (openai/gpt-oss-20b)" | "Gemini (gemini-3.5-flash)"
    data_source_label: str         # e.g., "Groq AI (openai/gpt-oss-20b)" | "Google Gemini (gemini-3.5-flash)"
    duration_ms: int               # Latency in milliseconds
    primary_provider: str          # "Groq" | "Gemini"
    fallback_occurred: bool = False
    fallback_reason: Optional[str] = None


# Complex climate science keywords that require Gemini's deep synthesis and comprehensive reasoning
_COMPLEX_RESEARCH_KEYWORDS = {
    "amoc", "atlantic meridional", "circulation", "ipcc", "ar6", "ssp",
    "ssp1", "ssp2", "ssp3", "ssp4", "ssp5", "copernicus", "era5",
    "tipping point", "tipping points", "ocean heat content", "cryosphere",
    "radiative forcing", "ice sheet dynamics", "ice core", "paleoclimate",
    "climate sensitivity", "equilibrium climate sensitivity",
    "transient climate response", "carbon budget", "carbon cycle feedback",
    "thermohaline", "ocean acidification", "cmip6", "cmip5",
    "attribution study", "event attribution", "geoengineering",
    "solar radiation management", "carbon dioxide removal", "permafrost thaw",
    "methane clathrates", "borehole temperature", "climatological scenario",
}

_RESEARCH_PHRASES_REGEX = re.compile(
    r'\b(deep research|detailed scientific|mathematical model|peer-reviewed|'
    r'attribution methodology|thermodynamic equations|scenario modeling)\b',
    re.I,
)


def is_complex_research_query(prompt: str) -> bool:
    """
    Detect whether an inquiry demands complex scientific synthesis, physical equations,
    or deep Earth-system reasoning best served by Gemini.
    """
    if not prompt:
        return False

    lower = prompt.lower()
    for kw in _COMPLEX_RESEARCH_KEYWORDS:
        if re.search(r'\b' + re.escape(kw) + r'\b', lower):
            return True

    if _RESEARCH_PHRASES_REGEX.search(lower):
        return True

    return False


def select_provider(
    prompt: str,
    intent: str = "general",
    cities: Optional[List[str]] = None,
    has_images: bool = False,
) -> AIProvider:
    """
    Determine the primary AI provider for an incoming user prompt:
    1. Multimodal image analysis inquiries MUST route to Gemini (Groq LLM is text-only).
    2. Respect explicit configuration overrides ('groq' or 'gemini').
    3. Direct complex scientific research and deep Earth system reasoning to Gemini.
    4. Route everyday conversations, greetings, weather synthesis, forecasts,
       city comparisons, and simple climate explanations to Groq.
    """
    # Multimodal vision requirements strictly override to Gemini
    if has_images:
        return AIProvider.GEMINI

    settings = get_settings()
    mode = getattr(settings, "ai_provider", "auto").lower().strip()

    if mode == "groq":
        return AIProvider.GROQ
    if mode == "gemini":
        return AIProvider.GEMINI

    # Auto mode:
    if is_complex_research_query(prompt):
        return AIProvider.GEMINI

    return AIProvider.GROQ


async def route_and_generate(
    prompt: str,
    history: Optional[List[ChatHistoryMessage]] = None,
    weather_context: Optional[str] = None,
    intent: str = "general",
    cities: Optional[List[str]] = None,
    images: Optional[List[Dict[str, str]]] = None,
) -> AIRoutingResult:
    """
    Orchestrate AI response generation with intelligent provider selection and transparent fallback.

    - If inquiry contains images, routes directly to Gemini vision.
    - If primary is Groq:
        1. Checks if Groq is configured. If not, immediately routes to Gemini.
        2. Calls Groq. On authentication error, rate limit, timeout, or service error,
           transparently falls back to Gemini.
    - If primary is Gemini:
        1. Calls Gemini (with multimodal images if provided).
        2. On failure, if Groq is configured AND no images are present, attempts transparent fallback to Groq.
    - Raises error only if all viable providers fail.
    """
    settings = get_settings()
    has_images = bool(images and len(images) > 0)
    primary = select_provider(prompt, intent, cities, has_images=has_images)
    t_start = time.monotonic()

    # ─────────────────────────────────────────────────────────────────────────────
    # CASE 1: Primary provider is GROQ
    # ─────────────────────────────────────────────────────────────────────────────
    if primary == AIProvider.GROQ:
        # Check if Groq API key is present in environment
        if not settings.groq_api_key or not settings.groq_api_key.strip():
            logger.info(
                "[AI Router] Groq API key not configured; transparently routing to Gemini."
            )
            try:
                set_last_active_gemini_model(None)
                gemini_text = await generate_gemini_response(
                    prompt=prompt,
                    history=history,
                    weather_context=weather_context,
                    images=images,
                )
                duration_ms = int((time.monotonic() - t_start) * 1000)
                gemini_model = get_last_active_gemini_model() or settings.gemini_model
                logger.info(
                    "[AI Router] Gemini generated response in %d ms (model: %s).",
                    duration_ms, gemini_model,
                )
                return AIRoutingResult(
                    content=gemini_text,
                    provider="Gemini",
                    model=gemini_model,
                    model_identifier=f"Gemini ({gemini_model})",
                    data_source_label=f"Google Gemini ({gemini_model})",
                    duration_ms=duration_ms,
                    primary_provider="Groq",
                    fallback_occurred=True,
                    fallback_reason="Groq API key not configured in environment",
                )
            except Exception as exc:
                logger.error("[AI Router] Gemini also failed after unconfigured Groq key: %s", exc)
                raise

        # Groq key is present: Attempt primary generation via Groq
        try:
            groq_text, model_id = await generate_groq_response(
                prompt=prompt,
                history=history,
                weather_context=weather_context,
            )
            duration_ms = int((time.monotonic() - t_start) * 1000)
            model_name = model_id.replace("Groq (", "").rstrip(")")
            logger.info(
                "[AI Router] Groq generated response in %d ms (model: %s).",
                duration_ms, model_name,
            )
            return AIRoutingResult(
                content=groq_text,
                provider="Groq",
                model=model_name,
                model_identifier=model_id,
                data_source_label=f"Groq AI ({model_name})",
                duration_ms=duration_ms,
                primary_provider="Groq",
                fallback_occurred=False,
            )
        except (GroqServiceError, GroqAPIKeyMissingError) as exc:
            reason = exc.message if hasattr(exc, "message") else str(exc)
            logger.warning(
                "[AI Router] Groq generation failed (%s). Transparently falling back to Gemini.",
                reason,
            )
            # Transparent fallback to Gemini
            try:
                set_last_active_gemini_model(None)
                gemini_text = await generate_gemini_response(
                    prompt=prompt,
                    history=history,
                    weather_context=weather_context,
                    images=images,
                )
                duration_ms = int((time.monotonic() - t_start) * 1000)
                gemini_model = get_last_active_gemini_model() or settings.gemini_model
                logger.info(
                    "[AI Router] Gemini fallback succeeded in %d ms (model: %s).",
                    duration_ms, gemini_model,
                )
                return AIRoutingResult(
                    content=gemini_text,
                    provider="Gemini",
                    model=gemini_model,
                    model_identifier=f"Gemini ({gemini_model})",
                    data_source_label=f"Google Gemini ({gemini_model})",
                    duration_ms=duration_ms,
                    primary_provider="Groq",
                    fallback_occurred=True,
                    fallback_reason=reason,
                )
            except Exception as gemini_exc:
                logger.error(
                    "[AI Router] Both Groq (%s) and Gemini (%s) failed.",
                    reason, gemini_exc,
                )
                raise

    # ─────────────────────────────────────────────────────────────────────────────
    # CASE 2: Primary provider is GEMINI
    # ─────────────────────────────────────────────────────────────────────────────
    else:
        try:
            set_last_active_gemini_model(None)
            gemini_text = await generate_gemini_response(
                prompt=prompt,
                history=history,
                weather_context=weather_context,
                images=images,
            )
            duration_ms = int((time.monotonic() - t_start) * 1000)
            gemini_model = get_last_active_gemini_model() or settings.gemini_model
            logger.info(
                "[AI Router] Gemini primary succeeded in %d ms (model: %s, has_images=%s).",
                duration_ms, gemini_model, has_images,
            )
            return AIRoutingResult(
                content=gemini_text,
                provider="Gemini",
                model=gemini_model,
                model_identifier=f"Gemini ({gemini_model})",
                data_source_label=f"Google Gemini ({gemini_model})",
                duration_ms=duration_ms,
                primary_provider="Gemini",
                fallback_occurred=False,
            )
        except (GeminiServiceError, GeminiAPIKeyMissingError) as exc:
            reason = exc.message if hasattr(exc, "message") else str(exc)
            logger.warning(
                "[AI Router] Gemini primary failed (%s). Checking Groq fallback...",
                reason,
            )
            # If the request requires image vision, Groq text models cannot process it
            if has_images:
                logger.warning("[AI Router] Cannot fall back to Groq for multimodal vision request.")
                raise exc

            if settings.groq_api_key and settings.groq_api_key.strip():
                try:
                    groq_text, model_id = await generate_groq_response(
                        prompt=prompt,
                        history=history,
                        weather_context=weather_context,
                    )
                    duration_ms = int((time.monotonic() - t_start) * 1000)
                    model_name = model_id.replace("Groq (", "").rstrip(")")
                    logger.info(
                        "[AI Router] Groq fallback succeeded in %d ms (model: %s).",
                        duration_ms, model_name,
                    )
                    return AIRoutingResult(
                        content=groq_text,
                        provider="Groq",
                        model=model_name,
                        model_identifier=model_id,
                        data_source_label=f"Groq AI ({model_name})",
                        duration_ms=duration_ms,
                        primary_provider="Gemini",
                        fallback_occurred=True,
                        fallback_reason=reason,
                    )
                except Exception as groq_exc:
                    logger.error(
                        "[AI Router] Dual provider failure: Gemini (%s) and Groq (%s) both failed.",
                        reason, groq_exc,
                    )
                    raise exc
            else:
                raise exc
