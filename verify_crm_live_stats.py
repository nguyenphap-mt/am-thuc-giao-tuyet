import asyncio
import httpx
from uuid import uuid4

# Config
BASE_URL = "http://localhost:8000/api/v1"

async def verify_live_stats():
    async with httpx.AsyncClient() as client:
        print("\n--- 1. Creating Test Customer for Live Stats ---")
        unique_id = str(uuid4())[:8]
        # UI validation in component is /^[0-9]{10}$/. Use valid 10 digits.
        start_phone = "098" 
        suffix = unique_id[:7] # 7 chars
        if len(suffix) < 7: suffix = suffix.ljust(7, '0')
        phone = f"{start_phone}{suffix}"
        
        customer_payload = {
            "full_name": f"Live Stats Test {unique_id}",
            "phone": phone
        }
        
        print(f"Creating Customer: {customer_payload['full_name']} ({phone})")
        resp = await client.post(f"{BASE_URL}/crm/customers", json=customer_payload)
        
        if resp.status_code != 200:
             print(f"Create failed: {resp.text}")
             return
        
        customer_id = resp.json()['id']
        print(f"Created Customer: {customer_id}")

        # Initial Stats Check
        print("\n--- 2. Checking Initial Stats (Expect 0) ---")
        stats = (await client.get(f"{BASE_URL}/crm/customers/{customer_id}/live-stats")).json()
        print(f"Stats: {stats}")
        assert stats['total_orders'] == 0
        assert stats['total_quotes'] == 0
        
        # Create Quote (REJECTED)
        print("\n--- 4. Creating REJECTED Quote ---")
        quote_payload = {
             "customer_name": customer_payload['full_name'],
             "customer_phone": phone,
             "customer_id": customer_id,
             "items": [],
             "services": [],
             "total_amount": 1000000,
             "status": "REJECTED"
        }
        # FIX: Correct endpoint is /quotes
        quote_resp = await client.post(f"{BASE_URL}/quotes", json=quote_payload)
        
        if quote_resp.status_code == 200:
            print("Quote Created & Rejected")
            created_quote = quote_resp.json()
            if created_quote['customer_id'] != customer_id:
                print(f"CRITICAL: Quote linked to WRONG customer! Got {created_quote['customer_id']}, Expected {customer_id}")
        else:
            print(f"Quote Create Failed: {quote_resp.text}")

        # Check Stats (Quote should be 1, Rejected 1)
        print("\n--- 5. Checking Stats After Quote ---")
        stats = (await client.get(f"{BASE_URL}/crm/customers/{customer_id}/live-stats")).json()
        print(f"Stats: {stats}")
        
        assert stats['total_quotes'] == 1
        assert stats['rejected_quotes'] == 1
        
        print("\n--- 6. Creating APPROVED Quote for Conversion ---")
        quote_payload_2 = quote_payload.copy()
        quote_payload_2['status'] = 'APPROVED'
        quote_payload_2['total_amount'] = 2000000
        quote_resp_2 = await client.post(f"{BASE_URL}/quotes", json=quote_payload_2)
        quote_id = quote_resp_2.json()['id']
        
        print(f"Converting Quote {quote_id} -> Order")
        # FIX: Correct endpoint is /quotes/{id}/convert-to-order
        convert_resp = await client.post(f"{BASE_URL}/quotes/{quote_id}/convert-to-order")
        if convert_resp.status_code == 200:
            print("Conversion Success")
        else:
             print(f"Conversion Failed: {convert_resp.text}")
             
        # Check Stats (Orders should be 1, Spent 2,000,000)
        print("\n--- 7. Checking Stats After Order ---")
        stats = (await client.get(f"{BASE_URL}/crm/customers/{customer_id}/live-stats")).json()
        print(f"Stats: {stats}")
        assert stats['total_orders'] == 1
        assert stats['total_spent'] == 2000000.0
        
        print("\n✅ Verification Passed!")

if __name__ == "__main__":
    asyncio.run(verify_live_stats())
