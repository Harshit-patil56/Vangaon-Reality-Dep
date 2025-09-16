"""
Test database connection with current environment variables
"""
import mysql.connector
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_db_connection():
    print("🔧 Testing Database Connection...")
    print("=" * 40)
    
    # Show current config (without password)
    print(f"DB_HOST: {os.getenv('DB_HOST')}")
    print(f"DB_PORT: {os.getenv('DB_PORT')}")
    print(f"DB_USER: {os.getenv('DB_USER')}")
    print(f"DB_NAME: {os.getenv('DB_NAME')}")
    print(f"SECRET_KEY: {'SET' if os.getenv('SECRET_KEY') else 'NOT SET'}")
    print()
    
    try:
        # Try connection with SSL as required by Aiven
        connection = mysql.connector.connect(
            host=os.getenv('DB_HOST'),
            port=int(os.getenv('DB_PORT', 3306)),
            user=os.getenv('DB_USER'),
            password=os.getenv('DB_PASSWORD'),
            database=os.getenv('DB_NAME'),
            ssl_ca='ca-certificate.pem',
            ssl_disabled=False
        )
        
        cursor = connection.cursor()
        cursor.execute("SELECT 1")
        result = cursor.fetchone()
        
        print("✅ Database connection successful!")
        print(f"   Test query result: {result}")
        
        # Test users table
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]
        print(f"   Users in database: {user_count}")
        
        connection.close()
        return True
        
    except Exception as e:
        print(f"❌ Database connection failed!")
        print(f"   Error: {e}")
        return False

if __name__ == "__main__":
    test_db_connection()