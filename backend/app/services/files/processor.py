"""
Secure file validation, image processing, text extraction, and dataset analysis.

Supports:
- Images: PNG, JPG, JPEG, WEBP
- Documents: PDF, DOCX, TXT
- Data: CSV, XLSX
"""

import base64
import csv
import io
import logging
import os
import re
import zipfile
from typing import Any, Dict, List, Optional, Tuple

from PIL import Image
import docx
import openpyxl
from pypdf import PdfReader
from pypdf.errors import FileNotDecryptedError, PdfReadError

from app.core.config import get_settings
from app.core.exceptions import FileProcessingError, FileValidationError
from app.schemas.chat import AttachmentPayload

logger = logging.getLogger(__name__)

# File category mappings
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
DOCUMENT_EXTENSIONS = {".pdf", ".docx", ".txt"}
DATA_EXTENSIONS = {".csv", ".xlsx"}
ALL_ALLOWED_EXTENSIONS = IMAGE_EXTENSIONS | DOCUMENT_EXTENSIONS | DATA_EXTENSIONS

# Magic byte signatures
MAGIC_BYTES = {
    ".png": b"\x89PNG\r\n\x1a\n",
    ".jpg": b"\xff\xd8\xff",
    ".jpeg": b"\xff\xd8\xff",
    ".pdf": b"%PDF-",
}


