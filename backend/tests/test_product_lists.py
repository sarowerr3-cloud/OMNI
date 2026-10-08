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
    # Weight price at 1.20 Tk/gm:
    # Item 1: 350 gm * 1.2 = 420 * 10 = 4200 BDT
    # Item 2: 150 gm * 1.2 = 180 * 20 = 3600 BDT -> 4200 + 3600 = 7800 BDT
    assert float(created_data["total_weight_price_bdt"]) == 7800.0
    assert float(created_data["grand_total_bdt"]) == 31400.0
    assert float(created_data["total_paid_bdt"]) == 0.0
    assert float(created_data["total_due_bdt"]) == 23600.0
    assert created_data["payment_status"] == "unpaid"

    # 2. Get list by ID
    get_res = await async_client.get(f"/product-lists/{list_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == list_id

    # 3. List all
    list_all_res = await async_client.get("/product-lists")
    assert list_all_res.status_code == 200
    assert len(list_all_res.json()) >= 1

    # 4. Update list with partial payment
    payload["name"] = "Updated Q4 Sourcing List"
    payload["items"][0]["paid_amount_bdt"] = 5600.00  # Item 1 fully paid
    payload["items"][1]["paid_amount_bdt"] = 3000.00  # Item 2 partial paid
    update_res = await async_client.put(f"/product-lists/{list_id}", json=payload)
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["name"] == "Updated Q4 Sourcing List"
    assert float(updated_data["total_paid_bdt"]) == 8600.0
    assert float(updated_data["total_due_bdt"]) == 15000.0
    assert updated_data["payment_status"] == "partial"
    assert updated_data["items"][0]["payment_status"] == "paid"
    assert float(updated_data["items"][0]["due_amount_bdt"]) == 0.0
    assert updated_data["items"][1]["payment_status"] == "partial"
    assert float(updated_data["items"][1]["due_amount_bdt"]) == 15000.0

    # 5. Delete list
    del_res = await async_client.delete(f"/product-lists/{list_id}")
    assert del_res.status_code == 204

    # 6. Verify deletion
    get_again = await async_client.get(f"/product-lists/{list_id}")
    assert get_again.status_code == 404
