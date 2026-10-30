import logging
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from typing import Optional
from backend.app.services.gemini_service import gemini_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="", tags=["Products"])


@router.post("/products/analyze-screenshot")
@router.post("/api/products/analyze-screenshot")
async def analyze_product_screenshot(
    file: UploadFile = File(...),
    cnyRate: Optional[float] = Form(None),
    exchangeRate: Optional[float] = Form(None),
    exchange_rate: Optional[float] = Form(None),
):
    """
    AI-powered Smart Screenshot Extractor for 1688, AliExpress, and Pinduoduo products.
    Uses Google Gemini Vision API to analyze product screenshots, translate titles & color variants,
    extract original CNY prices, calculate BDT converted prices, and apply the 1.2x packaging weight factor.
    """
    if not file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No screenshot image file provided. Please upload an image.",
        )

    # Determine rate (priority: exchange_rate -> exchangeRate -> cnyRate -> 20.0 default)
    rate = 20.0
    for candidate in [exchange_rate, exchangeRate, cnyRate]:
        if candidate is not None and candidate > 0:
            rate = float(candidate)
            break

    try:
        content_bytes = await file.read()
        mime_type = file.content_type or "image/jpeg"

        logger.info(
            f"Analyzing product screenshot '{file.filename}' ({len(content_bytes)} bytes) with rate {rate} CNY/BDT"
        )

        result = await gemini_service.analyze_screenshot(
            image_bytes=content_bytes,
            mime_type=mime_type,
            exchange_rate=rate,
        )

        return result
    except Exception as e:
        logger.error(f"Error analyzing screenshot: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze screenshot: {str(e)}",
        )
