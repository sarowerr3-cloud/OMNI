from decimal import Decimal, ROUND_HALF_UP
from typing import List
from backend.app.schemas.product import LocalMarketBenchmark, MarketMarginAnalysis


class PricingEngine:
    """Calculates profit margins, gross margin %, ROI, and break-even targets against local BD market benchmarks."""

    @staticmethod
    def calculate_market_margin(
        per_unit_landed_cost: Decimal,
        local_benchmarks: List[LocalMarketBenchmark],
        target_margin_percent: Decimal = Decimal("40.0")
    ) -> MarketMarginAnalysis:
        """Calculate financial return metrics comparing total landed cost against local BD market prices."""

        if not local_benchmarks:
            # Fallback when no benchmarks are available
            default_retail_price = (per_unit_landed_cost * (Decimal("1") + (target_margin_percent / Decimal("100")))).quantize(
                Decimal("10"), rounding=ROUND_HALF_UP
            )
            profit = default_retail_price - per_unit_landed_cost
            gross_margin = (profit / default_retail_price * Decimal("100")).quantize(Decimal("0.01"))
            roi = (profit / per_unit_landed_cost * Decimal("100")).quantize(Decimal("0.01"))

            return MarketMarginAnalysis(
                per_unit_landed_cost=per_unit_landed_cost,
                local_bd_market_avg_price=default_retail_price,
                local_bd_market_min_price=default_retail_price,
                local_bd_market_max_price=default_retail_price,
                estimated_net_profit=profit,
                gross_margin_percent=gross_margin,
                roi_percent=roi,
                break_even_quantity=1,
                local_benchmarks=[]
            )

        prices = [b.price_bdt for b in local_benchmarks]
        min_price = min(prices)
        max_price = max(prices)
        avg_price = (sum(prices) / Decimal(len(prices))).quantize(Decimal("0.01"))

        # Profit & Margins based on average BD retail market value
        net_profit = (avg_price - per_unit_landed_cost).quantize(Decimal("0.01"))

        if avg_price > Decimal("0"):
            gross_margin_pct = ((net_profit / avg_price) * Decimal("100")).quantize(Decimal("0.01"))
        else:
            gross_margin_pct = Decimal("0.00")

        if per_unit_landed_cost > Decimal("0"):
            roi_pct = ((net_profit / per_unit_landed_cost) * Decimal("100")).quantize(Decimal("0.01"))
        else:
            roi_pct = Decimal("0.00")

        # Break-even quantity (assuming fixed marketing/ops overhead of ৳5,000 for campaign launch)
        fixed_ops_overhead = Decimal("5000.00")
        if net_profit > Decimal("0"):
            break_even_qty = int((fixed_ops_overhead / net_profit).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
        else:
            break_even_qty = 99999

        return MarketMarginAnalysis(
            per_unit_landed_cost=per_unit_landed_cost,
            local_bd_market_avg_price=avg_price,
            local_bd_market_min_price=min_price,
            local_bd_market_max_price=max_price,
            estimated_net_profit=net_profit,
            gross_margin_percent=gross_margin_pct,
            roi_percent=roi_pct,
            break_even_quantity=max(1, break_even_qty),
            local_benchmarks=local_benchmarks
        )


pricing_engine = PricingEngine()
