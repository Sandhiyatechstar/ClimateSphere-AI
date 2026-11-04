"""
Chat endpoint integrating Google Gemini AI and OpenWeather real-time telemetry.
Supports multi-turn context resolution, follow-up inquiries, and multi-location comparisons.
"""

import asyncio
import logging
import re
from typing import List, Optional, Tuple

from fastapi import APIRouter, Request, status

from app.core.config import get_settings
from app.core.exceptions import (
    APIKeyMissingError,
    CityNotFoundError,
    GeminiAPIKeyMissingError,
    GeminiServiceError,
    GroqAPIKeyMissingError,
    GroqServiceError,
)
from app.schemas.chat import ChatHistoryMessage, ChatRequest, ChatResponse
from app.schemas.weather import CurrentWeatherResponse, ForecastResponse
from app.services.ai.router import route_and_generate
from app.services.gemini.client import generate_gemini_response
from app.services.weather.client import (
    get_current_weather_by_city,
    get_forecast_by_city,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["AI Chat"])

# Known weather trigger words
WEATHER_KEYWORDS = {
    "weather", "forecast", "temperature", "temp", "rain", "raining", "snow",
    "snowing", "wind", "windy", "humidity", "humid", "pressure", "clouds",
    "cloudy", "sunny", "precipitation", "storm", "cyclone", "typhoon", "monsoon",
    "hot", "cold", "warm", "warmer", "cooler", "colder", "hotter", "chill", "chilly",
    "muggy", "overcast", "breeze", "umbrella", "raincoat", "jacket", "drizzle",
    "showers", "thunderstorm", "hail", "heat", "heatwave", "heat index", "feels like",
    "barometric", "dew point",
}

FORECAST_KEYWORDS = {
    "forecast", "tomorrow", "tomorrow's", "tomorrows", "next 5 days", "5-day", "5 day",
    "five-day", "upcoming", "this week", "next week", "weekend", "outlook", "future",
    "will it rain", "chance of rain", "rain chance", "is it going to rain", "umbrella",
    "getting warmer", "getting colder", "getting hotter", "warming up", "cooling down",
    "next 24 hours", "next 48 hours", "hourly", "extended forecast", "weekly forecast",
}

COMPARISON_KEYWORDS = {
    "compare", "comparison", "versus", "vs", "difference between",
    "how does it compare", "compare it with", "compare with", "compare to",
    "how about", "what about",
}

_STOP_WORDS = {
    "today", "tomorrow", "now", "tonight", "weekend", "this week", "next week",
    "please", "there", "here", "it", "that", "weather", "forecast", "temperature",
    "climate", "city", "place", "conditions", "current", "me", "more", "us",
    "them", "this", "something", "anything", "everything", "general", "future",
    "morning", "afternoon", "evening", "night", "detail", "details",
}

# Common expressions, conversational descriptors, and quality modifiers to reject from city extraction
_COMMON_EXPRESSION_TERMS = {
    "simple terms", "simple words", "simple language", "plain english", "plain terms",
    "layman terms", "laymans terms", "layman's terms", "layman language", "easy terms",
    "easy words", "brief", "briefly", "shortly", "in short", "summary", "summarize",
    "detail", "details", "in detail", "in depth", "depth", "depths", "deep dive",
    "general", "general terms", "high level", "overview", "scratch", "beginners",
    "for beginners", "kids", "children", "students", "laypeople", "anyone", "everyone",
    "example", "examples", "instance", "fact", "facts", "truth", "reality", "perspective",
    "context", "science", "physics", "nature", "history", "future", "past", "earth",
    "world", "globe", "concept", "theory", "mechanism", "principle", "reason", "reasons",
    "cause", "causes", "effect", "effects", "impact", "impacts", "consequence",
    "consequences", "action", "actions", "solution", "solutions", "effort", "efforts",
    "terms", "words", "simple", "easy", "plain", "coastal areas", "tropical areas",
    "urban areas", "rural areas", "coastal regions", "polar regions", "mountain regions",
    "high pressure", "low pressure", "severe weather", "extreme weather", "amoc stability",
    "latest findings", "amoc", "atlantic meridional overturning circulation",
}

# Words that should never form part of a valid city name
_INVALID_CITY_WORDS = {
    "simple", "terms", "plain", "english", "detail", "details", "depth", "depths",
    "brief", "short", "general", "high", "level", "summary", "scratch", "layman",
    "laymans", "layperson", "beginner", "beginners", "child", "children", "kid",
    "kids", "anyone", "everyone", "someone", "people", "students", "explain",
    "explanation", "definition", "overview", "basics", "fundamentals", "concept",
    "theory", "mechanism", "fact", "facts", "truth", "reality", "science",
    "physics", "nature", "history", "future", "past", "warming", "cooling",
    "effect", "effects", "cause", "causes", "reason", "reasons", "impact",
    "impacts", "change", "changes", "crisis", "action", "solution", "solutions",
    "world", "globe", "earth", "atmosphere", "stratosphere", "troposphere",
    "ocean", "oceans", "sea", "seas", "land", "space", "universe", "how",
    "why", "what", "where", "when", "who", "which", "tell", "describe",
    "discuss", "understand", "mean", "meaning", "define", "findings", "finding",
    "stability", "amoc", "circulation", "layer", "cycle", "forcing",
}

