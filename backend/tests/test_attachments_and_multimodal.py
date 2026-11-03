"""
Unit and integration tests for ClimateSphere AI File and Image Uploads,
signature validation, text/data extraction, and multimodal vision routing.
"""

import io
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import httpx
from fastapi.testclient import TestClient
from PIL import Image
import docx
import openpyxl
from pypdf import PdfWriter

import app.core.config as _cfg
from app.core.exceptions import GeminiAPIKeyMissingError, GeminiServiceError
from app.main import app
from app.schemas.chat import AttachmentPayload, ChatHistoryMessage, ChatRequest
from app.services.ai.router import AIProvider, route_and_generate, select_provider
from app.services.files.processor import (
    process_uploaded_file,
    sanitize_filename,
    validate_file_content,
)

client = TestClient(app)


# ── Helpers for Generating In-Memory Test Files ────────────────────────────────

def _create_test_png(width: int = 100, height: int = 100, color: str = "blue") -> bytes:
    buf = io.BytesIO()
    img = Image.new("RGB", (width, height), color=color)
    img.save(buf, format="PNG")
    return buf.getvalue()


def _create_test_jpeg(width: int = 100, height: int = 100) -> bytes:
    buf = io.BytesIO()
    img = Image.new("RGB", (width, height), color="red")
    img.save(buf, format="JPEG")
    return buf.getvalue()


def _create_test_pdf(text: str = "Climate change observed telemetry report.") -> bytes:
    writer = PdfWriter()
    writer.add_blank_page(width=72, height=72)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def _create_test_docx(paragraphs: list) -> bytes:
    doc = docx.Document()
    for p in paragraphs:
        doc.add_paragraph(p)
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


def _create_test_xlsx(headers: list, rows: list) -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "ClimateMetrics"
    ws.append(headers)
    for r in rows:
        ws.append(r)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


# ── 1. Filename Sanitization & Validation Unit Tests ──────────────────────────

def test_sanitize_filename_traversal():
    assert sanitize_filename("../../../etc/passwd.txt") == "passwd.txt"
    assert sanitize_filename("..\\..\\windows\\system32\\cmd.exe") == "cmd.exe"
    assert sanitize_filename("safe_report_2024.pdf") == "safe_report_2024.pdf"


def test_sanitize_filename_special_chars():
    cleaned = sanitize_filename('annual * report <version 2>.csv')
    assert "annual _ report _version 2_.csv" in cleaned or "*" not in cleaned


def test_validate_empty_file():
    from app.core.exceptions import FileValidationError
    with pytest.raises(FileValidationError) as exc:
        validate_file_content("empty.txt", b"")
    assert "empty (0 bytes)" in str(exc.value)


def test_validate_unsupported_extension():
    from app.core.exceptions import FileValidationError
    with pytest.raises(FileValidationError) as exc:
        validate_file_content("script.py", b"print('hello')")
    assert "Unsupported file extension" in str(exc.value)


def test_validate_spoofed_signature():
    from app.core.exceptions import FileValidationError
    # Executable header MZ disguised as PNG
    with pytest.raises(FileValidationError) as exc:
        validate_file_content("malicious.png", b"MZ\x90\x00\x03\x00\x00\x00")
    assert "genuine PNG signature" in str(exc.value)


# ── 2. Multipart Upload Endpoint Tests ─────────────────────────────────────────

