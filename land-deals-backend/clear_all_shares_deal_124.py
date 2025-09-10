#!/usr/bin/env python3
"""
Script to clear all owner and investor percentage shares for deal 124
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from app import get_db_connection
from datetime import datetime

def clear_all_shares_deal_124():
    """Clear all owner and investor percentage shares for deal 124"""
    connection = None
    try:
        print("Connecting to database...")
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Clear investor percentages and amounts
        print("\nClearing investor shares for deal 124...")
        cursor.execute("""
            UPDATE investors 
            SET investment_percentage = 0, investment_amount = 0 
            WHERE deal_id = 124
        """)
        investor_rows = cursor.rowcount
        print(f"Cleared {investor_rows} investor records")
        
        # Clear owner percentages
        print("\nClearing owner shares for deal 124...")
        cursor.execute("""
            UPDATE owners 
            SET percentage_share = 0 
            WHERE deal_id = 124
        """)
        owner_rows = cursor.rowcount
        print(f"Cleared {owner_rows} owner records")
        
        connection.commit()
        print(f"\n✅ Successfully cleared all shares for deal 124")
        
        # Verify the changes
        print("\nVerifying changes...")
        
        cursor.execute("""
            SELECT id, investor_name, investment_percentage, investment_amount 
            FROM investors 
            WHERE deal_id = 124
            ORDER BY id
        """)
        investors = cursor.fetchall()
        
        cursor.execute("""
            SELECT id, name, percentage_share 
            FROM owners 
            WHERE deal_id = 124
            ORDER BY id
        """)
        owners = cursor.fetchall()
        
        print("Current investor data:")
        for investor in investors:
            print(f"  ID: {investor['id']}, Name: {investor['investor_name']}, "
                  f"Percentage: {investor['investment_percentage']}%, "
                  f"Amount: ₹{investor['investment_amount']}")
        
        print("Current owner data:")
        for owner in owners:
            print(f"  ID: {owner['id']}, Name: {owner['name']}, "
                  f"Percentage: {owner['percentage_share']}%")
        
        print(f"\nTimestamp: {datetime.now()}")
        
    except Exception as e:
        print(f"Error: {e}")
        if connection:
            connection.rollback()
    finally:
        if connection:
            connection.close()

if __name__ == "__main__":
    clear_all_shares_deal_124()
