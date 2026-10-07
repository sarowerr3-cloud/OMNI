from fastapi import APIRouter
from backend.app.core.config import settings
from backend.app.services.gemini_service import gemini_service

router = APIRouter()


@router.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint returning system status and service details."""
    return {
        "status": "ok",
        "service": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "ai_provider": "google-gemini",
        "gemini_configured": gemini_service.is_configured,
        "gemini_model": settings.GEMINI_MODEL
    }
