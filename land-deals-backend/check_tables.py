#!/usr/bin/env python3
"""
Check database table structures
"""

import mysql.connector
import os
from dotenv import load_dotenv

def check_tables():
    load_dotenv()
    
    try:
        connection = mysql.connector.connect(
            host=os.getenv('DB_HOST'),
            user=os.getenv('DB_USER'),
            password=os.getenv('DB_PASSWORD'),
            database=os.getenv('DB_NAME'),
            port=int(os.getenv('DB_PORT', 3306))
        )
        cursor = connection.cursor()
        
        # Check owners table columns
        cursor.execute("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'owners'
            ORDER BY ORDINAL_POSITION
        """)
        owners_columns = [row[0] for row in cursor.fetchall()]
        print("Owners table columns:", owners_columns)
        
        # Check investors table columns
        cursor.execute("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'investors'
            ORDER BY ORDINAL_POSITION
        """)
        investors_columns = [row[0] for row in cursor.fetchall()]
        print("Investors table columns:", investors_columns)
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if connection:
            connection.close()

if __name__ == "__main__":
    check_tables()
