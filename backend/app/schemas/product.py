from decimal import Decimal
from typing import Optional, List, Dict
from pydantic import BaseModel, HttpUrl


class ProductBase(BaseModel):
    platform: str  # "AliExpress", "1688", "Pinduoduo", "Daraz_BD", "Facebook", "Instagram", "TikTok", "Offline_Retail"
    title_original: str
    title_en: Optional[str] = None
    price: Decimal
    currency: str = "RMB"  # "RMB", "USD", "BDT"
    price_bdt: Optional[Decimal] = None
    moq: int = 1
    url: Optional[str] = None
    images: List[str] = []
    videos: List[str] = []
    specs: Dict[str, str] = {}
    seller_name: Optional[str] = None
    seller_rating: Optional[float] = None
    weight_kg: Optional[Decimal] = None
    dimensions: Optional[str] = None
    is_local_bd_market: bool = False  # True for local BD benchmarks, False for China sourcing


class LocalMarketBenchmark(BaseModel):
    platform: str  # "Daraz BD", "Facebook Page", "Instagram Shop", "TikTok Seller", "Offline Retail Store"
    seller_or_store: str
    price_bdt: Decimal
    listing_url: Optional[str] = None
    source_type: str  # "e-commerce", "social_media", "retail"
    notes: Optional[str] = None


class CostBreakdown(BaseModel):
    item_price_bdt: Decimal
    domestic_china_shipping_bdt: Decimal
    agent_fee_bdt: Decimal
    international_freight_bdt: Decimal
    duty_vat_bdt: Decimal
    payment_fee_bdt: Decimal
    total_landed_cost: Decimal
    per_unit_landed_cost: Decimal


class MarketMarginAnalysis(BaseModel):
    per_unit_landed_cost: Decimal
    local_bd_market_avg_price: Decimal
    local_bd_market_min_price: Decimal
    local_bd_market_max_price: Decimal
    estimated_net_profit: Decimal
    gross_margin_percent: Decimal
    roi_percent: Decimal
    break_even_quantity: int
    local_benchmarks: List[LocalMarketBenchmark]
