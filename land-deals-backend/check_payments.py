import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

connection = mysql.connector.connect(
    host=os.getenv('DB_HOST'),
    user=os.getenv('DB_USER'),
    password=os.getenv('DB_PASSWORD'),
    database=os.getenv('DB_NAME'),
    port=int(os.getenv('DB_PORT', 3306))
)

cursor = connection.cursor()
cursor.execute('SELECT id, amount, status, paid_by_id, receiver_id, payment_date FROM payments WHERE deal_id = 124 ORDER BY payment_date DESC LIMIT 10')
results = cursor.fetchall()

print('Recent payments for deal 124:')
for row in results:
    print(f'ID: {row[0]}, Amount: {row[1]}, Status: "{row[2]}", Paid_by_id: {row[3]}, Receiver_id: {row[4]}, Date: {row[5]}')

cursor.close()
connection.close()
