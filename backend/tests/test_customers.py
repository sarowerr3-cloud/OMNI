import pytest


@pytest.mark.asyncio
async def test_unauthenticated_customer_access_blocked(async_client):
    """Verify that CRM endpoints block unauthenticated requests with 401."""
    response = await async_client.get("/customers")
    assert response.status_code == 401
    assert "detail" in response.json()


@pytest.mark.asyncio
async def test_list_and_seed_customers(authenticated_client):
    response = await authenticated_client.get("/customers")
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
async def test_create_and_delete_customer(authenticated_client):
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
    res_create = await authenticated_client.post("/customers", json=new_cust)
    assert res_create.status_code == 201
    created = res_create.json()
    cust_id = created["id"]
    assert created["name"] == new_cust["name"]
    assert created["city"] == "Chittagong"

    # Update customer
    res_update = await authenticated_client.put(f"/customers/{cust_id}", json={"city": "Sylhet", "notes": "Updated note"})
    assert res_update.status_code == 200
    assert res_update.json()["city"] == "Sylhet"

    # Delete customer
    res_del = await authenticated_client.delete(f"/customers/{cust_id}")
    assert res_del.status_code == 204

    # Verify not found
    res_get = await authenticated_client.get(f"/customers/{cust_id}")
    assert res_get.status_code == 404


@pytest.mark.asyncio
async def test_list_groups(authenticated_client):
    response = await authenticated_client.get("/customers/groups/list")
    assert response.status_code == 200
    groups = response.json()
    assert len(groups) >= 4
    group_names = [g["name"] for g in groups]
    assert "Wholesale Buyers" in group_names
    assert "Retail Gadgets" in group_names


@pytest.mark.asyncio
async def test_compose_messages(authenticated_client):
    payload = {
        "group": "Wholesale Buyers",
        "template_type": "new_arrival",
        "product_title": "Smart Watch Ultra 9 AMOLED",
        "price_bdt": 2450.00,
        "product_url": "https://omni-sourcing.bd/product/123",
    }
    res = await authenticated_client.post("/customers/messages/compose", json=payload)
    assert res.status_code == 200
    messages = res.json()
    assert len(messages) >= 1
    msg = messages[0]
    assert "customer_name" in msg
    assert "whatsapp_url" in msg
    assert "wa.me/880" in msg["whatsapp_url"]
    assert "Smart Watch Ultra 9 AMOLED" in msg["message_text"]
    assert "2,450.00" in msg["message_text"]


@pytest.mark.asyncio
async def test_customer_order_delivery_and_packing_cost(authenticated_client):
    """Verify that delivery_cost and packing_cost are accepted, stored, and calculated properly into total_amount."""
    # 1. Fetch customer list
    res_list = await authenticated_client.get("/customers")
    assert res_list.status_code == 200
    customers = res_list.json()
    assert len(customers) > 0
    target_cust = customers[0]
    cust_id = target_cust["id"]

    # 2. Add an order with delivery_cost=120 and packing_cost=50
    order_payload = {
        "product_name": "Premium Leather Watch Band",
        "price": 800.0,
        "quantity": 2,
        "delivery_cost": 120.0,
        "packing_cost": 50.0,
        "advance_payment": 500.0,
        "notes": "RedX courier with bubble packaging"
    }
    # Expected total = (800 * 2) + 120 + 50 = 1770
    # Expected remaining balance = 1770 - 500 = 1270
    res_add = await authenticated_client.post(f"/customers/{cust_id}/orders", json=order_payload)
    assert res_add.status_code == 201
    created_ord = res_add.json()
    assert created_ord["delivery_cost"] == 120.0
    assert created_ord["packing_cost"] == 50.0
    assert created_ord["total_amount"] == 1770.0
    assert created_ord["remaining_balance"] == 1270.0
    assert created_ord["payment_status"] == "partial"

    # 3. Update the order with adjusted delivery cost
    ord_id = created_ord["id"]
    res_update = await authenticated_client.put(
        f"/customers/{cust_id}/orders/{ord_id}",
        json={"delivery_cost": 70.0, "advance_payment": 1720.0}
    )
    # Expected total = 1600 + 70 + 50 = 1720
    # Expected remaining balance = 1720 - 1720 = 0.0, status='paid'
    assert res_update.status_code == 200
    updated_ord = res_update.json()
    assert updated_ord["delivery_cost"] == 70.0
    assert updated_ord["total_amount"] == 1720.0
    assert updated_ord["remaining_balance"] == 0.0
    assert updated_ord["payment_status"] == "paid"


@pytest.mark.asyncio
async def test_customer_profile_default_delivery_and_packing_cost(authenticated_client):
    """Verify that a customer profile saves and updates default_delivery_cost and default_packing_cost."""
    new_cust_payload = {
        "name": "Kamal Hossain Logistics",
        "phone": "+8801700998877",
        "address": "Banani, Block C, Road 11, Dhaka",
        "group": "Wholesale Buyers",
        "category": "Electronics",
        "city": "Dhaka",
        "default_delivery_cost": 70.0,
        "default_packing_cost": 30.0,
        "notes": "Prefers Pathao courier"
    }

    res = await authenticated_client.post("/customers", json=new_cust_payload)
    assert res.status_code == 201
    cust = res.json()
    assert cust["default_delivery_cost"] == 70.0
    assert cust["default_packing_cost"] == 30.0
    cust_id = cust["id"]

    # Update customer profile defaults
    res_up = await authenticated_client.put(
        f"/customers/{cust_id}",
        json={"default_delivery_cost": 130.0, "default_packing_cost": 50.0}
    )
    assert res_up.status_code == 200
    updated = res_up.json()
    assert updated["default_delivery_cost"] == 130.0
    assert updated["default_packing_cost"] == 50.0

    # Cleanup
    await authenticated_client.delete(f"/customers/{cust_id}")

