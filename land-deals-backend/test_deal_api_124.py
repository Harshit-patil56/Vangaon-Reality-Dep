#!/usr/bin/env python3
"""
Test script to check what the deal API returns for deal 124
"""

import requests
import json

def test_deal_api():
    """Test the deal API endpoint"""
    try:
        # Make sure to adjust the URL and add proper authentication token if needed
        url = "http://localhost:5000/api/deals/124"
        
        # You might need to add authentication headers here
        headers = {
            'Content-Type': 'application/json',
            # 'Authorization': 'Bearer YOUR_TOKEN_HERE'  # Add if needed
        }
        
        print("Testing deal API endpoint...")
        print(f"URL: {url}")
        
        response = requests.get(url, headers=headers)
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("\nDeal data structure:")
            print(f"Deal keys: {list(data.keys())}")
            
            if 'investors' in data:
                print(f"\nInvestors count: {len(data['investors'])}")
                for i, investor in enumerate(data['investors']):
                    print(f"Investor {i+1}:")
                    print(f"  ID: {investor.get('id')}")
                    print(f"  Name: {investor.get('investor_name')}")
                    print(f"  Investment Percentage: {investor.get('investment_percentage')}")
                    print(f"  Investment Amount: {investor.get('investment_amount')}")
                    print(f"  Full data: {investor}")
                    print()
            else:
                print("No investors key found in response")
                
        else:
            print(f"Error: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to backend. Make sure backend is running on localhost:5000")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_deal_api()
