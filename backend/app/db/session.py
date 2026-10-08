from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from backend.app.core.config import get_settings

settings = get_settings()

db_url = settings.DATABASE_URL
# Normalize common deployment URLs (e.g. Render / Heroku postgres:// -> postgresql+asyncpg://)
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif db_url.startswith("postgresql://") and "+asyncpg" not in db_url:
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

engine_kwargs = {
    "echo": settings.ENVIRONMENT == "development",
    "future": True,
}

if "sqlite" not in db_url:
    engine_kwargs.update({
        "pool_pre_ping": True,
        "pool_size": 10,
        "max_overflow": 20,
    })

engine = create_async_engine(db_url, **engine_kwargs)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