# Known non-city scientific terms to blacklist from city extraction
_NON_CITY_TERMS = {
    "the coriolis effect", "coriolis effect", "greenhouse effect", "greenhouse gases",
    "global warming", "climate change", "carbon dioxide", "ozone layer", "jet stream",
    "trade winds", "sea breeze", "land breeze", "monsoon", "atmosphere", "troposphere",
    "stratosphere", "el nino", "la nina", "polar vortex", "heat dome", "dew point",
    "ocean currents", "carbon cycle", "water cycle", "albedo", "solar radiation",
    "radiative forcing", "thermohaline circulation", "photosynthesis", "acid rain",
    "relative humidity", "atmospheric pressure", "barometric pressure", "details",
    "amoc", "atlantic meridional overturning circulation", "tipping point", "tipping points",
    "amoc stability", "carbon footprint", "sea level rise", "ocean acidification",
}

_BOUNDARY_WORDS = {
    "is", "was", "are", "were", "has", "have", "had", "under", "with", "where",
    "in", "at", "for", "to", "of", "from", "today", "tomorrow", "now", "right",
    "currently", "please", "this", "next", "tonight", "weekend", "weather",
    "forecast", "temperature", "temp", "climate", "over", "during", "and", "or",
    "but", "while", "as", "by", "on", "about", "which", "that", "so", "morning",
    "afternoon", "evening", "night", "versus", "vs", "simple", "terms", "plain",
    "english", "detail", "details", "depth", "brief", "short", "general", "scratch",
    "kids", "children", "beginners", "layman", "laymans", "anyone", "everyone",
    "someone", "explain", "why", "how", "what", "where", "when", "who", "which",
    "tell", "describe", "understand", "world", "globe", "earth", "warming",
    "cooling", "effect", "effects", "cause", "causes", "science", "physics", "nature",
}

# Distinct climate science concepts that must be routed to climate explanation rather than weather
_CLIMATE_EXPLANATION_TOPICS = {
    "global warming", "climate change", "greenhouse effect", "greenhouse gas",
    "greenhouse gases", "carbon emissions", "carbon footprint", "carbon cycle",
    "carbon dioxide", "deforestation", "ocean acidification", "renewable energy",
    "fossil fuels", "albedo", "solar radiation", "ozone layer", "ozone depletion",
    "sea level rise", "polar ice", "glacier melt", "permafrost", "permafrost thaw",
    "amoc", "atlantic meridional", "circulation", "thermohaline",
    "tipping point", "tipping points", "el nino", "la nina", "enso",
    "paris agreement", "ipcc", "ar6", "radiative forcing", "climate sensitivity",
    "transient climate response", "carbon budget", "geoengineering",
    "solar radiation management", "extreme weather trends", "paleoclimate",
}


def _is_climate_or_general_inquiry(text: str) -> bool:
    """Detect whether a query is primarily a conceptual climate science or Earth-system inquiry."""
    lower = text.lower()
    for topic in _CLIMATE_EXPLANATION_TOPICS:
        if re.search(r'\b' + re.escape(topic) + r'\b', lower):
            return True
    return False


def _clean_city_candidate(candidate: str) -> Optional[str]:
    """Strip noise words, punctuation, and markdown from a matched city candidate and validate it."""
    if not candidate:
        return None
    # Strip markdown bold/italics/backticks
    candidate = re.sub(r'[*_`]', '', candidate)
    # Remove leading phrases like 'the weather in', 'weather in', 'weather of', 'forecast for', etc.
    candidate = re.sub(
        r'^(?:the\s+)?(?:weather|forecast|temperature|temp|climate|conditions)\s+(?:in|for|at|of)\s+',
        '', candidate, flags=re.I
    )
    # Remove leading prepositions/articles/conjunctions
    candidate = re.sub(r'^(?:in|for|at|of|the|a|an|to|with|and|versus|vs|between|about)\s+', '', candidate, flags=re.I)
    # Strip trailing country code (e.g. ", IN", ", US", ", India")
    candidate = re.sub(r',\s*[a-zA-Z]{2,15}$', '', candidate)
    # Strip 2-letter state/country suffix if attached with space (e.g. "Chennai IN", "London UK")
    candidate = re.sub(r'\s+[a-zA-Z]{2}$', '', candidate)
    # Remove trailing common stop / time / weather / verb noise words
    candidate = re.sub(
        r'\s+\b(is|was|are|has|have|had|with|and|in|at|for|to|of|from|today|tomorrow|now|right|currently|please|this|next|tonight|weekend|weather|forecast|temperature|temp|climate|over|during)\b.*$',
        '', candidate, flags=re.I
    ).strip()
    # Strip residual punctuation and whitespace
    candidate = candidate.strip(' .,?!:;()[]')

    if not candidate or len(candidate) < 2:
        return None
    lower_c = candidate.lower()
    # Reject if it's in stopwords, weather keywords, non-city scientific terms, or common expressions
    if (
        lower_c in _STOP_WORDS
        or lower_c in WEATHER_KEYWORDS
        or lower_c in _NON_CITY_TERMS
        or lower_c in _COMMON_EXPRESSION_TERMS
    ):
        return None

    # Reject if any individual token is an invalid city word (e.g. "simple", "terms", "explain", "causes")
    candidate_tokens = lower_c.split()
    if any(tok in _INVALID_CITY_WORDS for tok in candidate_tokens):
        return None

    # Reject if too many words (likely a full phrase)
    if len(candidate_tokens) > 3:
        return None
    # Reject if it contains digits
    if re.search(r'\d', candidate):
        return None
    return candidate.title()


