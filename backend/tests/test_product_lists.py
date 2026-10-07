import pytest


@pytest.mark.asyncio
async def test_product_list_crud_flow(async_client):
    # 1. Create list
    payload = {
        "name": "Q4 Sourcing List - Smartwatches & Wearables",
        "date": "2026-10-07",
        "notes": "Urgent sourcing order for Dhaka warehouse",
        "items": [
            {
                "id": "item-1",
                "title": "Smart Watch Ultra 8 Series",
                "details": "OLED screen, Bluetooth Call, Titanium Casing",
                "price": 28.00,
                "currency": "RMB",
                "price_bdt": 560.00,
                "weight_kg": 0.35,
                "quantity": 10,
                "image_url": "https://images.unsplash.com/photo-1523275335684-37898b6baf30",
                "product_url": "https://detail.1688.com/offer/12345678.html",
                "platform": "1688"
            },
            {
                "id": "item-2",
                "title": "Wireless Earbuds Pro 2",
                "details": "Active Noise Cancellation, Type-C Charging",
                "price": 45.00,
                "currency": "RMB",
                "price_bdt": 900.00,
                "weight_kg": 0.15,
                "quantity": 20,
                "image_url": "https://images.unsplash.com/photo-1590658268037-6bf12165a8df",
                "product_url": "https://detail.1688.com/offer/87654321.html",
                "platform": "1688"
            }
        ]
    }

    create_res = await async_client.post("/product-lists", json=payload)
    assert create_res.status_code == 201
    created_data = create_res.json()

    list_id = created_data["id"]
    assert created_data["name"] == "Q4 Sourcing List - Smartwatches & Wearables"
    assert created_data["total_items_count"] == 2
    assert created_data["total_quantity"] == 30
    
    # 10 * 560 + 20 * 900 = 5600 + 18000 = 23600 BDT
    assert float(created_data["total_price_bdt"]) == 23600.0
    # 10 * 0.35 + 20 * 0.15 = 3.5 + 3.0 = 6.5 kg
    assert float(created_data["total_weight_kg"]) == 6.5

    # 2. Get list by ID
    get_res = await async_client.get(f"/product-lists/{list_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == list_id

    # 3. List all
    list_all_res = await async_client.get("/product-lists")
    assert list_all_res.status_code == 200
    assert len(list_all_res.json()) >= 1

    # 4. Update list
    payload["name"] = "Updated Q4 Sourcing List"
    update_res = await async_client.put(f"/product-lists/{list_id}", json=payload)
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Updated Q4 Sourcing List"

    # 5. Delete list
    del_res = await async_client.delete(f"/product-lists/{list_id}")
    assert del_res.status_code == 204

    # 6. Verify deletion
    get_again = await async_client.get(f"/product-lists/{list_id}")
    assert get_again.status_code == 404
