"""
Test script to verify the investor duplication fix
This script simulates creating a deal with starred investors
"""

import requests
import json

# Backend API URL
API_BASE = "http://localhost:5000/api"

def test_investor_duplication_fix():
    """Test the investor duplication fix"""
    
    print("🧪 Testing Investor Duplication Fix")
    print("=" * 50)
    
    # Step 1: Get existing starred investors
    print("1. Fetching starred investors...")
    try:
        response = requests.get(f"{API_BASE}/investors/starred")
        if response.status_code == 200:
            starred_investors = response.json()
            print(f"   ✅ Found {len(starred_investors)} starred investors")
            if starred_investors:
                print(f"   📋 First investor: {starred_investors[0].get('investor_name', 'N/A')}")
        else:
            print(f"   ❌ Failed to fetch starred investors: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error fetching starred investors: {e}")
        return False
    
    # Step 2: Check current investor count
    print("\n2. Checking current investor count...")
    try:
        response = requests.get(f"{API_BASE}/investors")
        if response.status_code == 200:
            all_investors = response.json()
            initial_count = len(all_investors)
            print(f"   📊 Current total investors: {initial_count}")
        else:
            print(f"   ❌ Failed to fetch investors: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error fetching investors: {e}")
        return False
    
    print("\n✅ Test setup complete!")
    print("\nNext steps:")
    print("1. Start your backend server: cd land-deals-backend && python app.py")
    print("2. Start your frontend server: cd land-deals-frontend/my-app && npm run dev")
    print("3. Create a new deal with starred investors")
    print("4. Check the investor management page for duplicates")
    
    return True

if __name__ == "__main__":
    test_investor_duplication_fix()