def _extract_cities_from_text(text: str) -> List[str]:
    """Extract ordered unique valid city names mentioned in the text."""
    cities: List[str] = []

    # 1. Dual-city comparison patterns (highest priority)
    compare_patterns = [
        r'(?:compare|difference\s+between)\s+(?:the\s+)?(?:weather|forecast|temperature|temp|conditions)?\s*(?:in|for|of|between)?\s*([a-zA-Z\s.-]+?)\s+(?:and|with|versus|vs|to)\s+(?:the\s+)?(?:weather|forecast|temperature|temp|conditions)?\s*(?:in|for|of)?\s*([a-zA-Z\s.-]+?)(?:\?|$|\.|\,)',
        r'([a-zA-Z\s.-]+?)\s+(?:versus|vs)\s+([a-zA-Z\s.-]+?)(?:\?|$|\.|\,)',
    ]
    for pat in compare_patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            c1 = _clean_city_candidate(m.group(1))
            c2 = _clean_city_candidate(m.group(2))
            if c1 and c2 and c1.lower() != c2.lower():
                return [c1, c2]

    # 2. Markdown or explicit location markers
    labeled_patterns = [
        r'for\s+\*\*([a-zA-Z\s.-]+?)(?:,\s*[a-zA-Z]{2,})?\*\*',
        r'in\s+\*\*([a-zA-Z\s.-]+?)(?:,\s*[a-zA-Z]{2,})?\*\*',
        r'Location:\s*([a-zA-Z\s.-]+?)(?:,|$)',
        r'###\s+.*?(?:in|for)\s+([a-zA-Z\s.-]+?)(?:,|$|\n)',
        r'(?:compare\s+(?:it\s+)?(?:with|to)|compare\s+to|how\s+about|what\s+about)\s+([a-zA-Z\s.-]+?)(?:\?|$|\.|\,)',
        r'([a-zA-Z\s.-]{2,30}?)\s+(?:weather|forecast|temperature|temp)(?:\?|$|\.|\,)',
    ]
    for pat in labeled_patterns:
        for m in re.finditer(pat, text, re.IGNORECASE):
            c = _clean_city_candidate(m.group(1))
            if c and c not in cities:
                cities.append(c)

    # 3. Prepositional extraction with boundary token detection
    for m in re.finditer(r'\b(?:in|for|at|around|of)\s+([a-zA-Z\s.,\'-]+)', text, re.IGNORECASE):
        after = m.group(1).strip()
        words = re.findall(r'[a-zA-Z]+', after)
        city_tokens = []
        for w in words:
            if w.lower() in _BOUNDARY_WORDS or w.lower() in _INVALID_CITY_WORDS:
                break
            city_tokens.append(w)
            if len(city_tokens) >= 3:
                break
        if city_tokens:
            cand = _clean_city_candidate(' '.join(city_tokens))
            if cand and cand not in cities:
                cities.append(cand)

    return cities


def _extract_last_weather_city_from_history(history: Optional[List[ChatHistoryMessage]]) -> Optional[str]:
    """
    Search conversation history for the most recently referenced valid weather city.
    Prioritizes user queries to avoid matching incidental geographical words in assistant replies.
    """
    if not history:
        return None

    # Step 1: Scan recent user messages in reverse chronological order
    for msg in reversed(history):
        if msg.role.lower() in ("user", "human"):
            cities = _extract_cities_from_text(msg.content)
            if cities:
                return cities[0]

    # Step 2: Scan assistant messages for explicit telemetry location markers
    for msg in reversed(history):
        if msg.role.lower() in ("assistant", "model", "bot"):
            # Match "Location: CityName, Country"
            m = re.search(r'Location:\s*([a-zA-Z\s.-]+?)(?:,|$|\n)', msg.content, re.IGNORECASE)
            if m:
                cand = _clean_city_candidate(m.group(1))
                if cand:
                    return cand
            # Match "weather in CityName"
            m2 = re.search(r'\bweather in\s+([a-zA-Z\s.-]+?)(?:,|\sis|\swas|\scurrently|\.|\?|$)', msg.content, re.IGNORECASE)
            if m2:
                cand = _clean_city_candidate(m2.group(1))
                if cand:
                    return cand

    return None


