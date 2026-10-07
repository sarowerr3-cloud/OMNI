import pytest
from decimal import Decimal


@pytest.mark.asyncio
async def test_search_endpoint_with_bd_market_benchmarks(async_client):
    response = await async_client.post(
        "/search",
        json={
            "query": "Smart Watch Ultra",
            "quantity": 10,
            "shipping_method": "air"
        }
    )
    assert response.status_code == 200
    data = response.json()

    assert data["query"] == "Smart Watch Ultra"
    assert len(data["sourcing_results"]) > 0
    assert len(data["bd_market_benchmarks"]) > 0

    # Verify BD market benchmarks contain Daraz, Facebook, Instagram, TikTok
    platforms = [b["platform"] for b in data["bd_market_benchmarks"]]
    assert "Daraz BD" in platforms
    assert "Facebook Page / Shop" in platforms

    # Verify first sourcing result has cost breakdown & market margin analysis
    first_res = data["sourcing_results"][0]
    assert "cost_breakdown" in first_res
    assert "market_analysis" in first_res

    margin = first_res["market_analysis"]
    assert float(margin["per_unit_landed_cost"]) > 0
    assert float(margin["local_bd_market_avg_price"]) > float(margin["per_unit_landed_cost"])
    assert float(margin["estimated_net_profit"]) > 0
    assert float(margin["gross_margin_percent"]) > 0
    assert float(margin["roi_percent"]) > 0


@pytest.mark.asyncio
async def test_manual_calculator_endpoint(async_client):
    response = await async_client.post(
        "/calculate/manual",
        json={
            "unit_price_rmb": 28.00,
            "rate_rmb_bdt": 16.50,
            "quantity": 10,
            "weight_value": 350,
            "weight_unit": "gm",
            "shipping_charge_per_unit_weight": 1000.00,
            "shipping_charge_unit": "per_kg",
            "domestic_china_shipping_bdt": 20.00,
            "agent_fee_percent": 5.00,
            "duty_vat_percent": 15.00,
            "other_costs_bdt": 50.00,
            "target_selling_price_bdt": 1500.00
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert float(data["total_landed_cost"]) > 0
    assert float(data["per_unit_landed_cost"]) > 0
    assert float(data["estimated_net_profit_per_unit"]) > 0
    assert float(data["gross_margin_percent"]) > 0
