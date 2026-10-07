import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.claude_service import claude_service
from backend.app.services.ai_orchestrator import ai_orchestrator

client = TestClient(app)


@pytest.mark.asyncio
async def test_claude_service_analysis():
    result = await claude_service.analyze_sourcing_market(
        product_title="Smart Watch Ultra 2",
        landed_cost_bdt=1200.0,
        bd_avg_retail_price_bdt=2500.0,
        estimated_margin_percent=52.0,
        moq=5
    )
    assert result is not None
    assert "commercial_viability" in result
    assert "risk_factors" in result
    assert isinstance(result["risk_factors"], list)


@pytest.mark.asyncio
async def test_ai_orchestrator_status():
    status = ai_orchestrator.get_status()
    assert "gemini_active" in status
    assert "claude_active" in status
    assert "orchestrator_mode" in status


def test_ai_status_endpoint():
    response = client.get("/ai/status")
    assert response.status_code == 200
    data = response.json()
    assert "orchestrator_mode" in data


def test_ai_insight_endpoint():
    payload = {
        "product_title": "Wireless Bluetooth Earbuds",
        "landed_cost_bdt": 450.0,
        "bd_avg_price_bdt": 1200.0,
        "gross_margin_pct": 62.5
    }
    response = client.post("/ai/insight", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "consensus_rating" in data
    assert "active_models" in data
    assert "claude_strategy" in data
