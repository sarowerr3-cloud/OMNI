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