def _resolve_query_context(
    prompt: str,
    history: Optional[List[ChatHistoryMessage]] = None,
    explicit_city: Optional[str] = None,
) -> Tuple[List[str], str]:
    """
    Resolve target cities and intent ('current' | 'forecast' | 'compare' | 'weather_missing_location' | 'none')
    from prompt, conversation history, and optional explicit parameter.
    """
    if explicit_city and explicit_city.strip():
        cleaned = _clean_city_candidate(explicit_city.strip()) or explicit_city.strip()
        intent = "forecast" if any(w in prompt.lower() for w in FORECAST_KEYWORDS) else "current"
        return [cleaned], intent

    text = prompt.strip()
    lower = text.lower()

    # Detect comparison trigger
    is_comparison = any(
        re.search(r'\b' + re.escape(w) + r'\b', lower)
        for w in ["compare", "comparison", "versus", "vs", "difference between"]
    )
    is_forecast = any(w in lower for w in FORECAST_KEYWORDS)
    is_weather = is_forecast or any(re.search(r'\b' + re.escape(w) + r'\b', lower) for w in WEATHER_KEYWORDS)
    is_climate_topic = _is_climate_or_general_inquiry(text)

    # 1. Climate science / explanation questions without explicit weather/forecast request
    # e.g., "Explain global warming in simple terms", "What causes the greenhouse effect?", "AMOC stability"
    if is_climate_topic and not is_comparison:
        # Check if user specifically asks for local weather in a city despite mentioning climate
        cities_in_prompt = _extract_cities_from_text(text)
        has_explicit_weather_request = any(
            w in lower for w in ["current weather", "forecast", "is it raining", "temperature today"]
        )
        if not (cities_in_prompt and has_explicit_weather_request):
            return [], "none"

    # 2. Extract city candidates from the current prompt
    cities = _extract_cities_from_text(text)

    # Case A: Two cities mentioned directly in prompt for comparison
    if len(cities) >= 2:
        return cities[:2], "compare"

    # Case B: Comparison requested with one city in prompt + reference to prior location in history
    if is_comparison and len(cities) == 1 and history:
        new_city = cities[0]
        prev_city = _extract_last_weather_city_from_history(history)
        if prev_city and prev_city.lower() != new_city.lower():
            return [prev_city, new_city], "compare"

    # Case C: Single city in current prompt
    if len(cities) == 1:
        # Only assign weather/forecast intent if the query is asking about weather/forecast/conditions/temperature
        if is_weather or any(w in lower for w in ["in", "for", "at", "current", "conditions", "how is"]):
            intent = "forecast" if is_forecast else "current"
            return [cities[0]], intent
        return [], "none"

    # Case D: No city in prompt, but weather or forecast follow-up inquiry
    # e.g. "What about tomorrow?", "What about humidity?", "Will it rain?", "Is it windy?"
    if is_weather:
        prev_city = _extract_last_weather_city_from_history(history)
        if prev_city:
            intent = "forecast" if is_forecast else "current"
            return [prev_city], intent
        else:
            # Weather inquiry with NO city in prompt and NO city in history:
            # Must ask user for the location instead of guessing or failing
            return [], "weather_missing_location"

    # Case E: General inquiry, elaboration, or non-weather inquiry
    return [], "none"


def _extract_city_and_intent(
    prompt: str,
    history: Optional[List[ChatHistoryMessage]] = None,
    explicit_city: Optional[str] = None,
) -> Tuple[Optional[str], str]:
    """
    Compatibility wrapper returning (city: Optional[str], intent: str).
    """
    cities, intent = _resolve_query_context(prompt, history, explicit_city)
    return (cities[0] if cities else None), intent


def _format_current_context(w: CurrentWeatherResponse) -> str:
    """Format CurrentWeatherResponse into verified context text for Gemini."""
    temp_c = round(w.temperature_k - 273.15, 1)
    feels_c = round(w.feels_like_k - 273.15, 1)
    temp_f = round(temp_c * 9 / 5 + 32, 1)
    feels_f = round(feels_c * 9 / 5 + 32, 1)
    wind_kmh = round(w.wind.speed_mps * 3.6, 1)

    return (
        f"Location: {w.city}, {w.country} (Lat: {w.latitude}, Lon: {w.longitude})\n"
        f"Observation Time: {w.observation_time_utc.isoformat()}\n"
        f"Atmospheric Condition: {w.description.title()} (Icon: {w.icon_code})\n"
        f"Temperature: {temp_c}°C ({temp_f}°F) [Raw: {w.temperature_k} K]\n"
        f"Perceived (Feels Like): {feels_c}°C ({feels_f}°F)\n"
        f"Relative Humidity: {w.humidity_pct}%\n"
        f"Atmospheric Pressure: {w.pressure_hpa} hPa\n"
        f"Wind: {w.wind.speed_mps} m/s ({wind_kmh} km/h), Direction: {w.wind.direction_deg or 'N/A'}°\n"
        f"Cloud Coverage: {w.clouds_pct}%\n"
        f"Data Source: {w.data_source}\n"
        f"Retrieval Timestamp: {w.retrieved_at.isoformat()}"
    )


