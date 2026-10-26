import os
import socket
import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from backend.app.core.config import get_settings
from backend.app.db.base import Base

logger = logging.getLogger(__name__)
settings = get_settings()

db_url = settings.DATABASE_URL
# Normalize common deployment URLs (e.g. Render / Heroku postgres:// -> postgresql+asyncpg://)
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif db_url.startswith("postgresql://") and "+asyncpg" not in db_url:
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# If DATABASE_URL targets Docker hostname 'postgres' but running outside Docker
if "@postgres:" in db_url or "@postgres/" in db_url:
    try:
        socket.gethostbyname("postgres")
    except socket.gaierror:
        # Resolve test.db relative to backend root
        backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        local_db_path = os.path.join(backend_dir, "test.db").replace("\\", "/")
        db_url = f"sqlite+aiosqlite:///{local_db_path}"
        logger.info(f"Docker postgres unresolvable. Using local SQLite at: {db_url}")
elif "sqlite" in db_url and "./test.db" in db_url:
    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    local_db_path = os.path.join(backend_dir, "test.db").replace("\\", "/")
    db_url = f"sqlite+aiosqlite:///{local_db_path}"

engine_kwargs = {
    "echo": False,
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

_tables_initialized = False


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    global _tables_initialized
    if not _tables_initialized:
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            _tables_initialized = True
        except Exception as e:
            logger.warning(f"Auto table init encountered: {e}")

    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
