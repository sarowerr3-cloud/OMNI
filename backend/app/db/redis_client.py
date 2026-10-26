import json
import logging
from typing import Any, Optional
from backend.app.core.config import get_settings

logger = logging.getLogger(__name__)

try:
    import redis.asyncio as aioredis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    logger.warning("redis package not installed, caching will run in fallback no-op mode.")

_redis_client = None


async def get_redis():
    """Return a shared async Redis connection, or None if Redis is unavailable."""
    global _redis_client
    if not REDIS_AVAILABLE:
        return None
    if _redis_client is None:
        try:
            settings = get_settings()
            _redis_client = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=2
            )
            await _redis_client.ping()
        except Exception as e:
            logger.debug(f"Redis unavailable, in-memory/no-op caching active: {e}")
            _redis_client = None
    return _redis_client


async def cache_get(key: str) -> Optional[Any]:
    """Get a JSON-decoded value from Redis cache."""
    redis = await get_redis()
    if not redis:
        return None
    try:
        value = await redis.get(key)
        return json.loads(value) if value else None
    except Exception as e:
        logger.debug(f"Redis GET failed for key '{key}': {e}")
        return None


async def cache_set(key: str, value: Any, ttl_seconds: int = 86400) -> None:
    """Store a JSON-encoded value in Redis with TTL."""
    redis = await get_redis()
    if not redis:
        return
    try:
        await redis.set(key, json.dumps(value, default=str), ex=ttl_seconds)
    except Exception as e:
        logger.debug(f"Redis SET failed for key '{key}': {e}")
