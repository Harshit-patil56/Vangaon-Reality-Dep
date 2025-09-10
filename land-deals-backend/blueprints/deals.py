from flask import Blueprint, request, jsonify
import mysql.connector
from .. import get_db_connection, token_required

deals_bp = Blueprint('deals', __name__, url_prefix='/api/deals')

@deals_bp.route('/', methods=['GET'])
@token_required
def get_deals(current_user):
    """Get all deals"""
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM deals")
        deals = cursor.fetchall()
        return jsonify(deals)
    except mysql.connector.Error as err:
        return jsonify({"error": str(err)}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

@deals_bp.route('/<int:deal_id>', methods=['GET'])
@token_required
def get_deal(current_user, deal_id):
    """Get a single deal by id"""
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM deals WHERE id = %s", (deal_id,))
        deal = cursor.fetchone()
        if deal:
            return jsonify(deal)
        else:
            return jsonify({"error": "Deal not found"}), 404
    except mysql.connector.Error as err:
        return jsonify({"error": str(err)}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

@deals_bp.route('/', methods=['POST'])
@token_required
def create_deal(current_user):
    """Create a new deal"""
    data = request.get_json()
    # ... (add the rest of the create_deal logic here)
    return jsonify({"message": "Deal created"}), 201

@deals_bp.route('/<int:deal_id>', methods=['PUT'])
@token_required
def update_deal(current_user, deal_id):
    """Update an existing deal"""
    data = request.get_json()
    # ... (add the rest of the update_deal logic here)
    return jsonify({"message": "Deal updated"})

@deals_bp.route('/<int:deal_id>', methods=['DELETE'])
@token_required
def delete_deal(current_user, deal_id):
    """Delete a deal"""
    # ... (add the rest of the delete_deal logic here)
    return jsonify({"message": "Deal deleted"})

@deals_bp.route('/<int:deal_id>/financials', methods=['GET'])
@token_required
def deal_financials(current_user, deal_id):
    """Return a financial summary for a deal"""
    # ... (add the rest of the deal_financials logic here)
    return jsonify({"message": "Financials"})