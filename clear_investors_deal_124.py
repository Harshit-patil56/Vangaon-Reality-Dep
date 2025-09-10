#!/usr/bin/env python3
"""
Script to clear all investor investments from deal 124
This will set investment_percentage and investment_amount to 0 for all investors in deal 124
"""

import mysql.connector
import os
from datetime import datetime

# Database configuration
DB_CONFIG = {
    'host': 'YOUR_DATABASE_HOST',
    'port': 17231,
    'user': 'YOUR_DATABASE_USER',
    'password': 'YOUR_DATABASE_PASSWORD',
    'database': 'defaultdb',
    'ssl_ca': 'ca-certificate.pem',
    'ssl_verify_cert': True,
    'ssl_verify_identity': True
}

def clear_investors_for_deal_124():
    """Clear all investor investments for deal 124"""
    connection = None
    try:
        # Connect to database
        print("Connecting to database...")
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor(dictionary=True)
        
        # First, check what investors exist for deal 124
        print("\nChecking existing investors for deal 124...")
        cursor.execute("""
            SELECT id, investor_name, investment_percentage, investment_amount 
            FROM investors 
            WHERE deal_id = 124
            ORDER BY id
        """)
        
        existing_investors = cursor.fetchall()
        
        if not existing_investors:
            print("No investors found for deal 124")
            return
        
        print(f"Found {len(existing_investors)} investors for deal 124:")
        for investor in existing_investors:
            print(f"  ID: {investor['id']}, Name: {investor['investor_name']}, "
                  f"Percentage: {investor['investment_percentage']}%, "
                  f"Amount: ₹{investor['investment_amount']}")
        
        # Confirm action
        print(f"\nThis will clear investment percentages and amounts for all {len(existing_investors)} investors.")
        confirm = input("Do you want to proceed? (yes/no): ").lower().strip()
        
        if confirm not in ['yes', 'y']:
            print("Operation cancelled.")
            return
        
        # Clear the investments
        print("\nClearing investor investments...")
        cursor.execute("""
            UPDATE investors 
            SET investment_percentage = 0, investment_amount = 0 
            WHERE deal_id = 124
        """)
        
        rows_affected = cursor.rowcount
        connection.commit()
        
        print(f"Successfully cleared investments for {rows_affected} investors")
        
        # Verify the changes
        print("\nVerifying changes...")
        cursor.execute("""
            SELECT id, investor_name, investment_percentage, investment_amount 
            FROM investors 
            WHERE deal_id = 124
            ORDER BY id
        """)
        
        updated_investors = cursor.fetchall()
        
        print("Updated investor data:")
        for investor in updated_investors:
            print(f"  ID: {investor['id']}, Name: {investor['investor_name']}, "
                  f"Percentage: {investor['investment_percentage']}%, "
                  f"Amount: ₹{investor['investment_amount']}")
        
        print(f"\n✅ Successfully cleared all investor investments for deal 124")
        print(f"Timestamp: {datetime.now()}")
        
    except mysql.connector.Error as e:
        print(f"Database error: {e}")
        if connection:
            connection.rollback()
    except Exception as e:
        print(f"Error: {e}")
        if connection:
            connection.rollback()
    finally:
        if connection:
            connection.close()
            print("Database connection closed.")

if __name__ == "__main__":
    clear_investors_for_deal_124()
