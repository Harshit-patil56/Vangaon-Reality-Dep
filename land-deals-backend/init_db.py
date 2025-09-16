#!/usr/bin/env python3
"""
Database initialization script for Land Deals Manager
This script connects to the cloud MySQL database and creates all necessary tables
"""

import mysql.connector
import os
from pathlib import Path

# Database configuration (same as in app.py)
# Use environment variables for all database configuration
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

DB_CONFIG = {
    'host': os.environ.get('DB_HOST'),
    'port': int(os.environ.get('DB_PORT', 3306)),
    'user': os.environ.get('DB_USER'),
    'password': os.environ.get('DB_PASSWORD'),
    'database': os.environ.get('DB_NAME'),
}

# Add SSL configuration only if SSL certificate exists (for cloud databases)
ssl_ca_path = os.path.join(os.path.dirname(__file__), 'ca-certificate.pem')
if os.path.exists(ssl_ca_path) and os.environ.get('DB_HOST') and 'aivencloud.com' in os.environ.get('DB_HOST', ''):
    DB_CONFIG.update({
        'ssl_ca': ssl_ca_path,
        'ssl_verify_cert': True,
        'ssl_verify_identity': True
    })

def init_database():
    """Initialize the database with required tables"""
    try:
        print("Connecting to the cloud MySQL database...")
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        print("Connection successful!")
        
        # Read and execute the schema file
        schema_file = os.path.join(os.path.dirname(__file__), 'init_schema.sql')
        with open(schema_file, 'r', encoding='utf-8') as file:
            schema_sql = file.read()
        
        # Split the SQL file into individual statements
        statements = [stmt.strip() for stmt in schema_sql.split(';') if stmt.strip()]
        
        print("Creating tables...")
        for statement in statements:
            if statement:
                try:
                    cursor.execute(statement)
                    print(f"Executed: {statement[:50]}...")
                except mysql.connector.Error as err:
                    print(f"Warning: {err}")
                    continue
        
        connection.commit()
        print("Database initialization completed successfully!")
        
        # Test the connection by showing tables
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()
        print("\nCreated tables:")
        for table in tables:
            print(f"  - {table[0]}")
        
    except mysql.connector.Error as err:
        print(f"Database error: {err}")
        return False
    except FileNotFoundError:
        print("Schema file 'init_schema.sql' not found!")
        return False
    except Exception as e:
        print(f"Unexpected error: {e}")
        return False
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()
            print("Database connection closed.")
    
    return True

def test_connection():
    """Test the database connection"""
    try:
        print("Testing database connection...")
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        cursor.execute("SELECT VERSION()")
        version = cursor.fetchone()
        print(f"MySQL version: {version[0]}")
        
        cursor.execute("SELECT DATABASE()")
        database = cursor.fetchone()
        print(f"Current database: {database[0]}")
        
        return True
        
    except mysql.connector.Error as err:
        print(f"Connection test failed: {err}")
        return False
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()

if __name__ == "__main__":
    print("=== Land Deals Manager Database Initialization ===\n")
    
    # Test connection first
    if test_connection():
        print("\n" + "="*50 + "\n")
        init_database()
    else:
        print("Failed to connect to the database. Please check your configuration.")