def _format_forecast_context(f: ForecastResponse) -> str:
    """Format ForecastResponse into verified context text for Gemini."""
    from collections import defaultdict

    lines = [
        f"Location: {f.city}, {f.country} (Lat: {f.latitude}, Lon: {f.longitude})",
        f"Forecast Coverage: 5-Day / 3-Hour Interval Synoptic Model",
        f"Data Source: {f.data_source}",
        f"Retrieval Timestamp: {f.retrieved_at.isoformat()}",
        "",
        "Upcoming 48-Hour Chronological Intervals:",
    ]
    for slot in f.slots[:16]:
        temp_c = round(slot.temperature_k - 273.15, 1)
        feels_c = round(slot.feels_like_k - 273.15, 1)
        rain_prob = f"{round(slot.rain_probability * 100)}%" if slot.rain_probability is not None else "0%"
        rain_vol = f", Rain Vol: {slot.rain_volume_3h_mm} mm" if slot.rain_volume_3h_mm else ""
        wind_kmh = round(slot.wind.speed_mps * 3.6, 1)
        lines.append(
            f" - {slot.forecast_time_utc.strftime('%a %d %b %H:%M UTC')}: "
            f"{temp_c}°C (feels {feels_c}°C), {slot.description.title()}, "
            f"Humidity: {slot.humidity_pct}%, Pressure: {slot.pressure_hpa} hPa, "
            f"Wind: {wind_kmh} km/h, Rain Prob: {rain_prob}{rain_vol}"
        )

    # Compute daily synoptic summaries across all slots
    daily_groups = defaultdict(list)
    for slot in f.slots:
        day_key = slot.forecast_time_utc.strftime('%a %d %b')
        daily_groups[day_key].append(slot)

    if daily_groups:
        lines.append("")
        lines.append("Daily 5-Day Synoptic Overview (Use for multi-day questions, temperature trends, and weekend planning):")
        for day_label, d_slots in daily_groups.items():
            min_t = min(round(s.temperature_k - 273.15, 1) for s in d_slots)
            max_t = max(round(s.temperature_k - 273.15, 1) for s in d_slots)
            max_pop = max((s.rain_probability or 0.0) for s in d_slots)
            descriptions = [s.description.title() for s in d_slots]
            dominant_desc = max(set(descriptions), key=descriptions.count)
            avg_hum = round(sum(s.humidity_pct for s in d_slots) / len(d_slots))
            max_wind = max(round(s.wind.speed_mps * 3.6, 1) for s in d_slots)
            lines.append(
                f" - {day_label}: Temp Range {min_t}°C to {max_t}°C, "
                f"Condition: {dominant_desc}, Max Rain Prob: {round(max_pop * 100)}%, "
                f"Avg Humidity: {avg_hum}%, Peak Wind: {max_wind} km/h"
            )

    return "\n".join(lines)


def _format_comparison_context(w1: CurrentWeatherResponse, w2: CurrentWeatherResponse) -> str:
    """Format dual CurrentWeatherResponse objects into comparative context text for Gemini."""
    return (
        f"COMPARATIVE METEOROLOGICAL TELEMETRY FROM OPENWEATHER GATEWAY:\n\n"
        f"[LOCATION 1: {w1.city}, {w1.country}]:\n"
        f"{_format_current_context(w1)}\n\n"
        f"[LOCATION 2: {w2.city}, {w2.country}]:\n"
        f"{_format_current_context(w2)}\n\n"
        f"[COMPARISON INSTRUCTION]:\n"
        f"Compare current atmospheric conditions between {w1.city}, {w1.country} and {w2.city}, {w2.country}. "
        f"Include a side-by-side comparative table of their observed physical measurements "
        f"(Temperature in °C/°F, Perceived Feels-Like, Humidity, Pressure, Wind Speed, Cloud Cover). "
        f"Explain the atmospheric and geographic factors (such as latitude, maritime vs. continental influence, "
        f"elevation, or synoptic systems) contributing to the observed differences. "
        f"Strictly use the verified measurements above; do not fabricate values."
    )


def _build_weather_fallback_content(
    weather_telemetry: Optional[CurrentWeatherResponse],
    forecast_telemetry: Optional[ForecastResponse],
    notice: str,
) -> str:
    """
    Format verified weather telemetry into concise, conversational markdown when Gemini is temporarily unavailable.
    Ensures real OpenWeather data is delivered immediately without failing the request.
    """
    if weather_telemetry:
        w = weather_telemetry
        temp_c = round(w.temperature_k - 273.15, 1)
        feels_c = round(w.feels_like_k - 273.15, 1)
        wind_kmh = round(w.wind.speed_mps * 3.6, 1)

        # Dynamic weather emoji based on conditions
        desc_lower = w.description.lower()
        icon = "☀️"
        if "rain" in desc_lower or "drizzle" in desc_lower:
            icon = "🌧️"
        elif "thunder" in desc_lower or "storm" in desc_lower:
            icon = "⛈️"
        elif "snow" in desc_lower:
            icon = "❄️"
        elif "cloud" in desc_lower or "overcast" in desc_lower:
            icon = "☁️"
        elif "fog" in desc_lower or "mist" in desc_lower or "haze" in desc_lower:
            icon = "🌫️"

        # Contextual, helpful advisory
        advisory = ""
        if "rain" in desc_lower:
            advisory = "It might be a good idea to carry an umbrella if you are heading out."
        elif temp_c >= 35:
            advisory = "It is quite hot and sunny outside, so stay hydrated and avoid prolonged sun exposure."
        elif temp_c <= 10:
            advisory = "It feels chilly outside, so remember to bundle up warmly."
        elif w.humidity_pct >= 80:
            advisory = "It may feel somewhat warm and humid outside."
        else:
            advisory = f"Weather conditions in {w.city} are generally pleasant."

        return (
            f"**The weather in {w.city} is currently {desc_lower}. {icon}**\n\n"
            f"- Temperature: {temp_c}°C\n"
            f"- Feels like: {feels_c}°C\n"
            f"- Humidity: {w.humidity_pct}%\n"
            f"- Wind: {wind_kmh} km/h\n\n"
            f"{advisory}\n\n"
            f"> *Note: {notice}*"
        )

    if forecast_telemetry:
        f = forecast_telemetry
        lines = [
            f"**Upcoming 5-day forecast for {f.city}, {f.country}: 📅**\n",
        ]
        for slot in f.slots[:5]:
            temp_c = round(slot.temperature_k - 273.15, 1)
            pop = f"{round(slot.rain_probability * 100)}%" if slot.rain_probability is not None else "0%"
            lines.append(
                f"- **{slot.forecast_time_utc.strftime('%a %d %b %H:%M UTC')}**: "
                f"{temp_c}°C, {slot.description.lower()} (Rain chance: {pop}, Wind: {round(slot.wind.speed_mps * 3.6, 1)} km/h)"
            )
        lines.append(f"\n> *Note: {notice}*")
        return "\n".join(lines)

    return f"Weather telemetry was retrieved, but could not be formatted. {notice}"


