import pytest
from httpx import AsyncClient
from uuid import uuid4
from decimal import Decimal

@pytest.mark.asyncio
async def test_procurement_flow(client: AsyncClient):
    # 1. Create Supplier
    supplier_data = {
        "name": f"Test Supplier {uuid4()}",
        "phone": "0901234567",
        "balance": 0
    }
    resp = await client.post("/api/v1/procurement/suppliers", json=supplier_data)
    assert resp.status_code == 200
    supplier = resp.json()
    supplier_id = supplier["id"]
    assert supplier["name"] == supplier_data["name"]

    # 2. Create Purchase Order
    po_data = {
        "supplier_id": supplier_id,
        "code": f"PO-{uuid4()}",
        "total_amount": 100000,
        "status": "DRAFT",
        "items": [
            {
                "item_name": "Test Item 1",
                "quantity": 10,
                "uom": "kg",
                "unit_price": 5000,
                "total_price": 50000
            },
            {
                "item_name": "Test Item 2",
                "quantity": 5,
                "uom": "kg",
                "unit_price": 10000,
                "total_price": 50000
            }
        ]
    }
    resp = await client.post("/api/v1/procurement/orders", json=po_data)
    assert resp.status_code == 200
    order = resp.json()
    order_id = order["id"]
    assert order["code"] == po_data["code"]
    assert len(order["items"]) == 2
    
    # 3. List Orders
    resp = await client.get("/api/v1/procurement/orders")
    assert resp.status_code == 200
    orders = resp.json()
    assert any(o["id"] == order_id for o in orders)
    
    # 4. Get Order Detail
    resp = await client.get(f"/api/v1/procurement/orders/{order_id}")
    assert resp.status_code == 200
    detail = resp.json()
    assert detail["id"] == order_id
    assert detail["supplier"]["id"] == supplier_id
    
    # 5. Update Status
    resp = await client.put(f"/api/v1/procurement/orders/{order_id}/status?status=SENT")
    assert resp.status_code == 200
    updated = resp.json()
    assert updated["status"] == "SENT"
