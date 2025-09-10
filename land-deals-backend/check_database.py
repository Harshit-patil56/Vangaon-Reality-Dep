#!/usr/bin/env python3
"""
Database Schema Checker and Updater
Checks the current database schema and applies necessary updates for payment status
"""
import mysql.connector
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('../.env')

# Database connection parameters
DB_CONFIG = {
    'host': os.getenv('DB_HOST'),
    'port': int(os.getenv('DB_PORT', 3306)),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'database': os.getenv('DB_NAME'),
}

def check_database_connection():
    """Test database connection"""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        print("✅ Database connection successful!")
        print(f"Connected to: {DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}")
        conn.close()
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

def check_table_exists(table_name):
    """Check if a table exists"""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        cursor.execute(f"""
            SELECT COUNT(*) 
            FROM information_schema.tables 
            WHERE table_schema = '{DB_CONFIG['database']}' 
            AND table_name = '{table_name}'
        """)
        
        exists = cursor.fetchone()[0] > 0
        conn.close()
        return exists
    except Exception as e:
        print(f"Error checking table {table_name}: {e}")
        return False

def get_column_info(table_name):
    """Get column information for a table"""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        cursor.execute(f"""
            SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
            FROM information_schema.columns
            WHERE table_schema = '{DB_CONFIG['database']}' 
            AND table_name = '{table_name}'
            ORDER BY ORDINAL_POSITION
        """)
        
        columns = cursor.fetchall()
        conn.close()
        return columns
    except Exception as e:
        print(f"Error getting column info for {table_name}: {e}")
        return []

def check_payments_status_column():
    """Check if payments table has the correct status column"""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        cursor.execute(f"""
            SELECT COLUMN_TYPE 
            FROM information_schema.columns
            WHERE table_schema = '{DB_CONFIG['database']}' 
            AND table_name = 'payments'
            AND column_name = 'status'
        """)
        
        result = cursor.fetchone()
        conn.close()
        
        if result:
            column_type = result[0]
            print(f"Status column type: {column_type}")
            return column_type
        else:
            print("Status column does not exist")
            return None
    except Exception as e:
        print(f"Error checking status column: {e}")
        return None

def update_payments_status_enum():
    """Update the payments status enum to include all required values"""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Start transaction
        conn.start_transaction()
        
        print("🔄 Updating payments status enum...")
        
        # Update the status column to include all required values
        cursor.execute("""
            ALTER TABLE payments 
            MODIFY COLUMN status ENUM('pending','completed','overdue','cancelled','failed') 
            DEFAULT 'pending'
        """)
        
        # Update any existing 'paid' status to 'completed'
        cursor.execute("UPDATE payments SET status = 'completed' WHERE status = 'paid'")
        updated_rows = cursor.rowcount
        
        # Also update payment_type to include maintenance_taxes if not present
        cursor.execute("""
            ALTER TABLE payments 
            MODIFY COLUMN payment_type ENUM('land_purchase','investment_sale','documentation_legal','maintenance_taxes','other') 
            DEFAULT 'other'
        """)
        
        # Commit transaction
        conn.commit()
        
        print(f"✅ Status enum updated successfully!")
        print(f"✅ Updated {updated_rows} rows from 'paid' to 'completed'")
        print("✅ Payment type enum updated to include 'maintenance_taxes'")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Error updating status enum: {e}")
        conn.rollback()
        conn.close()
        return False

def main():
    """Main function to check and update database schema"""
    print("🔍 Checking Database Schema...")
    print("=" * 50)
    
    # Check database connection
    if not check_database_connection():
        return
    
    # Check if main tables exist
    tables_to_check = ['payments', 'payment_parties', 'deals', 'owners', 'investors']
    
    print("\n📋 Checking table existence:")
    for table in tables_to_check:
        exists = check_table_exists(table)
        status = "✅ EXISTS" if exists else "❌ MISSING"
        print(f"  {table}: {status}")
    
    # Check payments table structure
    if check_table_exists('payments'):
        print("\n🔍 Checking payments table structure:")
        columns = get_column_info('payments')
        
        required_columns = ['status', 'payment_type', 'due_date']
        existing_columns = [col[0] for col in columns]
        
        for req_col in required_columns:
            if req_col in existing_columns:
                print(f"  ✅ {req_col} column exists")
            else:
                print(f"  ❌ {req_col} column missing")
        
        # Check status column specifically
        print("\n🔍 Checking status column details:")
        status_type = check_payments_status_column()
        
        if status_type:
            # Check if all required status values are present
            required_statuses = ['pending', 'completed', 'overdue', 'cancelled', 'failed']
            if all(status in status_type for status in required_statuses):
                print("✅ Status column has all required values")
            else:
                print("⚠️  Status column needs updating")
                print("🔄 Applying status enum update...")
                update_payments_status_enum()
        else:
            print("❌ Status column missing - needs to be added")
    
    # Check payment_parties table
    if check_table_exists('payment_parties'):
        print("\n🔍 Checking payment_parties table structure:")
        columns = get_column_info('payment_parties')
        
        required_columns = ['pay_to_id', 'pay_to_name', 'pay_to_type', 'role']
        existing_columns = [col[0] for col in columns]
        
        for req_col in required_columns:
            if req_col in existing_columns:
                print(f"  ✅ {req_col} column exists")
            else:
                print(f"  ❌ {req_col} column missing")
    
    print("\n" + "=" * 50)
    print("✅ Database schema check completed!")
    print("\nIf any columns were missing, please run the migration scripts:")
    print("  - migrations/20250901_add_status_and_pay_to.sql")
    print("  - migrations/20250906_update_payment_status_enum.sql")

if __name__ == "__main__":
    main()
