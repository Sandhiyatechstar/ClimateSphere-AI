"""
Pydantic schemas for the Gemini conversational chat endpoint.
"""

from datetime import datetime, timezone
from typing import List, Optional

from pydantic import BaseModel, Field

from app.schemas.weather import CurrentWeatherResponse, ForecastResponse


class ChatHistoryMessage(BaseModel):
    role: str = Field(..., max_length=20, description="Role of the sender: 'user' or 'assistant' / 'model'")
    content: str = Field(..., max_length=10000, description="Message text content")


class AttachmentPayload(BaseModel):
    id: Optional[str] = Field(default=None, description="Unique attachment identifier")
    filename: str = Field(..., max_length=255, description="Sanitized original filename")
    content_type: str = Field(..., max_length=100, description="MIME content type")
    file_type: str = Field(..., description="Category: 'image' | 'document' | 'data'")
    size_bytes: int = Field(..., ge=0, description="File size in bytes")
    extracted_text: Optional[str] = Field(default=None, description="Extracted text or tabular summary for LLM context")
    image_base64: Optional[str] = Field(default=None, description="Base64-encoded image data for vision models")
    preview_url: Optional[str] = Field(default=None, description="Preview data URL for client thumbnail rendering")


class ChatRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=4000, description="User's query or message")
    history: Optional[List[ChatHistoryMessage]] = Field(
        default=None, max_length=50, description="Prior conversation turns for multi-turn context"
    )
    city: Optional[str] = Field(
        default=None, max_length=100, description="Optional explicit city override"
    )
    attachments: Optional[List[AttachmentPayload]] = Field(
        default=None, max_length=5, description="Attached images, documents, or data files"
    )


class ChatResponse(BaseModel):
    content: str = Field(..., description="AI generated response formatted in progressive levels")
    data_sources: List[str] = Field(
        default_factory=list, description="Referenced datasets and scientific gateways"
    )
    suggested_follow_ups: List[str] = Field(
        default_factory=list, description="Suggested next inquiries"
    )
    model_identifier: str = Field(
        default="Gemini 2.5 Flash", description="AI model that generated this response"
    )
    weather_telemetry: Optional[CurrentWeatherResponse] = Field(
        default=None, description="Verified live OpenWeather current telemetry if retrieved"
    )
    forecast_telemetry: Optional[ForecastResponse] = Field(
        default=None, description="Verified 5-day OpenWeather forecast data if retrieved"
    )
    retrieved_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp of response generation",
    )
