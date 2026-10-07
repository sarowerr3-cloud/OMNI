import pytest
from backend.app.services.gemini_service import GeminiService


@pytest.mark.asyncio
async def test_gemini_service_mock_fallback():
    # Test service in mock mode (no API key provided)
    service = GeminiService(api_key=None)
    assert service.is_configured is False

    translation = await service.translate_text("测试商品")
    assert "[Mock English]" in translation or "测试商品" in translation

    analysis = await service.analyze_product_image(b"fake_image_bytes")
    assert "keywords_en" in analysis
    assert "keywords_zh" in analysis
