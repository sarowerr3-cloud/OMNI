import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app


@pytest.mark.asyncio
async def test_get_live_rates():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/rates/live")
        assert response.status_code == 200
        data = response.json()
        assert "cny_to_bdt" in data
        assert "usd_to_bdt" in data
        assert data["cny_to_bdt"] > 0
        assert data["usd_to_bdt"] > 0
        assert "currency_pairs" in data
