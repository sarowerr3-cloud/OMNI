from fastapi import FastAPI
from backend.app.core.config import get_settings
from backend.app.core.middleware import setup_middleware
from backend.app.api.router import api_router

settings = get_settings()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    openapi_url="/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS and middlewares
setup_middleware(app, settings)

# Primary versioned router (/api/v1)
app.include_router(api_router, prefix="/api/v1")

# Legacy / root-level router for backwards compatibility with existing clients
app.include_router(api_router)


@app.get("/")
async def root():
    return {
        "message": "Welcome to OMNI Sourcing & Costing API",
        "version": "1.0.0",
        "api_v1": "/api/v1",
        "docs": "/docs",
        "health": "/health"
    }
