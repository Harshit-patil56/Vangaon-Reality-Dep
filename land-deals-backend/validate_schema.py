#!/usr/bin/env python3
"""
Detailed Database Schema Validator
Checks specific enum values and data consistency
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

def check_payment_type_enum():
    """Check if payment_type has all required values"""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        cursor.execute(f"""
            SELECT COLUMN_TYPE 
            FROM information_schema.columns
            WHERE table_schema = '{DB_CONFIG['database']}' 
            AND table_name = 'payments'
            AND column_name = 'payment_type'
        """)
        
        result = cursor.fetchone()
        conn.close()
        
        if result:
            column_type = result[0]
            print(f"Payment type column: {column_type}")
            
            required_types = ['land_purchase', 'investment_sale', 'documentation_legal', 'maintenance_taxes', 'other']
            missing_types = []
            
            for req_type in required_types:
                if req_type not in column_type:
                    missing_types.append(req_type)
            
            if missing_types:
                print(f"⚠️  Missing payment types: {missing_types}")
                return False, missing_types
            else:
                print("✅ Payment type enum has all required values")
                return True, []
        else:
            print("❌ Payment type column does not exist")
            return False, []
    except Exception as e:
        print(f"Error checking payment type: {e}")
        return False, []

def update_payment_type_enum():
    """Update payment_type enum to include maintenance_taxes"""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        print("🔄 Updating payment_type enum...")
        
        cursor.execute("""
            ALTER TABLE payments 
            MODIFY COLUMN payment_type 
            ENUM('land_purchase','investment_sale','documentation_legal','maintenance_taxes','other') 
            DEFAULT 'other'
        """)
        
        conn.commit()
        print("✅ Payment type enum updated successfully!")
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Error updating payment type enum: {e}")
        conn.close()
        return False

def check_sample_data():
    """Check some sample data to verify everything is working"""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Check payments count
        cursor.execute("SELECT COUNT(*) FROM payments")
        payment_count = cursor.fetchone()[0]
        print(f"📊 Total payments in database: {payment_count}")
        
        # Check status distribution
        cursor.execute("""
            SELECT status, COUNT(*) 
            FROM payments 
            WHERE status IS NOT NULL 
            GROUP BY status
        """)
        
        status_counts = cursor.fetchall()
        if status_counts:
            print("📊 Status distribution:")
            for status, count in status_counts:
                print(f"  {status}: {count}")
        else:
            print("📊 No status data found (all NULL)")
        
        # Check payment types
        cursor.execute("""
            SELECT payment_type, COUNT(*) 
            FROM payments 
            WHERE payment_type IS NOT NULL 
            GROUP BY payment_type
        """)
        
        type_counts = cursor.fetchall()
        if type_counts:
            print("📊 Payment type distribution:")
            for ptype, count in type_counts:
                print(f"  {ptype}: {count}")
        
        conn.close()
        
    except Exception as e:
        print(f"Error checking sample data: {e}")

def main():
    """Main validation function"""
    print("🔍 Detailed Database Schema Validation...")
    print("=" * 50)
    
    # Check payment_type enum
    print("\n🔍 Checking payment_type enum:")
    has_all_types, missing_types = check_payment_type_enum()
    
    if not has_all_types and missing_types:
        print("🔄 Updating payment_type enum...")
        update_payment_type_enum()
    
    # Check sample data
    print("\n📊 Database Statistics:")
    check_sample_data()
    
    print("\n" + "=" * 50)
    print("✅ Detailed validation completed!")
    print("\n🎉 Your database schema is ready for the new status functionality!")

if __name__ == "__main__":
    main()
