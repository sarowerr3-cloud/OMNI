import pytest


@pytest.mark.asyncio
async def test_login_success(async_client):
    response = await async_client.post(
        "/auth/login",
        json={"email": "admin@sourceiq.com", "password": "admin123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "admin"
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_failure(async_client):
    response = await async_client.post(
        "/auth/login",
        json={"email": "admin@sourceiq.com", "password": "wrongpassword"}
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_me_with_valid_token(async_client):
    # First login
    login_resp = await async_client.post(
        "/auth/login",
        json={"email": "user@sourceiq.com", "password": "user123"}
    )
    token = login_resp.json()["access_token"]

    # Access /auth/me
    headers = {"Authorization": f"Bearer {token}"}
    me_resp = await async_client.get("/auth/me", headers=headers)
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["email"] == "user@sourceiq.com"
    assert me_data["role"] == "user"
