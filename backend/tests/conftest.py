import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.core.security import create_access_token
from backend.app.db.session import engine, AsyncSessionLocal
from backend.app.db.base import Base
from backend.app.db.user_crud import ensure_seed_users
from backend.app.db.customer_sync import sync_customers_to_db


@pytest.fixture(autouse=True)
async def init_test_db():
    """Ensure database schema, seed users, and initial customer records are present."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as session:
        await ensure_seed_users(session)
        await sync_customers_to_db(session)


@pytest.fixture
async def async_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.fixture
def auth_token():
    return create_access_token(subject="admin@sourceiq.com", role="admin")


@pytest.fixture
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture
async def authenticated_client(async_client, auth_headers):
    async_client.headers.update(auth_headers)
    return async_client
