"""
Utility for managing and appending verified scientific references to AI responses.

- Prioritizes authoritative climate bodies: IPCC, NASA Climate, NOAA, and WMO.
- Maps recognized sources to canonical, genuine URLs (never fabricated).
- Rejects non-authoritative or fabricated source entries.
- Appends clean markdown References sections when genuine scientific sources are cited.
"""

import re
from typing import Dict, List, Optional

# Verified canonical URLs for recognized scientific authorities
SOURCE_URLS: Dict[str, str] = {
    # IPCC
    "IPCC": "https://www.ipcc.ch",
    "IPCC AR6": "https://www.ipcc.ch",
    "Intergovernmental Panel on Climate Change": "https://www.ipcc.ch",
    "Intergovernmental Panel on Climate Change (IPCC AR6)": "https://www.ipcc.ch",
    "Intergovernmental Panel on Climate Change (IPCC)": "https://www.ipcc.ch",

    # NASA Climate
    "NASA Climate": "https://climate.nasa.gov",
    "NASA Climate (Global Climate Change)": "https://climate.nasa.gov",
    "NASA Earth Observatory": "https://earthobservatory.nasa.gov",
    "NASA": "https://climate.nasa.gov",
    "National Aeronautics and Space Administration": "https://climate.nasa.gov",

    # NOAA
    "NOAA Climate": "https://www.climate.gov",
    "NOAA": "https://www.noaa.gov",
    "National Oceanic and Atmospheric Administration": "https://www.noaa.gov",
    "National Oceanic and Atmospheric Administration (NOAA)": "https://www.noaa.gov",

    # WMO
    "WMO": "https://wmo.int",
    "World Meteorological Organization": "https://wmo.int",
    "World Meteorological Organization (WMO)": "https://wmo.int",
    "World Meteorological Organization (WMO) Global Standards": "https://wmo.int",

    # OpenWeather
    "OpenWeatherMap": "https://openweathermap.org",
    "OpenWeather": "https://openweathermap.org",

    # Additional recognized scientific authorities
    "Copernicus Climate Change Service": "https://climate.copernicus.eu",
    "Copernicus": "https://climate.copernicus.eu",
    "Global Carbon Project": "https://www.globalcarbonproject.org",
    "U.S. Global Change Research Program": "https://www.globalchange.gov",
    "USGCRP": "https://www.globalchange.gov",
}

# Climate science trigger terms for discerning whether scientific citations apply
_CLIMATE_SCIENCE_KEYWORDS = {
    "climate", "climate change", "global warming", "greenhouse effect", "greenhouse gas",
    "greenhouse gases", "carbon dioxide", "co2", "methane", "ch4", "nitrous oxide",
    "sea level rise", "sea level", "arctic sea ice", "antarctic", "glacier", "glaciers",
    "ice sheet", "ice sheets", "permafrost", "ocean acidification", "ocean heat",
    "ocean currents", "coriolis effect", "albedo", "solar radiation", "radiative forcing",
    "thermohaline circulation", "el nino", "la nina", "stratosphere", "troposphere",
    "ozone layer", "heat dome", "tipping point", "carbon budget", "ipcc", "ar6",
    "wmo", "noaa", "extreme weather trends", "drought trends", "paleoclimate",
}


def get_canonical_source_url(source_name: str) -> Optional[str]:
    """Return the verified canonical URL for a recognized source identifier, or None."""
    if not source_name:
        return None
    lower_name = source_name.lower()
    for key, url in SOURCE_URLS.items():
        if key.lower() in lower_name:
            return url
    return None


def is_scientific_topic(prompt: str) -> bool:
    """Detect whether a user query discusses climate science, atmospheric physics, or Earth systems."""
    lower_prompt = prompt.lower()
    return any(
        re.search(r'\b' + re.escape(kw) + r'\b', lower_prompt)
        for kw in _CLIMATE_SCIENCE_KEYWORDS
    )


