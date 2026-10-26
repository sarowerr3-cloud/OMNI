import time
import logging
from typing import Dict, Any
from fastapi import APIRouter
import httpx
from backend.app.db.redis_client import cache_get, cache_set

router = APIRouter(prefix="/rates", tags=["Exchange Rates"])
logger = logging.getLogger(__name__)

RATE_CACHE_KEY = "rates:live:cny"
CACHE_TTL_SECONDS = 3600

# In-memory fallback cache if Redis is offline
_FALLBACK_CACHE: Dict[str, Any] = {
    "data": None,
    "last_fetched": 0,
}

# Default benchmark rates for China-to-Bangladesh trade
DEFAULT_RATES = {
    "cny_to_bdt": 20.00,
    "cny_to_bdt_interbank": 17.15,
    "usd_to_bdt": 121.50,
    "rmb_import_premium_pct": 16.5,  # Real-world agent/LC remittance spread over mid-market
    "currency_pairs": {
        "CNY_BDT": 20.00,
        "USD_BDT": 121.50,
        "HKD_BDT": 15.55,
        "EUR_BDT": 132.00,
    },
    "source": "fallback_defaults",
    "updated_at": int(time.time()),
}


@router.get("/live")
async def get_live_rates():
    """
    Fetch live exchange rates for China and international sourcing to Bangladesh BDT.
    Provides interbank rates and commercial landed agent settlement rates.
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

                if cny_to_bdt_raw:
                    interbank = round(float(cny_to_bdt_raw), 2)
                    commercial_rate = round(interbank * 1.165, 2)
                    usd_to_bdt = round((float(cny_to_bdt_raw) / float(cny_to_usd_raw)), 2) if cny_to_usd_raw else 121.50

                    result = {
                        "cny_to_bdt": commercial_rate,
                        "cny_to_bdt_interbank": interbank,
                        "usd_to_bdt": usd_to_bdt,
                        "rmb_import_premium_pct": 16.5,
                        "currency_pairs": {
                            "CNY_BDT": commercial_rate,
                            "USD_BDT": usd_to_bdt,
                        },
                        "source": "live_exchange_feed",
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
