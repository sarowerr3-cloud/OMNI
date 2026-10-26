import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from backend.app.main import app
from backend.app.db.session import AsyncSessionLocal
from backend.app.models.customer import Customer, CustomerOrder


@pytest.mark.asyncio
async def test_phase8_auth_flow(async_client: AsyncClient):
    """Step 8.2: Verify register -> login -> /auth/me flow."""
    test_email = "phase8_trader@sourceiq.com"
    test_pass = "secureTr4derPass"

    # 1. Register
    reg_resp = await async_client.post(
        "/api/v1/auth/register",
        json={"email": test_email, "password": test_pass, "full_name": "Phase 8 Trader"}
    )
    assert reg_resp.status_code in (201, 409)

    # 2. Login
    login_resp = await async_client.post(
        "/api/v1/auth/login",
        json={"email": test_email, "password": test_pass}
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    assert token

    # 3. /auth/me with Bearer token
    me_resp = await async_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == test_email


@pytest.mark.asyncio
async def test_phase8_unauthenticated_endpoints_blocked(async_client: AsyncClient):
    """Step 8.2: Verify protected endpoints reject unauthenticated requests with 401."""
    resp1 = await async_client.get("/api/v1/customers")
    assert resp1.status_code == 401

    resp2 = await async_client.get("/api/v1/product-lists")
    assert resp2.status_code == 401


@pytest.mark.asyncio
async def test_phase8_cors_lockdown():
    """Step 8.4: Verify CORS does not allow unauthorized origins."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        # Request with evil origin
        resp = await client.options(
            "/api/v1/health",
            headers={
                "Origin": "https://malicious-site.com",
                "Access-Control-Request-Method": "GET"
            }
        )
        # Unauthorized origin must not be reflected as allowed
        allowed_origin = resp.headers.get("access-control-allow-origin")
        assert allowed_origin != "*"
        assert allowed_origin != "https://malicious-site.com"

        # Request with valid origin (localhost:3000)
        resp_valid = await client.options(
            "/api/v1/health",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET"
            }
        )
        assert resp_valid.headers.get("access-control-allow-origin") == "http://localhost:3000"


@pytest.mark.asyncio
async def test_phase8_database_customer_sync():
    """Step 5.3 & Step 8.2: Verify customer & order models exist in DB."""
    async with AsyncSessionLocal() as session:
        cust_result = await session.execute(select(Customer))
        customers = cust_result.scalars().all()
        # Verify database has customers synced
        assert len(customers) > 0

        orders_result = await session.execute(select(CustomerOrder))
        orders = orders_result.scalars().all()
        assert len(orders) > 0


@pytest.mark.asyncio
async def test_phase8_rate_limiting_blocks_after_5_attempts():
    """Step 8.3: Verify rate limiting blocks on the 6th attempt within a minute."""
    async with AsyncClient(
        transport=ASGITransport(app=app, client=("192.168.100.99", 50000)),
        base_url="http://test"
    ) as client:
        statuses = []
        for _ in range(6):
            res = await client.post(
                "/api/v1/auth/login",
                json={"email": "bad_actor@sourceiq.com", "password": "wrongpassword"}
            )
            statuses.append(res.status_code)

        # First 5 should be 401 Unauthorized
        assert statuses[:5] == [401, 401, 401, 401, 401]
        # 6th should be 429 Too Many Requests
        assert statuses[5] == 429

