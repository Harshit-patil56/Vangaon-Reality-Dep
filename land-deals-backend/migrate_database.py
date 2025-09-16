#!/usr/bin/env python3
"""
Database Schema Checker and Migration Script
Checks current payments table structure and applies necessary updates for enhanced payment management
"""

import os
import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_db_connection():
    """Get database connection using environment variables"""
    try:
        db_config = {
            'host': os.environ.get('DB_HOST'),
            'port': int(os.environ.get('DB_PORT', 3306)),
            'user': os.environ.get('DB_USER'),
            'password': os.environ.get('DB_PASSWORD'),
            'database': os.environ.get('DB_NAME'),
        }
        
        # Add SSL configuration only if SSL certificate exists (for cloud databases)
        ssl_ca_path = os.path.join(os.path.dirname(__file__), 'ca-certificate.pem')
        if os.path.exists(ssl_ca_path) and os.environ.get('DB_HOST') and 'aivencloud.com' in os.environ.get('DB_HOST', ''):
            db_config.update({
                'ssl_ca': ssl_ca_path,
                'ssl_verify_cert': True,
                'ssl_verify_identity': True
            })
        
        connection = mysql.connector.connect(**db_config)
        return connection
    except Error as e:
        print(f"Error connecting to database: {e}")
        return None

def check_table_structure():
    """Check current payments table structure"""
    conn = get_db_connection()
    if not conn:
        return None
    
    try:
        cursor = conn.cursor()
        
        # Check if payments table exists
        cursor.execute("SHOW TABLES LIKE 'payments'")
        if not cursor.fetchone():
            print("❌ Payments table does not exist!")
            return None
        
        # Get current table structure
        cursor.execute("DESCRIBE payments")
        columns = cursor.fetchall()
        
        print("📊 Current payments table structure:")
        print("-" * 60)
        for column in columns:
            print(f"{column[0]:<20} {column[1]:<30} {column[2]}")
        
        # Check for enhanced columns
        column_names = [col[0] for col in columns]
        enhanced_columns = ['status', 'due_date', 'paid_by', 'paid_to', 'description', 'category']
        missing_columns = [col for col in enhanced_columns if col not in column_names]
        
        print(f"\n🔍 Enhanced columns check:")
        for col in enhanced_columns:
            status = "✅ EXISTS" if col in column_names else "❌ MISSING"
            print(f"  {col:<15} {status}")
        
        return {
            'columns': columns,
            'column_names': column_names,
            'missing_columns': missing_columns
        }
        
    except Error as e:
        print(f"Error checking table structure: {e}")
        return None
    finally:
        if conn:
            conn.close()

def apply_schema_updates():
    """Apply schema updates for enhanced payment management"""
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        
        print("\n🔧 Applying schema updates...")
        
        # List of SQL statements to execute
        updates = [
            # Add status column
            """
            ALTER TABLE payments 
            ADD COLUMN status ENUM('pending', 'completed', 'cancelled', 'failed', 'overdue') 
            DEFAULT 'pending' 
            AFTER payment_mode
            """,
            
            # Add due_date column
            """
            ALTER TABLE payments 
            ADD COLUMN due_date DATE NULL 
            AFTER payment_date
            """,
            
            # Add paid_by column
            """
            ALTER TABLE payments 
            ADD COLUMN paid_by VARCHAR(255) NULL 
            AFTER reference
            """,
            
            # Add paid_to column
            """
            ALTER TABLE payments 
            ADD COLUMN paid_to VARCHAR(255) NULL 
            AFTER paid_by
            """,
            
            # Add description column
            """
            ALTER TABLE payments 
            ADD COLUMN description TEXT NULL 
            AFTER notes
            """,
            
            # Add category column
            """
            ALTER TABLE payments 
            ADD COLUMN category VARCHAR(100) NULL 
            AFTER description
            """,
            
            # Update payment_type enum to include maintenance_taxes
            """
            ALTER TABLE payments 
            MODIFY COLUMN payment_type ENUM('land_purchase', 'investment_sale', 'documentation_legal', 'maintenance_taxes', 'other') 
            DEFAULT 'other'
            """
        ]
        
        # Execute each update, handling errors gracefully
        for i, sql in enumerate(updates):
            try:
                cursor.execute(sql)
                conn.commit()
                print(f"✅ Update {i+1}/7 completed successfully")
            except Error as e:
                if "Duplicate column name" in str(e):
                    print(f"⚠️  Update {i+1}/7 skipped - column already exists")
                elif "Unknown column" in str(e):
                    print(f"⚠️  Update {i+1}/7 skipped - base column missing")
                else:
                    print(f"❌ Update {i+1}/7 failed: {e}")
        
        # Add indexes for better performance
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)",
            "CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(payment_type)",
            "CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments(due_date)"
        ]
        
        print("\n📈 Adding performance indexes...")
        for idx_sql in indexes:
            try:
                cursor.execute(idx_sql)
                conn.commit()
                print(f"✅ Index created successfully")
            except Error as e:
                print(f"⚠️  Index creation skipped: {e}")
        
        # Update existing records with default values
        print("\n🔄 Updating existing records...")
        try:
            cursor.execute("""
                UPDATE payments 
                SET status = CASE 
                    WHEN payment_date <= CURDATE() THEN 'completed'
                    ELSE 'pending'
                END
                WHERE status IS NULL
            """)
            conn.commit()
            print("✅ Existing records updated with default status")
        except Error as e:
            print(f"⚠️  Record update skipped: {e}")
        
        return True
        
    except Error as e:
        print(f"❌ Error applying schema updates: {e}")
        conn.rollback()
        return False
    finally:
        if conn:
            conn.close()

def main():
    """Main function to check and update database schema"""
    print("🚀 Enhanced Payment Management - Database Migration")
    print("=" * 60)
    
    # Test connection
    print("🔌 Testing database connection...")
    conn = get_db_connection()
    if not conn:
        print("❌ Failed to connect to database. Please check your credentials.")
        return
    
    print("✅ Database connection successful!")
    conn.close()
    
    # Check current structure
    table_info = check_table_structure()
    if not table_info:
        return
    
    # Apply updates if needed
    if table_info['missing_columns']:
        print(f"\n🔄 Found {len(table_info['missing_columns'])} missing columns")
        print("Applying schema updates...")
        
        if apply_schema_updates():
            print("\n✅ Schema updates completed successfully!")
            
            # Verify updates
            print("\n🔍 Verifying updates...")
            check_table_structure()
            
        else:
            print("\n❌ Schema updates failed!")
    else:
        print("\n✅ All enhanced columns are already present!")
    
    print("\n🎉 Database migration process completed!")

if __name__ == "__main__":
    main()
