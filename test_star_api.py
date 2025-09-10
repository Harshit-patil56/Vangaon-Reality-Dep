#!/usr/bin/env python3

import requests
import json

# Configuration
BASE_URL = "http://localhost:5000"
API_BASE = f"{BASE_URL}/api"

def test_star_functionality():
    """Test the star functionality with proper authentication"""
    
    # Step 1: Register a test user
    print("1. Registering test user...")
    register_data = {
        "username": "testuser",
        "password": "testpass123"
    }
    
    try:
        response = requests.post(f"{API_BASE}/register", json=register_data)
        if response.status_code == 201:
            print("✓ User registered successfully")
        elif response.status_code == 409:
            print("✓ User already exists")
        else:
            print(f"✗ Registration failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"✗ Registration error: {e}")
    
    # Step 2: Login and get token
    print("\n2. Logging in...")
    login_data = {
        "username": "testuser",
        "password": "testpass123"
    }
    
    try:
        response = requests.post(f"{API_BASE}/login", json=login_data)
        if response.status_code == 200:
            token = response.json().get('token')
            print("✓ Login successful")
            print(f"Token: {token[:20]}...")
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
    
    # Step 3: Test getting all owners
    print("\n3. Testing /api/owners endpoint...")
    try:
        response = requests.get(f"{API_BASE}/owners", headers=headers)
        if response.status_code == 200:
            owners = response.json()
            print(f"✓ Successfully fetched {len(owners)} owners")
            if owners:
                first_owner = owners[0]
                print(f"First owner: {first_owner.get('name')} (ID: {first_owner.get('id')}, Starred: {first_owner.get('is_starred')})")
            else:
                print("No owners found in database")
                return
        else:
            print(f"✗ Failed to fetch owners: {response.status_code} - {response.text}")
            return
    except Exception as e:
        print(f"✗ Error fetching owners: {e}")
        return
    
    # Step 4: Test getting starred owners
    print("\n4. Testing /api/owners/starred endpoint...")
    try:
        response = requests.get(f"{API_BASE}/owners/starred", headers=headers)
        if response.status_code == 200:
            starred_owners = response.json()
            print(f"✓ Successfully fetched {len(starred_owners)} starred owners")
        else:
            print(f"✗ Failed to fetch starred owners: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"✗ Error fetching starred owners: {e}")
    
    # Step 5: Test starring an owner (if we have owners)
    if owners and len(owners) > 0:
        owner_id = owners[0]['id']
        print(f"\n5. Testing starring owner {owner_id}...")
        try:
            star_data = {"starred": True}
            response = requests.post(f"{API_BASE}/owners/{owner_id}/star", 
                                   headers=headers, json=star_data)
            if response.status_code == 200:
                result = response.json()
                print(f"✓ Successfully starred owner: {result.get('message')}")
            else:
                print(f"✗ Failed to star owner: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"✗ Error starring owner: {e}")
        
        # Step 6: Test getting starred owners again
        print("\n6. Testing /api/owners/starred endpoint after starring...")
        try:
            response = requests.get(f"{API_BASE}/owners/starred", headers=headers)
            if response.status_code == 200:
                starred_owners = response.json()
                print(f"✓ Successfully fetched {len(starred_owners)} starred owners")
                if starred_owners:
                    print(f"Starred owner: {starred_owners[0].get('name')}")
            else:
                print(f"✗ Failed to fetch starred owners: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"✗ Error fetching starred owners: {e}")
        
        # Step 7: Test unstarring
        print(f"\n7. Testing unstarring owner {owner_id}...")
        try:
            unstar_data = {"starred": False}
            response = requests.post(f"{API_BASE}/owners/{owner_id}/star", 
                                   headers=headers, json=unstar_data)
            if response.status_code == 200:
                result = response.json()
                print(f"✓ Successfully unstarred owner: {result.get('message')}")
            else:
                print(f"✗ Failed to unstar owner: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"✗ Error unstarring owner: {e}")

if __name__ == "__main__":
    print("Testing Star Functionality API Endpoints")
    print("=" * 50)
    test_star_functionality()
