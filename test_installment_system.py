#!/usr/bin/env python3
"""
Test script for the complete installment system
"""
import requests
import json
import sys
from datetime import datetime, timedelta

# Configuration
BASE_URL = "http://localhost:5000"  # Change this to your backend URL
TEST_DEAL_ID = 8  # Change this to a real deal ID
TEST_TOKEN = ""  # Add your auth token here if needed

def test_installment_creation():
    """Test creating installment payments"""
    print("Testing installment creation...")
    
    # Prepare test data
    installment_data = {
        "installments": [
            {
                "amount": 50000,
                "payment_date": "2025-01-15",
                "due_date": "2025-01-15"
            },
            {
                "amount": 50000,
                "payment_date": "2025-02-15",
                "due_date": "2025-02-15"
            },
            {
                "amount": 50000,
                "payment_date": "2025-03-15",
                "due_date": "2025-03-15"
            }
        ],
        "description": "Test installment payment plan",
        "payment_type": "land_purchase",
        "status": "pending",
        "paid_by": "test_buyer",
        "paid_to": "test_seller",
        "payment_mode": "Bank Transfer",
        "reference": "TEST-INST-001",
        "notes": "Test installment creation",
        "category": "land_purchase"
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    if TEST_TOKEN:
        headers["Authorization"] = f"Bearer {TEST_TOKEN}"
    
    # Make the request
    try:
        response = requests.post(
            f"{BASE_URL}/api/payments/{TEST_DEAL_ID}/split-installments",
            headers=headers,
            json=installment_data
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 201:
            print("✅ Installment creation test PASSED")
            result = response.json()
            return result.get('payments', [])
        else:
            print("❌ Installment creation test FAILED")
            return []
            
    except Exception as e:
        print(f"❌ Error during installment creation test: {e}")
        return []

def test_installment_retrieval(payment_id):
    """Test retrieving installment information"""
    print(f"Testing installment retrieval for payment {payment_id}...")
    
    headers = {}
    if TEST_TOKEN:
        headers["Authorization"] = f"Bearer {TEST_TOKEN}"
    
    try:
        response = requests.get(
            f"{BASE_URL}/api/payments/{TEST_DEAL_ID}/{payment_id}/installments",
            headers=headers
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ Installment retrieval test PASSED")
            return True
        else:
            print("❌ Installment retrieval test FAILED")
            return False
            
    except Exception as e:
        print(f"❌ Error during installment retrieval test: {e}")
        return False

def test_payment_list():
    """Test that installment payments appear correctly in payment list"""
    print("Testing payment list with installments...")
    
    headers = {}
    if TEST_TOKEN:
        headers["Authorization"] = f"Bearer {TEST_TOKEN}"
    
    try:
        response = requests.get(
            f"{BASE_URL}/api/payments/{TEST_DEAL_ID}",
            headers=headers
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            payments = data.get('data', [])
            
            # Check for installment payments
            installment_payments = [p for p in payments if p.get('is_installment')]
            print(f"Found {len(installment_payments)} installment payments")
            
            for payment in installment_payments[:3]:  # Show first 3
                print(f"  - Payment {payment['id']}: Installment {payment.get('installment_number', 'N/A')} of {payment.get('total_installments', 'N/A')}")
            
            print("✅ Payment list test PASSED")
            return True
        else:
            print("❌ Payment list test FAILED")
            return False
            
    except Exception as e:
        print(f"❌ Error during payment list test: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Starting Installment System Tests")
    print("=" * 50)
    
    # Test 1: Create installments
    created_payments = test_installment_creation()
    print()
    
    # Test 2: Retrieve installment info (if we created payments)
    if created_payments:
        first_payment_id = created_payments[0]['payment_id']
        test_installment_retrieval(first_payment_id)
        print()
    
    # Test 3: Check payment list
    test_payment_list()
    print()
    
    print("=" * 50)
    print("🏁 Tests completed!")
    
    if not created_payments:
        print("\n⚠️ Note: No installments were created. This could be due to:")
        print("   1. Missing authentication token")
        print("   2. Backend not running")
        print("   3. Invalid deal ID")
        print("   4. Database connection issues")
        print("\nTo fix:")
        print("   1. Start the backend server: python app.py")
        print("   2. Update TEST_DEAL_ID with a valid deal ID")
        print("   3. Add authentication token if required")

if __name__ == "__main__":
    main()
