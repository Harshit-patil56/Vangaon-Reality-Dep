"""
Land Selling Features - Backend API Extensions
This file contains all the new API endpoints for land selling, offers, audit logs, and reminders
"""

import os
import json
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify
import mysql.connector

# Add these new endpoints to your app.py file

# ===== AUDIT LOGGING UTILITY =====
def log_activity(user_id, action, entity_type, entity_id, entity_name=None, changes=None, request_obj=None):
    """
    Log user activity for audit trail
    
    Args:
        user_id: ID of the user performing the action
        action: Action type ('CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', etc.)
        entity_type: Type of entity ('deal', 'payment', 'offer', etc.)
        entity_id: ID of the entity being acted upon
        entity_name: Human-readable name of the entity
        changes: Dictionary of changes made
        request_obj: Flask request object for IP and user agent
    """
    conn = None
    try:
        conn = get_db_connection()
        if not conn:
            return False
            
        cursor = conn.cursor()
        
        # Get IP address and user agent from request
        ip_address = None
        user_agent = None
        if request_obj:
            ip_address = request_obj.remote_addr
            user_agent = request_obj.headers.get('User-Agent')
        
        # Convert changes to JSON string
        changes_json = json.dumps(changes) if changes else None
        
        cursor.execute("""
            INSERT INTO activity_logs (user_id, action, entity_type, entity_id, entity_name, changes, ip_address, user_agent)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (user_id, action, entity_type, entity_id, entity_name, changes_json, ip_address, user_agent))
        
        conn.commit()
        return True
        
    except mysql.connector.Error as e:
        print(f"Error logging activity: {e}")
        return False
    finally:
        if conn:
            conn.close()

# ===== SELLING ENDPOINTS =====

@app.route('/api/deals/<int:deal_id>/selling-status', methods=['PUT'])
@token_required
def update_selling_status(current_user, deal_id):
    """Update deal status for selling (For Sale / Sold)"""
    data = request.get_json() or {}
    new_status = data.get('status')
    asking_price = data.get('asking_price')
    sold_price = data.get('sold_price')
    
    if new_status not in ['For Sale', 'Sold']:
        return jsonify({'error': 'Invalid selling status'}), 400
    
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get current deal data for audit log
        cursor.execute("SELECT * FROM deals WHERE id = %s", (deal_id,))
        old_deal = cursor.fetchone()
        if not old_deal:
            return jsonify({'error': 'Deal not found'}), 404
        
        # Prepare update data
        update_fields = ['status = %s']
        update_values = [new_status]
        changes = {'status': {'old': old_deal['status'], 'new': new_status}}
        
        if new_status == 'For Sale':
            if asking_price:
                update_fields.append('asking_price = %s')
                update_values.append(asking_price)
                changes['asking_price'] = {'old': old_deal.get('asking_price'), 'new': asking_price}
            
            update_fields.append('listing_date = %s')
            update_values.append(datetime.now().date())
            changes['listing_date'] = {'old': old_deal.get('listing_date'), 'new': datetime.now().date().isoformat()}
            
        elif new_status == 'Sold':
            if sold_price:
                update_fields.append('sold_price = %s')
                update_values.append(sold_price)
                changes['sold_price'] = {'old': old_deal.get('sold_price'), 'new': sold_price}
            
            update_fields.append('sold_date = %s')
            update_values.append(datetime.now().date())
            changes['sold_date'] = {'old': old_deal.get('sold_date'), 'new': datetime.now().date().isoformat()}
        
        update_values.append(deal_id)
        
        # Update the deal
        cursor.execute(f"""
            UPDATE deals 
            SET {', '.join(update_fields)}
            WHERE id = %s
        """, update_values)
        
        conn.commit()
        
        # Log the activity
        log_activity(
            user_id=current_user,
            action='STATUS_CHANGE',
            entity_type='deal',
            entity_id=deal_id,
            entity_name=old_deal.get('project_name'),
            changes=changes,
            request_obj=request
        )
        
        return jsonify({'message': 'Selling status updated successfully'})
        
    except mysql.connector.Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/deals/selling', methods=['GET'])
@token_required
def get_selling_deals(current_user):
    """Get all deals marked as For Sale or Sold"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT d.*, 
                   COUNT(o.id) as offer_count,
                   MAX(o.offer_amount) as highest_offer
            FROM deals d
            LEFT JOIN offers o ON d.id = o.deal_id AND o.status != 'Rejected'
            WHERE d.status IN ('For Sale', 'Sold')
            GROUP BY d.id
            ORDER BY 
                CASE WHEN d.status = 'For Sale' THEN 1 ELSE 2 END,
                d.listing_date DESC, d.sold_date DESC
        """)
        
        deals = cursor.fetchall() or []
        
        # Convert dates to ISO format
        for deal in deals:
            for date_field in ['listing_date', 'sold_date', 'created_at']:
                if deal.get(date_field) and isinstance(deal[date_field], datetime):
                    deal[date_field] = deal[date_field].isoformat()
                elif deal.get(date_field):
                    deal[date_field] = str(deal[date_field])
        
        return jsonify(deals)
        
    except mysql.connector.Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()

# ===== OFFERS ENDPOINTS =====

@app.route('/api/deals/<int:deal_id>/offers', methods=['GET'])
@token_required
def get_deal_offers(current_user, deal_id):
    """Get all offers for a specific deal"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT o.*, u.name as created_by_name
            FROM offers o
            LEFT JOIN users u ON o.created_by = u.id
            WHERE o.deal_id = %s
            ORDER BY o.offer_date DESC, o.created_at DESC
        """, (deal_id,))
        
        offers = cursor.fetchall() or []
        
        # Convert dates to ISO format
        for offer in offers:
            for date_field in ['offer_date', 'valid_until', 'created_at', 'updated_at']:
                if offer.get(date_field) and isinstance(offer[date_field], datetime):
                    offer[date_field] = offer[date_field].isoformat()
                elif offer.get(date_field):
                    offer[date_field] = str(offer[date_field])
        
        return jsonify(offers)
        
    except mysql.connector.Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/deals/<int:deal_id>/offers', methods=['POST'])
@token_required
def create_offer(current_user, deal_id):
    """Create a new offer for a deal"""
    data = request.get_json() or {}
    
    required_fields = ['buyer_name', 'offer_amount', 'offer_date']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Verify deal exists and is for sale
        cursor.execute("SELECT project_name, status FROM deals WHERE id = %s", (deal_id,))
        deal = cursor.fetchone()
        if not deal:
            return jsonify({'error': 'Deal not found'}), 404
        
        if deal[1] != 'For Sale':
            return jsonify({'error': 'Deal is not available for offers'}), 400
        
        # Parse offer date
        offer_date = parse_date_to_mysql_format(data['offer_date'])
        valid_until = parse_date_to_mysql_format(data.get('valid_until')) if data.get('valid_until') else None
        
        cursor.execute("""
            INSERT INTO offers (deal_id, buyer_name, buyer_email, buyer_phone, offer_amount, 
                              offer_date, notes, valid_until, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            deal_id,
            data['buyer_name'],
            data.get('buyer_email'),
            data.get('buyer_phone'),
            data['offer_amount'],
            offer_date,
            data.get('notes'),
            valid_until,
            current_user
        ))
        
        offer_id = cursor.lastrowid
        conn.commit()
        
        # Log the activity
        log_activity(
            user_id=current_user,
            action='CREATE',
            entity_type='offer',
            entity_id=offer_id,
            entity_name=f"Offer from {data['buyer_name']} for {deal[0]}",
            changes={'offer_amount': data['offer_amount'], 'buyer_name': data['buyer_name']},
            request_obj=request
        )
        
        return jsonify({'message': 'Offer created successfully', 'offer_id': offer_id}), 201
        
    except mysql.connector.Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/offers/<int:offer_id>/status', methods=['PUT'])
