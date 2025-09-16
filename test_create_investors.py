#!/usr/bin/env python3
"""
Script to create 20 test investors for testing pagination and functionality.
Run this script to populate the database with test data.
"""

import requests
import json
import random
from faker import Faker

# Initialize Faker for generating realistic test data
fake = Faker()

# Backend API endpoint
BASE_URL = "http://localhost:5000"  # Adjust if your backend runs on different port
API_ENDPOINT = f"{BASE_URL}/api/investors"

# Test data for creating investors
test_investors = []

# Generate 20 test investors
for i in range(1, 21):
    investor_data = {
        "investor_name": fake.name(),
        "investment_amount": round(random.uniform(10000, 500000), 2),  # Between 10K and 500K
        "investment_percentage": round(random.uniform(5, 25), 2),      # Between 5% and 25%
        "mobile": fake.phone_number()[:15],  # Limit length to fit database constraints
        "email": fake.email(),
        "aadhar_card": f"{random.randint(1000, 9999)} {random.randint(1000, 9999)} {random.randint(1000, 9999)}",
        "pan_card": f"{fake.random_letter().upper()}{fake.random_letter().upper()}{fake.random_letter().upper()}{fake.random_letter().upper()}{fake.random_letter().upper()}{random.randint(1000, 9999)}{fake.random_letter().upper()}",
        "address": fake.address().replace('\n', ', ')[:200],  # Limit address length
        "deal_id": 1  # Assuming deal ID 1 exists, adjust as needed
    }
    test_investors.append(investor_data)

def create_test_investors():
    """Create test investors via API calls"""
    created_count = 0
    failed_count = 0
    
    print("Creating 20 test investors...")
    print("-" * 50)
    
    # You'll need to get an auth token first - this is a placeholder
    headers = {
        "Content-Type": "application/json",
        # "Authorization": "Bearer YOUR_TOKEN_HERE"  # Add your auth token
    }
    
    for i, investor in enumerate(test_investors, 1):
        try:
            print(f"Creating investor {i}/20: {investor['investor_name']}")
            
            # Make API request to create investor
            response = requests.post(API_ENDPOINT, json=investor, headers=headers)
            
            if response.status_code in [200, 201]:
                created_count += 1
                print(f"✓ Successfully created: {investor['investor_name']}")
            else:
                failed_count += 1
                print(f"✗ Failed to create: {investor['investor_name']} - Status: {response.status_code}")
                print(f"  Error: {response.text}")
                
        except Exception as e:
            failed_count += 1
            print(f"✗ Error creating {investor['investor_name']}: {str(e)}")
    
    print("-" * 50)
    print(f"Summary: {created_count} created, {failed_count} failed")
    return created_count, failed_count

def create_sql_insert_script():
    """Generate SQL INSERT statements for manual database insertion"""
    print("Generating SQL INSERT script...")
    
    sql_script = """-- Test Investors Data
-- Run this script directly in your MySQL database

INSERT INTO investors (
    investor_name, investment_amount, investment_percentage, 
    mobile, email, aadhar_card, pan_card, address, deal_id, 
    created_at, is_starred
) VALUES """
    
    values_list = []
    for investor in test_investors:
        values = f"""(
    '{investor['investor_name'].replace("'", "''")}',
    {investor['investment_amount']},
    {investor['investment_percentage']},
    '{investor['mobile']}',
    '{investor['email']}',
    '{investor['aadhar_card']}',
    '{investor['pan_card']}',
    '{investor['address'].replace("'", "''")}',
    {investor['deal_id']},
    NOW(),
    {random.choice(['TRUE', 'FALSE'])}
)"""
        values_list.append(values)
    
    sql_script += ',\n'.join(values_list) + ";\n"
    
    # Write to file
    with open("test_investors_insert.sql", "w", encoding="utf-8") as f:
        f.write(sql_script)
    
    print("✓ SQL script saved as 'test_investors_insert.sql'")
    print("You can run this script directly in your MySQL database.")

def print_test_data():
    """Print the test data for review"""
    print("\nGenerated Test Investors:")
    print("=" * 80)
    for i, investor in enumerate(test_investors, 1):
        print(f"{i:2d}. {investor['investor_name']:<25} | "
              f"₹{investor['investment_amount']:>10,.2f} | "
              f"{investor['investment_percentage']:>5.1f}% | "
              f"{investor['mobile']}")
    print("=" * 80)

if __name__ == "__main__":
    print("Test Investors Creator")
    print("=" * 50)
    
    # Show what data will be created
    print_test_data()
    
    print("\nChoose an option:")
    print("1. Create via API calls (requires backend running and auth)")
    print("2. Generate SQL script for manual insertion")
    print("3. Both")
    
    choice = input("\nEnter your choice (1/2/3): ").strip()
    
    if choice in ["1", "3"]:
        print("\n" + "="*50)
        print("CREATING VIA API...")
        print("Note: Make sure your backend is running and update the auth token in the script")
        created, failed = create_test_investors()
        
    if choice in ["2", "3"]:
        print("\n" + "="*50)
        print("GENERATING SQL SCRIPT...")
        create_sql_insert_script()
    
    print("\nDone! Test investors are ready for testing pagination and functionality.")