#!/usr/bin/env python3
"""
Migration script to add owner share tracking columns
Run this to add percentage_share and investment_amount columns to owners table
"""

import mysql.connector
import os
from dotenv import load_dotenv

def run_migration():
    load_dotenv()
    
    try:
        # Database connection
        connection = mysql.connector.connect(
            host=os.getenv('DB_HOST'),
            user=os.getenv('DB_USER'),
            password=os.getenv('DB_PASSWORD'),
            database=os.getenv('DB_NAME'),
            port=int(os.getenv('DB_PORT', 3306))
        )
        cursor = connection.cursor()
        
        print("Connected to database successfully")
        
        # Check if columns already exist for owners
        cursor.execute("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'owners' 
            AND COLUMN_NAME IN ('percentage_share', 'investment_amount')
        """)
        existing_owner_columns = [row[0] for row in cursor.fetchall()]
        print(f"Existing owner columns: {existing_owner_columns}")
        
        # Add percentage_share to owners if not exists
        if 'percentage_share' not in existing_owner_columns:
            cursor.execute('ALTER TABLE owners ADD COLUMN percentage_share DECIMAL(5,2) DEFAULT 0.00')
            print("✅ Added percentage_share column to owners")
        else:
            print("⚠️ percentage_share column already exists in owners")
        
        # Add investment_amount to owners if not exists  
        if 'investment_amount' not in existing_owner_columns:
            cursor.execute('ALTER TABLE owners ADD COLUMN investment_amount DECIMAL(15,2) DEFAULT 0.00')
            print("✅ Added investment_amount column to owners")
        else:
            print("⚠️ investment_amount column already exists in owners")

        # Check if columns already exist for investors
        cursor.execute("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'investors' 
            AND COLUMN_NAME IN ('percentage_share')
        """)
        existing_investor_columns = [row[0] for row in cursor.fetchall()]
        print(f"Existing investor columns: {existing_investor_columns}")
        
        # Add percentage_share to investors if not exists
        if 'percentage_share' not in existing_investor_columns:
            cursor.execute('ALTER TABLE investors ADD COLUMN percentage_share DECIMAL(5,2) DEFAULT 0.00')
            print("✅ Added percentage_share column to investors")
        else:
            print("⚠️ percentage_share column already exists in investors")
        
        connection.commit()
        print("🎉 Migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        if 'connection' in locals():
            connection.rollback()
    finally:
        if 'connection' in locals():
            connection.close()

if __name__ == "__main__":
    run_migration()