@token_required
def update_offer_status(current_user, offer_id):
    """Update offer status (Accept/Reject/Counter)"""
    data = request.get_json() or {}
    new_status = data.get('status')
    
    if new_status not in ['Pending', 'Accepted', 'Rejected', 'Countered']:
        return jsonify({'error': 'Invalid offer status'}), 400
    
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get current offer
        cursor.execute("""
            SELECT o.*, d.project_name 
            FROM offers o 
            JOIN deals d ON o.deal_id = d.id 
            WHERE o.id = %s
        """, (offer_id,))
        offer = cursor.fetchone()
        if not offer:
            return jsonify({'error': 'Offer not found'}), 404
        
        # Update offer status
        cursor.execute("UPDATE offers SET status = %s WHERE id = %s", (new_status, offer_id))
        conn.commit()
        
        # Log the activity
        log_activity(
            user_id=current_user,
            action='UPDATE',
            entity_type='offer',
            entity_id=offer_id,
            entity_name=f"Offer from {offer['buyer_name']}",
            changes={'status': {'old': offer['status'], 'new': new_status}},
            request_obj=request
        )
        
        return jsonify({'message': 'Offer status updated successfully'})
        
    except mysql.connector.Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()

# ===== GEOLOCATION ENDPOINTS =====

@app.route('/api/deals/<int:deal_id>/location', methods=['PUT'])
@token_required
def update_deal_location(current_user, deal_id):
    """Update deal geolocation"""
    data = request.get_json() or {}
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    
    if latitude is None or longitude is None:
        return jsonify({'error': 'Both latitude and longitude are required'}), 400
    
    try:
        latitude = float(latitude)
        longitude = float(longitude)
        
        # Basic validation for valid lat/lng ranges
        if not (-90 <= latitude <= 90) or not (-180 <= longitude <= 180):
            return jsonify({'error': 'Invalid latitude or longitude values'}), 400
            
    except (ValueError, TypeError):
        return jsonify({'error': 'Latitude and longitude must be valid numbers'}), 400
    
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get current deal for audit log
        cursor.execute("SELECT project_name, latitude, longitude FROM deals WHERE id = %s", (deal_id,))
        deal = cursor.fetchone()
        if not deal:
            return jsonify({'error': 'Deal not found'}), 404
        
        # Update location
        cursor.execute("""
            UPDATE deals 
            SET latitude = %s, longitude = %s 
            WHERE id = %s
        """, (latitude, longitude, deal_id))
        
        conn.commit()
        
        # Log the activity
        changes = {
            'latitude': {'old': deal.get('latitude'), 'new': latitude},
            'longitude': {'old': deal.get('longitude'), 'new': longitude}
        }
        
        log_activity(
            user_id=current_user,
            action='UPDATE',
            entity_type='deal',
            entity_id=deal_id,
            entity_name=deal['project_name'],
            changes=changes,
            request_obj=request
        )
        
        return jsonify({'message': 'Location updated successfully'})
        
    except mysql.connector.Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()