def test_upload_valid_png():
    png_bytes = _create_test_png(120, 80)
    response = client.post(
        "/api/v1/attachments/upload",
        files={"files": ("satellite_monsoon.png", png_bytes, "image/png")},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["filename"] == "satellite_monsoon.png"
    assert data[0]["file_type"] == "image"
    assert data[0]["content_type"] == "image/png"
    assert data[0]["image_base64"] is not None
    assert data[0]["preview_url"].startswith("data:image/png;base64,")


def test_upload_valid_jpeg():
    jpeg_bytes = _create_test_jpeg(90, 90)
    response = client.post(
        "/api/v1/attachments/upload",
        files={"files": ("radar_thermal.jpg", jpeg_bytes, "image/jpeg")},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["file_type"] == "image"
    assert data[0]["content_type"] == "image/jpeg"


def test_upload_valid_pdf():
    pdf_bytes = _create_test_pdf()
    response = client.post(
        "/api/v1/attachments/upload",
        files={"files": ("ipcc_summary.pdf", pdf_bytes, "application/pdf")},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["filename"] == "ipcc_summary.pdf"
    assert data[0]["file_type"] == "document"
    assert "[ATTACHED DOCUMENT: ipcc_summary.pdf" in data[0]["extracted_text"]


def test_upload_valid_docx():
    docx_bytes = _create_test_docx(["Arctic sea ice decline observations", "Greenland mass loss overview."])
    response = client.post(
        "/api/v1/attachments/upload",
        files={"files": ("cryosphere_study.docx", docx_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["file_type"] == "document"
    assert "Arctic sea ice decline" in data[0]["extracted_text"]


def test_upload_valid_txt():
    txt_content = b"Global mean surface temperature increased by 1.1C compared to pre-industrial levels."
    response = client.post(
        "/api/v1/attachments/upload",
        files={"files": ("notes.txt", txt_content, "text/plain")},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["file_type"] == "document"
    assert "Global mean surface temperature" in data[0]["extracted_text"]


def test_upload_valid_csv():
    csv_content = (
        b"Year,MeanTemp_C,Precipitation_mm\n"
        b"2020,14.8,1020\n"
        b"2021,14.9,980\n"
        b"2022,15.1,950\n"
        b"2023,15.3,1010\n"
    )
    response = client.post(
        "/api/v1/attachments/upload",
        files={"files": ("annual_temp.csv", csv_content, "text/csv")},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["file_type"] == "data"
    assert "Total Records" in data[0]["extracted_text"]
    assert "4 rows" in data[0]["extracted_text"]
    assert "MeanTemp_C" in data[0]["extracted_text"]


def test_upload_valid_xlsx():
    headers = ["Station", "Ozone_ppb", "PM25_ugm3"]
    rows = [["Station_A", 42.5, 18.2], ["Station_B", 55.1, 24.0]]
    xlsx_bytes = _create_test_xlsx(headers, rows)
    response = client.post(
        "/api/v1/attachments/upload",
        files={"files": ("air_quality.xlsx", xlsx_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["file_type"] == "data"
    assert "ClimateMetrics" in data[0]["extracted_text"]
    assert "Station_A" in data[0]["extracted_text"]


def test_upload_multiple_mixed_files():
    png_bytes = _create_test_png(50, 50)
    txt_content = b"Notes on Chennai rainfall"
    response = client.post(
        "/api/v1/attachments/upload",
        files=[
            ("files", ("image.png", png_bytes, "image/png")),
            ("files", ("notes.txt", txt_content, "text/plain")),
        ],
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["file_type"] == "image"
    assert data[1]["file_type"] == "document"


def test_upload_too_many_files():
    png_bytes = _create_test_png(10, 10)
    files = [("files", (f"img_{i}.png", png_bytes, "image/png")) for i in range(6)]
    response = client.post("/api/v1/attachments/upload", files=files)
    assert response.status_code == 400
    assert "Maximum allowed is 5 files" in response.json()["detail"]


# ── 3. AI Provider Routing & Multimodal Vision Tests ──────────────────────────

def test_select_provider_with_images_forces_gemini():
    # Even casual prompt must route to Gemini if images are attached
    assert select_provider("Hello!", has_images=True) == AIProvider.GEMINI
    assert select_provider("What is the weather?", has_images=True) == AIProvider.GEMINI


@pytest.mark.asyncio
async def test_route_and_generate_multimodal_image(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test_gemini_key")
    monkeypatch.setenv("GEMINI_MODEL", "gemini-2.5-flash")
    _cfg.get_settings.cache_clear()

    mock_gemini_reply = "The uploaded satellite image indicates a convective cloud cluster associated with tropical moisture."

    with patch("app.services.ai.router.generate_gemini_response", new=AsyncMock(return_value=mock_gemini_reply)) as mock_gemini:
        images = [{"mime_type": "image/png", "data": "base64data=="}]
        result = await route_and_generate(
            prompt="Explain what is in this satellite image.",
            images=images,
        )

    assert result.provider == "Gemini"
    assert "convective cloud cluster" in result.content
    assert not result.fallback_occurred
    mock_gemini.assert_awaited_once()


@pytest.mark.asyncio
async def test_image_inquiry_fails_gracefully_when_gemini_key_missing(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "")
    _cfg.get_settings.cache_clear()

    images = [{"mime_type": "image/png", "data": "base64data=="}]
    with pytest.raises(GeminiAPIKeyMissingError):
        await route_and_generate(
            prompt="What is this image?",
            images=images,
        )


# ── 4. End-to-End Chat Ingestion of Attachments ────────────────────────────────

def test_chat_endpoint_with_document_attachment(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test_gemini_key")
    _cfg.get_settings.cache_clear()

    mock_reply = "Based on the uploaded IPCC report, global sea level rise is accelerating due to thermal expansion and ice sheet loss."
    from app.services.ai.router import AIRoutingResult
    routing_result = AIRoutingResult(
        content=mock_reply,
        provider="Gemini",
        model="gemini-2.5-flash",
        model_identifier="Gemini (gemini-2.5-flash)",
        data_source_label="Google Gemini (gemini-2.5-flash)",
        duration_ms=450,
        primary_provider="Gemini",
    )

    with patch("app.api.chat.route_and_generate", new=AsyncMock(return_value=routing_result)):
        chat_payload = {
            "prompt": "Summarize this document.",
            "attachments": [
                {
                    "filename": "ipcc_report.pdf",
                    "content_type": "application/pdf",
                    "file_type": "document",
                    "size_bytes": 1024,
                    "extracted_text": "[ATTACHED DOCUMENT: ipcc_report.pdf]\nSea level rise data: +3.7 mm/yr.",
                }
            ],
        }

        response = client.post("/api/v1/chat", json=chat_payload)

    assert response.status_code == 200
    data = response.json()
    assert "accelerating due to thermal expansion" in data["content"]
    assert any("Uploaded Document" in src for src in data["data_sources"])
    assert any("ipcc_report.pdf" in src for src in data["data_sources"])


def test_chat_endpoint_with_csv_data_attachment(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test_gemini_key")
    _cfg.get_settings.cache_clear()

    mock_reply = "Analysis of the attached temperature dataset indicates a statistically significant warming trend of +0.18°C per decade."
    from app.services.ai.router import AIRoutingResult
    routing_result = AIRoutingResult(
        content=mock_reply,
        provider="Gemini",
        model="gemini-2.5-flash",
        model_identifier="Gemini (gemini-2.5-flash)",
        data_source_label="Google Gemini (gemini-2.5-flash)",
        duration_ms=400,
        primary_provider="Gemini",
    )

    with patch("app.api.chat.route_and_generate", new=AsyncMock(return_value=routing_result)):
        chat_payload = {
            "prompt": "Analyze this climate dataset.",
            "attachments": [
                {
                    "filename": "temperatures.csv",
                    "content_type": "text/csv",
                    "file_type": "data",
                    "size_bytes": 2048,
                    "extracted_text": "[ATTACHED DATASET: temperatures.csv]\nTotal Records: 140 rows.",
                }
            ],
        }

        response = client.post("/api/v1/chat", json=chat_payload)

    assert response.status_code == 200
    data = response.json()
    assert "+0.18°C per decade" in data["content"]
    assert any("Uploaded Dataset" in src for src in data["data_sources"])
    assert any("temperatures.csv" in src for src in data["data_sources"])
