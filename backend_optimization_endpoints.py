# Backend API optimization endpoints to add to app.py
# Add these endpoints to make frontend pages load much faster

from flask import Flask, jsonify, request
import mysql.connector
import os
from dotenv import load_dotenv

# These functions should be added to your main app.py file
# They provide direct database lookups instead of searching all deals

def get_db_connection():
    """Get database connection using environment variables"""
    return mysql.connector.connect(
        host=os.getenv('DB_HOST'),
        user=os.getenv('DB_USER'), 
        password=os.getenv('DB_PASSWORD'),
        database=os.getenv('DB_NAME'),
        port=int(os.getenv('DB_PORT', 3306)),
        ssl_disabled=False
    )

@app.route('/api/owners/<int:owner_id>', methods=['GET'])
def get_owner_by_id(owner_id):
    """Direct owner lookup - much faster than searching all deals"""
    try:
        # Join owners with deals to get both in one query
        query = """
        SELECT o.*, d.* 
        FROM owners o 
        JOIN deals d ON o.deal_id = d.id 
        WHERE o.id = %s
        """
        cursor.execute(query, (owner_id,))
        result = cursor.fetchone()
        
        if result:
            # Split the result into owner and deal data
            owner_columns = ['id', 'deal_id', 'owner_name', 'mobile', 'email', 'address', 'aadhar_card', 'pan_card', 'created_at']
            owner_data = {col: result[i] for i, col in enumerate(owner_columns) if i < len(result)}
            
            # Deal data starts after owner columns
            deal_columns = ['id', 'project_name', 'survey_number', 'location', 'status', 'created_at', 'total_area']
            deal_data = {col: result[i + len(owner_columns)] for i, col in enumerate(deal_columns) if i + len(owner_columns) < len(result)}
            
            return jsonify({
                'success': True,
                'owner': owner_data,
                'deal': deal_data
            })
        else:
            return jsonify({'success': False, 'message': 'Owner not found'}), 404
            
    except Exception as e:
        print(f"Error fetching owner {owner_id}: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/investors/<int:investor_id>', methods=['GET'])  
def get_investor_by_id(investor_id):
    """Direct investor lookup - much faster than searching all deals"""
    try:
        # Get investor with all their deals in one query
        query = """
        SELECT 
            i.id as investor_id,
            i.investor_name,
            i.investment_amount,
            i.investment_percentage,
            i.mobile,
            i.email,
            i.address,
            d.id as deal_id,
            d.project_name,
            d.location,
            d.status,
            d.total_area,
            d.asking_price
        FROM investors i 
        JOIN deals d ON i.deal_id = d.id 
        WHERE i.id = %s
        """
        cursor.execute(query, (investor_id,))
        results = cursor.fetchall()
        
        if results:
            # Process results - investor info and their deals
            investor_data = {
                'id': results[0][0],
                'investor_name': results[0][1], 
                'investment_amount': float(results[0][2]) if results[0][2] else 0,
                'investment_percentage': float(results[0][3]) if results[0][3] else 0,
                'mobile': results[0][4],
                'email': results[0][5],
                'address': results[0][6]
            }
            
            deals = []
            for row in results:
                deal = {
                    'id': row[7],
                    'project_name': row[8],
                    'location': row[9],
                    'status': row[10],
                    'total_area': float(row[11]) if row[11] else 0,
                    'asking_price': float(row[12]) if row[12] else 0,
                    'investment_amount': float(row[2]) if row[2] else 0
                }
                deals.append(deal)
            
            return jsonify({
                'success': True,
                'investor': investor_data,
                'deals': deals
            })
        else:
            return jsonify({'success': False, 'message': 'Investor not found'}), 404
            
    except Exception as e:
        print(f"Error fetching investor {investor_id}: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/search/owner/<int:owner_id>', methods=['GET'])
def search_owner(owner_id):
    """Search for owner across all deals - fallback method"""
    try:
        query = """
        SELECT o.*, d.*
        FROM owners o
        JOIN deals d ON o.deal_id = d.id
        WHERE o.id = %s OR o.owner_id = %s
        LIMIT 1
        """
        cursor.execute(query, (owner_id, owner_id))
        result = cursor.fetchone()
        
        if result:
            return jsonify({
                'success': True,
                'owner': dict(zip([desc[0] for desc in cursor.description], result))
            })
        else:
            return jsonify({'success': False, 'message': 'Owner not found'}), 404
            
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
