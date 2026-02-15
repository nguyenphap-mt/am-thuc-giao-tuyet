import requests
import json
import random
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000/api/v1"

def create_lost_customer():
    rand_id = random.randint(10000, 99999)
    phone = f"0933{rand_id}"
    name = f"Lost Customer {rand_id}"
    print(f"Creating LOST customer: {name} ({phone})")
    
    # 1. Create Customer
    cust_payload = {"full_name": name, "phone": phone}
    resp = requests.post(f"{BASE_URL}/crm/customers", json=cust_payload)
    if resp.status_code != 200:
        print(f"Error creating customer: {resp.text}")
        return None
    customer_id = resp.json()['id']
    
    # 2. Create & Reject 4 Quotes
    for i in range(4):
        quote_payload = {
            "customer_name": name,
            "customer_phone": phone,
            "status": "PENDING",
            "items": []
        }
        resp = requests.post(f"{BASE_URL}/quotes", json=quote_payload)
        q_id = resp.json()['id']
        
        # Reject
        update = quote_payload.copy()
        update['status'] = 'REJECTED'
        requests.put(f"{BASE_URL}/quotes/{q_id}", json=update)
        
    return customer_id

def verify_retention():
    print("\n--- 1. Setting up Data ---")
    lost_id = create_lost_customer()
    if not lost_id:
        print("Failed to setup data.")
        return

    print("\n--- 2. Verifying Retention Stats ---")
    resp = requests.get(f"{BASE_URL}/crm/marketing/retention-stats")
    if resp.status_code == 200:
        stats = resp.json()
        print(f"Stats: {stats}")
        if stats['lost_count'] > 0:
            print("PASS: Lost count detected.")
        else:
            print("FAIL: Lost count is 0 (should be > 0).")
    else:
        print(f"FAIL: API Error {resp.status_code} - {resp.text}")

    print("\n--- 3. Verifying Campaign Sending ---")
    campaign_payload = {
        "customer_ids": [lost_id],
        "template_id": "MISS_YOU",
        "channel": "ZALO"
    }
    resp = requests.post(f"{BASE_URL}/crm/marketing/campaigns/send", json=campaign_payload)
    if resp.status_code == 200:
        result = resp.json()
        print(f"Campaign Result: {result}")
        if result['success'] and result['sent_count'] == 1:
            print("PASS: Campaign sent successfully.")
        else:
            print("FAIL: Campaign response indicates failure.")
    else:
        print(f"FAIL: API Error {resp.status_code} - {resp.text}")

if __name__ == "__main__":
    verify_retention()
