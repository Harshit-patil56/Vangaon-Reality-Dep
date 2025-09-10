# New endpoint to add to app.py for cross-deal payment support

@app.route('/api/payments', methods=['GET'])
@token_required
def list_all_payments(current_user):
    """Return all payments across all deals with deal information"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get all payments with deal information
        cursor.execute("""
            SELECT p.*, 
                   d.title as deal_name, 
                   d.location as deal_location,
                   d.state as deal_state,
                   d.district as deal_district
            FROM payments p 
            JOIN deals d ON p.deal_id = d.id 
            ORDER BY p.payment_date DESC, p.id DESC
        """)
        rows = cursor.fetchall() or []

        # Convert dates to isoformat
        for r in rows:
            for k in ('payment_date', 'due_date', 'created_at'):
                if r.get(k) is not None and isinstance(r.get(k), datetime):
                    r[k] = r[k].isoformat()
            
            # Add deal name for frontend display
            if r.get('deal_name'):
                r['dealName'] = r['deal_name']
            else:
                r['dealName'] = f"Deal #{r['deal_id']}"

        return jsonify({'payments': rows}), 200

    except Exception as e:
        print(f"Error fetching all payments: {str(e)}")
        return jsonify({'error': 'Failed to fetch payments'}), 500
    finally:
        if conn:
            conn.close()