def _build_comparison_fallback_content(
    w1: CurrentWeatherResponse,
    w2: CurrentWeatherResponse,
    notice: str,
) -> str:
    """Format verified dual weather telemetry into concise comparative markdown when Gemini is unavailable."""
    temp1_c = round(w1.temperature_k - 273.15, 1)
    feels1_c = round(w1.feels_like_k - 273.15, 1)
    temp1_f = round(temp1_c * 9 / 5 + 32, 1)
    feels1_f = round(feels1_c * 9 / 5 + 32, 1)
    wind1_kmh = round(w1.wind.speed_mps * 3.6, 1)

    temp2_c = round(w2.temperature_k - 273.15, 1)
    feels2_c = round(w2.feels_like_k - 273.15, 1)
    temp2_f = round(temp2_c * 9 / 5 + 32, 1)
    feels2_f = round(feels2_c * 9 / 5 + 32, 1)
    wind2_kmh = round(w2.wind.speed_mps * 3.6, 1)

    return (
        f"**Real-Time Weather Comparison: {w1.city} vs {w2.city} ⚖️**\n\n"
        f"Currently, **{w1.city}** is experiencing {w1.description.lower()} at **{temp1_c}°C** ({temp1_f}°F, feels like {feels1_c}°C), "
        f"while **{w2.city}** has {w2.description.lower()} at **{temp2_c}°C** ({temp2_f}°F, feels like {feels2_c}°C).\n\n"
        f"| Metric | {w1.city}, {w1.country} | {w2.city}, {w2.country} |\n"
        f"|:---|:---|:---|\n"
        f"| Condition | {w1.description.title()} | {w2.description.title()} |\n"
        f"| Temperature | {temp1_c}°C ({temp1_f}°F) | {temp2_c}°C ({temp2_f}°F) |\n"
        f"| Perceived (Feels Like) | {feels1_c}°C ({feels1_f}°F) | {feels2_c}°C ({feels2_f}°F) |\n"
        f"| Relative Humidity | {w1.humidity_pct}% | {w2.humidity_pct}% |\n"
        f"| Wind Speed | {wind1_kmh} km/h | {wind2_kmh} km/h |\n\n"
        f"> *Note: {notice}*"
    )


