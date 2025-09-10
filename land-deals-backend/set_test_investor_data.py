#!/usr/bin/env python3
"""
Test script to manually set some investor percentages for testing
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from app import get_db_connection
from datetime import datetime

def set_test_percentages():
    """Set some test percentages for investors in deal 124"""
    connection = None
    try:
        print("Connecting to database...")
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Set test percentages
        test_data = [
            (158, 30.0, 300000),  # Tanmay Patil: 30%, ₹300,000
            (159, 70.0, 700000)   # Harsh Salvi: 70%, ₹700,000
        ]
        
        print("Setting test investment percentages...")
        for investor_id, percentage, amount in test_data:
            cursor.execute("""
                UPDATE investors 
                SET investment_percentage = %s, investment_amount = %s 
                WHERE id = %s AND deal_id = 124
            """, (percentage, amount, investor_id))
            print(f"  Set investor {investor_id}: {percentage}%, ₹{amount}")
        
        connection.commit()
        print("Test data saved successfully!")
        
        # Verify the changes
        print("\nVerifying changes...")
        cursor.execute("""
            SELECT id, investor_name, investment_percentage, investment_amount 
            FROM investors 
            WHERE deal_id = 124
            ORDER BY id
        """)
        
        investors = cursor.fetchall()
        
        print("Current investor data:")
        for investor in investors:
            print(f"  ID: {investor['id']}, Name: {investor['investor_name']}, "
                  f"Percentage: {investor['investment_percentage']}%, "
                  f"Amount: ₹{investor['investment_amount']}")
        
    except Exception as e:
        print(f"Error: {e}")
        if connection:
            connection.rollback()
    finally:
        if connection:
            connection.close()

if __name__ == "__main__":
    set_test_percentages()
