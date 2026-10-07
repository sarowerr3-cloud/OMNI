import asyncio
import logging
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Query, HTTPException, File, UploadFile, Form
from pydantic import BaseModel
from backend.app.schemas.product import ProductBase, CostBreakdown, MarketMarginAnalysis, LocalMarketBenchmark
from backend.app.connectors.sourcing import aliexpress_connector, connector_1688, pdd_connector
from backend.app.connectors.bd_market import bd_market_connector
from backend.app.services.cost_engine import cost_engine
from backend.app.services.pricing_engine import pricing_engine
from backend.app.services.gemini_service import gemini_service
from backend.app.services.claude_service import claude_service
from backend.app.services.ai_orchestrator import ai_orchestrator

logger = logging.getLogger(__name__)
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
    claude_insight: Optional[Dict[str, Any]] = None


class SearchResponse(BaseModel):
    query: str
    quantity: int
    shipping_method: str
    rate_rmb_bdt: Decimal
    image_analysis: Optional[Dict[str, Any]] = None
    ai_status: Optional[Dict[str, Any]] = None
    sourcing_results: List[SourcedProductResult]
    bd_market_benchmarks: List[LocalMarketBenchmark]


class ManualCalculatorRequest(BaseModel):
    unit_price_rmb: Decimal
    rate_rmb_bdt: Decimal = Decimal("16.50")
    quantity: int = 10
    weight_value: float = 0.35
    weight_unit: str = "kg"  # "kg" or "gm"
    shipping_charge_per_unit_weight: Decimal = Decimal("1000.00")
    shipping_charge_unit: str = "per_kg"  # "per_kg" or "per_gm"
    domestic_china_shipping_bdt: Decimal = Decimal("20.00")
    agent_fee_percent: Decimal = Decimal("5.00")
    duty_vat_percent: Decimal = Decimal("15.00")
    other_costs_bdt: Decimal = Decimal("0.00")
    target_selling_price_bdt: Optional[Decimal] = None


class ManualCalculatorResponse(BaseModel):
    unit_price_rmb: Decimal
    rate_rmb_bdt: Decimal
    quantity: int
    weight_value: float
    weight_unit: str
    total_weight_kg: float
    item_price_bdt: Decimal
    domestic_china_shipping_bdt: Decimal
    agent_fee_bdt: Decimal
    international_freight_bdt: Decimal
    duty_vat_bdt: Decimal
    other_costs_bdt: Decimal
    total_landed_cost: Decimal
    per_unit_landed_cost: Decimal
    target_selling_price_bdt: Decimal
    estimated_net_profit_per_unit: Decimal
    gross_margin_percent: Decimal
    roi_percent: Decimal


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

        claude_insight = await claude_service.analyze_sourcing_market(
            product_title=product.title_en or product.title_original,
            landed_cost_bdt=float(breakdown.per_unit_landed_cost),
            bd_avg_retail_price_bdt=float(analysis.local_bd_market_avg_price),
            estimated_margin_percent=float(analysis.gross_margin_percent),
            moq=product.moq
        )

        sourced_results.append(
            SourcedProductResult(
                product=product,
                cost_breakdown=breakdown,
                market_analysis=analysis,
                claude_insight=claude_insight
            )
        )

    # Sort results by lowest per-unit landed cost
    sourced_results.sort(key=lambda x: x.cost_breakdown.per_unit_landed_cost)

    return SearchResponse(
        query=req.query,
        quantity=req.quantity,
        shipping_method=req.shipping_method,
        rate_rmb_bdt=rmb_rate,
        ai_status=ai_orchestrator.get_status(),
        sourcing_results=sourced_results,
        bd_market_benchmarks=bd_benchmarks
    )


