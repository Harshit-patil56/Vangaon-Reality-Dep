#!/usr/bin/env python3
"""
Script to clear all investor investments from deal 124
This will set investment_percentage and investment_amount to 0 for all investors in deal 124
"""

import sys
import os

# Add the backend directory to Python path to import from app.py
sys.path.append(os.path.dirname(__file__))

try:
    from app import get_db_connection
except ImportError:
    print("Error: Could not import get_db_connection from app.py")
    print("Make sure this script is running from the backend directory")
    sys.exit(1)

from datetime import datetime

def clear_investors_for_deal_124():
    """Clear all investor investments for deal 124"""
    connection = None
    try:
        # Connect to database using the existing function
        print("Connecting to database...")
        connection = get_db_connection()
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
        
        # Clear the investments without confirmation since it's a specific request
        print(f"\nClearing investment percentages and amounts for all {len(existing_investors)} investors...")
        
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
