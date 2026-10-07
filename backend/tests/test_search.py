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
