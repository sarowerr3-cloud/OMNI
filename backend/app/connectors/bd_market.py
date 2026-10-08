import json
import logging
from decimal import Decimal
from typing import List
from backend.app.connectors.base import AbstractBDMarketConnector
from backend.app.schemas.product import LocalMarketBenchmark
from backend.app.services.gemini_service import gemini_service

logger = logging.getLogger(__name__)

# Check if google-genai types are available for grounded search
try:
    from google.genai import types as genai_types
    GENAI_TYPES_AVAILABLE = True
except ImportError:
    GENAI_TYPES_AVAILABLE = False


class BDMarketConnector(AbstractBDMarketConnector):
    """BD Market connector that benchmarks local BD selling prices across Daraz, FB, Instagram, TikTok & offline stores.
    
    When Gemini API is configured, uses Google Search grounding to find real-time
    Bangladesh market prices. Falls back to realistic mock data otherwise.
    """

    async def search_local_market(self, query: str, limit: int = 5) -> List[LocalMarketBenchmark]:
        """Search local BD market value across multiple channels."""

        # Attempt real Gemini Grounded Search for live BD market prices
        if gemini_service.is_configured and GENAI_TYPES_AVAILABLE:
            try:
                grounded_results = await self._search_with_gemini_grounding(query, limit)
                if grounded_results and len(grounded_results) >= 2:
                    logger.info(f"Gemini grounded search returned {len(grounded_results)} BD market results for '{query}'")
                    return grounded_results[:limit]
                else:
                    logger.warning(f"Gemini grounded search returned insufficient results for '{query}', falling back to mock data")
            except Exception as e:
                logger.error(f"Gemini grounded search failed for BD market '{query}': {e}")

        # Fallback: Return realistic mock BD market price points
        return self._generate_mock_benchmarks(query, limit)

    async def _search_with_gemini_grounding(self, query: str, limit: int = 5) -> List[LocalMarketBenchmark]:
        """Use Gemini with Google Search grounding to find real Bangladesh market prices."""
        prompt = (
            f"Search for the current retail selling price of '{query}' in Bangladesh in BDT (৳).\n"
            f"Look at these platforms: Daraz BD, Facebook Marketplace/Pages, Instagram shops, TikTok Shop BD, "
            f"and estimate offline retail store prices in Dhaka (Bashundhara City, Multiplan Center, New Market).\n\n"
            f"Return a JSON array of {limit} objects, each with these exact keys:\n"
            f"- \"platform\": string (e.g. \"Daraz BD\", \"Facebook Page / Shop\", \"Instagram Shop\", \"TikTok Seller\", \"Offline Retail Store\")\n"
            f"- \"seller_or_store\": string (specific shop/seller name)\n"
            f"- \"price_bdt\": number (price in BDT, no currency symbol)\n"
            f"- \"listing_url\": string or null (URL if available)\n"
            f"- \"source_type\": string (\"e-commerce\", \"social_media\", or \"retail\")\n"
            f"- \"notes\": string or null (delivery info, condition, etc.)\n\n"
            f"Return ONLY the JSON array, no other text."
        )

        try:
            response = gemini_service._client.models.generate_content(
                model=gemini_service.model,
                contents=prompt,
                config=genai_types.GenerateContentConfig(
                    response_mime_type="application/json",
                    tools=[genai_types.Tool(google_search=genai_types.GoogleSearch())]
                )
            )

            raw_text = response.text.strip()
            parsed = json.loads(raw_text)

            if not isinstance(parsed, list):
                logger.warning(f"Gemini grounded search returned non-list: {type(parsed)}")
                return []

            benchmarks = []
            for item in parsed:
                try:
                    price_bdt = Decimal(str(item.get("price_bdt", 0)))
                    if price_bdt <= 0:
                        continue
                    benchmarks.append(
                        LocalMarketBenchmark(
                            platform=item.get("platform", "Unknown Platform"),
                            seller_or_store=item.get("seller_or_store", "Unknown Seller"),
                            price_bdt=price_bdt,
                            listing_url=item.get("listing_url"),
                            source_type=item.get("source_type", "e-commerce"),
                            notes=item.get("notes")
                        )
                    )
                except (ValueError, TypeError) as e:
                    logger.warning(f"Skipping invalid BD market benchmark item: {e}")
                    continue

            return benchmarks

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini grounded search JSON for BD market: {e}")
            return []
        except Exception as e:
            logger.error(f"Gemini grounded search API call failed: {e}")
            return []

    def _generate_mock_benchmarks(self, query: str, limit: int = 5) -> List[LocalMarketBenchmark]:
        """Generate realistic mock BD market benchmarks as fallback."""
        base_mock_price = Decimal("1500.00")

        benchmarks = [
            LocalMarketBenchmark(
                platform="Daraz BD",
                seller_or_store="TechGadgets BD (Verified Mall)",
                price_bdt=base_mock_price,
                listing_url="https://www.daraz.com.bd/products/sample-item-i12345.html",
                source_type="e-commerce",
                notes="Free shipping in Dhaka city"
            ),
            LocalMarketBenchmark(
                platform="Facebook Page / Shop",
                seller_or_store="Gadget Zone Bangladesh",
                price_bdt=base_mock_price - Decimal("100.00"),  # ৳1400
                listing_url="https://www.facebook.com/gadgetzonebd/posts/987654",
                source_type="social_media",
                notes="Delivery ৳70 inside Dhaka, ৳130 outside"
            ),
            LocalMarketBenchmark(
                platform="Instagram Shop",
                seller_or_store="@trendy_imports_bd",
                price_bdt=base_mock_price + Decimal("100.00"),  # ৳1600
                listing_url="https://www.instagram.com/p/Cxyz123/",
                source_type="social_media",
                notes="Pre-order item, cash on delivery"
            ),
            LocalMarketBenchmark(
                platform="TikTok Seller",
                seller_or_store="@bd_smart_shopping",
                price_bdt=base_mock_price - Decimal("50.00"),  # ৳1450
                listing_url="https://www.tiktok.com/@bd_smart_shopping/video/7890123",
                source_type="social_media",
                notes="Featured on TikTok Shop live stream"
            ),
            LocalMarketBenchmark(
                platform="Offline Retail Store",
                seller_or_store="Multiplan Center / Bashundhara City Retail",
                price_bdt=base_mock_price + Decimal("200.00"),  # ৳1700
                listing_url=None,
                source_type="retail",
                notes="Physical store retail counter price"
            )
        ]

        return benchmarks[:limit]


bd_market_connector = BDMarketConnector()
