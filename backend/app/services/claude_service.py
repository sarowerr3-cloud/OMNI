import logging
import os
from typing import Optional, Dict, Any, List
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False
    logger.warning("anthropic package not installed, running ClaudeService in fallback mode.")


class ClaudeService:
    """
    Service to handle interactions with Anthropic's Claude API.
    Provides commercial intelligence, market positioning, keyword optimization,
    and risk assessment for Bangladesh import sourcing.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.CLAUDE_API_KEY or os.getenv("ANTHROPIC_API_KEY")
        self.model = settings.CLAUDE_MODEL
        self._client = None

        if self.api_key and ANTHROPIC_AVAILABLE:
            try:
                self._client = anthropic.AsyncAnthropic(api_key=self.api_key)
            except Exception as e:
                logger.error(f"Failed to initialize Anthropic Claude Client: {e}")

    @property
    def is_configured(self) -> bool:
        return self._client is not None

    async def analyze_sourcing_market(
        self,
        product_title: str,
        landed_cost_bdt: float,
        bd_avg_retail_price_bdt: float,
        estimated_margin_percent: float,
        moq: int = 1
    ) -> Dict[str, Any]:
        """
        Generates Claude commercial strategic advice for importing products from China to Bangladesh.
        """
        if not self.is_configured:
            logger.info("Claude API key not set. Returning structured simulated Claude intelligence.")
            return {
                "claude_model": "claude-3-5-sonnet (Simulated / Standby)",
                "market_positioning": f"Product '{product_title}' has a target landed cost of ৳{landed_cost_bdt:,.2f} BDT vs BD market price of ৳{bd_avg_retail_price_bdt:,.2f} BDT.",
                "commercial_viability": "HIGH" if estimated_margin_percent > 30 else ("MODERATE" if estimated_margin_percent > 15 else "LOW"),
                "risk_factors": [
                    "Customs duty tariffs variation on arrival at Chattogram / HS code check",
                    "Weight & volumetric freight discrepancies during air shipment",
                    "Competitive price war from high-volume Daraz sellers"
                ],
                "recommended_pricing_strategy": f"Set retail price between ৳{landed_cost_bdt * 1.3:,.2f} and ৳{bd_avg_retail_price_bdt * 0.95:,.2f} for fast market penetration.",
                "recommended_channels": ["Facebook Page Ads", "TikTok Live Shopping", "Daraz BD Seller Center"],
                "sourcing_tip": "Negotiate sample purchase before placing MOQ bulk order on 1688 / Pinduoduo."
            }

        prompt = f"""
You are an expert commercial trade analyst specializing in China-to-Bangladesh cross-border e-commerce and sourcing.

Analyze this sourcing opportunity:
- Product: {product_title}
- MOQ: {moq} pcs
- Landed Cost per Unit in Bangladesh: ৳{landed_cost_bdt:.2f} BDT
- Average Retail Price in BD Local Market (Daraz, FB, IG, Retail): ৳{bd_avg_retail_price_bdt:.2f} BDT
- Estimated Gross Margin: {estimated_margin_percent:.2f}%

Return a concise JSON object with the following key fields:
- "market_positioning": Summary of product competitive standing in Bangladesh
- "commercial_viability": "HIGH", "MODERATE", or "LOW"
- "risk_factors": List of 3 key logistics/regulatory/competition risks
- "recommended_pricing_strategy": Pricing advice for maximum ROI
- "recommended_channels": Array of top BD selling platforms
- "sourcing_tip": 1 actionable negotiation tip for 1688 / Pinduoduo / AliExpress
"""

        try:
            response = await self._client.messages.create(
                model=self.model,
                max_tokens=600,
                system="Respond ONLY with valid JSON. Do not include markdown code block formatting or preambles.",
                messages=[{"role": "user", "content": prompt}]
            )

            raw_text = response.content[0].text.strip()
            import json
            parsed = json.loads(raw_text)
            parsed["claude_model"] = self.model
            return parsed

        except Exception as e:
            logger.error(f"Claude API request error: {e}")
            return {
                "error": str(e),
                "claude_model": self.model,
                "commercial_viability": "UNKNOWN",
                "risk_factors": [f"API Connection Error: {str(e)}"]
            }

    async def optimize_search_keywords(self, user_query: str) -> Dict[str, Any]:
        """
        Uses Claude to expand user search queries into high-converting English and Chinese 1688 search terms.
        """
        if not self.is_configured:
            return {
                "query": user_query,
                "keywords_en": [user_query, f"wholesale {user_query}"],
                "keywords_zh": [user_query],
                "category": "General Goods"
            }

        prompt = f"""
Given the product search query: '{user_query}'
Provide a JSON response with:
- "keywords_en": 3 optimized English search terms for AliExpress
- "keywords_zh": 3 precise Simplified Chinese (简体中文) search keywords for 1688 / Pinduoduo
- "category": Target product category (e.g. Consumer Electronics, Fashion, Home & Kitchen)
"""

        try:
            response = await self._client.messages.create(
                model=self.model,
                max_tokens=300,
                system="Respond ONLY with valid JSON.",
                messages=[{"role": "user", "content": prompt}]
            )

            import json
            return json.loads(response.content[0].text.strip())
        except Exception as e:
            logger.error(f"Claude keyword optimization error: {e}")
            return {
                "query": user_query,
                "keywords_en": [user_query],
                "keywords_zh": [user_query],
                "category": "General Goods"
            }


# Singleton instance
claude_service = ClaudeService()