# ===== AUDIT LOG ENDPOINTS =====

@app.route('/api/deals/<int:deal_id>/logs', methods=['GET'])
@token_required
def get_deal_logs(current_user, deal_id):
    """Get audit logs for a specific deal"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT al.*, u.name as user_name
            FROM activity_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE al.entity_type = 'deal' AND al.entity_id = %s
            ORDER BY al.timestamp DESC
            LIMIT 100
        """, (deal_id,))
        
        logs = cursor.fetchall() or []
        
        # Process logs for display
        for log in logs:
            if log.get('timestamp') and isinstance(log['timestamp'], datetime):
                log['timestamp'] = log['timestamp'].isoformat()
            
            # Parse changes JSON
            if log.get('changes'):
                try:
                    log['changes'] = json.loads(log['changes'])
                except (json.JSONDecodeError, TypeError):
                    log['changes'] = {}
        
        return jsonify(logs)
        
    except mysql.connector.Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/logs', methods=['GET'])
@token_required
def get_all_logs(current_user):
    """Get all recent audit logs (admin only)"""
    # Check if user has admin permissions
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get user role
        cursor.execute("SELECT role FROM users WHERE id = %s", (current_user,))
        user = cursor.fetchone()
        if not user or user.get('role') != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        # Get recent logs
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)
        entity_type = request.args.get('entity_type')
        
        query = """
            SELECT al.*, u.name as user_name
            FROM activity_logs al
            LEFT JOIN users u ON al.user_id = u.id
        """
        params = []
        
        if entity_type:
            query += " WHERE al.entity_type = %s"
            params.append(entity_type)
        
        query += " ORDER BY al.timestamp DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        cursor.execute(query, params)
        logs = cursor.fetchall() or []
        
        # Process logs
        for log in logs:
            if log.get('timestamp') and isinstance(log['timestamp'], datetime):
                log['timestamp'] = log['timestamp'].isoformat()
            
            if log.get('changes'):
                try:
                    log['changes'] = json.loads(log['changes'])
                except (json.JSONDecodeError, TypeError):
                    log['changes'] = {}
        
        return jsonify(logs)
        
    except mysql.connector.Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()

# Add this code to your existing app.py file
print("✅ Land Selling API endpoints ready for integration")
