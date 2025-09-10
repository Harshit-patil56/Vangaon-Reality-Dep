"""
Database Migration: Add Installment Fields to Payments Table
Date: 2025-09-06
Description: Adds necessary fields to support installment payments feature
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'land-deals-backend'))

from app import app

def add_installment_fields():
    """Add installment-related fields to payments table"""
    with app.app_context():
        from app import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            print("🔄 Starting installment fields migration...")
            
            # Check current table structure
            cursor.execute("DESCRIBE payments")
            existing_columns = [col[0] for col in cursor.fetchall()]
            print(f"📋 Current payments table has {len(existing_columns)} columns")
            
            # List of new columns to add
            new_columns = [
                {
                    'name': 'total_installments',
                    'definition': 'INT DEFAULT NULL',
                    'description': 'Total number of installments'
                },
                {
                    'name': 'parent_amount',
                    'definition': 'DECIMAL(15,2) DEFAULT NULL',
                    'description': 'Original total amount before splitting'
                }
            ]
            
            # Add each column if it doesn't exist
            columns_added = 0
            for column in new_columns:
                if column['name'] not in existing_columns:
                    try:
                        sql = f"ALTER TABLE payments ADD COLUMN {column['name']} {column['definition']}"
                        cursor.execute(sql)
                        conn.commit()
                        print(f"✅ Added column: {column['name']} - {column['description']}")
                        columns_added += 1
                    except Exception as e:
                        print(f"❌ Failed to add column {column['name']}: {e}")
                        conn.rollback()
                else:
                    print(f"ℹ️  Column {column['name']} already exists")
            
            # Verify the installment-related columns
            cursor.execute("DESCRIBE payments")
            all_columns = cursor.fetchall()
            
            installment_columns = []
            for col in all_columns:
                if col[0] in ['is_installment', 'installment_number', 'parent_payment_id', 'total_installments', 'parent_amount']:
                    installment_columns.append({
                        'name': col[0],
                        'type': col[1],
                        'null': col[2],
                        'default': col[4]
                    })
            
            print("\n📊 Current installment-related columns:")
            for col in installment_columns:
                print(f"   - {col['name']}: {col['type']} (Null: {col['null']}, Default: {col['default']})")
            
            if columns_added > 0:
                print(f"\n🎉 Migration completed! Added {columns_added} new columns.")
            else:
                print(f"\n✨ Migration completed! No new columns needed to be added.")
                
            print("\n🔍 Installment feature is now ready!")
            
        except Exception as e:
            print(f"💥 Migration failed: {e}")
            conn.rollback()
            return False
        finally:
            cursor.close()
            conn.close()
            
    return True

def verify_installment_support():
    """Verify that all required fields exist for installment functionality"""
    with app.app_context():
        from app import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("DESCRIBE payments")
            existing_columns = [col[0] for col in cursor.fetchall()]
            
            required_fields = [
                'is_installment',
                'installment_number', 
                'parent_payment_id',
                'total_installments',
                'parent_amount'
            ]
            
            missing_fields = []
            for field in required_fields:
                if field not in existing_columns:
                    missing_fields.append(field)
            
            if missing_fields:
                print(f"❌ Missing required fields: {', '.join(missing_fields)}")
                return False
            else:
                print("✅ All required installment fields are present!")
                return True
                
        except Exception as e:
            print(f"Error verifying installment support: {e}")
            return False
        finally:
            cursor.close()
            conn.close()

def test_installment_creation():
    """Test creating a sample installment payment"""
    print("\n🧪 Testing installment payment creation...")
    
    with app.app_context():
        from app import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Create a test installment payment
            test_payment = {
                'deal_id': 1,  # Assuming deal 1 exists
                'amount': 10000.00,
                'payment_date': '2025-09-06',
                'description': 'Test installment payment',
                'payment_type': 'land_purchase',
                'status': 'pending',
                'paid_by': 'test_payer',
                'paid_to': 'test_receiver',
                'is_installment': True,
                'installment_number': 1,
                'total_installments': 3,
                'parent_amount': 30000.00
            }
            
            sql = """
                INSERT INTO payments (
                    deal_id, amount, payment_date, description, payment_type, 
                    status, paid_by, paid_to, is_installment, installment_number,
                    total_installments, parent_amount, created_at
                ) VALUES (
                    %(deal_id)s, %(amount)s, %(payment_date)s, %(description)s, %(payment_type)s,
                    %(status)s, %(paid_by)s, %(paid_to)s, %(is_installment)s, %(installment_number)s,
                    %(total_installments)s, %(parent_amount)s, NOW()
                )
            """
            
            cursor.execute(sql, test_payment)
            test_payment_id = cursor.lastrowid
            conn.commit()
            
            print(f"✅ Test installment payment created with ID: {test_payment_id}")
            
            # Clean up the test payment
            cursor.execute("DELETE FROM payments WHERE id = %s", (test_payment_id,))
            conn.commit()
            print("🧹 Test payment cleaned up")
            
            return True
            
        except Exception as e:
            print(f"❌ Test failed: {e}")
            conn.rollback()
            return False
        finally:
            cursor.close()
            conn.close()

if __name__ == "__main__":
    print("🚀 Starting installment feature migration for cloud database...")
    print("=" * 60)
    
    # Step 1: Add installment fields
    if add_installment_fields():
        print("\n" + "=" * 60)
        
        # Step 2: Verify all fields exist
        if verify_installment_support():
            print("\n" + "=" * 60)
            
            # Step 3: Test installment creation
            if test_installment_creation():
                print("\n" + "=" * 60)
                print("🎉 Installment feature migration completed successfully!")
                print("✨ Your application now supports installment payments!")
            else:
                print("\n❌ Migration completed but test failed")
        else:
            print("\n❌ Migration incomplete - missing required fields")
    else:
        print("\n💥 Migration failed!")
