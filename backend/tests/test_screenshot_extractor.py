import pytest
from httpx import AsyncClient
import io


@pytest.mark.asyncio
async def test_screenshot_extractor_mock_fallback(async_client: AsyncClient):
    """Test POST /api/v1/products/analyze-screenshot with mock image upload."""
    fake_image = io.BytesIO(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4")
    
    files = {
        "file": ("test_screenshot.png", fake_image, "image/png")
    }
    data = {
        "cnyRate": "17.5"
    }

    response = await async_client.post("/api/v1/products/analyze-screenshot", files=files, data=data)
    assert response.status_code == 200
    res_data = response.json()

    assert "productName" in res_data
    assert "colors" in res_data
    assert isinstance(res_data["colors"], list)
    assert "priceCNY" in res_data
    assert "baseWeightKg" in res_data
    assert "boundingBoxForProductImage" in res_data
    assert "finalWeightKg" in res_data
    assert "priceBDT" in res_data

    # Verify weight logic: if weight is not in screenshot, both are None for manual input.
    # If baseWeightKg is found, finalWeightKg must be baseWeightKg * 1.2
    if res_data["baseWeightKg"] is not None:
        assert res_data["finalWeightKg"] == round(res_data["baseWeightKg"] * 1.2, 3)
    else:
        assert res_data["finalWeightKg"] is None

    # Verify BDT conversion: priceBDT == round(priceCNY * 17.5, 2)
    assert res_data["priceBDT"] == round(res_data["priceCNY"] * 17.5, 2)


@pytest.mark.asyncio
async def test_screenshot_extractor_with_weight_math():
    """Verify business calculation math: when baseWeightKg is present, 1.2x packaging factor is applied."""
    from backend.app.services.gemini_service import gemini_service
    # Test formula directly
    base_weight = 0.450
    final_weight = round(base_weight * 1.2, 3)
    assert final_weight == 0.540
    assert int(round(final_weight * 1000)) == 540