@router.post("/search/image", response_model=SearchResponse, tags=["Sourcing & Market Benchmark"])
async def search_products_by_image(
    file: UploadFile = File(...),
    quantity: int = Form(10),
    shipping_method: str = Form("air"),
    user_weight_kg: Optional[str] = Form(None),
    rate_rmb_bdt: Optional[str] = Form("16.50")
):
    """
    Search product by uploading an Image. Uses Google Gemini Vision AI to identify product features,
    generate English and Chinese search terms, query China sourcing platforms + BD local market benchmarks,
    and calculate Landed Costs using user's RMB exchange rate.
    """
    filename = (file.filename or "").lower()
    content_type = (file.content_type or "").lower()

    valid_extensions = ('.jpg', '.jpeg', '.png', '.webp', '.heic', '.bmp', '.gif')
    is_valid_type = content_type.startswith("image/") or filename.endswith(valid_extensions)

    if not is_valid_type:
        raise HTTPException(
            status_code=400,
            detail=f"Uploaded file '{file.filename}' is not a recognized image. Please upload JPG, PNG, WEBP, or HEIC image."
        )

    try:
        contents = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read image file: {str(e)}")

    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Uploaded image file is empty.")

    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image size exceeds 10MB limit.")

    # Determine MIME type safely
    mime_type = content_type if content_type.startswith("image/") else "image/jpeg"

    # Analyze product image using Gemini Vision AI
    analysis = await gemini_service.analyze_product_image(contents, mime_type=mime_type)

    keywords_en = analysis.get("keywords_en", [])
    search_query = keywords_en[0] if keywords_en else analysis.get("description_en", "Sample Product")

    # Parse numeric inputs safely
    try:
        parsed_rate = Decimal(str(rate_rmb_bdt)) if rate_rmb_bdt else Decimal("16.50")
        if parsed_rate <= 0:
            parsed_rate = Decimal("16.50")
    except Exception:
        parsed_rate = Decimal("16.50")

    parsed_weight = None
    if user_weight_kg:
        try:
            parsed_weight = float(user_weight_kg)
        except ValueError:
            parsed_weight = None

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
            user_weight_kg=parsed_weight,
            custom_rate_rmb_bdt=parsed_rate
        )

        margin_analysis = pricing_engine.calculate_market_margin(
            per_unit_landed_cost=breakdown.per_unit_landed_cost,
            local_benchmarks=bd_benchmarks
        )

        claude_insight = await claude_service.analyze_sourcing_market(
            product_title=product.title_en or product.title_original,
            landed_cost_bdt=float(breakdown.per_unit_landed_cost),
            bd_avg_retail_price_bdt=float(margin_analysis.local_bd_market_avg_price),
            estimated_margin_percent=float(margin_analysis.gross_margin_percent),
            moq=product.moq
        )

        sourced_results.append(
            SourcedProductResult(
                product=product,
                cost_breakdown=breakdown,
                market_analysis=margin_analysis,
                claude_insight=claude_insight
            )
        )

    sourced_results.sort(key=lambda x: x.cost_breakdown.per_unit_landed_cost)

    return SearchResponse(
        query=search_query,
        quantity=quantity,
        shipping_method=shipping_method,
        rate_rmb_bdt=parsed_rate,
        image_analysis=analysis,
        ai_status=ai_orchestrator.get_status(),
        sourcing_results=sourced_results,
        bd_market_benchmarks=bd_benchmarks
    )


