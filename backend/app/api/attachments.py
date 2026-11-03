"""
Attachments endpoint for secure file upload and content extraction.
Supports images (PNG, JPG, WEBP), documents (PDF, DOCX, TXT), and data (CSV, XLSX).
"""

import logging
from typing import List

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.core.config import get_settings
from app.core.exceptions import FileProcessingError, FileValidationError
from app.schemas.chat import AttachmentPayload
from app.services.files.processor import process_uploaded_file

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/attachments", tags=["File Attachments"])


@router.post(
    "/upload",
    response_model=List[AttachmentPayload],
    status_code=status.HTTP_200_OK,
    summary="Upload and inspect images, documents, or data files",
    description=(
        "Upload one or more files (up to 5 files, 10MB each) for multimodal analysis, "
        "document question answering, or tabular dataset insights. Supported formats: "
        "PNG, JPG, JPEG, WEBP, PDF, DOCX, TXT, CSV, XLSX."
    ),
)
async def upload_attachments(
    files: List[UploadFile] = File(..., description="List of files to upload and analyze"),
) -> List[AttachmentPayload]:
    settings = get_settings()
    max_count = getattr(settings, "max_attachments_per_message", 5)

    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files were provided in upload request.",
        )

    if len(files) > max_count:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Too many files uploaded ({len(files)}). Maximum allowed is {max_count} files per inquiry.",
        )

    results: List[AttachmentPayload] = []

    for file in files:
        filename = file.filename or "attachment"
        try:
            content = await file.read()
            processed = process_uploaded_file(
                filename=filename,
                content=content,
                declared_content_type=file.content_type,
            )
            results.append(processed)
        except (FileValidationError, FileProcessingError):
            raise
        except Exception as exc:
            logger.error("Unexpected error processing file %r: %s", filename, exc)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unexpected error processing '{filename}': {exc}",
            )
        finally:
            await file.close()

    return results
