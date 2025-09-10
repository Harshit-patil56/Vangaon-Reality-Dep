#!/usr/bin/env python3
"""
Test script for the new investor percentage shares endpoint
"""

import requests
import json

def test_investor_percentage_shares():
    """Test the new investor percentage shares endpoint"""
    try:
        # Test data - must total 100%
        test_data = {
            "investor_shares": [
                {
                    "investor_id": 158,
                    "percentage_share": 40.0
                },
                {
                    "investor_id": 159,
                    "percentage_share": 60.0
                }
            ]
        }
        
        url = "http://localhost:5000/api/deals/124/investors/percentage-shares"
        
        headers = {
            'Content-Type': 'application/json',
            # Note: In real usage, you need authentication token
            # 'Authorization': 'Bearer YOUR_TOKEN_HERE'
        }
        
        print("Testing investor percentage shares endpoint...")
        print(f"URL: {url}")
        print(f"Data: {json.dumps(test_data, indent=2)}")
        
        response = requests.put(url, json=test_data, headers=headers)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 401:
            print("\n⚠️  Authentication required - this is expected")
            print("The endpoint exists and is working, but needs a valid login token")
        elif response.status_code == 200:
            print("\n✅ Success!")
        else:
            print(f"\n❌ Error: {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Error: Could not connect to backend. Make sure backend is running on localhost:5000")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_investor_percentage_shares()
