import logging
from typing import Optional, Dict, Any
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False
    logger.warning("google-genai package not installed, running in fallback mode.")


def _is_valid_key(key: Optional[str]) -> bool:
    if not key:
        return False
    k = key.strip()
    return bool(k and not k.startswith("your_") and "placeholder" not in k.lower() and k != "none")


_UNSET = object()


class GeminiService:
    """Service to handle interactions with the Google Gemini API using the google-genai SDK."""

    def __init__(self, api_key: Any = _UNSET):
        if api_key is not _UNSET:
            self.api_key = api_key if _is_valid_key(api_key) else None
            self._explicit = True
        else:
            self.api_key = settings.GEMINI_API_KEY if _is_valid_key(settings.GEMINI_API_KEY) else None
            self._explicit = False
        self.model = settings.GEMINI_MODEL
        self._client = None
        self._init_client()

    def _init_client(self):
        if _is_valid_key(self.api_key) and GENAI_AVAILABLE:
            try:
                self._client = genai.Client(api_key=self.api_key)
            except Exception as e:
                logger.error(f"Failed to initialize Gemini Client: {e}")

    def configure(self, api_key: Optional[str] = None, model: Optional[str] = None):
        from backend.app.core.config import get_settings
        current_settings = get_settings()
        target_key = api_key if api_key is not None else current_settings.GEMINI_API_KEY
        self.api_key = target_key if _is_valid_key(target_key) else None
        self._explicit = api_key is not None
        if model or current_settings.GEMINI_MODEL:
            self.model = model or current_settings.GEMINI_MODEL
        self._client = None
        self._init_client()

    @property
    def is_configured(self) -> bool:
        if self._client is None and not self._explicit:
            from backend.app.core.config import get_settings
            get_settings.cache_clear()
            fresh_settings = get_settings()
            key_to_use = self.api_key or fresh_settings.GEMINI_API_KEY
            if _is_valid_key(key_to_use):
                self.api_key = key_to_use
                self.model = fresh_settings.GEMINI_MODEL
                self._init_client()
        return self._client is not None

    async def translate_text(self, text: str, target_lang: str = "English") -> str:
        """Translate product titles or descriptions to target language."""
        if not self.is_configured:
            logger.info("Gemini API key not configured. Returning mock translation.")
            return f"[Mock {target_lang}] {text}"

        prompt = f"Translate the following product text into clear {target_lang}. Return ONLY the translation:\n\n{text}"
        try:
            response = self._client.models.generate_content(
                model=self.model,
                contents=prompt
            )
            return response.text.strip()
        except Exception as e:
            logger.error(f"Gemini API error during translation: {e}")
            return text

    async def analyze_product_image(self, image_bytes: bytes, mime_type: str = "image/jpeg") -> Dict[str, Any]:
        """Analyze product image to produce keywords in English and Chinese, plus visual summary."""
        if not self.is_configured:
            return {
                "description_en": "Mock product image description",
                "description_zh": "模拟商品图片描述",
                "keywords_en": ["sample product", "mock item"],
                "keywords_zh": ["样品", "测试商品"],
                "estimated_weight_kg": 0.5
            }

        prompt = (
            "Analyze this product image. Provide a JSON response with:\n"
            "- 'description_en': Short English description\n"
            "- 'description_zh': Short Simplified Chinese description for sourcing\n"
            "- 'keywords_en': List of 3-5 English search keywords\n"
            "- 'keywords_zh': List of 3-5 Chinese search keywords (for 1688/Taobao)\n"
            "- 'estimated_weight_kg': Estimated weight in kg (number or null)"
        )

        try:
            image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
            response = self._client.models.generate_content(
                model=self.model,
                contents=[prompt, image_part],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            import json
        except Exception as e:
            logger.error(f"Gemini Vision API error: {e}")
            return {
                "error": str(e),
                "keywords_en": [],
                "keywords_zh": []
            }

    async def analyze_screenshot(
        self,
        image_bytes: bytes,
        mime_type: str = "image/jpeg",
        exchange_rate: float = 20.0
    ) -> Dict[str, Any]:
        """Extract structured product details from e-commerce screenshots (1688, AliExpress, PDD)."""
        if not self.is_configured:
            return {
                "isProductScreenshot": False,
                "productName": "No data found",
                "colors": [],
                "priceCNY": None,
                "baseWeightKg": None,
                "boundingBoxForProductImage": None,
                "exchangeRate": exchange_rate,
                "priceBDT": None,
                "finalWeightKg": None,
                "finalWeightGm": None,
                "platformDetected": "Other",
                "isAiPowered": False,
                "note": "AI key not configured (No data found)"
            }

        prompt = (
            "You are an expert AI sourcing vision analyst for Chinese e-commerce platforms (1688.com, AliExpress, Pinduoduo, Taobao).\n"
            "Analyze the provided image and extract structured information with extreme accuracy and ZERO fabrication.\n\n"
            "E-COMMERCE SCREENSHOT TYPES TO RECOGNIZE (isProductScreenshot: true):\n"
            "1. Main Product Listing / Detail Page: Displays product title, showcase photo, price, supplier info.\n"
            "2. SKU / Variant Selection Drawer (选规格 / 立即购买弹窗): In mobile apps, when picking color/size, a drawer opens with dark backdrop on top. It shows thumbnail photo, price (e.g. ¥58.9 or ¥68.0), selected text ('已选: 黑色, 40'), and option buttons. THIS IS 100% A VALID PRODUCT SCREENSHOT (isProductScreenshot: true)! If formal title is obscured, generate a descriptive English title from photo & options (e.g. 'Lightweight Breathable Running Shoes').\n\n"
            "CRITICAL NON-PRODUCT / RANDOM IMAGE DETECTION:\n"
            "- If the image is NOT an e-commerce product screenshot (e.g. personal photo, scenery, random document, app UI, meme, chart, or receipt without product details):\n"
            "  * Set 'isProductScreenshot': false\n"
            "  * Set 'productName': 'No data found'\n"
            "  * Set 'priceCNY': null\n"
            "  * Set 'colors': []\n"
            "  * Set 'baseWeightKg': null\n"
            "  * Set 'boundingBoxForProductImage': null\n"
            "  * Return immediately without fabricating data.\n\n"
            "REQUIREMENTS:\n"
            "1. 'productName': Translate or describe the product in clear, professional English. If completely unrelated, return 'No data found'.\n"
            "2. 'colors': Extract ONLY actively selected color, model, or style variants indicated in the screenshot. If none selected, return empty list [].\n"
            "3. 'priceCNY': Extract the item price in Chinese Yuan (CNY / RMB ¥) as a number ONLY if visibly and explicitly printed on the screenshot. If no price is clearly printed, return null. NEVER fabricate a price.\n"
            "4. 'baseWeightKg': Extract base weight in kg ONLY if explicitly printed on the screenshot. If not found, return null.\n"
            "5. 'boundingBoxForProductImage': Percentage bounding box {'ymin': 0-100, 'xmin': 0-100, 'ymax': 0-100, 'xmax': 0-100} for product image, or null if not a product.\n"
            "6. 'platform': Detect platform: '1688', 'AliExpress', 'Pinduoduo', 'Taobao', or 'Other'.\n\n"
            "You MUST strictly return a valid JSON object matching this schema:\n"
            "{\n"
            '  "isProductScreenshot": true,\n'
            '  "productName": "Descriptive English name of the product",\n'
            '  "colors": ["Selected variant in English"],\n'
            '  "priceCNY": 68.90,\n'
            '  "baseWeightKg": null,\n'
            '  "boundingBoxForProductImage": {\n'
            '    "ymin": 12,\n'
            '    "xmin": 12,\n'
            '    "ymax": 60,\n'
            '    "xmax": 88\n'
            '  },\n'
            '  "platform": "Pinduoduo"\n'
            "}"
        )

        candidate_models = [self.model, "gemini-3-flash-preview", "gemini-3.5-flash", "gemini-3.8-flash", "gemini-flash-latest"]
        image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
        last_err = None

        for m in candidate_models:
            if not m:
                continue
            try:
                response = self._client.models.generate_content(
                    model=m,
                    contents=[prompt, image_part],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json"
                    )
                )
                import json
                data = json.loads(response.text)
                raw_price = data.get("priceCNY")
                has_price = isinstance(raw_price, (int, float)) and raw_price > 0
                has_title = bool(data.get("productName") and data.get("productName").lower() != "no data found")
                has_variants = bool(data.get("colors"))
                
                is_product = data.get("isProductScreenshot", True) and (has_title or has_price or has_variants)
                
                price_cny = float(raw_price) if (is_product and has_price) else None
                price_bdt = round(price_cny * exchange_rate, 2) if price_cny is not None else None

                raw_weight = data.get("baseWeightKg")
                has_weight = is_product and isinstance(raw_weight, (int, float)) and raw_weight > 0
                base_weight = float(raw_weight) if has_weight else None
                final_weight = round(base_weight * 1.2, 3) if base_weight is not None else None
                final_weight_gm = int(round(final_weight * 1000)) if final_weight is not None else None

                name = data.get("productName", "No data found")
                if is_product and (not name or name.lower() == "no data found"):
                    name = "Imported Sourced Product"

                return {
                    "isProductScreenshot": is_product,
                    "productName": name if is_product else "No data found",
                    "colors": (data.get("colors") or []) if is_product else [],
                    "priceCNY": price_cny,
                    "baseWeightKg": base_weight,
                    "boundingBoxForProductImage": data.get("boundingBoxForProductImage") if is_product else None,
                    "exchangeRate": exchange_rate,
                    "priceBDT": price_bdt,
                    "finalWeightKg": final_weight,
                    "finalWeightGm": final_weight_gm,
                    "platformDetected": data.get("platform", "Other" if not is_product else "1688"),
                    "isAiPowered": True,
                    "note": f"Live extracted with {m}"
                }
            except Exception as e:
                logger.warning(f"Model {m} failed in analyze_screenshot: {e}")
                last_err = e

        logger.error(f"All Gemini models failed in analyze_screenshot: {last_err}")
        return {
            "isProductScreenshot": False,
            "productName": "No data found",
            "colors": [],
            "priceCNY": None,
            "baseWeightKg": None,
            "boundingBoxForProductImage": None,
            "exchangeRate": exchange_rate,
            "priceBDT": None,
            "finalWeightKg": None,
            "finalWeightGm": None,
            "platformDetected": "Other",
            "isAiPowered": False,
            "error": str(last_err)
        }



# Singleton instance
gemini_service = GeminiService()

