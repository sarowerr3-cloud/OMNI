from decimal import Decimal, ROUND_HALF_UP
from typing import Optional
from backend.app.schemas.product import ProductBase, CostBreakdown


class CostEngine:
    """Calculates full landed cost in BDT for a product imported into Bangladesh."""

    def __init__(
        self,
        rate_rmb_bdt: Decimal = Decimal("20.00"),
        rate_usd_bdt: Decimal = Decimal("120.00"),
        air_rate_per_kg: Decimal = Decimal("1000.00"),  # ৳1000/kg by air
        sea_rate_per_kg: Decimal = Decimal("300.00"),   # ৳300/kg by sea
        duty_vat_percent: Decimal = Decimal("15.00"),    # 15% estimated duty/tax
        agent_fee_percent: Decimal = Decimal("5.00")      # 5% sourcing agent fee
    ):
        self.default_rate_rmb_bdt = rate_rmb_bdt
        self.rate_usd_bdt = rate_usd_bdt
        self.air_rate_per_kg = air_rate_per_kg
        self.sea_rate_per_kg = sea_rate_per_kg
        self.duty_vat_percent = duty_vat_percent
        self.agent_fee_percent = agent_fee_percent

    def calculate_landed_cost(
        self,
        product: ProductBase,
        quantity: int = 10,
        shipping_method: str = "air",
        user_weight_kg: Optional[float] = None,
        custom_rate_rmb_bdt: Optional[Decimal] = None
    ) -> CostBreakdown:
        # Use user-defined RMB exchange rate if provided, otherwise default rate
        effective_rmb_rate = custom_rate_rmb_bdt if custom_rate_rmb_bdt is not None else self.default_rate_rmb_bdt

        # Convert original item price to BDT
        if product.currency == "RMB":
            unit_price_bdt = product.price * effective_rmb_rate
        elif product.currency == "USD":
            unit_price_bdt = product.price * self.rate_usd_bdt
        else:
            unit_price_bdt = product.price

        total_item_price_bdt = unit_price_bdt * Decimal(quantity)

        # Domestic China Shipping (Estimated ৳20 per unit)
        domestic_shipping_bdt = Decimal("20.00") * Decimal(quantity)

        # Agent fee
        agent_fee_bdt = (total_item_price_bdt * (self.agent_fee_percent / Decimal("100"))).quantize(Decimal("0.01"))

        # Weight calculation
        weight_kg = Decimal(str(user_weight_kg)) if user_weight_kg is not None else (product.weight_kg or Decimal("0.30"))
        total_weight_kg = weight_kg * Decimal(quantity)

        # Shipping rate
        rate_per_kg = self.air_rate_per_kg if shipping_method == "air" else self.sea_rate_per_kg
        international_freight_bdt = (total_weight_kg * rate_per_kg).quantize(Decimal("0.01"))

        # Duty & VAT
        duty_vat_bdt = (total_item_price_bdt * (self.duty_vat_percent / Decimal("100"))).quantize(Decimal("0.01"))

        # Payment processing fee (1.5% FX/transfer fee)
        payment_fee_bdt = (total_item_price_bdt * Decimal("0.015")).quantize(Decimal("0.01"))

        total_landed_cost = (
            total_item_price_bdt + domestic_shipping_bdt + agent_fee_bdt +
            international_freight_bdt + duty_vat_bdt + payment_fee_bdt
        ).quantize(Decimal("0.01"))

        per_unit_landed_cost = (total_landed_cost / Decimal(quantity)).quantize(Decimal("0.01"))

        return CostBreakdown(
            item_price_bdt=total_item_price_bdt,
            domestic_china_shipping_bdt=domestic_shipping_bdt,
            agent_fee_bdt=agent_fee_bdt,
            international_freight_bdt=international_freight_bdt,
            duty_vat_bdt=duty_vat_bdt,
            payment_fee_bdt=payment_fee_bdt,
            total_landed_cost=total_landed_cost,
            per_unit_landed_cost=per_unit_landed_cost
        )


cost_engine = CostEngine()
