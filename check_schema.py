#!/usr/bin/env python3

import mysql.connector
import sys
import os

# Add the backend directory to path to import the config
sys.path.append('land-deals-backend')

try:
    from app import get_db_connection
except ImportError:
    # Fallback connection
    def get_db_connection():
        return mysql.connector.connect(
            host='localhost',
            user='root',
            password='Hardi@2580',
            database='landdeals'
        )

def check_database_schema():
    """Check the current database schema for owners table"""
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        print("Checking owners table schema...")
        cursor.execute("DESCRIBE owners")
        columns = cursor.fetchall()
        
        print("\nCurrent columns in owners table:")
        for col in columns:
            print(f"- {col['Field']}: {col['Type']} (Null: {col['Null']}, Default: {col['Default']})")
        
        # Check if is_starred column exists
        has_starred_column = any(col['Field'] == 'is_starred' for col in columns)
        print(f"\nis_starred column exists: {has_starred_column}")
        
        if has_starred_column:
            print("\nSample data from owners table:")
            cursor.execute("SELECT id, name, is_starred FROM owners LIMIT 3")
            sample_data = cursor.fetchall()
            for row in sample_data:
                print(f"ID: {row['id']}, Name: {row['name']}, Starred: {row['is_starred']}")
        
        return has_starred_column
        
    except Exception as e:
        print(f"Error checking database schema: {e}")
        return False
    finally:
        if connection:
            connection.close()

if __name__ == "__main__":
    check_database_schema()