@router.post("/calculate/manual", response_model=ManualCalculatorResponse, tags=["Pricing Calculator"])
async def calculate_manual_landed_cost(req: ManualCalculatorRequest):
    """
    Standalone Manual Landed Cost & Pricing Calculator.
    Allows user to input unit price in RMB, exchange rate, quantity, weight (kg or gm),
    shipping charge per kg/gm, domestic freight, duty %, and other overhead costs,
    and returns a line-by-line itemized BDT cost breakdown and profit analysis.
    """
    qty = max(1, req.quantity)
    rate = req.rate_rmb_bdt if req.rate_rmb_bdt > 0 else Decimal("16.50")

    # Calculate item price in BDT
    item_price_bdt = (req.unit_price_rmb * rate * Decimal(qty)).quantize(Decimal("0.01"))

    # Convert weight to kg
    weight_kg = req.weight_value / 1000.0 if req.weight_unit == "gm" else req.weight_value
    total_weight_kg = weight_kg * qty

    # Calculate international freight charge
    if req.shipping_charge_unit == "per_gm":
        weight_gm = req.weight_value if req.weight_unit == "gm" else req.weight_value * 1000.0
        freight_bdt = (Decimal(str(weight_gm * qty)) * req.shipping_charge_per_unit_weight).quantize(Decimal("0.01"))
    else:
        freight_bdt = (Decimal(str(total_weight_kg)) * req.shipping_charge_per_unit_weight).quantize(Decimal("0.01"))

    domestic_shipping = (req.domestic_china_shipping_bdt * Decimal(qty)).quantize(Decimal("0.01"))
    agent_fee = (item_price_bdt * (req.agent_fee_percent / Decimal("100"))).quantize(Decimal("0.01"))
    duty_vat = (item_price_bdt * (req.duty_vat_percent / Decimal("100"))).quantize(Decimal("0.01"))
    other_costs = req.other_costs_bdt.quantize(Decimal("0.01"))

    total_landed_cost = (
        item_price_bdt + domestic_shipping + agent_fee + freight_bdt + duty_vat + other_costs
    ).quantize(Decimal("0.01"))

    per_unit_landed_cost = (total_landed_cost / Decimal(qty)).quantize(Decimal("0.01"))

    # Target Selling Price & Profit Calculation
    target_selling_price = req.target_selling_price_bdt if req.target_selling_price_bdt is not None and req.target_selling_price_bdt > 0 else (per_unit_landed_cost * Decimal("1.40")).quantize(Decimal("0.01"))
    net_profit = (target_selling_price - per_unit_landed_cost).quantize(Decimal("0.01"))

    if target_selling_price > 0:
        gross_margin = ((net_profit / target_selling_price) * Decimal("100")).quantize(Decimal("0.01"))
    else:
        gross_margin = Decimal("0.00")

    if per_unit_landed_cost > 0:
        roi = ((net_profit / per_unit_landed_cost) * Decimal("100")).quantize(Decimal("0.01"))
    else:
        roi = Decimal("0.00")

    return ManualCalculatorResponse(
        unit_price_rmb=req.unit_price_rmb,
        rate_rmb_bdt=rate,
        quantity=qty,
        weight_value=req.weight_value,
        weight_unit=req.weight_unit,
        total_weight_kg=total_weight_kg,
        item_price_bdt=item_price_bdt,
        domestic_china_shipping_bdt=domestic_shipping,
        agent_fee_bdt=agent_fee,
        international_freight_bdt=freight_bdt,
        duty_vat_bdt=duty_vat,
        other_costs_bdt=other_costs,
        total_landed_cost=total_landed_cost,
        per_unit_landed_cost=per_unit_landed_cost,
        target_selling_price_bdt=target_selling_price,
        estimated_net_profit_per_unit=net_profit,
        gross_margin_percent=gross_margin,
        roi_percent=roi
    )


class AIInsightRequest(BaseModel):
    product_title: str
    landed_cost_bdt: float
    bd_avg_price_bdt: float
    gross_margin_pct: float


@router.get("/ai/status", tags=["AI Co-Pilot (Gemini + Claude)"])
async def get_ai_status():
    """Returns active operational status for both Gemini API and Claude API engines."""
    return ai_orchestrator.get_status()


@router.post("/ai/insight", tags=["AI Co-Pilot (Gemini + Claude)"])
async def generate_dual_ai_insight(req: AIInsightRequest):
    """
    Generates combined Dual AI Strategic Insight (Gemini Vision + Claude Commercial Strategy).
    """
    return await ai_orchestrator.generate_dual_ai_insight(
        product_title=req.product_title,
        landed_cost_bdt=req.landed_cost_bdt,
        bd_avg_price_bdt=req.bd_avg_price_bdt,
        gross_margin_pct=req.gross_margin_pct
    )

