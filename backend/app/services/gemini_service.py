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
        exchange_rate: float = 17.5
    ) -> Dict[str, Any]:
        """Extract structured product details from e-commerce screenshots (1688, AliExpress, PDD)."""
        if not self.is_configured:
            price_cny = 45.50
            return {
                "productName": "Ultra 8 NFC Smart Watch with HD AMOLED Display & Waterproof Strap",
                "colors": ["Midnight Black", "Starlight Silver", "Alpine Orange"],
                "priceCNY": price_cny,
                "baseWeightKg": None,
                "boundingBoxForProductImage": {
                    "ymin": 12,
                    "xmin": 12,
                    "ymax": 60,
                    "xmax": 88
                },
                "exchangeRate": exchange_rate,
                "priceBDT": round(price_cny * exchange_rate, 2),
                "finalWeightKg": None,
                "finalWeightGm": None,
                "platformDetected": "1688",
                "isAiPowered": False,
                "note": "Mock extraction (add GEMINI_API_KEY for live Gemini Vision analysis)"
            }

        prompt = (
            "You are an expert AI sourcing vision analyst for Chinese e-commerce platforms (1688.com, AliExpress, Pinduoduo, Taobao).\n"
            "Analyze the provided product screenshot and extract structured information.\n\n"
            "REQUIREMENTS:\n"
            "1. 'productName': Translate the Chinese or foreign product title into a clear, attractive, professional English product title.\n"
            "2. 'colors': Extract all visible color, model, or style variants shown in the screenshot, translated into English as a list of strings.\n"
            "3. 'priceCNY': Extract the original item price in Chinese Yuan (CNY / RMB ¥) as a number (e.g. 45.5). If a range is shown, use the standard single unit price.\n"
            "4. 'baseWeightKg': Extract the base product weight in kg ONLY if it is explicitly written or shown in the screenshot (look in specs, parameter table, packaging details, or title: e.g. '重量', '单件重量', '毛重', '净重', '500g' -> 0.5, '350克' -> 0.35, '1.2kg' -> 1.2).\n"
            "   CRITICAL RULE: If the weight is NOT explicitly written or found anywhere on the screenshot, you MUST return null. Do NOT guess, do NOT estimate, and do NOT provide any default or automatic base weight.\n"
            "5. 'boundingBoxForProductImage': Detect the bounding box for the main primary product showcase photo/thumbnail in the screenshot as percentage numbers 0-100: "
            "{'ymin': 0-100, 'xmin': 0-100, 'ymax': 0-100, 'xmax': 0-100}.\n"
            "6. 'platform': Detect platform: '1688', 'AliExpress', 'Pinduoduo', 'Taobao', or 'Other'.\n\n"
            "You MUST strictly return a valid JSON object matching this schema:\n"
            "{\n"
            '  "productName": "Translated English name of the product",\n'
            '  "colors": ["Color 1 in English", "Color 2 in English"],\n'
            '  "priceCNY": 45.50,\n'
            '  "baseWeightKg": null,\n'
            '  "boundingBoxForProductImage": {\n'
            '    "ymin": 12,\n'
            '    "xmin": 12,\n'
            '    "ymax": 60,\n'
            '    "xmax": 88\n'
            '  },\n'
            '  "platform": "1688"\n'
            "}"
        )

        candidate_models = [self.model, "gemini-3-flash-preview", "gemini-3.8-flash", "gemini-2.5-pro"]
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
                price_cny = float(data.get("priceCNY") or 45.50)
                raw_weight = data.get("baseWeightKg")
                has_weight = isinstance(raw_weight, (int, float)) and raw_weight > 0
                base_weight = float(raw_weight) if has_weight else None
                final_weight = round(base_weight * 1.2, 3) if base_weight is not None else None
                final_weight_gm = int(round(final_weight * 1000)) if final_weight is not None else None

                return {
                    "productName": data.get("productName", "Imported Sourced Product"),
                    "colors": data.get("colors") or ["Standard"],
                    "priceCNY": price_cny,
                    "baseWeightKg": base_weight,
                    "boundingBoxForProductImage": data.get("boundingBoxForProductImage") or {
                        "ymin": 10, "xmin": 10, "ymax": 60, "xmax": 90
                    },
                    "exchangeRate": exchange_rate,
                    "priceBDT": round(price_cny * exchange_rate, 2),
                    "finalWeightKg": final_weight,
                    "finalWeightGm": final_weight_gm,
                    "platformDetected": data.get("platform", "1688"),
                    "isAiPowered": True,
                    "note": f"Live extracted with {m}"
                }
            except Exception as e:
                logger.warning(f"Model {m} failed in analyze_screenshot: {e}")
                last_err = e

        logger.error(f"All Gemini models failed in analyze_screenshot: {last_err}")
        price_cny = 45.50
        return {
            "productName": "Imported Sourced Item (Fallback)",
            "colors": ["Standard Edition"],
            "priceCNY": price_cny,
            "baseWeightKg": None,
            "boundingBoxForProductImage": {"ymin": 10, "xmin": 10, "ymax": 60, "xmax": 90},
            "exchangeRate": exchange_rate,
            "priceBDT": round(price_cny * exchange_rate, 2),
            "finalWeightKg": None,
            "finalWeightGm": None,
            "platformDetected": "1688",
            "isAiPowered": False,
            "error": str(last_err)
        }



# Singleton instance
gemini_service = GeminiService()

