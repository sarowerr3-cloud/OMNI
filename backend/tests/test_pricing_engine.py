from decimal import Decimal
from backend.app.schemas.product import LocalMarketBenchmark
from backend.app.services.pricing_engine import pricing_engine


def test_pricing_engine_exact_margin_math():
    landed_cost = Decimal("600.00")  # Landed cost per unit = ৳600
    benchmarks = [
        LocalMarketBenchmark(
            platform="Daraz BD",
            seller_or_store="Store A",
            price_bdt=Decimal("1500.00"),
            source_type="e-commerce"
        )
    ]

    analysis = pricing_engine.calculate_market_margin(
        per_unit_landed_cost=landed_cost,
        local_benchmarks=benchmarks
    )

    # Net Profit = ৳1500 - ৳600 = ৳900
    assert analysis.estimated_net_profit == Decimal("900.00")

    # Gross Margin % = (৳900 / ৳1500) * 100 = 60.00%
    assert analysis.gross_margin_percent == Decimal("60.00")

    # ROI % = (৳900 / ৳600) * 100 = 150.00%
    assert analysis.roi_percent == Decimal("150.00")