@router.post(
    "",
    response_model=ChatResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate AI conversational response with verified weather grounding",
)
async def chat_interaction(request: ChatRequest, raw_req: Request = None) -> ChatResponse:
    """
    Receives user prompt and optional conversation history.
    Resolves target cities and intent across single-city, multi-city comparisons,
    and multi-turn contextual follow-ups.
    """
    if raw_req is not None:
        from app.core.rate_limit import chat_limiter
        chat_limiter.check_rate_limit(raw_req)

    settings = get_settings()
    cities, intent = _resolve_query_context(
        request.prompt, request.history, request.city
    )

    weather_context: Optional[str] = None
    weather_telemetry: Optional[CurrentWeatherResponse] = None
    second_weather_telemetry: Optional[CurrentWeatherResponse] = None
    forecast_telemetry: Optional[ForecastResponse] = None
    data_sources: List[str] = []
    follow_ups: List[str] = []

    # Case 0: Genuine weather or forecast inquiry but location is completely missing from prompt & history
    if intent == "weather_missing_location":
        is_forecast = any(w in request.prompt.lower() for w in FORECAST_KEYWORDS)
        inquiry_type = "forecast" if is_forecast else "weather"
        missing_location_msg = (
            f"Which city or location would you like the {inquiry_type} for? "
            f"Please mention the city name (for example, **Chennai**, **London**, or **New York**)."
        )
        return ChatResponse(
            content=missing_location_msg,
            data_sources=["ClimateSphere Meteorological Gateway"],
            suggested_follow_ups=[
                "Weather in Chennai",
                "Forecast for London",
                "Temperature in Tokyo",
            ],
            model_identifier="ClimateSphere AI Gateway",
            weather_telemetry=None,
            forecast_telemetry=None,
        )

    # Case 1: Comparison between two cities
    if intent == "compare" and len(cities) >= 2:
        c1, c2 = cities[0], cities[1]
        try:
            res1, res2 = await asyncio.gather(
                get_current_weather_by_city(c1),
                get_current_weather_by_city(c2),
                return_exceptions=True,
            )
            ok1 = isinstance(res1, CurrentWeatherResponse)
            ok2 = isinstance(res2, CurrentWeatherResponse)

            if ok1 and ok2:
                weather_telemetry = res1
                second_weather_telemetry = res2
                weather_context = _format_comparison_context(res1, res2)
                obs1_str = res1.observation_time_utc.strftime('%Y-%m-%d %H:%M UTC')
                obs2_str = res2.observation_time_utc.strftime('%Y-%m-%d %H:%M UTC')
                data_sources = [
                    f"OpenWeatherMap Current Weather API ({res1.city}: Observed {obs1_str})",
                    f"OpenWeatherMap Current Weather API ({res2.city}: Observed {obs2_str})",
                    f"Google Gemini ({settings.gemini_model})",
                ]
                follow_ups = [
                    f"What is the 5-day forecast for {res1.city}?",
                    f"What is the 5-day forecast for {res2.city}?",
                    f"Why do temperature and humidity differ between {res1.city} and {res2.city}?",
                ]
            elif ok1 and not ok2:
                weather_telemetry = res1
                weather_context = (
                    f"LOCATION 1 OBSERVATIONS:\n{_format_current_context(res1)}\n\n"
                    f"NOTE: The second city '{c2}' could not be located in OpenWeather's registry. "
                    f"Provide {res1.city}'s observed data and explain that '{c2}' was not found."
                )
                obs1_str = res1.observation_time_utc.strftime('%Y-%m-%d %H:%M UTC')
                data_sources = [
                    f"OpenWeatherMap Current Weather API ({res1.city}: Observed {obs1_str})",
                    f"Google Gemini ({settings.gemini_model})",
                ]
                follow_ups = [f"What is the 5-day forecast for {res1.city}?", "Compare with London", "Compare with Tokyo"]
            elif ok2 and not ok1:
                weather_telemetry = res2
                weather_context = (
                    f"LOCATION 1 OBSERVATIONS:\n{_format_current_context(res2)}\n\n"
                    f"NOTE: The first city '{c1}' could not be located in OpenWeather's registry. "
                    f"Provide {res2.city}'s observed data and explain that '{c1}' was not found."
                )
                obs2_str = res2.observation_time_utc.strftime('%Y-%m-%d %H:%M UTC')
                data_sources = [
                    f"OpenWeatherMap Current Weather API ({res2.city}: Observed {obs2_str})",
                    f"Google Gemini ({settings.gemini_model})",
                ]
                follow_ups = [f"What is the 5-day forecast for {res2.city}?", "Compare with London", "Compare with Tokyo"]
            else:
                weather_context = (
                    f"NOTE: Neither '{c1}' nor '{c2}' could be located in OpenWeather's registry. "
                    f"Inform the user clearly and offer general climatological insights."
                )
                data_sources = [f"Google Gemini ({settings.gemini_model})"]
        except APIKeyMissingError:
            weather_context = (
                "NOTE: The OpenWeather API key is not configured in the backend. "
                "Explicitly inform the user that live weather telemetry is currently unconfigured."
            )
            data_sources = [f"Google Gemini ({settings.gemini_model})"]
        except Exception as exc:
            logger.warning("Comparison weather fetch error: %s", exc)
            weather_context = f"NOTE: Meteorological gateway error: {exc}"

    # Case 2: Single-city current weather or forecast
    elif cities and intent in ("current", "forecast"):
        city = cities[0]
        try:
            if intent == "forecast":
                forecast_telemetry = await get_forecast_by_city(city)
                weather_context = _format_forecast_context(forecast_telemetry)
                retrieved_str = forecast_telemetry.retrieved_at.strftime('%Y-%m-%d %H:%M UTC')
                data_sources = [
                    f"OpenWeatherMap 5-Day / 3-Hour Forecast API (Retrieved: {retrieved_str})",
                    f"Google Gemini ({settings.gemini_model})",
                ]
                follow_ups = [
                    f"What is the current real-time weather in {forecast_telemetry.city}?",
                    f"Will it rain significantly in {forecast_telemetry.city} over the next 48 hours?",
                    f"Compare {forecast_telemetry.city} weather with another location",
                ]
            else:
                weather_telemetry = await get_current_weather_by_city(city)
                weather_context = _format_current_context(weather_telemetry)
                obs_time_str = weather_telemetry.observation_time_utc.strftime('%Y-%m-%d %H:%M UTC')
                data_sources = [
                    f"OpenWeatherMap Current Weather API (Observed: {obs_time_str})",
                    f"Google Gemini ({settings.gemini_model})",
                ]
                follow_ups = [
                    f"What is the 5-day forecast for {weather_telemetry.city}?",
                    f"How does the humidity and pressure in {weather_telemetry.city} affect comfort?",
                    f"Compare {weather_telemetry.city} with Mumbai or London",
                ]
        except CityNotFoundError:
            logger.info("City %r not found in weather registry; passing notification to Gemini context", city)
            weather_context = (
                f"NOTE: The user inquired about weather for '{city}', but that city was not found "
                f"in the OpenWeather station registry. Inform the user clearly that live telemetry "
                f"could not be retrieved for '{city}', suggest checking the spelling or specifying a country code, "
                f"and provide general climate insights about the region if known."
            )
            data_sources = [f"Google Gemini ({settings.gemini_model})"]
            follow_ups = [
                "Weather in Chennai",
                "Temperature in Mumbai",
                "Forecast for London",
            ]
        except APIKeyMissingError:
            logger.warning("OpenWeather API key missing during chat interaction")
            weather_context = (
                "NOTE: The OpenWeather API key is not configured in the backend. "
                "Explicitly inform the user that live weather telemetry is currently unconfigured "
                "and explain how to set OPENWEATHER_API_KEY in backend/.env, while providing "
                "general climate knowledge."
            )
            data_sources = [f"Google Gemini ({settings.gemini_model})"]
        except Exception as exc:
            logger.warning("Weather fetch error during chat interaction: %s", exc)
            weather_context = (
                f"NOTE: The meteorological gateway returned a temporary error: {exc}. "
                f"Inform the user that real-time atmospheric telemetry is temporarily unavailable, "
                f"and provide general scientific guidance."
            )

    # General climate or default data sources if none assigned
    if not data_sources:
        from app.utils.reference import determine_scientific_sources
        scientific_sources = determine_scientific_sources(request.prompt)
        if scientific_sources:
            data_sources = scientific_sources + [f"Google Gemini ({settings.gemini_model})"]
            follow_ups = [
                "What is the difference between weather and climate?",
                "How does the IPCC assess uncertainty in climate models?",
                "What are the main observed indicators of global warming?",
            ]
        else:
            # Casual conversation or non-scientific query: do not attach irrelevant scientific sources
            data_sources = [f"Google Gemini ({settings.gemini_model})"]
            follow_ups = [
                "What is the current weather in Chennai?",
                "Explain the difference between weather and climate",
                "Compare the weather between London and Paris",
            ]

    # ── Multimodal Attachments & Document Ingestion ────────────────────────────
    multimodal_images: List[Dict[str, str]] = []
    attachment_contexts: List[str] = []

    if request.attachments:
        for att in request.attachments:
            if att.file_type == "image" and att.image_base64:
                multimodal_images.append({
                    "mime_type": att.content_type,
                    "data": att.image_base64,
                })
                data_sources.append(f"Uploaded Image ({att.filename})")
            if att.extracted_text:
                attachment_contexts.append(att.extracted_text)
                if att.file_type == "document":
                    data_sources.append(f"Uploaded Document ({att.filename})")
                elif att.file_type == "data":
                    data_sources.append(f"Uploaded Dataset ({att.filename})")

    # Combine prompt with extracted attachment contexts
    effective_prompt = request.prompt
    if attachment_contexts:
        context_block = "\n\n".join(attachment_contexts)
        effective_prompt = (
            f"[VERIFIED USER ATTACHMENTS & DOCUMENT CONTEXT]:\n"
            f"{context_block}\n\n"
            f"[USER INQUIRY]:\n"
            f"{request.prompt}"
        )
        if not follow_ups:
            follow_ups = [
                "Summarize the key findings from this attachment",
                "What anomalies or patterns stand out in this data?",
                "How does this relate to broader regional climate trends?",
            ]

    # Generate response via multi-provider AI router (Groq primary for chat/weather, Gemini for complex research & vision)
    try:
        routing_result = await route_and_generate(
            prompt=effective_prompt,
            history=request.history,
            weather_context=weather_context,
            intent=intent,
            cities=cities,
            images=multimodal_images if multimodal_images else None,
        )
        ai_content = routing_result.content
        model_identifier = routing_result.model_identifier

        # Ensure data_sources reflects the exact AI model that generated this response
        data_sources = [
            src for src in data_sources
            if not any(k in src.lower() for k in ("gemini", "groq", "llama"))
        ]
        data_sources.append(routing_result.data_source_label)

    except (GeminiServiceError, GeminiAPIKeyMissingError, GroqServiceError, GroqAPIKeyMissingError) as exc:
        if weather_telemetry and second_weather_telemetry:
            reason = exc.message if hasattr(exc, "message") else "upstream AI service temporarily unavailable"
            logger.warning("AI services unavailable (%s), formatting verified comparison data directly", reason)
            ai_content = _build_comparison_fallback_content(
                w1=weather_telemetry,
                w2=second_weather_telemetry,
                notice=f"Live meteorological telemetry retrieved successfully for both cities. Detailed AI commentary omitted ({reason}).",
            )
            model_identifier = "OpenWeatherMap Live Gateway"
        elif weather_telemetry or forecast_telemetry:
            reason = exc.message if hasattr(exc, "message") else "upstream AI service temporarily unavailable"
            logger.warning("AI services unavailable (%s), formatting verified OpenWeather data directly", reason)
            ai_content = _build_weather_fallback_content(
                weather_telemetry=weather_telemetry,
                forecast_telemetry=forecast_telemetry,
                notice=f"Live meteorological telemetry retrieved successfully. Detailed AI commentary omitted ({reason}).",
            )
            model_identifier = "OpenWeatherMap Live Gateway"
        else:
            raise

    # Append References section based on data sources only when explicitly requested
    from app.utils.reference import append_references
    ai_content = append_references(
        ai_content,
        data_sources,
        user_prompt=request.prompt,
        require_explicit_request=True,
    )

    return ChatResponse(
        content=ai_content,
        data_sources=data_sources,
        suggested_follow_ups=follow_ups,
        model_identifier=model_identifier,
        weather_telemetry=weather_telemetry,
        forecast_telemetry=forecast_telemetry,
    )
