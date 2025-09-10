#!/usr/bin/env python3
"""
Test script to verify investor share updates are working with cloud database
"""

import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

def test_investor_update():
    try:
        # Connect to database
        conn = mysql.connector.connect(
            host=os.getenv('DB_HOST'),
            user=os.getenv('DB_USER'),
            password=os.getenv('DB_PASSWORD'),
            database=os.getenv('DB_NAME'),
            port=int(os.getenv('DB_PORT', 3306)),
            autocommit=False  # Ensure we control transactions
        )
        
        cursor = conn.cursor()
        
        print("DATABASE CONNECTION INFO:")
        print(f"Host: {os.getenv('DB_HOST')}")
        print(f"Database: {os.getenv('DB_NAME')}")
        print(f"Port: {os.getenv('DB_PORT', 3306)}")
        print()
        
        # Check current investor data
        cursor.execute("""
            SELECT id, investor_name, investment_amount, investment_percentage, deal_id 
            FROM investors 
            WHERE deal_id = 124 
            ORDER BY id
        """)
        
        print("CURRENT INVESTORS FOR DEAL 124:")
        investors = cursor.fetchall()
        for row in investors:
            print(f"  ID: {row[0]}, Name: {row[1]}, Amount: {row[2]}, Percentage: {row[3]}, Deal: {row[4]}")
        
        if not investors:
            print("  No investors found for deal 124")
            return
        
        print()
        
        # Test update for first investor (if exists)
        test_investor = investors[0]
        investor_id = test_investor[0]
        
        print(f"TESTING UPDATE FOR INVESTOR {investor_id}:")
        
        # Update with test values
        test_percentage = 99.99
        test_amount = 999999
        
        print(f"  Updating to: percentage={test_percentage}, amount={test_amount}")
        
        cursor.execute("""
            UPDATE investors 
            SET investment_percentage = %s, investment_amount = %s 
            WHERE id = %s AND deal_id = 124
        """, (test_percentage, test_amount, investor_id))
        
        print(f"  Rows affected: {cursor.rowcount}")
        
        # Commit the transaction
        conn.commit()
        print("  Transaction committed")
        
        # Verify the update
        cursor.execute("""
            SELECT investment_percentage, investment_amount 
            FROM investors 
            WHERE id = %s AND deal_id = 124
        """, (investor_id,))
        
        result = cursor.fetchone()
        if result:
            print(f"  VERIFICATION: percentage={result[0]}, amount={result[1]}")
            if float(result[0]) == test_percentage and float(result[1]) == test_amount:
                print("  ✅ UPDATE SUCCESSFUL!")
            else:
                print("  ❌ UPDATE FAILED - values don't match")
        else:
            print("  ❌ UPDATE FAILED - could not retrieve updated data")
        
        # Restore original values
        original_percentage = test_investor[3] or 0
        original_amount = test_investor[2] or 0
        
        print(f"  Restoring original values: percentage={original_percentage}, amount={original_amount}")
        
        cursor.execute("""
            UPDATE investors 
            SET investment_percentage = %s, investment_amount = %s 
            WHERE id = %s AND deal_id = 124
        """, (original_percentage, original_amount, investor_id))
        
        conn.commit()
        print("  Original values restored")
        
    except mysql.connector.Error as e:
        print(f"❌ DATABASE ERROR: {e}")
        if conn:
            conn.rollback()
    except Exception as e:
        print(f"❌ ERROR: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()
            print("\nDatabase connection closed")

if __name__ == "__main__":
    test_investor_update()
