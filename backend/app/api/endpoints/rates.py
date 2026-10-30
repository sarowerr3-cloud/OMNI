import time
import logging
from typing import Dict, Any
from fastapi import APIRouter
import httpx
from backend.app.db.redis_client import cache_get, cache_set

router = APIRouter(prefix="/rates", tags=["Exchange Rates"])
logger = logging.getLogger(__name__)

RATE_CACHE_KEY = "rates:live:cny:v2"
CACHE_TTL_SECONDS = 3600

# In-memory fallback cache if Redis is offline
_FALLBACK_CACHE: Dict[str, Any] = {
    "data": None,
    "last_fetched": 0,
}

# Default benchmark rates for China-to-Bangladesh trade (Fixed 1 RMB = 20 BDT)
DEFAULT_RATES = {
    "cny_to_bdt": 20.00,
    "cny_to_bdt_interbank": 20.00,
    "usd_to_bdt": 121.50,
    "rmb_import_premium_pct": 0.0,
    "currency_pairs": {
        "CNY_BDT": 20.00,
        "USD_BDT": 121.50,
        "HKD_BDT": 15.55,
        "EUR_BDT": 132.00,
    },
    "source": "fixed_trade_rate",
    "updated_at": int(time.time()),
}


@router.get("/live")
async def get_live_rates():
    """
    Fetch live exchange rates for China and international sourcing to Bangladesh BDT.
    RMB rate is configured to 20.00 BDT per requirement.
    Cached with a 1-hour TTL via Redis (with in-memory fallback).
    """
    now = time.time()

    # 1. Try Redis cache
    cached = await cache_get(RATE_CACHE_KEY)
    if cached:
        return {**cached, "cached": True}

    # 2. Try in-memory fallback cache
    if _FALLBACK_CACHE["data"] and (now - _FALLBACK_CACHE["last_fetched"] < CACHE_TTL_SECONDS):
        return {**_FALLBACK_CACHE["data"], "cached": True}

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get("https://open.er-api.com/v6/latest/CNY")
            if resp.status_code == 200:
                data = resp.json()
                rates = data.get("rates", {})
                cny_to_bdt_raw = rates.get("BDT")
                cny_to_usd_raw = rates.get("USD")

                usd_to_bdt = round((float(cny_to_bdt_raw) / float(cny_to_usd_raw)), 2) if (cny_to_bdt_raw and cny_to_usd_raw) else 121.50

                result = {
                    "cny_to_bdt": 20.00,
                    "cny_to_bdt_interbank": 20.00,
                    "usd_to_bdt": usd_to_bdt,
                    "rmb_import_premium_pct": 0.0,
                    "currency_pairs": {
                        "CNY_BDT": 20.00,
                        "USD_BDT": usd_to_bdt,
                    },
                    "source": "fixed_rate_20",
                    "updated_at": int(now),
                    "cached": False,
                }
                _FALLBACK_CACHE["data"] = result
                _FALLBACK_CACHE["last_fetched"] = now
                await cache_set(RATE_CACHE_KEY, result, ttl_seconds=CACHE_TTL_SECONDS)
                return result
    except Exception as exc:
        logger.warning(f"Failed to fetch live FX rate, using defaults: {exc}")

    # Fallback if network fails
    fallback_data = {**DEFAULT_RATES, "updated_at": int(now), "cached": False}
    _FALLBACK_CACHE["data"] = fallback_data
    _FALLBACK_CACHE["last_fetched"] = now
    await cache_set(RATE_CACHE_KEY, fallback_data, ttl_seconds=CACHE_TTL_SECONDS)
    return fallback_data
