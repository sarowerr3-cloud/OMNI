from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import Settings


def setup_middleware(app: FastAPI, settings: Settings) -> None:
    """Configure CORS and application-wide middlewares."""
    # CORS Configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
