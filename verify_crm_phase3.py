import requests
import json
import random
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000/api/v1"

def create_customer_with_orders(prefix, order_count, days_ago_list, rejected_quotes=0):
    rand_id = random.randint(10000, 99999)
    phone = f"0911{rand_id}"
    name = f"Test {prefix} {rand_id}"
    
    print(f"\n--- Testing Segment: {prefix} ---")
    print(f"Creating Customer: {name} ({phone})")
    
    # 1. Create Order to trigger auto-creation
    # or create customer manually first.
    # For POTENTIAL/LOST, we want to rely on auto-creation or manual creation without forcing REGULAR.
    cust_payload = {
        "full_name": name,
        "phone": phone
        # "customer_type": "REGULAR" <-- Removed to let system decide or default
    }
    resp = requests.post(f"{BASE_URL}/crm/customers", json=cust_payload)
    if resp.status_code != 200:
        print(f"Error creating customer: {resp.text}")
        return
    customer_id = resp.json()['id']
    
    # 2. Create Orders
    for days_ago in days_ago_list:
        event_date = (datetime.now() - timedelta(days=days_ago)).isoformat()
        order_payload = {
            "customer_name": name,
            "customer_phone": phone,
            "event_type": "Party",
            "event_date": event_date,
            "final_amount": 5000000, # 5M VND
            "items": []
        }
        resp = requests.post(f"{BASE_URL}/orders", json=order_payload)
        order_data = resp.json()
        order_id = order_data['id']
        requests.post(f"{BASE_URL}/orders/{order_id}/confirm")
        requests.post(f"{BASE_URL}/orders/{order_id}/complete")
        
    # 3. Create Rejected Quotes for LOST
    for i in range(rejected_quotes):
        print(f"Creating & Rejecting Quote {i+1}...")
        quote_payload = {
            "customer_name": name,
            "customer_phone": phone,
            "status": "PENDING",
            "items": []
        }
        resp = requests.post(f"{BASE_URL}/quotes", json=quote_payload)
        q_id = resp.json()['id']
        
        # Reject Quote via PUT
        update_payload = quote_payload.copy()
        update_payload['status'] = 'REJECTED'
        requests.put(f"{BASE_URL}/quotes/{q_id}", json=update_payload)

    # Check Result
    resp = requests.get(f"{BASE_URL}/crm/customers/{customer_id}")
    cust = resp.json()
    print(f"Result for {prefix}: {cust.get('customer_type')} (Orders: {cust.get('order_count')})")

def test_segments():
    # 1. LOYAL: > 2 orders, recent
    create_customer_with_orders("LOYAL_TEST", 3, [0, 0, 0])
    
    # 2. POTENTIAL: 0 orders (Just created, no orders)
    print("\n--- Testing Segment: POTENTIAL_REAL ---")
    rand_id = random.randint(10000, 99999)
    phone = f"0922{rand_id}"
    name = f"Potential {rand_id}"
    
    # Create Quote -> Auto Creates Customer as POTENTIAL
    quote_payload = {
        "customer_name": name,
        "customer_phone": phone,
        "status": "PENDING",
        "items": []
    }
    resp = requests.post(f"{BASE_URL}/quotes", json=quote_payload)
    if resp.status_code != 200:
        print(f"Error creating quote for POTENTIAL: {resp.text}")
        return
        
    print("Quote created successfully. Searching for auto-created customer...")
    
    # Check customer
    # We need to find customer ID. 
    # Let's search by phone
    print(f"Searching for customer with phone: '{phone}'")
    resp = requests.get(f"{BASE_URL}/crm/customers?search={phone}")
    data = resp.json()
    if not data:
        print(f"Customer not found by search '{phone}'.")
        return

    cust = data[0]
    print(f"Result for POTENTIAL_REAL: {cust.get('customer_type')}")

    
    # 3. LOST: 0 orders, 4 rejected quotes
    # Use auto-creation via Quote first
    create_customer_with_orders("LOST_TEST", 0, [], rejected_quotes=4)

if __name__ == "__main__":
    test_segments()