def sanitize_filename(name: str) -> str:
    """
    Sanitize an uploaded filename to prevent directory traversal and filesystem attacks.
    Preserves clean alphanumeric characters, hyphens, underscores, dots, and spaces.
    """
    if not name:
        return "unnamed_attachment"

    # Extract base filename (removes directory traversal such as ../ or ..\)
    base = os.path.basename(name).strip()
    # Replace dangerous characters with an underscore
    cleaned = re.sub(r'[^a-zA-Z0-9._ -]', '_', base)
    # Collapse multiple dots or spaces
    cleaned = re.sub(r'\.{2,}', '.', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()

    if not cleaned or cleaned.startswith('.'):
        cleaned = f"attachment_{cleaned}" if cleaned else "attachment"

    # Ensure length restriction while preserving extension
    if len(cleaned) > 100:
        stem, ext = os.path.splitext(cleaned)
        cleaned = f"{stem[:90]}{ext}"

    return cleaned


def validate_file_content(
    filename: str,
    content: bytes,
    declared_content_type: Optional[str] = None,
) -> Tuple[str, str, str]:
    """
    Validate file size, extension, MIME type, and binary file signatures.
    Returns: (cleaned_filename, file_type, content_type)
    """
    settings = get_settings()
    max_bytes = getattr(settings, "max_file_size_bytes", 10_485_760)

    if not content or len(content) == 0:
        raise FileValidationError(f"File '{filename}' is empty (0 bytes).")

    if len(content) > max_bytes:
        max_mb = max_bytes / (1024 * 1024)
        actual_mb = len(content) / (1024 * 1024)
        raise FileValidationError(
            f"File '{filename}' ({actual_mb:.1f} MB) exceeds maximum allowed size ({max_mb:.1f} MB)."
        )

    cleaned_name = sanitize_filename(filename)
    _, ext = os.path.splitext(cleaned_name)
    ext = ext.lower()

    if ext not in ALL_ALLOWED_EXTENSIONS:
        allowed_list = ", ".join(sorted(ALL_ALLOWED_EXTENSIONS))
        raise FileValidationError(
            f"Unsupported file extension '{ext}'. Permitted formats: {allowed_list}."
        )

    # 1. Images Validation
    if ext in IMAGE_EXTENSIONS:
        file_type = "image"
        # Validate magic signatures
        if ext in (".jpg", ".jpeg") and not content.startswith(MAGIC_BYTES[".jpg"]):
            raise FileValidationError(f"File '{filename}' does not match genuine JPEG signature.")
        if ext == ".png" and not content.startswith(MAGIC_BYTES[".png"]):
            raise FileValidationError(f"File '{filename}' does not match genuine PNG signature.")
        if ext == ".webp":
            if not (content.startswith(b"RIFF") and b"WEBP" in content[8:16]):
                raise FileValidationError(f"File '{filename}' does not match genuine WEBP signature.")

        # Verify actual image decode via Pillow
        try:
            with Image.open(io.BytesIO(content)) as img:
                img.verify()
        except Exception as exc:
            raise FileValidationError(
                f"File '{filename}' is corrupted or not a valid image: {exc}"
            )

        content_type = f"image/{ext.replace('.', '')}" if ext != ".jpg" else "image/jpeg"

    # 2. PDF Document Validation
    elif ext == ".pdf":
        file_type = "document"
        if not content.startswith(MAGIC_BYTES[".pdf"]):
            raise FileValidationError(f"File '{filename}' does not match genuine PDF header signature.")
        content_type = "application/pdf"

    # 3. DOCX Document Validation (Zip package containing word/document.xml)
    elif ext == ".docx":
        file_type = "document"
        if not content.startswith(b"PK\x03\x04"):
            raise FileValidationError(f"File '{filename}' does not match genuine DOCX package signature.")
        try:
            with zipfile.ZipFile(io.BytesIO(content)) as z:
                namelist = z.namelist()
                if "word/document.xml" not in namelist:
                    raise FileValidationError(
                        f"File '{filename}' is not a valid Word (.docx) document."
                    )
        except zipfile.BadZipFile:
            raise FileValidationError(f"File '{filename}' is a corrupted Word document.")
        content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    # 4. XLSX Spreadsheet Validation (Zip package containing xl/workbook.xml)
    elif ext == ".xlsx":
        file_type = "data"
        if not content.startswith(b"PK\x03\x04"):
            raise FileValidationError(f"File '{filename}' does not match genuine XLSX package signature.")
        try:
            with zipfile.ZipFile(io.BytesIO(content)) as z:
                namelist = z.namelist()
                if not any("xl/workbook" in item for item in namelist):
                    raise FileValidationError(
                        f"File '{filename}' is not a valid Excel (.xlsx) workbook."
                    )
        except zipfile.BadZipFile:
            raise FileValidationError(f"File '{filename}' is a corrupted Excel workbook.")
        content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    # 5. CSV Data Validation
    elif ext == ".csv":
        file_type = "data"
        # CSV should be text, reject binary files with null bytes
        if b"\x00" in content[:2048]:
            raise FileValidationError(f"File '{filename}' contains binary data and is not a valid CSV.")
        content_type = "text/csv"

    # 6. TXT Document Validation
    elif ext == ".txt":
        file_type = "document"
        if b"\x00" in content[:2048]:
            raise FileValidationError(f"File '{filename}' contains binary data and is not a valid text document.")
        content_type = "text/plain"

    else:
        raise FileValidationError(f"Unsupported file format: '{ext}'.")

    return cleaned_name, file_type, content_type


# ── Extractor Functions ─────────────────────────────────────────────────────────

def _extract_pdf_content(content: bytes, filename: str) -> str:
    """Extract page count and text from a PDF document safely."""
    try:
        reader = PdfReader(io.BytesIO(content))
        if reader.is_encrypted:
            raise FileProcessingError(
                f"PDF '{filename}' is password-protected. Please remove encryption and retry."
            )

        total_pages = len(reader.pages)
        if total_pages == 0:
            return f"[ATTACHED DOCUMENT: {filename} (PDF, 0 pages)]\n(Empty document)"

        extracted_pages: List[str] = []
        max_pages = min(total_pages, 25)
        char_count = 0
        max_chars = 35_000

        for idx in range(max_pages):
            page_text = reader.pages[idx].extract_text() or ""
            page_text = page_text.strip()
            if page_text:
                extracted_pages.append(f"--- Page {idx + 1} ---\n{page_text}")
                char_count += len(page_text)
                if char_count >= max_chars:
                    extracted_pages.append(
                        f"\n(Note: Document text truncated at {char_count} characters for context efficiency.)"
                    )
                    break

        if not extracted_pages:
            return (
                f"[ATTACHED DOCUMENT: {filename} (PDF, {total_pages} pages)]\n"
                f"(Notice: This PDF does not contain embedded digital text layers. "
                f"It may consist of scanned raster pages. For scanned visual pages, upload them as PNG or JPG images.)"
            )

        full_text = "\n\n".join(extracted_pages)
        return (
            f"[ATTACHED DOCUMENT: {filename} (PDF, {total_pages} pages)]\n"
            f"{full_text}"
        )
    except (FileNotDecryptedError, PdfReadError) as exc:
        raise FileProcessingError(f"Unable to read PDF '{filename}': {exc}")
    except Exception as exc:
        logger.warning("Error reading PDF %r: %s", filename, exc)
        raise FileProcessingError(f"Error parsing PDF '{filename}': {exc}")


def _extract_docx_content(content: bytes, filename: str) -> str:
    """Extract paragraphs and tables from a Word document safely."""
    try:
        doc = docx.Document(io.BytesIO(content))
        elements: List[str] = []
        char_count = 0
        max_chars = 35_000

        # Extract paragraphs
        for p in doc.paragraphs:
            text = p.text.strip()
            if text:
                elements.append(text)
                char_count += len(text)
                if char_count >= max_chars:
                    break

        # Extract tables if within character limit
        if char_count < max_chars and doc.tables:
            for t_idx, table in enumerate(doc.tables[:5], start=1):
                table_lines: List[str] = [f"\nTable {t_idx}:"]
                for row in table.rows[:20]:
                    cells = [cell.text.strip().replace("\n", " ") for cell in row.cells]
                    table_lines.append("| " + " | ".join(cells) + " |")
                elements.append("\n".join(table_lines))

        if not elements:
            return f"[ATTACHED DOCUMENT: {filename} (Word Document)]\n(Document has no text content)"

        return f"[ATTACHED DOCUMENT: {filename} (Word Document)]\n" + "\n\n".join(elements)
    except Exception as exc:
        logger.warning("Error reading DOCX %r: %s", filename, exc)
        raise FileProcessingError(f"Error parsing Word document '{filename}': {exc}")


def _extract_txt_content(content: bytes, filename: str) -> str:
    """Decode text file with resilient encoding fallback."""
    for enc in ("utf-8", "utf-8-sig", "latin-1", "cp1252"):
        try:
            text = content.decode(enc)
            # Remove null bytes or control characters
            text = text.replace("\x00", "")
            if len(text) > 35_000:
                text = text[:35_000] + "\n\n(Note: Text file truncated to 35,000 characters for context efficiency.)"
            return f"[ATTACHED TEXT FILE: {filename}]\n{text}"
        except UnicodeDecodeError:
            continue
    raise FileProcessingError(f"Could not decode text file '{filename}' with standard character encodings.")


def _extract_csv_content(content: bytes, filename: str) -> str:
    """Parse CSV, generate column statistics, and format markdown table preview."""
    # Decode text
    decoded_text = None
    for enc in ("utf-8", "utf-8-sig", "latin-1", "cp1252"):
        try:
            decoded_text = content.decode(enc)
            break
        except UnicodeDecodeError:
            continue

    if decoded_text is None:
        raise FileProcessingError(f"Could not decode CSV '{filename}'.")

    # Detect delimiter
    sample = decoded_text[:4096]
    delimiter = ","
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|")
        delimiter = dialect.delimiter
    except Exception:
        delimiter = ","

    f = io.StringIO(decoded_text)
    reader = csv.reader(f, delimiter=delimiter)

    try:
        rows = list(reader)
    except Exception as exc:
        raise FileProcessingError(f"Malformed CSV structure in '{filename}': {exc}")

    if not rows:
        return f"[ATTACHED DATASET: {filename} (CSV)]\n(Dataset is empty)"

    headers = [h.strip() for h in rows[0]]
    data_rows = rows[1:]
    total_records = len(data_rows)

    # Compute numeric statistics where applicable
    stats: List[str] = []
    if data_rows and headers:
        for col_idx, col_name in enumerate(headers[:12]):
            nums: List[float] = []
            for row in data_rows[:2000]:  # Sample up to 2,000 rows for fast statistical summary
                if col_idx < len(row):
                    val = row[col_idx].strip().replace(",", "")
                    try:
                        nums.append(float(val))
                    except ValueError:
                        pass
            if len(nums) > (len(data_rows[:2000]) * 0.6) and nums:
                min_v = min(nums)
                max_v = max(nums)
                avg_v = sum(nums) / len(nums)
                stats.append(f"  * **{col_name}**: min={min_v:g}, max={max_v:g}, mean={avg_v:.2f}")

    # Build markdown table preview (first 15 rows)
    preview_rows = data_rows[:15]
    table_lines: List[str] = []
    table_lines.append("| " + " | ".join(headers) + " |")
    table_lines.append("| " + " | ".join(["---"] * len(headers)) + " |")
    for r in preview_rows:
        padded = r + [""] * (len(headers) - len(r))
        clean_cells = [cell.strip().replace("\n", " ") for cell in padded[:len(headers)]]
        table_lines.append("| " + " | ".join(clean_cells) + " |")

    out_parts = [
        f"[ATTACHED DATASET: {filename} (CSV Format)]",
        f"- **Total Records**: {total_records} rows",
        f"- **Columns ({len(headers)})**: {', '.join(headers[:20])}",
    ]
    if stats:
        out_parts.append("- **Statistical Summary**:\n" + "\n".join(stats))
    out_parts.append(f"- **Data Preview (first {len(preview_rows)} rows)**:\n" + "\n".join(table_lines))
    if total_records > len(preview_rows):
        out_parts.append(f"(... and {total_records - len(preview_rows)} more records.)")

    return "\n\n".join(out_parts)


def _extract_xlsx_content(content: bytes, filename: str) -> str:
    """Parse XLSX workbook, list sheets, and format markdown preview tables."""
    try:
        wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True, read_only=True)
        sheet_names = wb.sheetnames
        if not sheet_names:
            return f"[ATTACHED SPREADSHEET: {filename} (Excel)]\n(Workbook has no sheets)"

        sections: List[str] = [
            f"[ATTACHED SPREADSHEET: {filename} (Excel Workbook)]",
            f"- **Worksheets ({len(sheet_names)})**: {', '.join(sheet_names)}",
        ]

        # Process up to first 2 sheets
        for sheet_name in sheet_names[:2]:
            ws = wb[sheet_name]
            all_rows = []
            for r_idx, row in enumerate(ws.iter_rows(values_only=True)):
                if r_idx >= 25:
                    break
                row_vals = ["" if v is None else str(v).strip().replace("\n", " ") for v in row]
                if any(row_vals):
                    all_rows.append(row_vals)

            if not all_rows:
                sections.append(f"### Sheet: {sheet_name}\n(Empty sheet)")
                continue

            headers = all_rows[0]
            data_rows = all_rows[1:]
            table_lines: List[str] = [
                f"### Sheet: {sheet_name} ({len(data_rows)} rows previewed)",
                "| " + " | ".join(headers) + " |",
                "| " + " | ".join(["---"] * len(headers)) + " |",
            ]
            for r in data_rows[:15]:
                padded = r + [""] * (len(headers) - len(r))
                table_lines.append("| " + " | ".join(padded[:len(headers)]) + " |")

            sections.append("\n".join(table_lines))

        wb.close()
        return "\n\n".join(sections)
    except Exception as exc:
        logger.warning("Error reading XLSX %r: %s", filename, exc)
        raise FileProcessingError(f"Error reading Excel workbook '{filename}': {exc}")