def determine_scientific_sources(prompt: str) -> List[str]:
    """
    Select authentic, contextually relevant scientific authorities for a climate science inquiry.
    Avoids attaching irrelevant scientific sources to casual conversations or greetings.
    """
    if not is_scientific_topic(prompt):
        return []

    lower = prompt.lower()
    sources: List[str] = []

    # 1. Marine, oceanic, atmospheric dynamics, El Niño / ENSO, cyclones
    if any(k in lower for k in ["ocean", "sea", "marine", "el nino", "la nina", "coriolis", "currents", "cyclone", "hurricane"]):
        sources.append("National Oceanic and Atmospheric Administration (NOAA)")
        sources.append("World Meteorological Organization (WMO)")

    # 2. Cryosphere, polar ice, satellite data, solar radiation, Earth observations
    if any(k in lower for k in ["ice", "arctic", "antarctic", "glacier", "satellite", "albedo", "solar"]):
        sources.append("NASA Climate (Global Climate Change)")
        sources.append("National Oceanic and Atmospheric Administration (NOAA)")

    # 3. Global warming, greenhouse gases, emissions, mitigation, temperature targets, climate change
    if any(k in lower for k in ["global warming", "climate change", "greenhouse", "carbon", "co2", "methane", "emissions", "ipcc", "1.5"]):
        if "Intergovernmental Panel on Climate Change (IPCC AR6)" not in sources:
            sources.append("Intergovernmental Panel on Climate Change (IPCC AR6)")
        if "NASA Climate (Global Climate Change)" not in sources:
            sources.append("NASA Climate (Global Climate Change)")
        if "World Meteorological Organization (WMO)" not in sources:
            sources.append("World Meteorological Organization (WMO)")

    # 4. Fallback for general climate science / weather vs. climate
    if not sources:
        sources = [
            "Intergovernmental Panel on Climate Change (IPCC AR6)",
            "World Meteorological Organization (WMO) Global Standards",
            "NASA Climate (Global Climate Change)",
        ]

    # Deduplicate while preserving order
    return list(dict.fromkeys(sources))


def _extract_known_sources(sources: List[str]) -> List[str]:
    """Return a deduplicated list of source descriptors that match recognized authorities."""
    found: List[str] = []
    for src in sources:
        url = get_canonical_source_url(src)
        if url:
            matched_key = None
            for key in SOURCE_URLS:
                if key.lower() in src.lower():
                    matched_key = key
                    break
            found.append(matched_key or src)
    return list(dict.fromkeys(found))


def should_include_references(prompt: str) -> bool:
    """
    Check if the user explicitly requested scientific sources, citations, references, or evidence.
    """
    if not prompt:
        return False
    lower = prompt.lower()
    patterns = [
        r'\b(sources?|references?|citations?|cites?|citing)\b',
        r'\b(evidence|bibliography|papers?|studies|study|literature)\b',
        r'\b(peer[- ]reviewed|where does this come from|where is this from)\b',
        r'\b(proof|prove it|documentation|substantiate)\b',
    ]
    return any(re.search(pat, lower) for pat in patterns)


def append_references(
    content: str,
    data_sources: List[str],
    user_prompt: Optional[str] = None,
    require_explicit_request: bool = False,
) -> str:
    """
    Append a markdown References section to `content` if appropriate.

    - Detects whether an existing References heading is already present.
    - If `require_explicit_request` is True, only appends if user_prompt explicitly requested citations/sources.
    - Only includes verified sources with genuine canonical URLs.
    - Omits models (e.g. Gemini, Groq) and unverified entries to prevent fabricated citations.
    """
    if require_explicit_request and user_prompt:
        if not should_include_references(user_prompt):
            return content

    # Detect existing References/Sources sections (case-insensitive heading)
    if re.search(r'(?im)^#{1,4}\s*(?:references|sources|citations)\b', content):
        return content
    if re.search(r'(?i)\*\*(?:references|sources|citations):\*\*', content):
        return content

    # Filter data_sources to only verified external scientific repositories
    verified_refs: List[str] = []
    for src in data_sources:
        # Skip AI models, local uploaded files, and raw telemetry strings
        if any(skip in src.lower() for skip in ["gemini", "groq", "llama", "model", "telemetry", "observed:", "uploaded"]):
            continue
        url = get_canonical_source_url(src)
        if url:
            clean_name = src
            for key in [
                "Intergovernmental Panel on Climate Change (IPCC AR6)",
                "Intergovernmental Panel on Climate Change",
                "NASA Climate (Global Climate Change)",
                "NASA Climate",
                "NASA",
                "National Oceanic and Atmospheric Administration (NOAA)",
                "National Oceanic and Atmospheric Administration",
                "NOAA",
                "World Meteorological Organization (WMO) Global Standards",
                "World Meteorological Organization",
                "WMO",
                "OpenWeatherMap",
                "Copernicus Climate Change Service",
                "Global Carbon Project",
            ]:
                if key.lower() in src.lower():
                    clean_name = key
                    break
            verified_refs.append(f"- [{clean_name}]({url})")

    if not verified_refs:
        return content

    # Deduplicate entries while preserving order
    deduped_refs = list(dict.fromkeys(verified_refs))
    ref_block = "\n\n### References\n" + "\n".join(deduped_refs)
    return f"{content.rstrip()}{ref_block}"
