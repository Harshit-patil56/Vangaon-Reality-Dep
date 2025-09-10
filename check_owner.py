import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'land-deals-backend'))

from app import app

with app.app_context():
    from app import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # First, let's see what columns exist in the owners table
    cursor.execute('DESCRIBE owners')
    columns = cursor.fetchall()
    print('Owners table columns:')
    for col in columns:
        print(f'  {col[0]} ({col[1]})')
    
    # Check investors table too
    cursor.execute('DESCRIBE investors')
    columns = cursor.fetchall()
    print('\nInvestors table columns:')
    for col in columns:
        print(f'  {col[0]} ({col[1]})')
    
    # Check if owner with ID 147 exists
    cursor.execute('SELECT id, name FROM owners WHERE id = 147')
    owner = cursor.fetchone()
    
    if owner:
        print(f'\nOwner 147 found: {owner}')
        print(f'Columns: id={owner[0]}, name="{owner[1]}"')
    else:
        print('\nOwner with ID 147 not found')
    
    # Let's also check a few owners around this ID
    cursor.execute('SELECT id, name FROM owners WHERE id BETWEEN 145 AND 150 ORDER BY id')
    nearby_owners = cursor.fetchall()
    print(f'\nOwners near ID 147:')
    for owner in nearby_owners:
        print(f'  ID {owner[0]}: name="{owner[1]}"')
    
    # Check if investor 159 exists
    cursor.execute('SELECT id, investor_name FROM investors WHERE id = 159')
    investor = cursor.fetchone()
    
    if investor:
        print(f'\nInvestor 159 found: {investor}')
        print(f'Columns: id={investor[0]}, investor_name="{investor[1]}"')
    else:
        print('\nInvestor with ID 159 not found')
    
    # Also check what payment is using owner_147
    cursor.execute('SELECT id, deal_id, paid_by, paid_to, amount FROM payments WHERE paid_by LIKE "%owner_147%" OR paid_to LIKE "%owner_147%"')
    payments = cursor.fetchall()
    print(f'\nPayments involving owner_147:')
    for payment in payments:
        print(f'  Payment ID {payment[0]}: Deal {payment[1]}, paid_by="{payment[2]}", paid_to="{payment[3]}", amount={payment[4]}')
    
    cursor.close()
    conn.close()