# ── Main Processing Orchestrator ───────────────────────────────────────────────

def process_uploaded_file(
    filename: str,
    content: bytes,
    declared_content_type: Optional[str] = None,
    attachment_id: Optional[str] = None,
) -> AttachmentPayload:
    """
    Validate, inspect, and extract contents from an uploaded file.
    Returns a structured AttachmentPayload ready for frontend rendering and AI prompt injection.
    """
    cleaned_name, file_type, content_type = validate_file_content(
        filename=filename,
        content=content,
        declared_content_type=declared_content_type,
    )

    size_bytes = len(content)
    att_id = attachment_id or f"att_{int(os.urandom(4).hex(), 16)}"
    _, ext = os.path.splitext(cleaned_name)
    ext = ext.lower()

    extracted_text: Optional[str] = None
    image_base64: Optional[str] = None
    preview_url: Optional[str] = None

    if file_type == "image":
        # Re-open with PIL to read dimensions and format
        try:
            with Image.open(io.BytesIO(content)) as img:
                width, height = img.size
                img_format = img.format or ext.replace(".", "").upper()

            b64_str = base64.b64encode(content).decode("ascii")
            image_base64 = b64_str
            preview_url = f"data:{content_type};base64,{b64_str}"
            extracted_text = (
                f"[ATTACHED IMAGE: {cleaned_name} ({img_format}, {width}x{height}px, {size_bytes // 1024} KB)]"
            )
        except Exception as exc:
            raise FileProcessingError(f"Could not process image '{cleaned_name}': {exc}")

    elif ext == ".pdf":
        extracted_text = _extract_pdf_content(content, cleaned_name)

    elif ext == ".docx":
        extracted_text = _extract_docx_content(content, cleaned_name)

    elif ext == ".txt":
        extracted_text = _extract_txt_content(content, cleaned_name)

    elif ext == ".csv":
        extracted_text = _extract_csv_content(content, cleaned_name)

    elif ext == ".xlsx":
        extracted_text = _extract_xlsx_content(content, cleaned_name)

    return AttachmentPayload(
        id=att_id,
        filename=cleaned_name,
        content_type=content_type,
        file_type=file_type,
        size_bytes=size_bytes,
        extracted_text=extracted_text,
        image_base64=image_base64,
        preview_url=preview_url,
    )
