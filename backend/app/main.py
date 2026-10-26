import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from backend.app.core.config import get_settings
from backend.app.core.middleware import setup_middleware
from backend.app.api.router import api_router
from backend.app.db.base import Base
from backend.app.db.session import engine, AsyncSessionLocal
from backend.app.db.user_crud import ensure_seed_users

from backend.app.db.customer_sync import sync_customers_to_db

# Ensure models are imported so Base.metadata knows about them
import backend.app.models.user  # noqa: F401
import backend.app.models.customer  # noqa: F401

logger = logging.getLogger(__name__)
settings = get_settings()

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    try:
        # Automatically initialize database schema if needed (SQLite/dev)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        # Ensure default seed users and customer data exist in database
        async with AsyncSessionLocal() as session:
            await ensure_seed_users(session)
            await sync_customers_to_db(session)
        logger.info("Database schema, seed users & customer records verified on startup.")
    except Exception as e:
        logger.warning(f"Database initialization during startup encountered: {e}")
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    openapi_url="/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS and application middlewares
setup_middleware(app, settings)


@app.middleware("http")
async def legacy_route_compatibility(request: Request, call_next):
    """Seamlessly handle requests made without /api/v1 prefix without duplicate router registration."""
    path = request.url.path
    if (
        not path.startswith("/api/v1")
        and not path.startswith("/docs")
        and not path.startswith("/redoc")
        and not path.startswith("/openapi.json")
        and path != "/"
    ):
        request.scope["path"] = f"/api/v1{path}"
    return await call_next(request)


# Single versioned router (/api/v1)
app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "message": "Welcome to OMNI Sourcing & Costing API",
        "version": "1.0.0",
        "api_v1": "/api/v1",
        "docs": "/docs",
        "health": "/api/v1/health"
    }
