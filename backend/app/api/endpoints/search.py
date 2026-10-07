import asyncio
from decimal import Decimal
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Query, HTTPException, File, UploadFile, Form
from pydantic import BaseModel
from backend.app.schemas.product import ProductBase, CostBreakdown, MarketMarginAnalysis, LocalMarketBenchmark
from backend.app.connectors.sourcing import aliexpress_connector, connector_1688, pdd_connector
from backend.app.connectors.bd_market import bd_market_connector
from backend.app.services.cost_engine import cost_engine
from backend.app.services.pricing_engine import pricing_engine
from backend.app.services.gemini_service import gemini_service

router = APIRouter()


class SearchRequest(BaseModel):
    query: str
    quantity: int = 10
    shipping_method: str = "air"  # "air" or "sea"
    user_weight_kg: Optional[float] = None
    rate_rmb_bdt: Optional[Decimal] = Decimal("16.50")


class SourcedProductResult(BaseModel):
    product: ProductBase
    cost_breakdown: CostBreakdown
    market_analysis: MarketMarginAnalysis


class SearchResponse(BaseModel):
    query: str
    quantity: int
    shipping_method: str
    rate_rmb_bdt: Decimal
    image_analysis: Optional[Dict[str, Any]] = None
    sourcing_results: List[SourcedProductResult]
    bd_market_benchmarks: List[LocalMarketBenchmark]


@router.post("/search", response_model=SearchResponse, tags=["Sourcing & Market Benchmark"])
async def search_products(req: SearchRequest):
    """
    Search product by text across AliExpress, 1688, and Pinduoduo using user-defined RMB exchange rate,
    calculate Landed Cost (BDT ৳), discover Bangladesh Local Market Prices (Daraz, FB, IG, TikTok),
    and compute Profit & Gross Margin.
    """
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Search query cannot be empty")

    rmb_rate = req.rate_rmb_bdt if req.rate_rmb_bdt and req.rate_rmb_bdt > 0 else Decimal("16.50")

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
        # Calculate Landed Cost using user-defined RMB exchange rate
        breakdown = cost_engine.calculate_landed_cost(
            product=product,
            quantity=req.quantity,
            shipping_method=req.shipping_method,
            user_weight_kg=req.user_weight_kg,
            custom_rate_rmb_bdt=rmb_rate
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
        rate_rmb_bdt=rmb_rate,
        sourcing_results=sourced_results,
        bd_market_benchmarks=bd_benchmarks
    )


@router.post("/search/image", response_model=SearchResponse, tags=["Sourcing & Market Benchmark"])
async def search_products_by_image(
    file: UploadFile = File(...),
    quantity: int = Form(10),
    shipping_method: str = Form("air"),
    user_weight_kg: Optional[float] = Form(None),
    rate_rmb_bdt: Optional[float] = Form(16.50)
):
    """
    Search product by uploading an Image. Uses Google Gemini Vision AI to identify product features,
    generate English and Chinese search terms, query China sourcing platforms + BD local market benchmarks,
    and calculate Landed Costs using user's RMB exchange rate.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be a valid image (JPEG, PNG, WEBP, HEIC)")

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image size exceeds 10MB limit")

    # Analyze product image using Gemini Vision AI
    analysis = await gemini_service.analyze_product_image(contents, mime_type=file.content_type)

    keywords_en = analysis.get("keywords_en", [])
    search_query = keywords_en[0] if keywords_en else analysis.get("description_en", "Sample Product")

    rmb_rate = Decimal(str(rate_rmb_bdt)) if rate_rmb_bdt and rate_rmb_bdt > 0 else Decimal("16.50")

    # Execute search using keywords derived from Gemini Vision AI
    ali_task = aliexpress_connector.search_by_image(contents)
    c1688_task = connector_1688.search_by_image(contents)
    pdd_task = pdd_connector.search_by_image(contents)
    bd_market_task = bd_market_connector.search_local_market(search_query)

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
        breakdown = cost_engine.calculate_landed_cost(
            product=product,
            quantity=quantity,
            shipping_method=shipping_method,
            user_weight_kg=user_weight_kg,
            custom_rate_rmb_bdt=rmb_rate
        )

        margin_analysis = pricing_engine.calculate_market_margin(
            per_unit_landed_cost=breakdown.per_unit_landed_cost,
            local_benchmarks=bd_benchmarks
        )

        sourced_results.append(
            SourcedProductResult(
                product=product,
                cost_breakdown=breakdown,
                market_analysis=margin_analysis
            )
        )

    sourced_results.sort(key=lambda x: x.cost_breakdown.per_unit_landed_cost)

    return SearchResponse(
        query=search_query,
        quantity=quantity,
        shipping_method=shipping_method,
        rate_rmb_bdt=rmb_rate,
        image_analysis=analysis,
        sourcing_results=sourced_results,
        bd_market_benchmarks=bd_benchmarks
    )
