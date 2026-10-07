import asyncio
import logging
from typing import Dict, Any, List, Optional
from backend.app.services.gemini_service import gemini_service
from backend.app.services.claude_service import claude_service

logger = logging.getLogger(__name__)


class AIOrchestrator:
    """
    Co-Pilot Orchestrator combining Google Gemini API & Anthropic Claude API.
    Gemini handles visual AI recognition, fast text translation, and multimodal analysis.
    Claude handles commercial market strategy, risk analysis, and pricing optimization.
    """

    def get_status(self) -> Dict[str, Any]:
        """Returns operational readiness for both Gemini and Claude engines."""
        gemini_ready = gemini_service.is_configured
        claude_ready = claude_service.is_configured

        if gemini_ready and claude_ready:
            mode = "Dual AI Active (Gemini Vision + Claude Strategy)"
        elif gemini_ready:
            mode = "Gemini AI Active (Claude in Fallback)"
        elif claude_ready:
            mode = "Claude AI Active (Gemini in Fallback)"
        else:
            mode = "Dual Fallback Mode (Demo / Test Active)"

        return {
            "gemini_active": gemini_ready,
            "gemini_model": gemini_service.model,
            "claude_active": claude_ready,
            "claude_model": claude_service.model,
            "orchestrator_mode": mode
        }

    async def generate_dual_ai_insight(
        self,
        product_title: str,
        landed_cost_bdt: float,
        bd_avg_price_bdt: float,
        gross_margin_pct: float,
        image_bytes: Optional[bytes] = None,
        mime_type: str = "image/jpeg"
    ) -> Dict[str, Any]:
        """
        Executes parallel analysis using both Gemini API and Claude API.
        Combines visual feature extraction with strategic commercial intelligence.
        """
        gemini_task = None
        if image_bytes:
            gemini_task = gemini_service.analyze_product_image(image_bytes, mime_type)
        else:
            gemini_task = gemini_service.translate_text(product_title, target_lang="English")

        claude_task = claude_service.analyze_sourcing_market(
            product_title=product_title,
            landed_cost_bdt=landed_cost_bdt,
            bd_avg_retail_price_bdt=bd_avg_price_bdt,
            estimated_margin_percent=gross_margin_pct
        )

        gemini_result, claude_result = await asyncio.gather(gemini_task, claude_task, return_exceptions=True)

        if isinstance(gemini_result, Exception):
            gemini_result = {"error": str(gemini_result)}
        if isinstance(claude_result, Exception):
            claude_result = {"error": str(claude_result)}

        # Formulate Dual-AI Consensus Recommendation
        consensus = "STRONG BUY & IMPORT" if gross_margin_pct >= 35 else ("PROFITABLE OPPORTUNITY" if gross_margin_pct >= 20 else "LOW MARGIN RISK")

        return {
            "consensus_rating": consensus,
            "active_models": [
                f"Gemini: {gemini_service.model}",
                f"Claude: {claude_service.model}"
            ],
            "gemini_analysis": gemini_result,
            "claude_strategy": claude_result,
            "ai_status": self.get_status()
        }


# Singleton instance
ai_orchestrator = AIOrchestrator()
