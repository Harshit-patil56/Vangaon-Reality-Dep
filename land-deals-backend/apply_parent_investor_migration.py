#!/usr/bin/env python3

import mysql.connector
from mysql.connector import Error
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def apply_migration():
    connection = None
    try:
        connection = mysql.connector.connect(
            host=os.getenv('DB_HOST'),
            port=int(os.getenv('DB_PORT', 3306)),
            user=os.getenv('DB_USER'),
            password=os.getenv('DB_PASSWORD'),
            database=os.getenv('DB_NAME'),
            ssl_ca='ca-certificate.pem',
            ssl_disabled=False,
            charset='utf8mb4',
            collation='utf8mb4_unicode_ci'
        )
        
        if connection.is_connected():
            cursor = connection.cursor()
            print('Connected to MySQL database')
            
            # Check if column exists first
            cursor.execute("""
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = %s 
                AND TABLE_NAME = 'investors' 
                AND COLUMN_NAME = 'parent_investor_id'
            """, (os.getenv('DB_NAME'),))
            result = cursor.fetchone()
            
            if result:
                print('✅ parent_investor_id column already exists')
            else:
                print('🔧 Adding parent_investor_id column...')
                
                # Add the column
                cursor.execute('ALTER TABLE investors ADD COLUMN parent_investor_id INT DEFAULT NULL')
                print('✅ Column added successfully')
                
                # Add foreign key constraint
                cursor.execute("""
                    ALTER TABLE investors ADD CONSTRAINT fk_parent_investor 
                    FOREIGN KEY (parent_investor_id) REFERENCES investors(id) ON DELETE SET NULL
                """)
                print('✅ Foreign key constraint added')
                
                # Create index (MySQL doesn't support IF NOT EXISTS for indexes, so we'll use a different approach)
                try:
                    cursor.execute('CREATE INDEX idx_investors_parent ON investors(parent_investor_id)')
                    print('✅ Index created')
                except Error as index_error:
                    if index_error.errno == 1061:  # Duplicate key name
                        print('✅ Index already exists')
                    else:
                        print(f'⚠️ Index creation failed: {index_error}')
                
                connection.commit()
                print('🎉 Migration completed successfully!')
            
    except Error as e:
        print(f'❌ Error: {e}')
        if connection:
            connection.rollback()
    finally:
        if connection and connection.is_connected():
            cursor.close()
            connection.close()
            print('MySQL connection closed')

if __name__ == "__main__":
    apply_migration()