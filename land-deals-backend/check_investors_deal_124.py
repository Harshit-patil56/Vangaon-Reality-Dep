#!/usr/bin/env python3
"""
Script to check current investor data for deal 124
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from app import get_db_connection
from datetime import datetime

def check_investors_deal_124():
    """Check current investor data for deal 124"""
    connection = None
    try:
        print("Connecting to database...")
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        print("\nChecking investors table structure...")
        cursor.execute("DESCRIBE investors")
        columns = cursor.fetchall()
        print("Investors table columns:")
        for col in columns:
            print(f"  {col['Field']} - {col['Type']}")
        
        print("\nChecking current investors for deal 124...")
        cursor.execute("""
            SELECT *
            FROM investors 
            WHERE deal_id = 124
            ORDER BY id
        """)
        
        investors = cursor.fetchall()
        
        if not investors:
            print("No investors found for deal 124")
            return
        
        print(f"Found {len(investors)} investors for deal 124:")
        for investor in investors:
            print(f"  Full investor data: {investor}")
            print(f"  ---")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if connection:
            connection.close()

if __name__ == "__main__":
    check_investors_deal_124()
