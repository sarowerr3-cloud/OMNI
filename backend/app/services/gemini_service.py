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


class GeminiService:
    """Service to handle interactions with the Google Gemini API using the google-genai SDK."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model = settings.GEMINI_MODEL
        self._client = None

        if self.api_key and GENAI_AVAILABLE:
            try:
                self._client = genai.Client(api_key=self.api_key)
            except Exception as e:
                logger.error(f"Failed to initialize Gemini Client: {e}")

    @property
    def is_configured(self) -> bool:
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
            return json.loads(response.text)
        except Exception as e:
            logger.error(f"Gemini Vision API error: {e}")
            return {
                "error": str(e),
                "keywords_en": [],
                "keywords_zh": []
            }


# Singleton instance
gemini_service = GeminiService()
