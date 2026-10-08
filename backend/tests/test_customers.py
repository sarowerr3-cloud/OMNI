import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app


@pytest.mark.asyncio
async def test_list_and_seed_customers():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/customers")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 5
        # Verify customer structure
        first = data[0]
        assert "id" in first
        assert "name" in first
        assert "phone" in first
        assert "group" in first
        assert "category" in first


@pytest.mark.asyncio
async def test_create_and_delete_customer():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        new_cust = {
            "name": "Test Client Chittagong",
            "phone": "01812345678",
            "email": "test@ctg.com",
            "group": "Wholesale Buyers",
            "category": "Electronics",
            "city": "Chittagong",
            "address": "Agrabad, Chittagong",
            "notes": "Testing customer creation",
            "preferred_contact": "whatsapp",
        }
        res_create = await ac.post("/customers", json=new_cust)
        assert res_create.status_code == 201
        created = res_create.json()
        cust_id = created["id"]
        assert created["name"] == new_cust["name"]
        assert created["city"] == "Chittagong"

        # Update customer
        res_update = await ac.put(f"/customers/{cust_id}", json={"city": "Sylhet", "notes": "Updated note"})
        assert res_update.status_code == 200
        assert res_update.json()["city"] == "Sylhet"

        # Delete customer
        res_del = await ac.delete(f"/customers/{cust_id}")
        assert res_del.status_code == 204

        # Verify not found
        res_get = await ac.get(f"/customers/{cust_id}")
        assert res_get.status_code == 404


@pytest.mark.asyncio
async def test_list_groups():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/customers/groups/list")
        assert response.status_code == 200
        groups = response.json()
        assert len(groups) >= 4
        group_names = [g["name"] for g in groups]
        assert "Wholesale Buyers" in group_names
        assert "Retail Gadgets" in group_names


@pytest.mark.asyncio
async def test_compose_messages():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {
            "group": "Wholesale Buyers",
            "template_type": "new_arrival",
            "product_title": "Smart Watch Ultra 9 AMOLED",
            "price_bdt": 2450.00,
            "product_url": "https://omni-sourcing.bd/product/123",
        }
        res = await ac.post("/customers/messages/compose", json=payload)
        assert res.status_code == 200
        messages = res.json()
        assert len(messages) >= 1
        msg = messages[0]
        assert "customer_name" in msg
        assert "whatsapp_url" in msg
        assert "wa.me/880" in msg["whatsapp_url"]
        assert "Smart Watch Ultra 9 AMOLED" in msg["message_text"]
        assert "2,450.00" in msg["message_text"]
