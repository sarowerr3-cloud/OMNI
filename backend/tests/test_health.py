import pytest


@pytest.mark.asyncio
async def test_health_endpoint(async_client):
    response = await async_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "OMNI"
    assert data["ai_provider"] == "google-gemini"
    assert "gemini_configured" in data


@pytest.mark.asyncio
async def test_api_v1_health_endpoint(async_client):
    response = await async_client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


@pytest.mark.asyncio
async def test_root_endpoint(async_client):
    response = await async_client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["version"] == "1.0.0"
    assert data["api_v1"] == "/api/v1"
    assert "docs" in data
