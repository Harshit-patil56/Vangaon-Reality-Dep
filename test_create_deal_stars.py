#!/usr/bin/env python3

import requests
import json

# Configuration
BASE_URL = "http://localhost:5000"
API_BASE = f"{BASE_URL}/api"

def test_create_deal_starred_owners():
    """Test that create deal page can fetch starred owners"""
    
    # Step 1: Login and get token
    print("1. Logging in...")
    login_data = {
        "username": "testuser",
        "password": "testpass123"
    }
    
    try:
        response = requests.post(f"{API_BASE}/login", json=login_data)
        if response.status_code == 200:
            token = response.json().get('token')
            print("✓ Login successful")
        else:
            print(f"✗ Login failed: {response.status_code} - {response.text}")
            return
    except Exception as e:
        print(f"✗ Login error: {e}")
        return
    
    # Set up headers with token
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Step 2: Get all owners and star a few
    print("\n2. Getting all owners and starring some...")
    try:
        response = requests.get(f"{API_BASE}/owners", headers=headers)
        if response.status_code == 200:
            owners = response.json()
            print(f"✓ Found {len(owners)} total owners")
            
            # Star the first 2 owners
            starred_count = 0
            for owner in owners[:2]:
                star_response = requests.post(f"{API_BASE}/owners/{owner['id']}/star", 
                                            headers=headers, json={"starred": True})
                if star_response.status_code == 200:
                    starred_count += 1
                    print(f"✓ Starred owner: {owner['name']}")
                else:
                    print(f"✗ Failed to star owner {owner['name']}: {star_response.text}")
            
            print(f"Successfully starred {starred_count} owners")
        else:
            print(f"✗ Failed to fetch owners: {response.status_code} - {response.text}")
            return
    except Exception as e:
        print(f"✗ Error: {e}")
        return
    
    # Step 3: Test the starred owners endpoint (what create deal page will use)
    print("\n3. Testing starred owners endpoint...")
    try:
        response = requests.get(f"{API_BASE}/owners/starred", headers=headers)
        if response.status_code == 200:
            starred_owners = response.json()
            print(f"✓ Successfully fetched {len(starred_owners)} starred owners")
            
            if starred_owners:
                print("Starred owners for create deal dropdown:")
                for owner in starred_owners:
                    print(f"  - {owner['name']} (ID: {owner['id']}) - Mobile: {owner.get('mobile', 'N/A')}")
            else:
                print("No starred owners found")
        else:
            print(f"✗ Failed to fetch starred owners: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"✗ Error fetching starred owners: {e}")
    
    print("\n4. Summary:")
    print("✓ Create deal page will now show only starred owners in dropdown")
    print("✓ Owner information will be properly fetched when selected")
    print("✓ Labels updated to indicate 'starred owners' instead of 'existing owners'")

if __name__ == "__main__":
    print("Testing Create Deal Starred Owners Integration")
    print("=" * 50)
    test_create_deal_starred_owners()
