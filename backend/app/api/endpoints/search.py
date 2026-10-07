import asyncio
from decimal import Decimal
from typing import Optional, List
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from backend.app.schemas.product import ProductBase, CostBreakdown, MarketMarginAnalysis, LocalMarketBenchmark
from backend.app.connectors.sourcing import aliexpress_connector, connector_1688, pdd_connector
from backend.app.connectors.bd_market import bd_market_connector
from backend.app.services.cost_engine import cost_engine
from backend.app.services.pricing_engine import pricing_engine

router = APIRouter()


class SearchRequest(BaseModel):
    query: str
    quantity: int = 10
    shipping_method: str = "air"  # "air" or "sea"
    user_weight_kg: Optional[float] = None


class SourcedProductResult(BaseModel):
    product: ProductBase
    cost_breakdown: CostBreakdown
    market_analysis: MarketMarginAnalysis


class SearchResponse(BaseModel):
    query: str
    quantity: int
    shipping_method: str
    sourcing_results: List[SourcedProductResult]
    bd_market_benchmarks: List[LocalMarketBenchmark]


@router.post("/search", response_model=SearchResponse, tags=["Sourcing & Market Benchmark"])
async def search_products(req: SearchRequest):
    """
    Search product across AliExpress, 1688, and Pinduoduo, calculate Landed Cost (BDT ৳),
    discover Bangladesh Local Market Prices (Daraz, FB, IG, TikTok), and compute Profit & Gross Margin.
    """
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Search query cannot be empty")

    # Concurrent search across sourcing connectors + BD local market connector
    ali_task = aliexpress_connector.search(req.query)
    c1688_task = connector_1688.search(req.query)
    pdd_task = pdd_connector.search(req.query)
    bd_market_task = bd_market_connector.search_local_market(req.query)

    ali_res, c1688_res, pdd_res, bd_benchmarks = await asyncio.gather(
        ali_task, c1688_task, pdd_task, bd_market_task, return_exceptions=True
    )

    sourcing_products: List[ProductBase] = []
    for res in [ali_res, c1688_res, pdd_res]:
        if isinstance(res, list):
            sourcing_products.extend(res)

    if not isinstance(bd_benchmarks, list):
        bd_benchmarks = []

    sourced_results: List[SourcedProductResult] = []

    for product in sourcing_products:
        # Calculate Landed Cost
        breakdown = cost_engine.calculate_landed_cost(
            product=product,
            quantity=req.quantity,
            shipping_method=req.shipping_method,
            user_weight_kg=req.user_weight_kg
        )

        # Calculate BD Market Margin & Profit against local benchmarks
        analysis = pricing_engine.calculate_market_margin(
            per_unit_landed_cost=breakdown.per_unit_landed_cost,
            local_benchmarks=bd_benchmarks
        )

        sourced_results.append(
            SourcedProductResult(
                product=product,
                cost_breakdown=breakdown,
                market_analysis=analysis
            )
        )

    # Sort results by lowest per-unit landed cost
    sourced_results.sort(key=lambda x: x.cost_breakdown.per_unit_landed_cost)

    return SearchResponse(
        query=req.query,
        quantity=req.quantity,
        shipping_method=req.shipping_method,
        sourcing_results=sourced_results,
        bd_market_benchmarks=bd_benchmarks
    )
