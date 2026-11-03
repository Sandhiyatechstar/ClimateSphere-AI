"""
AI multi-provider service layer orchestrating Groq AI and Google Gemini.
"""

from app.services.ai.router import (
    AIProvider,
    AIRoutingResult,
    is_complex_research_query,
    route_and_generate,
    select_provider,
)

__all__ = [
    "AIProvider",
    "AIRoutingResult",
    "is_complex_research_query",
    "route_and_generate",
    "select_provider",
]
