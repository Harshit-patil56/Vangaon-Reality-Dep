# app.py - Main Flask Application
from flask import Flask, request, jsonify, session, send_from_directory, send_file, abort
from flask_cors import CORS
from flask_compress import Compress
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import mysql.connector
from datetime import datetime, timedelta
import jwt
import os
import time
import csv
import io
import re
import traceback
from io import BytesIO
import hashlib
try:
    import bcrypt
    print(f"[DEBUG] bcrypt module imported successfully: {bcrypt}")
except ImportError:
    print("[DEBUG] bcrypt not found, attempting to install...")
    import subprocess
    import sys
    try:
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'bcrypt'])
        import bcrypt
        print(f"[DEBUG] bcrypt installed and imported: {bcrypt}")
    except Exception as e:
        print(f"[DEBUG] Failed to install bcrypt: {e}")
        bcrypt = None
try:
    from dotenv import load_dotenv
    load_dotenv()  # Load environment variables from .env file
except ImportError:
    pass  # python-dotenv not installed
try:
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    from reportlab.lib.utils import ImageReader
except Exception:
    # reportlab may not be installed in dev environment; the endpoint will return an error
    A4 = None
    canvas = None
    ImageReader = None
from functools import wraps
import json
import mimetypes
import requests
import re
from document_manager import get_document_manager

def parse_date_to_mysql_format(date_str):
    """
    Parse various date formats and convert to MySQL-compatible YYYY-MM-DD format
    Handles formats like:
    - 'Fri, 05 Sep 2025 00:00:00 GMT' (JavaScript toUTCString)
    - '2025-09-05' (ISO format)
    - '09/05/2025' (US format)
    - '05/09/2025' (UK format)
    """
    if not date_str:
        return None
    
    # Clean the input string
    date_str = str(date_str).strip()
    
    try:
        # Try YYYY-MM-DD format first (ISO format)
        if re.match(r'^\d{4}-\d{2}-\d{2}$', date_str):
            parsed_date = datetime.strptime(date_str, '%Y-%m-%d')
            return parsed_date.strftime('%Y-%m-%d')
    except Exception:
        pass
    
    try:
        # Try MM/DD/YYYY format
        if re.match(r'^\d{1,2}/\d{1,2}/\d{4}$', date_str):
            parsed_date = datetime.strptime(date_str, '%m/%d/%Y')
            return parsed_date.strftime('%Y-%m-%d')
    except Exception:
        pass
    
    try:
        # Try DD/MM/YYYY format
        if re.match(r'^\d{1,2}/\d{1,2}/\d{4}$', date_str):
            parsed_date = datetime.strptime(date_str, '%d/%m/%Y')
            return parsed_date.strftime('%Y-%m-%d')
    except Exception:
        pass
    
    try:
        # Handle JavaScript date format: 'Fri, 05 Sep 2025 00:00:00 GMT' or truncated 'GM'
        if ',' in date_str and ('GMT' in date_str or 'UTC' in date_str or 'GM' in date_str):
            # Extract just the date part after the comma
            date_part = date_str.split(',')[1].strip()
            # Remove timezone info (GMT, UTC, or truncated GM)
            date_part = re.sub(r'\s+(GMT|UTC|GM).*$', '', date_part)
            # Parse: '05 Sep 2025 00:00:00'
            parsed_date = datetime.strptime(date_part, '%d %b %Y %H:%M:%S')
            return parsed_date.strftime('%Y-%m-%d')
    except Exception:
        pass
    
    try:
        # Try ISO datetime format: '2025-09-05T00:00:00.000Z'
        if 'T' in date_str:
            date_part = date_str.split('T')[0]
            parsed_date = datetime.strptime(date_part, '%Y-%m-%d')
            return parsed_date.strftime('%Y-%m-%d')
    except Exception:
        pass
    
    # If all parsing fails, return None
    return None

def verify_password_comprehensive(password, stored_hash):
    """
    Comprehensive password verification that supports multiple hash types:
    - bcrypt hashes (primary)
    - Werkzeug/Flask password hashes (pbkdf2, sha1, scrypt, etc.)
    - MD5 hashes (legacy)
    - Plain text (insecure legacy)
    """
    if not password or not stored_hash:
        return False
    
    stored_hash = str(stored_hash).strip()
    
    # Try bcrypt FIRST since this is what we're using
    try:
        if stored_hash.startswith('$2b$'):
            if bcrypt is None:
                # Try to import bcrypt again
                import bcrypt as bcrypt_module
                result = bcrypt_module.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8'))
            else:
                result = bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8'))
            if result:
                return True
    except Exception as e:
        # Try importing bcrypt directly in case of import issues
        try:
            import bcrypt as bcrypt_direct
            result = bcrypt_direct.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8'))
            if result:
                return True
        except Exception:
            pass
    
    # Try Werkzeug password hash (pbkdf2, sha1, scrypt, etc.)
    try:
        if stored_hash.startswith(('pbkdf2:', 'sha1$', 'sha256$', 'scrypt:')):
            result = check_password_hash(stored_hash, password)
            if result:
                return True
    except Exception:
        pass
    
    # Try MD5 (legacy)
    try:
        if len(stored_hash) == 32 and all(c in '0123456789abcdef' for c in stored_hash.lower()):
            md5_hash = hashlib.md5(password.encode()).hexdigest()
            result = md5_hash == stored_hash.lower()
            if result:
                return True
    except Exception:
        pass
    
    # Try plain text comparison (should be avoided)
    try:
        result = password == stored_hash
        if result:
            return True
    except Exception:
        pass
    
    return False

# Load environment variables from .env file if it exists
def load_env_file():
    """Load environment variables from .env file"""
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()

# Load environment variables
load_env_file()

app = Flask(__name__)
app.static_folder = 'uploads'
app.static_url_path = '/uploads'
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'fallback-dev-key-not-for-production')
app.config['MAX_CONTENT_LENGTH'] = int(os.environ.get('MAX_CONTENT_LENGTH', 16 * 1024 * 1024))  # 16MB default

# Enable response compression for better performance
Compress(app)

APP_ROOT = os.path.dirname(__file__)
# Use absolute uploads folder inside backend so static serving works predictably
app.config['UPLOAD_FOLDER'] = os.path.join(APP_ROOT, os.environ.get('UPLOAD_FOLDER', 'uploads'))

# Configure CORS with environment variable for frontend URL
frontend_origins = [
    os.environ.get('FRONTEND_URL', 'http://localhost:3000'),
    'http://localhost:3000',  # Always allow localhost for development
    'https://vangaon-reality-1.onrender.com',  # Production frontend
]
CORS(app, origins=frontend_origins, supports_credentials=True, methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     allow_headers=['Content-Type', 'Authorization', 'Range'],
     expose_headers=['Content-Range', 'Accept-Ranges', 'Content-Length', 'Content-Type'])


# Database configuration
DB_CONFIG = {
    'host': os.environ.get('DB_HOST'),
    'port': int(os.environ.get('DB_PORT', 3306)),
    'user': os.environ.get('DB_USER'),
    'password': os.environ.get('DB_PASSWORD'),
    'database': os.environ.get('DB_NAME'),
}

# Add SSL configuration only if SSL certificate exists (for cloud databases)
ssl_ca_path = os.path.join(os.path.dirname(__file__), 'ca-certificate.pem')
if os.path.exists(ssl_ca_path) and os.environ.get('DB_HOST') and 'aivencloud.com' in os.environ.get('DB_HOST', ''):
    DB_CONFIG.update({
        'ssl_ca': ssl_ca_path,
        'ssl_verify_cert': True,
        'ssl_verify_identity': True
    })

# Create uploads directory if it doesn't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Database connection function
def get_db_connection():
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        return connection
    except mysql.connector.Error as err:
        # Log error to application logs instead of console
        return None

# JWT token decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        try:
            if token.startswith('Bearer '):
                token = token[7:]
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            # expose decoded user on request for permission checks
            try:
                request.user = {
                    'id': data.get('user_id'),
                    'username': data.get('username'),
                    'role': data.get('role')
                }
            except Exception:
                request.user = {'id': data.get('user_id')}
            current_user = data['user_id']
        except:
            return jsonify({'error': 'Token is invalid'}), 401
        
        return f(current_user, *args, **kwargs)
    return decorated

def user_access_control(f):
    """
    Decorator to add user-specific access control.
    Regular users can only access data linked to their owner_id or investor_id.
    Admin and auditor roles have full access.
    """
    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        # Get user information from database
        conn = None
        try:
            conn = get_db_connection()
            cur = conn.cursor(dictionary=True)
            cur.execute("SELECT role, owner_id, investor_id FROM users WHERE id = %s", (current_user,))
            user_data = cur.fetchone()
            
            if not user_data:
                return jsonify({'error': 'User not found'}), 403
            
            # Add user access control info to request
            request.user_access = {
                'role': user_data['role'],
                'owner_id': user_data['owner_id'],
                'investor_id': user_data['investor_id'],
                'can_access_all': user_data['role'] in ['admin', 'auditor'],
                'is_read_only': user_data['role'] == 'user'
            }
            
        except Exception as e:
            return jsonify({'error': 'Access control check failed'}), 500
        finally:
            if conn:
                conn.close()
        
        return f(current_user, *args, **kwargs)
    return decorated

# Routes

# Health check endpoint for Render
@app.route('/healthz', methods=['GET'])
def health_check():
    """Health check endpoint for deployment monitoring"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'service': 'land-deals-backend'
    }), 200

# Payments endpoints integrated into app.py (moved here so token_required is defined)
@app.route('/api/payments/test', methods=['GET'])
def payments_test():
    """Test endpoint to check database connectivity"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1 as test")
        result = cursor.fetchone()
        return jsonify({
            'message': 'Payments endpoints active',
            'database_connection': 'OK',
            'test_query': result[0] if result else 'No result'
        })
    except Exception as e:
        return jsonify({
            'message': 'Payments endpoints active',
            'database_connection': 'FAILED',
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/payments', methods=['GET'])
@token_required
def list_all_payments(current_user):
    """Return all payments across all deals with deal information"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get all payments with deal information (fixed column references)
        cursor.execute("""
            SELECT p.*, 
                   COALESCE(d.project_name, CONCAT('Deal #', d.id)) as deal_name, 
                   COALESCE(d.village, d.taluka, d.location) as deal_location,
                   s.name as deal_state,
                   dist.name as deal_district
            FROM payments p 
            JOIN deals d ON p.deal_id = d.id 
            LEFT JOIN states s ON d.state_id = s.id
            LEFT JOIN districts dist ON d.district_id = dist.id
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

        print(f"[DEBUG] Successfully fetched {len(rows)} payments")
        return jsonify({'payments': rows}), 200

    except Exception as e:
        print(f"[DEBUG] Error fetching all payments: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Failed to fetch payments', 'details': str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/payments/<int:deal_id>', methods=['GET'])
def list_payments(deal_id):
    """Return all payments for a deal"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT p.* FROM payments p WHERE p.deal_id = %s ORDER BY p.payment_date DESC", (deal_id,))
        rows = cursor.fetchall() or []

        # convert dates to isoformat where applicable
        for r in rows:
            for k in ('payment_date', 'created_at'):
                if r.get(k) is not None and isinstance(r.get(k), datetime):
                    r[k] = r[k].isoformat()

        # attach parties for each payment using a fresh cursor (dictionary rows expected)
        try:
            party_cursor = conn.cursor(dictionary=True)
            for r in rows:
                # Get payment parties with actual names from related tables
                party_cursor.execute("""
                    SELECT pp.id, pp.party_type, pp.party_id, pp.amount, pp.percentage, pp.role,
                           CASE 
                               WHEN pp.party_type = 'owner' AND pp.party_id IS NOT NULL THEN 
                                   (SELECT name FROM owners WHERE id = pp.party_id)
                               WHEN pp.party_type = 'investor' AND pp.party_id IS NOT NULL THEN 
                                   (SELECT investor_name FROM investors WHERE id = pp.party_id)
                               WHEN pp.party_type = 'buyer' AND pp.party_id IS NOT NULL THEN 
                                   (SELECT name FROM buyers WHERE id = pp.party_id)
                               ELSE NULL
                           END as party_name
                    FROM payment_parties pp 
                    WHERE pp.payment_id = %s
                """, (r['id'],))
                parts = party_cursor.fetchall() or []
                part_list = []
                for p in parts:
                    part_list.append({
                        'id': p.get('id'),
                        'party_type': p.get('party_type'),
                        'party_id': p.get('party_id'),
                        'party_name': p.get('party_name'),
                        'amount': float(p.get('amount')) if p.get('amount') is not None else None,
                        'percentage': float(p.get('percentage')) if p.get('percentage') is not None else None,
                        'role': p.get('role')
                    })
                r['parties'] = part_list
        except Exception:
            for r in rows:
                r['parties'] = []

        return jsonify(rows)
    except mysql.connector.Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/payments/ledger.csv', methods=['GET'])
@token_required
def payments_ledger_csv(current_user):
    """Export ledger results as CSV. Accepts same query params as /api/payments/ledger"""
    params = request.args
    deal_id = params.get('deal_id')
    party_type = params.get('party_type')
    party_id = params.get('party_id')
    payment_mode = params.get('payment_mode')
    payment_type = params.get('payment_type')
    person_search = params.get('person_search')
    start_date = params.get('start_date')
    end_date = params.get('end_date')

    args = []
    if party_type or party_id or person_search:
        sql = """SELECT DISTINCT p.* FROM payments p 
                 JOIN payment_parties pp ON pp.payment_id = p.id 
                 LEFT JOIN owners o ON pp.party_type = 'owner' AND pp.party_id = o.id
                 LEFT JOIN investors i ON pp.party_type = 'investor' AND pp.party_id = i.id
                 LEFT JOIN buyers b ON pp.party_type = 'buyer' AND pp.party_id = b.id
                 WHERE 1=1"""
        if deal_id:
            sql += " AND p.deal_id = %s"
            args.append(deal_id)
        if party_type:
            sql += " AND pp.party_type = %s"
            args.append(party_type)
        if party_id:
            sql += " AND pp.party_id = %s"
            args.append(party_id)
        if person_search:
            sql += """ AND (
                LOWER(o.name) LIKE LOWER(%s) OR 
                LOWER(i.investor_name) LIKE LOWER(%s) OR 
                LOWER(b.name) LIKE LOWER(%s)
            )"""
            search_term = f"%{person_search}%"
            args.extend([search_term, search_term, search_term])
        if payment_mode:
            sql += " AND p.payment_mode = %s"
            args.append(payment_mode)
        if payment_type:
            sql += " AND p.payment_type = %s"
            args.append(payment_type)
    else:
        sql = "SELECT p.* FROM payments p WHERE 1=1"
        if deal_id:
            sql += " AND p.deal_id = %s"
            args.append(deal_id)
        if payment_mode:
            sql += " AND p.payment_mode = %s"
            args.append(payment_mode)
        if payment_type:
            sql += " AND p.payment_type = %s"
            args.append(payment_type)

    if start_date:
        sql += " AND p.payment_date >= %s"
        args.append(start_date)
    if end_date:
        sql += " AND p.payment_date <= %s"
        args.append(end_date)

    sql += " ORDER BY p.payment_date DESC"

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(sql, tuple(args))
        cols = [d[0] for d in cursor.description]
        rows = cursor.fetchall() or []

        import io, csv
        buf = io.StringIO()
        w = csv.writer(buf)
        # add derived payer/payee columns to headers
        headers = cols + ['payers', 'payees']
        w.writerow(headers)
        for r in rows:
            row = []
            for v in r:
                if isinstance(v, datetime):
                    row.append(v.isoformat())
                else:
                    row.append(v)
            # fetch parties for this payment to derive payer/payee lists
            try:
                pc = conn.cursor()
                pc.execute("SELECT party_type, party_id, party_name, amount, percentage, role FROM payment_parties WHERE payment_id = %s", (r[0],))
                parts = pc.fetchall() or []
                payers = []
                payees = []
                for pp in parts:
                    # pp may be tuple; attempt to read role at the last position
                    role = pp[5] if len(pp) > 5 else None
                    label = None
                    # try to use party_name if present in tuple
                    if len(pp) > 2 and pp[2]:
                        label = str(pp[2])
                    elif pp[1]:
                        label = f"{pp[0]} #{pp[1]}"
                    else:
                        label = pp[0]
                    if role and str(role).lower() == 'payer':
                        payers.append(label)
                    elif role and str(role).lower() == 'payee':
                        payees.append(label)
                row.append(', '.join(payers))
                row.append(', '.join(payees))
            except Exception:
                row.append('')
                row.append('')
            w.writerow(row)
        csv_data = buf.getvalue()
        return app.response_class(csv_data, mimetype='text/csv', headers={"Content-Disposition": "attachment; filename=ledger.csv"})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/payments/ledger.pdf', methods=['GET'])
@token_required
def payments_ledger_pdf(current_user):
    """Generate a simple PDF ledger. Embeds the first proof image per payment when present."""
    if canvas is None:
        return jsonify({'error': 'reportlab not available on server'}), 500

    params = request.args
    deal_id = params.get('deal_id')
    party_type = params.get('party_type')
    party_id = params.get('party_id')
    payment_mode = params.get('payment_mode')
    payment_type = params.get('payment_type')
    start_date = params.get('start_date')
    end_date = params.get('end_date')

    args = []
    if party_type or party_id:
        sql = "SELECT DISTINCT p.* FROM payments p JOIN payment_parties pp ON pp.payment_id = p.id WHERE 1=1"
        if deal_id:
            sql += " AND p.deal_id = %s"
            args.append(deal_id)
        if party_type:
            sql += " AND pp.party_type = %s"
            args.append(party_type)
        if party_id:
            sql += " AND pp.party_id = %s"
            args.append(party_id)
        if payment_mode:
            sql += " AND p.payment_mode = %s"
            args.append(payment_mode)
        if payment_type:
            sql += " AND p.payment_type = %s"
            args.append(payment_type)
    else:
        sql = "SELECT p.* FROM payments p WHERE 1=1"
        if deal_id:
            sql += " AND p.deal_id = %s"
            args.append(deal_id)
        if payment_mode:
            sql += " AND p.payment_mode = %s"
            args.append(payment_mode)
        if payment_type:
            sql += " AND p.payment_type = %s"
            args.append(payment_type)

    if start_date:
        sql += " AND p.payment_date >= %s"
        args.append(start_date)
    if end_date:
        sql += " AND p.payment_date <= %s"
        args.append(end_date)

    sql += " ORDER BY p.payment_date DESC"

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(sql, tuple(args))
        rows = cursor.fetchall() or []

        # For each payment fetch one proof file path (if any)
        for r in rows:
            cursor.execute("SELECT file_path FROM payment_proofs WHERE payment_id = %s ORDER BY uploaded_at DESC LIMIT 1", (r['id'],))
            p = cursor.fetchone()
            if p and p.get('file_path'):
                r['proof'] = p.get('file_path')
            else:
                r['proof'] = None

        # Create PDF
        buff = BytesIO()
        c = canvas.Canvas(buff, pagesize=A4)
        width, height = A4
        y = height - 40
        c.setFont('Helvetica-Bold', 14)
        title = f"Payments Ledger {('Deal ' + str(deal_id)) if deal_id else ''}"
        c.drawString(40, y, title)
        y -= 30
        c.setFont('Helvetica', 10)

        for r in rows:
            if y < 160:
                c.showPage()
                y = height - 40
                c.setFont('Helvetica', 10)

            # Header line with date, id, amount, currency
            c.setFont('Helvetica-Bold', 11)
            c.drawString(40, y, f"{r.get('payment_date','')}  | ID: {r.get('id','-')}  | ₹{r.get('amount','')}")
            c.setFont('Helvetica', 10)
            c.drawString(400, y, f"{r.get('currency','INR')}")
            y -= 16

            # Mode, reference, created_by
            c.drawString(40, y, f"Mode: {r.get('payment_mode','-')}")
            c.drawString(200, y, f"Reference: {str(r.get('reference') or '-')}" )
            c.drawString(420, y, f"Created by: {r.get('created_by') or '-'}")
            y -= 14

            # Notes (trim long)
            notes = str(r.get('notes') or '')
            c.drawString(40, y, f"Notes: {notes[:120]}")
            y -= 14

            # Party splits (if any) — draw a small table with columns
            if r.get('parties'):
                parts = r.get('parties') or []
                # derive payer/payee summary if roles present
                try:
                    payers = [pp.get('party_name') or (f"{pp.get('party_type')} #{pp.get('party_id')}") for pp in parts if (pp.get('role') or '').lower() == 'payer']
                    payees = [pp.get('party_name') or (f"{pp.get('party_type')} #{pp.get('party_id')}") for pp in parts if (pp.get('role') or '').lower() == 'payee']
                    if payers or payees:
                        summary = ''
                        if payers and payees:
                            summary = f"{', '.join(payers)} → {', '.join(payees)}"
                        elif payers:
                            summary = f"Paid by {', '.join(payers)}"
                        else:
                            summary = f"Paid to {', '.join(payees)}"
                        c.setFont('Helvetica-Bold', 9)
                        c.drawString(40, y, summary[:200])
                        y -= 14
                except Exception:
                    pass
                if parts:
                    # Table layout
                    x0 = 48
                    col1 = x0
                    col2 = x0 + 260
                    col3 = x0 + 360
                    row_h = 14
                    # header
                    c.setFont('Helvetica-Bold', 9)
                    c.drawString(col1, y, 'Party')
                    c.drawString(col2, y, 'Percentage')
                    c.drawString(col3, y, 'Amount')
                    y -= row_h
                    c.setFont('Helvetica', 9)
                    # rows
                    for pp in parts:
                        # page break if necessary
                        if y < 80:
                            c.showPage()
                            y = height - 40
                            c.setFont('Helvetica', 10)
                        label = pp.get('party_name') or (f"{pp.get('party_type','')} #{pp.get('party_id')}" if pp.get('party_id') else pp.get('party_type',''))
                        pct = pp.get('percentage')
                        amt = pp.get('amount')
                        c.drawString(col1, y, f"{label}")
                        c.drawString(col2, y, f"{pct if pct is not None else '-'}")
                        c.drawRightString(col3 + 60, y, f"{('₹' + format(amt, ',.2f')) if amt is not None else '-'}")
                        y -= row_h
            else:
                # draw image thumbnail if proof exists and file present
                if r.get('proof'):
                    p = r.get('proof').replace('\\', '/')
                    idx = p.find('uploads/')
                    if idx != -1:
                        rel = p[idx:]
                        img_path = os.path.abspath(os.path.join(APP_ROOT, rel))
                        try:
                            img = ImageReader(img_path)
                            c.drawImage(img, 40, y-60, width=80, height=60, preserveAspectRatio=True, mask='auto')
                            y -= 64
                        except Exception:
                            pass

            y -= 12

        c.save()
        buff.seek(0)
        return send_file(buff, mimetype='application/pdf', as_attachment=True, download_name='ledger.pdf')
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/payments/ledger', methods=['GET'])
def payments_ledger():
    """Return payments filtered by query parameters:
    Supported params: deal_id, party_type, party_id, payment_mode, payment_type, person_search, start_date, end_date
    """
    params = request.args
    deal_id = params.get('deal_id')
    party_type = params.get('party_type')
    party_id = params.get('party_id')
    payment_mode = params.get('payment_mode')
    payment_type = params.get('payment_type')
    person_search = params.get('person_search')
    start_date = params.get('start_date')
    end_date = params.get('end_date')

    # If filtering by party (party_type, party_id, or person_search) prefer to join payment_parties
    args = []
    if party_type or party_id or person_search:
        sql = """SELECT DISTINCT p.* FROM payments p 
                 JOIN payment_parties pp ON pp.payment_id = p.id 
                 LEFT JOIN owners o ON pp.party_type = 'owner' AND pp.party_id = o.id
                 LEFT JOIN investors i ON pp.party_type = 'investor' AND pp.party_id = i.id
                 LEFT JOIN buyers b ON pp.party_type = 'buyer' AND pp.party_id = b.id
                 WHERE 1=1"""
        if deal_id:
            sql += " AND p.deal_id = %s"
            args.append(deal_id)
        if party_type:
            sql += " AND pp.party_type = %s"
            args.append(party_type)
        if party_id:
            sql += " AND pp.party_id = %s"
            args.append(party_id)
        if person_search:
            sql += """ AND (
                LOWER(o.name) LIKE LOWER(%s) OR 
                LOWER(i.investor_name) LIKE LOWER(%s) OR 
                LOWER(b.name) LIKE LOWER(%s)
            )"""
            search_term = f"%{person_search}%"
            args.extend([search_term, search_term, search_term])
        if payment_mode:
            sql += " AND p.payment_mode = %s"
            args.append(payment_mode)
        if payment_type:
            sql += " AND p.payment_type = %s"
            args.append(payment_type)
    else:
        sql = "SELECT p.* FROM payments p WHERE 1=1"
        if deal_id:
            sql += " AND p.deal_id = %s"
            args.append(deal_id)
        if payment_mode:
            sql += " AND p.payment_mode = %s"
            args.append(payment_mode)
        if payment_type:
            sql += " AND p.payment_type = %s"
            args.append(payment_type)

    if start_date:
        sql += " AND p.payment_date >= %s"
        args.append(start_date)
    if end_date:
        sql += " AND p.payment_date <= %s"
        args.append(end_date)

    sql += " ORDER BY p.payment_date DESC"

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(sql, tuple(args))
        rows = cursor.fetchall() or []
        for r in rows:
            for k in ('payment_date', 'created_at'):
                if r.get(k) is not None and isinstance(r.get(k), datetime):
                    r[k] = r[k].isoformat()
        return jsonify(rows)
    except mysql.connector.Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/payments/<int:deal_id>', methods=['POST'])
@token_required
def create_payment(current_user, deal_id):
    """Create a payment record for a deal"""
    data = request.get_json() or {}
    # normalize party_type to the ENUM allowed values in the DB
    party_type = data.get('party_type', 'other')
    allowed_party_types = {'owner', 'buyer', 'investor', 'other'}
    if party_type not in allowed_party_types:
        party_type = 'other'

    # normalize party_id to integer or None
    party_id = data.get('party_id')
    try:
        if party_id is None or party_id == '':
            party_id = None
        else:
            party_id = int(party_id)
    except Exception:
        party_id = None
    amount = data.get('amount')
    currency = data.get('currency', 'INR')
    payment_date = data.get('payment_date')
    due_date = data.get('due_date')
    payment_mode = data.get('payment_mode')
    reference = data.get('reference')
    notes = data.get('notes')
    description = data.get('description', '')
    category = data.get('category', '')
    paid_by = data.get('paid_by', '')
    paid_to = data.get('paid_to', '')
    status = data.get('status', 'pending')
    
    # Bank fields
    payer_bank_name = data.get('payer_bank_name', '')
    payer_bank_account_no = data.get('payer_bank_account_no', '')
    receiver_bank_name = data.get('receiver_bank_name', '')
    receiver_bank_account_no = data.get('receiver_bank_account_no', '')
    
    # Installment fields
    is_installment = data.get('is_installment', False)
    installment_number = data.get('installment_number')
    total_installments = data.get('total_installments')
    parent_amount = data.get('parent_amount')
    
    # Validate installment fields
    if is_installment:
        try:
            if installment_number is not None:
                installment_number = int(installment_number)
            if total_installments is not None:
                total_installments = int(total_installments)
            if parent_amount is not None:
                parent_amount = float(parent_amount)
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid installment field values'}), 400
    
    # payment_type: support enhanced types including 'maintenance_taxes'
    payment_type = data.get('payment_type', 'other')
    allowed_payment_types = {'land_purchase', 'investment_sale', 'documentation_legal', 'maintenance_taxes', 'other'}
    if payment_type not in allowed_payment_types:
        payment_type = 'other'
        
    # Validate status
    allowed_statuses = {'pending', 'completed', 'cancelled', 'failed', 'overdue'}
    if status not in allowed_statuses:
        status = 'pending'

    # Validate amount
    try:
        if amount is None or amount == '':
            raise ValueError('amount missing')
        amount = float(amount)
    except Exception:
        return jsonify({'error': 'amount is required and must be a number'}), 400

    # Validate payment_date (required)
    if not payment_date:
        return jsonify({'error': 'payment_date is required'}), 400
    
    # Parse payment_date using our flexible date parser
    parsed_payment_date = parse_date_to_mysql_format(payment_date)
    if parsed_payment_date is None:
        return jsonify({'error': 'Invalid payment_date format. Please provide a valid date.'}), 400
    payment_date = parsed_payment_date

    # Parse due_date (optional)
    parsed_due_date = None
    if due_date:
        parsed_due_date = parse_date_to_mysql_format(due_date)
        if parsed_due_date is None:
            return jsonify({'error': 'Invalid due_date format. Please provide a valid date.'}), 400

    # If parties provided, compute their sum and optionally enforce equality with amount.
    parties = data.get('parties')
    try:
        prepared_parties = []
        if parties and isinstance(parties, list):
            for part in parties:
                pt = part.get('party_type', 'other')
                pid = part.get('party_id')
                amt = part.get('amount')
                pct = part.get('percentage')
                role = part.get('role')
                if pid is not None and pid != '':
                    try:
                        pid = int(pid)
                    except Exception:
                        pid = None
                if amt is not None and amt != '':
                    try:
                        amt = float(amt)
                    except Exception:
                        amt = None
                if pct is not None and pct != '':
                    try:
                        pct = float(pct)
                    except Exception:
                        pct = None
                prepared_parties.append({'party_type': pt, 'party_id': pid, 'amount': amt, 'percentage': pct, 'role': role})
    except Exception:
        prepared_parties = []

    conn = None
    try:
        conn = get_db_connection()
        # Start a transaction to ensure payment + parties are atomic
        conn.start_transaction()
        cursor = conn.cursor()
        # Try to insert with all enhanced fields first
        try:
            cursor.execute(
                """INSERT INTO payments (deal_id, party_type, party_id, amount, currency, payment_date, due_date, payment_mode, reference, notes, description, category, paid_by, paid_to, status, created_by, payment_type, is_installment, installment_number, total_installments, parent_amount, payer_bank_name, payer_bank_account_no, receiver_bank_name, receiver_bank_account_no)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                (deal_id, party_type, party_id, amount, currency, payment_date, parsed_due_date, payment_mode, reference, notes, description, category, paid_by, paid_to, status, current_user, payment_type, is_installment, installment_number, total_installments, parent_amount, payer_bank_name, payer_bank_account_no, receiver_bank_name, receiver_bank_account_no)
            )
        except mysql.connector.Error as e:
            # Try with payment_type but without enhanced fields (for backward compatibility)
            try:
                cursor.execute(
                    """INSERT INTO payments (deal_id, party_type, party_id, amount, currency, payment_date, payment_mode, reference, notes, created_by, payment_type, is_installment, installment_number, total_installments, parent_amount, payer_bank_name, payer_bank_account_no, receiver_bank_name, receiver_bank_account_no)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                    (deal_id, party_type, party_id, amount, currency, payment_date, payment_mode, reference, notes, current_user, payment_type, is_installment, installment_number, total_installments, parent_amount, payer_bank_name, payer_bank_account_no, receiver_bank_name, receiver_bank_account_no)
                )
            except mysql.connector.Error as e2:
                # Final fallback to basic fields only
                cursor.execute(
                    """INSERT INTO payments (deal_id, party_type, party_id, amount, currency, payment_date, payment_mode, reference, notes, created_by, payer_bank_name, payer_bank_account_no, receiver_bank_name, receiver_bank_account_no)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                    (deal_id, party_type, party_id, amount, currency, payment_date, payment_mode, reference, notes, current_user, payer_bank_name, payer_bank_account_no, receiver_bank_name, receiver_bank_account_no)
                )
        payment_id = cursor.lastrowid

        # Server-side validation: if prepared_parties provided, ensure consistency
        if prepared_parties:
            amounts_provided = any(isinstance(p.get('amount'), (int, float)) for p in prepared_parties)
            percentages_provided = any(isinstance(p.get('percentage'), (int, float)) for p in prepared_parties)

            # If percentages are provided, ensure they sum to (approximately) 100
            if percentages_provided:
                total_pct = sum([p.get('percentage') or 0 for p in prepared_parties])
                force = request.args.get('force', 'false').lower() == 'true'
                
                # Only validate percentage sum if there are actual non-zero percentages
                non_zero_percentages = [p.get('percentage') for p in prepared_parties if p.get('percentage') and p.get('percentage') > 0]
                
                if non_zero_percentages and abs(total_pct - 100.0) > 0.01 and not force:
                    try:
                        conn.rollback()
                    except Exception:
                        pass
                    return jsonify({'error': f'Party percentage mismatch: total {total_pct}', 'total_percentage': total_pct}), 400

            # If only percentages are provided (not amounts), compute amounts from payment amount
            if percentages_provided and not amounts_provided:
                for p in prepared_parties:
                    pct = p.get('percentage')
                    if isinstance(pct, (int, float)):
                        p['amount'] = round((pct / 100.0) * amount, 2)

            # If amounts are provided, ensure their sum matches payment amount
            if amounts_provided:
                total_party_amount = sum([p['amount'] for p in prepared_parties if isinstance(p.get('amount'), (int, float))])
                force = request.args.get('force', 'false').lower() == 'true'
                if abs(total_party_amount - amount) > 0.01 and not force:
                    try:
                        conn.rollback()
                    except Exception:
                        pass
                    return jsonify({'error': 'party_amount_mismatch', 'payment_amount': amount, 'parties_total': total_party_amount}), 400

        # If request provided multiple parties with shares, persist them to payment_parties
        if prepared_parties:
            for part in prepared_parties:
                try:
                    # Try inserting with all new fields including pay_to fields
                    cursor.execute("""
                        INSERT INTO payment_parties 
                        (payment_id, party_type, party_id, amount, percentage, role, pay_to_id, pay_to_name, pay_to_type) 
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    """, (
                        payment_id, 
                        part.get('party_type', 'other'), 
                        part.get('party_id'), 
                        part.get('amount'), 
                        part.get('percentage'), 
                        part.get('role'),
                        part.get('pay_to_id'),
                        part.get('pay_to_name'),
                        part.get('pay_to_type')
                    ))
                except mysql.connector.Error as db_e:
                    # Try fallbacks for older schemas: missing percentage and/or role columns
                    msg = str(db_e)
                    try:
                        if 'Unknown column' in msg or getattr(db_e, 'errno', None) == 1054:
                            # Try with role and percentage but without pay_to fields
                            try:
                                cursor.execute("INSERT INTO payment_parties (payment_id, party_type, party_id, amount, percentage, role) VALUES (%s,%s,%s,%s,%s,%s)", (payment_id, part.get('party_type', 'other'), part.get('party_id'), part.get('amount'), part.get('percentage'), part.get('role')))
                            except mysql.connector.Error:
                                # try without percentage and role
                                try:
                                    cursor.execute("INSERT INTO payment_parties (payment_id, party_type, party_id, amount) VALUES (%s,%s,%s,%s)", (payment_id, part.get('party_type', 'other'), part.get('party_id'), part.get('amount')))
                                except mysql.connector.Error:
                                    # try with percentage only
                                    cursor.execute("INSERT INTO payment_parties (payment_id, party_type, party_id, amount, percentage) VALUES (%s,%s,%s,%s,%s)", (payment_id, part.get('party_type', 'other'), part.get('party_id'), part.get('amount'), part.get('percentage')))
                        else:
                            raise
                    except Exception:
                        raise

        # commit transaction
        conn.commit()

        return jsonify({'message': 'Payment recorded', 'payment_id': payment_id}), 201
    except Exception as e:
        # rollback on error
        try:
            if conn:
                conn.rollback()
        except Exception:
            pass
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/payments/<int:deal_id>/split-installments', methods=['POST'])
@token_required
def split_payment_into_installments(current_user, deal_id):
    """Split a payment into multiple installments"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['installments']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        installments = data['installments']
        if not isinstance(installments, list) or len(installments) < 2:
            return jsonify({'error': 'At least 2 installments required'}), 400
        
        # Common payment data
        payment_type = data.get('payment_type', 'land_purchase')
        payment_mode = data.get('payment_mode', '')
        reference = data.get('reference', '')
        notes = data.get('notes', '')
        description = data.get('description', '')
        category = data.get('category', '')
        paid_by = data.get('paid_by', '')
        paid_to = data.get('paid_to', '')
        status = data.get('status', 'pending')
        
        # Bank fields
        payer_bank_name = data.get('payer_bank_name', '')
        payer_bank_account_no = data.get('payer_bank_account_no', '')
        receiver_bank_name = data.get('receiver_bank_name', '')
        receiver_bank_account_no = data.get('receiver_bank_account_no', '')
        
        # Calculate parent amount (total of all installments)
        parent_amount = sum(float(inst.get('amount', 0)) for inst in installments)
        total_installments = len(installments)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        created_payments = []
        
        # Create each installment as a separate payment
        for i, installment in enumerate(installments, 1):
            amount = float(installment['amount'])
            payment_date = installment['payment_date']
            due_date = installment.get('due_date', payment_date)
            
            # Parse dates
            parsed_payment_date = datetime.strptime(payment_date, '%Y-%m-%d').date() if payment_date else None
            parsed_due_date = datetime.strptime(due_date, '%Y-%m-%d').date() if due_date else None
            
            # Insert installment payment
            cursor.execute("""
                INSERT INTO payments 
                (deal_id, amount, currency, payment_date, due_date, payment_mode, reference, notes, 
                description, category, paid_by, paid_to, status, created_by, payment_type, 
                is_installment, installment_number, total_installments, parent_amount,
                payer_bank_name, payer_bank_account_no, receiver_bank_name, receiver_bank_account_no)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                deal_id, amount, 'INR', parsed_payment_date, parsed_due_date, payment_mode, 
                reference, notes, description, category, paid_by, paid_to, status, current_user, 
                payment_type, True, i, total_installments, parent_amount,
                payer_bank_name, payer_bank_account_no, receiver_bank_name, receiver_bank_account_no
            ))
            
            payment_id = cursor.lastrowid
            created_payments.append({
                'payment_id': payment_id,
                'installment_number': i,
                'amount': amount,
                'payment_date': payment_date
            })
        
        conn.commit()
        
        return jsonify({
            'message': f'Successfully created {total_installments} installment payments',
            'parent_amount': parent_amount,
            'total_installments': total_installments,
            'payments': created_payments
        }), 201
        
    except Exception as e:
        if conn:
            conn.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/payments/<int:deal_id>/<int:payment_id>/installments', methods=['GET'])
@token_required
def get_payment_installments(current_user, deal_id, payment_id):
    """Get all installments for a payment (if it's part of an installment plan)"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # First, get the payment details to check if it's an installment
        cursor.execute("""
            SELECT is_installment, parent_amount, total_installments, installment_number
            FROM payments 
            WHERE id = %s AND deal_id = %s
        """, (payment_id, deal_id))
        
        payment = cursor.fetchone()
        if not payment:
            return jsonify({'error': 'Payment not found'}), 404
        
        if not payment['is_installment']:
            return jsonify({'error': 'This payment is not part of an installment plan'}), 400
        
        # Get all installments with the same parent_amount and total_installments
        cursor.execute("""
            SELECT id, amount, payment_date, due_date, status, installment_number, 
                   paid_by, paid_to, payment_mode, reference, notes
            FROM payments 
            WHERE deal_id = %s AND is_installment = 1 
            AND parent_amount = %s AND total_installments = %s
            ORDER BY installment_number
        """, (deal_id, payment['parent_amount'], payment['total_installments']))
        
        installments = cursor.fetchall()
        
        return jsonify({
            'parent_amount': payment['parent_amount'],
            'total_installments': payment['total_installments'],
            'installments': installments
        }), 200
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


def ensure_payment_schema():
    """Ensure the payments table has all required columns"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check existing columns first
        cursor.execute("DESCRIBE payments")
        existing_columns = {row[0] for row in cursor.fetchall()}
        
        # Define columns to add if they don't exist (without IF NOT EXISTS for broader compatibility)
        columns_to_add = [
            ("payment_type", "ALTER TABLE payments ADD COLUMN payment_type VARCHAR(50) DEFAULT 'advance'"),
            ("status", "ALTER TABLE payments ADD COLUMN status ENUM('pending','completed','cancelled','overdue') DEFAULT 'pending'"),
            ("due_date", "ALTER TABLE payments ADD COLUMN due_date DATE DEFAULT NULL"),
            ("paid_by", "ALTER TABLE payments ADD COLUMN paid_by VARCHAR(255) DEFAULT NULL"),
            ("paid_to", "ALTER TABLE payments ADD COLUMN paid_to VARCHAR(255) DEFAULT NULL"),
            ("description", "ALTER TABLE payments ADD COLUMN description TEXT DEFAULT NULL")
        ]
        
        # Add missing columns one by one
        for column_name, alter_sql in columns_to_add:
            if column_name not in existing_columns:
                try:
                    cursor.execute(alter_sql)
                    conn.commit()
                except mysql.connector.Error as e:
                    # Check if error is "column already exists" - that's OK
                    if "Duplicate column name" in str(e) or "already exists" in str(e):
                        pass  # Column already exists, continue
                    else:
                        # Log error to application logs instead of console
                        pass
                    # Don't fail the whole operation if one column fails
                    pass
        
    except Exception as e:
        # Don't fail the payment update if schema update fails
        # The update function will check which columns exist anyway
        pass  # Log to application logs instead of console
    finally:
        if conn:
            conn.close()

def ensure_deals_schema():
    """Ensure the deals table has all required columns"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check existing columns first
        cursor.execute("DESCRIBE deals")
        existing_columns = {row[0] for row in cursor.fetchall()}
        
        # Define columns to add if they don't exist
        columns_to_add = [
            ("purchase_date", "ALTER TABLE deals ADD COLUMN purchase_date DATE DEFAULT NULL")
        ]
        
        # Add missing columns one by one
        for column_name, alter_sql in columns_to_add:
            if column_name not in existing_columns:
                try:
                    cursor.execute(alter_sql)
                    conn.commit()
                except mysql.connector.Error as e:
                    # Check if error is "column already exists" - that's OK
                    if "Duplicate column name" in str(e) or "already exists" in str(e):
                        pass  # Column already exists, continue
                    else:
                        # Log error to application logs instead of console
                        pass
                    # Don't fail the whole operation if one column fails
                    pass
        
        # Update status ENUM to include commission
        try:
            cursor.execute("""
                ALTER TABLE deals 
                MODIFY COLUMN status ENUM('open','closed','commission','For Sale','Sold','In Progress','Completed','On Hold','Cancelled') DEFAULT 'open'
            """)
            conn.commit()
        except mysql.connector.Error as e:
            # If ENUM update fails, it's not critical
            pass
        
    except Exception as e:
        # Don't fail if schema update fails
        pass
    finally:
        if conn:
            conn.close()

@app.route('/api/payments/<int:deal_id>/<int:payment_id>', methods=['PUT'])
@token_required
def update_payment(current_user, deal_id, payment_id):
    """Update a payment's details"""
    try:
        data = request.get_json() or {}
        print(f"Payment update data: {data}")  # Just one debug line
        
        # Ensure schema is up to date (non-blocking)
        try:
            ensure_payment_schema()
        except Exception as e:
            pass  # Log to application logs instead of console
        
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Check if payment exists and user has permission
            cursor.execute("SELECT id FROM payments WHERE id = %s AND deal_id = %s", (payment_id, deal_id))
            if not cursor.fetchone():
                return jsonify({'error': 'Payment not found'}), 404
            
            # Get the table structure to see what columns exist
            cursor.execute("DESCRIBE payments")
            columns = {row[0] for row in cursor.fetchall()}
            
            # Map frontend fields to database columns and validate they exist
            field_mapping = {
                'amount': 'amount',
                'payment_date': 'payment_date', 
                'due_date': 'due_date',
                'description': 'description',
                'payment_type': 'payment_type',
                'status': 'status',
                'paid_by': 'paid_by',
                'paid_to': 'paid_to',
                'reference': 'reference',
                'notes': 'notes',
                'payment_mode': 'payment_mode',
                'category': 'category',
                'payer_bank_name': 'payer_bank_name',
                'payer_bank_account_no': 'payer_bank_account_no',
                'receiver_bank_name': 'receiver_bank_name',
                'receiver_bank_account_no': 'receiver_bank_account_no'
            }
            
            # Only include fields that exist in the database and are provided in the request
            fields = {}
            for field_name, db_column in field_mapping.items():
                if field_name in data and db_column in columns:
                    value = data[field_name]
                    
                    # Skip empty string values for optional fields
                    if value == '' and field_name in ['due_date', 'paid_by', 'paid_to', 'description']:
                        continue
                    
                    # Parse date fields to MySQL format
                    if field_name in ['payment_date', 'due_date']:
                        
                        # Skip empty or null date values for optional dates
                        if value is None or value == '' or value == 'null':
                            if field_name == 'payment_date':
                                # payment_date is required, cannot be empty
                                return jsonify({'error': 'Payment date is required'}), 400
                            continue
                        
                        parsed_date = parse_date_to_mysql_format(value)
                        if parsed_date is None:
                            return jsonify({'error': f'Invalid date format for {field_name}: "{value}". Expected format: YYYY-MM-DD or valid date string.'}), 400
                        value = parsed_date
                    
                    # Validate amount field
                    if field_name == 'amount':
                        try:
                            value = float(value)
                            if value <= 0:
                                return jsonify({'error': 'Amount must be greater than 0'}), 400
                        except (ValueError, TypeError):
                            return jsonify({'error': 'Amount must be a valid number'}), 400
                    
                    fields[db_column] = value
                elif field_name in data:
                    pass  # Field not available in database schema
            
            if not fields:
                available_fields = list(field_mapping.keys())
                provided_fields = list(data.keys())
                return jsonify({
                    'error': 'No valid updatable fields provided',
                    'available_fields': available_fields,
                    'provided_fields': provided_fields,
                    'existing_columns': list(columns)
                }), 400
            
            # Update the payment
            set_clause = ', '.join([f"{k} = %s" for k in fields.keys()])
            params = list(fields.values()) + [payment_id, deal_id]
            
            cursor.execute(f"UPDATE payments SET {set_clause} WHERE id = %s AND deal_id = %s", params)
            
            if cursor.rowcount == 0:
                return jsonify({'error': 'Payment not found or no changes made'}), 404
            
            conn.commit()
            
            return jsonify({
                'message': 'Payment updated successfully',
                'updated_fields': list(fields.keys())
            })
            
        except mysql.connector.Error as db_error:
            if conn:
                conn.rollback()
            error_msg = str(db_error)
            print(f"Database error during payment update: {error_msg}")
            # Check for specific constraint violations
            if "cannot be null" in error_msg.lower():
                return jsonify({'error': f'Required field missing: {error_msg}'}), 400
            elif "foreign key constraint" in error_msg.lower():
                return jsonify({'error': f'Invalid reference: {error_msg}'}), 400
            elif "duplicate entry" in error_msg.lower():
                return jsonify({'error': f'Duplicate value: {error_msg}'}), 400
            else:
                return jsonify({'error': f'Database error: {error_msg}'}), 500
        except Exception as general_error:
            if conn:
                conn.rollback()
            error_msg = str(general_error)
            print(f"General error during payment update: {error_msg}")
            return jsonify({'error': f'Server error: {error_msg}'}), 500
        finally:
            if conn:
                conn.close()
        
    except Exception as outer_error:
        return jsonify({'error': f'Critical server error: {str(outer_error)}'}), 500


@app.route('/api/payments/<int:deal_id>/<int:payment_id>', methods=['DELETE'])
@token_required
def delete_payment(current_user, deal_id, payment_id):
    """Delete a payment and its proof files (admin or owner)."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Fetch proofs to delete files
        cursor.execute("SELECT id, file_path FROM payment_proofs WHERE payment_id = %s", (payment_id,))
        proofs = cursor.fetchall()

        # Permission check: only admins or creator of payment can delete
        try:
            cursor.execute("SELECT created_by FROM payments WHERE id = %s AND deal_id = %s", (payment_id, deal_id))
            p = cursor.fetchone()
            created_by = p.get('created_by') if p else None
        except Exception:
            created_by = None

        role = None
        try:
            role = request.user.get('role')
        except Exception:
            role = None

        if not (role == 'admin' or created_by == current_user):
            return jsonify({'error': 'forbidden'}), 403

        # Delete DB rows for proofs
        cursor.execute("DELETE FROM payment_proofs WHERE payment_id = %s", (payment_id,))

        # Delete payment row
        cursor.execute("DELETE FROM payments WHERE deal_id = %s AND id = %s", (deal_id, payment_id))
        conn.commit()

        # remove files from disk (best-effort)
        for pr in proofs:
            fp = pr.get('file_path')
            if not fp:
                continue
            # Normalize: find uploads/ inside path
            p = fp.replace('\\', '/')
            idx = p.find('uploads/')
            if idx != -1:
                rel = p[idx:]
                # compute absolute path relative to the configured UPLOAD_FOLDER
                abs_path = os.path.abspath(os.path.join(app.config['UPLOAD_FOLDER'], os.path.relpath(rel.replace('uploads/', ''), '')))
                try:
                    # ensure the abs_path is inside UPLOAD_FOLDER
                    if abs_path.startswith(os.path.abspath(app.config['UPLOAD_FOLDER'])) and os.path.exists(abs_path):
                        os.remove(abs_path)
                except Exception:
                    pass

        return jsonify({'message': 'Payment and proofs deleted'})
    except mysql.connector.Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/payments/<int:deal_id>/investor-to-owner', methods=['POST'])
@token_required
def create_investor_to_owner_payment(current_user, deal_id):
    """Create a payment from investor to owner with real-time tracking"""
    try:
        data = request.get_json() or {}
        
        # Required fields
        investor_id = data.get('investor_id')
        owner_id = data.get('owner_id')
        amount = data.get('amount')
        payment_date = data.get('payment_date')
        
        # Optional fields
        payment_mode = data.get('payment_mode', 'bank_transfer')
        reference = data.get('reference', '')
        notes = data.get('notes', '')
        description = data.get('description', 'Payment from investor to owner')
        
        # Validation
        if not investor_id:
            return jsonify({'error': 'investor_id is required'}), 400
        if not owner_id:
            return jsonify({'error': 'owner_id is required'}), 400
        if not amount:
            return jsonify({'error': 'amount is required'}), 400
        if not payment_date:
            return jsonify({'error': 'payment_date is required'}), 400
            
        try:
            investor_id = int(investor_id)
            owner_id = int(owner_id)
            amount = float(amount)
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid data types for investor_id, owner_id, or amount'}), 400
            
        if amount <= 0:
            return jsonify({'error': 'Amount must be greater than 0'}), 400
            
        # Parse payment_date
        parsed_payment_date = parse_date_to_mysql_format(payment_date)
        if parsed_payment_date is None:
            return jsonify({'error': 'Invalid payment_date format'}), 400
            
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Verify deal exists
        cursor.execute("SELECT id FROM deals WHERE id = %s", (deal_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Deal not found'}), 404
            
        # Verify investor belongs to this deal
        cursor.execute("SELECT id, investor_name FROM investors WHERE id = %s AND deal_id = %s", (investor_id, deal_id))
        investor = cursor.fetchone()
        if not investor:
            return jsonify({'error': 'Investor not found for this deal'}), 400
            
        # Verify owner belongs to this deal
        cursor.execute("SELECT id, name FROM owners WHERE id = %s AND deal_id = %s", (owner_id, deal_id))
        owner = cursor.fetchone()
        if not owner:
            return jsonify({'error': 'Owner not found for this deal'}), 400
            
        # Start transaction
        conn.start_transaction()
        
        try:
            # Create payment record with enhanced tracking
            cursor.execute("""
                INSERT INTO payments (
                    deal_id, party_type, party_id, amount, currency, payment_date, 
                    payment_mode, reference, notes, description, status, created_by,
                    payment_type, paid_by, paid_to
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                deal_id, 'investor', investor_id, amount, 'INR', parsed_payment_date,
                payment_mode, reference, notes, description, 'completed', current_user,
                'investor_to_owner', investor['investor_name'], owner['name']
            ))
            
            payment_id = cursor.lastrowid
            
            # Add payment parties for tracking
            # From party (investor)
            cursor.execute("""
                INSERT INTO payment_parties (
                    payment_id, party_type, party_id, amount, role
                ) VALUES (%s, %s, %s, %s, %s)
            """, (payment_id, 'investor', investor_id, amount, 'payer'))
            
            # To party (owner)
            cursor.execute("""
                INSERT INTO payment_parties (
                    payment_id, party_type, party_id, amount, role
                ) VALUES (%s, %s, %s, %s, %s)
            """, (payment_id, 'owner', owner_id, amount, 'recipient'))
            
            conn.commit()
            
            # Return the created payment with party details
            cursor.execute("""
                SELECT p.*, 
                       i.investor_name as from_investor_name,
                       o.name as to_owner_name
                FROM payments p
                LEFT JOIN investors i ON i.id = %s
                LEFT JOIN owners o ON o.id = %s
                WHERE p.id = %s
            """, (investor_id, owner_id, payment_id))
            
            payment_details = cursor.fetchone()
            
            return jsonify({
                'message': 'Investor to owner payment recorded successfully',
                'payment_id': payment_id,
                'payment': payment_details
            }), 201
            
        except Exception as e:
            conn.rollback()
            raise e
            
    except Exception as e:
        print(f"Error creating investor to owner payment: {e}")
        return jsonify({'error': 'Failed to create payment'}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/deals/<int:deal_id>/payment-tracking', methods=['GET'])
@token_required
def get_payment_tracking_data(current_user, deal_id):
    """Get real-time payment tracking data for owners and investors"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get deal purchase amount
        cursor.execute("SELECT purchase_amount FROM deals WHERE id = %s", (deal_id,))
        deal = cursor.fetchone()
        if not deal:
            return jsonify({'error': 'Deal not found'}), 404
            
        purchase_amount = float(deal['purchase_amount'] or 0)
        
        # Get owners with their percentage shares
        cursor.execute("""
            SELECT id, name, percentage_share 
            FROM owners 
            WHERE deal_id = %s 
            ORDER BY id
        """, (deal_id,))
        owners = cursor.fetchall()
        
        # Get investors
        cursor.execute("""
            SELECT id, investor_name, investment_amount, investment_percentage
            FROM investors 
            WHERE deal_id = %s 
            ORDER BY id
        """, (deal_id,))
        investors = cursor.fetchall()
        
        # Get investor-to-owner payments
        cursor.execute("""
            SELECT 
                p.id,
                p.amount,
                p.payment_date,
                p.status,
                pp1.party_id as investor_id,
                i.investor_name,
                pp2.party_id as owner_id,
                o.name as owner_name
            FROM payments p
            JOIN payment_parties pp1 ON pp1.payment_id = p.id AND pp1.party_type = 'investor' AND pp1.role = 'payer'
            JOIN payment_parties pp2 ON pp2.payment_id = p.id AND pp2.party_type = 'owner' AND pp2.role = 'recipient'
            JOIN investors i ON i.id = pp1.party_id
            JOIN owners o ON o.id = pp2.party_id
            WHERE p.deal_id = %s AND p.payment_type = 'investor_to_owner' AND p.status = 'completed'
            ORDER BY p.payment_date DESC, p.id DESC
        """, (deal_id,))
        payments = cursor.fetchall()
        
        # Calculate payment summaries for each owner
        owner_summaries = []
        for owner in owners:
            owner_id = owner['id']
            percentage_share = float(owner['percentage_share'] or 0)
            
            # Calculate expected amount based on percentage
            expected_amount = (purchase_amount * percentage_share) / 100 if purchase_amount and percentage_share else 0
            
            # Calculate total received from all investors
            owner_payments = [p for p in payments if p['owner_id'] == owner_id]
            total_received = sum(float(p['amount']) for p in owner_payments)
            remaining_amount = max(0, expected_amount - total_received)
            
            # Get investor breakdown
            investor_breakdown = {}
            for payment in owner_payments:
                inv_id = payment['investor_id']
                inv_name = payment['investor_name']
                if inv_id not in investor_breakdown:
                    investor_breakdown[inv_id] = {
                        'investor_id': inv_id,
                        'investor_name': inv_name,
                        'total_paid': 0,
                        'payments': []
                    }
                investor_breakdown[inv_id]['total_paid'] += float(payment['amount'])
                investor_breakdown[inv_id]['payments'].append({
                    'payment_id': payment['id'],
                    'amount': float(payment['amount']),
                    'payment_date': payment['payment_date'].isoformat() if payment['payment_date'] else None,
                    'status': payment['status']
                })
            
            owner_summaries.append({
                'owner_id': owner_id,
                'owner_name': owner['name'],
                'percentage_share': percentage_share,
                'expected_amount': expected_amount,
                'total_received': total_received,
                'remaining_amount': remaining_amount,
                'investor_breakdown': list(investor_breakdown.values())
            })
        
        # Calculate payment summaries for each investor
        investor_summaries = []
        for investor in investors:
            investor_id = investor['id']
            investment_amount = float(investor['investment_amount'] or 0)
            
            # Calculate total paid to owners
            investor_payments = [p for p in payments if p['investor_id'] == investor_id]
            total_paid = sum(float(p['amount']) for p in investor_payments)
            remaining_obligation = max(0, investment_amount - total_paid)
            
            # Get owner breakdown
            owner_breakdown = {}
            for payment in investor_payments:
                owner_id = payment['owner_id']
                owner_name = payment['owner_name']
                if owner_id not in owner_breakdown:
                    owner_breakdown[owner_id] = {
                        'owner_id': owner_id,
                        'owner_name': owner_name,
                        'total_paid': 0,
                        'payments': []
                    }
                owner_breakdown[owner_id]['total_paid'] += float(payment['amount'])
                owner_breakdown[owner_id]['payments'].append({
                    'payment_id': payment['id'],
                    'amount': float(payment['amount']),
                    'payment_date': payment['payment_date'].isoformat() if payment['payment_date'] else None,
                    'status': payment['status']
                })
            
            investor_summaries.append({
                'investor_id': investor_id,
                'investor_name': investor['investor_name'],
                'investment_amount': investment_amount,
                'total_paid': total_paid,
                'remaining_obligation': remaining_obligation,
                'owner_breakdown': list(owner_breakdown.values())
            })
        
        return jsonify({
            'deal_id': deal_id,
            'purchase_amount': purchase_amount,
            'owners': owner_summaries,
            'investors': investor_summaries,
            'total_payments': len(payments)
        }), 200
        
    except Exception as e:
        print(f"Error getting payment tracking data: {e}")
        return jsonify({'error': 'Failed to get payment tracking data'}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/payments/<int:payment_id>/parties', methods=['POST'])
@token_required
def add_payment_party(current_user, payment_id):
    """Add a party share to an existing payment."""
    data = request.get_json() or {}
    pt = data.get('party_type', 'other')
    pid = data.get('party_id')
    amt = data.get('amount')
    pct = data.get('percentage')
    role = data.get('role')
    pay_to_id = data.get('pay_to_id')
    pay_to_name = data.get('pay_to_name')
    pay_to_type = data.get('pay_to_type')
    try:
        if pid is not None and pid != '':
            pid = int(pid)
    except Exception:
        pid = None
    try:
        if amt is not None and amt != '':
            amt = float(amt)
    except Exception:
        amt = None
    try:
        if pct is not None and pct != '':
            pct = float(pct)
    except Exception:
        pct = None
    try:
        if pay_to_id is not None and pay_to_id != '':
            pay_to_id = int(pay_to_id)
    except Exception:
        pay_to_id = None

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("""
                INSERT INTO payment_parties 
                (payment_id, party_type, party_id, amount, percentage, role, pay_to_id, pay_to_name, pay_to_type) 
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """, (payment_id, pt, pid, amt, pct, role, pay_to_id, pay_to_name, pay_to_type))
        except mysql.connector.Error as db_e:
            msg = str(db_e)
            if getattr(db_e, 'errno', None) == 1054 or 'Unknown column' in msg:
                # fallback: try without pay_to fields
                try:
                    cursor.execute("INSERT INTO payment_parties (payment_id, party_type, party_id, amount, percentage, role) VALUES (%s,%s,%s,%s,%s,%s)", (payment_id, pt, pid, amt, pct, role))
                except mysql.connector.Error:
                    # fallback: try without role and percentage
                    try:
                        cursor.execute("INSERT INTO payment_parties (payment_id, party_type, party_id, amount) VALUES (%s,%s,%s,%s)", (payment_id, pt, pid, amt))
                    except Exception:
                        # fallback to include percentage only
                        cursor.execute("INSERT INTO payment_parties (payment_id, party_type, party_id, amount, percentage) VALUES (%s,%s,%s,%s,%s)", (payment_id, pt, pid, amt, pct))
            else:
                raise
        conn.commit()
        return jsonify({'message': 'party_added', 'party_id': cursor.lastrowid}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/payments/parties/<int:party_id>', methods=['PUT'])
@token_required
def update_payment_party(current_user, party_id):
    data = request.get_json() or {}
    fields = {}
    for k in ('party_type', 'party_id', 'amount', 'percentage'):
        if k in data:
            fields[k] = data[k]
    if 'role' in data:
        fields['role'] = data.get('role')
    if not fields:
        return jsonify({'error': 'no fields to update'}), 400
    # normalize
    if 'party_id' in fields:
        try:
            fields['party_id'] = int(fields['party_id'])
        except Exception:
            fields['party_id'] = None
    if 'amount' in fields:
        try:
            fields['amount'] = float(fields['amount'])
        except Exception:
            fields['amount'] = None
    if 'percentage' in fields:
        try:
            fields['percentage'] = float(fields['percentage'])
        except Exception:
            fields['percentage'] = None

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        set_clause = ', '.join([f"{k} = %s" for k in fields.keys()])
        params = list(fields.values()) + [party_id]
        try:
            cursor.execute(f"UPDATE payment_parties SET {set_clause} WHERE id = %s", params)
        except mysql.connector.Error as db_e:
            # If percentage column doesn't exist and it's in set_clause, retry without it
            if (getattr(db_e, 'errno', None) == 1054 or 'Unknown column' in str(db_e)) and 'percentage' in set_clause:
                # Build a reduced clause removing percentage
                reduced_fields = {k: v for k, v in fields.items() if k != 'percentage'}
                if not reduced_fields:
                    return jsonify({'error': 'percentage column not present on server'}), 500
                set_clause2 = ', '.join([f"{k} = %s" for k in reduced_fields.keys()])
                params2 = list(reduced_fields.values()) + [party_id]
                cursor.execute(f"UPDATE payment_parties SET {set_clause2} WHERE id = %s", params2)
            else:
                raise
        conn.commit()
        return jsonify({'message': 'party_updated'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/payments/parties/<int:party_id>', methods=['DELETE'])
@token_required
def delete_payment_party(current_user, party_id):
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM payment_parties WHERE id = %s", (party_id,))
        conn.commit()
        return jsonify({'message': 'party_deleted'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/deals/<int:deal_id>/financials', methods=['GET'])
@token_required
def deal_financials(current_user, deal_id):
    """Return a financial summary for a deal: totals for payments by mode, total expenses, investments, owners' shares (if profit_allocation set), and simple P&L estimate."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # total payments grouped by payment_mode
        cursor.execute("SELECT payment_mode, SUM(amount) as total FROM payments WHERE deal_id = %s GROUP BY payment_mode", (deal_id,))
        payments_by_mode = cursor.fetchall() or []

        # total payments overall
        cursor.execute("SELECT SUM(amount) as total_payments FROM payments WHERE deal_id = %s", (deal_id,))
        total_pay = cursor.fetchone() or {}

        # total expenses
        cursor.execute("SELECT SUM(amount) as total_expenses FROM expenses WHERE deal_id = %s", (deal_id,))
        total_exp = cursor.fetchone() or {}

        # total investments
        cursor.execute("SELECT SUM(investment_amount) as total_invested FROM investors WHERE deal_id = %s", (deal_id,))
        total_inv = cursor.fetchone() or {}

        # owners count and basic split if profit_allocation exists on deals
        cursor.execute("SELECT profit_allocation FROM deals WHERE id = %s", (deal_id,))
        deal = cursor.fetchone() or {}

        # profit calculation not available without purchase/selling amounts
        profit = None

        return jsonify({
            'payments_by_mode': payments_by_mode,
            'total_payments': total_pay.get('total_payments'),
            'total_expenses': total_exp.get('total_expenses'),
            'total_invested': total_inv.get('total_invested'),
            'deal_profit_estimate': profit,
            'profit_allocation': deal.get('profit_allocation')
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/payments/<int:deal_id>/<int:payment_id>', methods=['GET'])
def get_payment_detail(deal_id, payment_id):
    """Get detailed information for a specific payment including parties and proofs"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get payment basic info
        cursor.execute("SELECT * FROM payments WHERE deal_id = %s AND id = %s", (deal_id, payment_id))
        payment = cursor.fetchone()
        
        if not payment:
            return jsonify({'error': 'Payment not found'}), 404
        
        # Convert dates to isoformat
        for k in ('payment_date', 'created_at'):
            if payment.get(k) is not None and isinstance(payment.get(k), datetime):
                payment[k] = payment[k].isoformat()
        
        # Get payment parties with names
        cursor.execute("""
            SELECT pp.id, pp.party_type, pp.party_id, pp.amount, pp.percentage, pp.role,
                   CASE 
                     WHEN pp.party_type = 'owner' THEN o.name
                     WHEN pp.party_type = 'investor' THEN i.investor_name  
                     WHEN pp.party_type = 'buyer' THEN b.name
                     ELSE NULL
                   END as party_name
            FROM payment_parties pp 
            LEFT JOIN owners o ON pp.party_type = 'owner' AND pp.party_id = o.id
            LEFT JOIN investors i ON pp.party_type = 'investor' AND pp.party_id = i.id  
            LEFT JOIN buyers b ON pp.party_type = 'buyer' AND pp.party_id = b.id
            WHERE pp.payment_id = %s
        """, (payment_id,))
        parties = cursor.fetchall() or []
        party_list = []
        for p in parties:
            party_list.append({
                'id': p.get('id'),
                'party_type': p.get('party_type'),
                'party_id': p.get('party_id'),
                'party_name': p.get('party_name'),
                'amount': float(p.get('amount')) if p.get('amount') is not None else None,
                'percentage': float(p.get('percentage')) if p.get('percentage') is not None else None,
                'role': p.get('role')
            })
        payment['parties'] = party_list
        
        # Get payment proofs
        cursor.execute("SELECT id, file_path, uploaded_by, uploaded_at, doc_type FROM payment_proofs WHERE payment_id = %s ORDER BY uploaded_at DESC", (payment_id,))
        proofs = cursor.fetchall() or []
        proof_list = []
        for proof in proofs:
            proof_data = {
                'id': proof.get('id'),
                'file_path': proof.get('file_path'),
                'uploaded_by': proof.get('uploaded_by'),
                'doc_type': proof.get('doc_type')
            }
            if proof.get('uploaded_at') and isinstance(proof.get('uploaded_at'), datetime):
                proof_data['uploaded_at'] = proof.get('uploaded_at').isoformat()
            
            # Add file_name and file_url for frontend compatibility
            if proof.get('file_path'):
                p = proof.get('file_path').replace('\\', '/')
                proof_data['file_name'] = os.path.basename(p)
                
                # Build URL
                idx = p.find('uploads/')
                if idx != -1:
                    clean_path = p[idx:]
                    if clean_path.startswith('uploads/'):
                        clean_path = clean_path[8:]  # Remove 'uploads/' prefix
                    file_url = f"/uploads/{clean_path}"
                else:
                    if not p.startswith('/'):
                        p = '/' + p
                    file_url = p if p.startswith('/uploads/') else f"/uploads{p}"
                
                try:
                    base = request.host_url.rstrip('/')
                    proof_data['url'] = f"{base}{file_url}"
                    proof_data['file_url'] = f"{base}{file_url}"
                except Exception:
                    proof_data['url'] = file_url
                    proof_data['file_url'] = file_url
            
            proof_list.append(proof_data)
        payment['proofs'] = proof_list
        
        return jsonify(payment)
    except mysql.connector.Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/payments/<int:deal_id>/<int:payment_id>/proofs/<int:proof_id>', methods=['DELETE'])
@token_required
def delete_proof(current_user, deal_id, payment_id, proof_id):
    """Delete a single proof by id (best-effort file removal)."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT file_path, uploaded_by FROM payment_proofs WHERE id = %s AND payment_id = %s", (proof_id, payment_id))
        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'proof not found'}), 404

        # permission: only admin or uploader can delete
        uploader = row.get('uploaded_by')
        role = None
        try:
            role = request.user.get('role')
        except Exception:
            role = None
        if not (role == 'admin' or uploader == current_user):
            return jsonify({'error': 'forbidden'}), 403

        # delete DB row
        cursor.execute("DELETE FROM payment_proofs WHERE id = %s", (proof_id,))
        conn.commit()

        # delete file
        fp = row.get('file_path')
        if fp:
            p = fp.replace('\\', '/')
            idx = p.find('uploads/')
            if idx != -1:
                rel = p[idx:]
                abs_path = os.path.join(APP_ROOT, rel)
                try:
                    if os.path.exists(abs_path):
                        os.remove(abs_path)
                except Exception:
                    pass

        return jsonify({'message': 'proof deleted'})
    except mysql.connector.Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/payments/<int:deal_id>/<int:payment_id>/proof', methods=['POST'])
@token_required
def upload_payment_proof(current_user, deal_id, payment_id):
    """Upload an image/file as proof for a payment. Expects form-data with key 'proof'."""
    if 'proof' not in request.files:
        return jsonify({'error': 'No proof file provided (use form field name "proof")'}), 400

    file = request.files['proof']
    if file.filename == '':
        return jsonify({'error': 'Empty filename'}), 400

    # Validation: accept any file type, but enforce size limit and secure filename
    MAX_UPLOAD_SIZE = 5 * 1024 * 1024  # 5 MB

    # prefix filename with a timestamp to avoid collisions
    base = secure_filename(file.filename)
    ts = str(int(time.time()))
    safe_name = f"{ts}_{base}"

    # Size check (attempt to use content_length or file.stream)
    size = None
    try:
        if hasattr(file, 'content_length') and file.content_length:
            size = int(file.content_length)
        else:
            # try to seek stream
            stream = file.stream
            stream.seek(0, os.SEEK_END)
            size = stream.tell()
            stream.seek(0)
    except Exception:
        size = None

    if size is not None and size > MAX_UPLOAD_SIZE:
        return jsonify({'error': 'File too large, max 5MB'}), 400

    # Save file under uploads/deal_<id>/payments/<payment_id>/
    # Save file under uploads/deal_<id>/payments/<payment_id>/
    save_dir = os.path.join(app.config['UPLOAD_FOLDER'], f'deal_{deal_id}', 'payments', str(payment_id))
    os.makedirs(save_dir, exist_ok=True)
    save_path = os.path.join(save_dir, safe_name)
    try:
        file.save(save_path)
    except Exception as e:
        return jsonify({'error': f'Failed to save file: {e}'}), 500

    # Store a web-friendly path starting with uploads/ so the frontend can request /uploads/...
    # e.g. uploads/deal_50/payments/3/project.jpg
    # Use a web-relative path (do not store the server absolute uploads folder path)
    web_rel = os.path.join('uploads', f'deal_{deal_id}', 'payments', str(payment_id), safe_name).replace('\\', '/')

    # Optional document type (e.g., receipt, bank_transfer, cheque, cash, upi, contra)
    doc_type = request.form.get('doc_type')

    # Persist metadata to payment_proofs table (if present)
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        # include doc_type if column exists (migration adds it)
        try:
            cursor.execute("INSERT INTO payment_proofs (payment_id, file_path, uploaded_by, doc_type) VALUES (%s,%s,%s,%s)", (payment_id, web_rel, current_user, doc_type))
        except Exception:
            # fallback if column doesn't exist
            cursor.execute("INSERT INTO payment_proofs (payment_id, file_path, uploaded_by) VALUES (%s,%s,%s)", (payment_id, web_rel, current_user))
        conn.commit()
        proof_id = cursor.lastrowid
    except mysql.connector.Error as e:
        # If table doesn't exist or insert fails, still return success for file save but warn
        return jsonify({'warning': 'file_saved_but_db_insert_failed', 'file_path': web_rel, 'db_error': str(e)}), 200
    finally:
        if conn:
            conn.close()

    return jsonify({'message': 'proof_uploaded', 'proof_id': proof_id, 'file_path': web_rel}), 201


@app.route('/api/payments/<int:deal_id>/<int:payment_id>/proofs', methods=['GET'])
def list_payment_proofs(deal_id, payment_id):
    """Return list of proof records for a given payment."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, file_path, uploaded_by, uploaded_at, doc_type FROM payment_proofs WHERE payment_id = %s ORDER BY uploaded_at DESC", (payment_id,))
        rows = cursor.fetchall()
        print(f"DEBUG: Found {len(rows)} proof records for payment {payment_id}")
        # Convert file_path to a URL path the frontend can load (uploads are served at /uploads/...)
        for r in rows:
            print(f"DEBUG: Processing proof record: {r}")
            if r.get('file_path'):
                p = r['file_path'].replace('\\', '/')
                # Extract filename from the path for display
                r['file_name'] = os.path.basename(p)
                print(f"DEBUG: Added file_name: {r['file_name']}")
                
                # Remove any leading path components and ensure we start from uploads/
                idx = p.find('uploads/')
                if idx != -1:
                    # Take everything from 'uploads/' onwards
                    clean_path = p[idx:]
                    # Backend serves uploads at /uploads, so don't double it
                    if clean_path.startswith('uploads/'):
                        clean_path = clean_path[8:]  # Remove 'uploads/' prefix
                    file_url = f"/uploads/{clean_path}"
                else:
                    # Fallback - ensure it starts with /uploads/
                    if not p.startswith('/'):
                        p = '/' + p
                    file_url = p if p.startswith('/uploads/') else f"/uploads{p}"
                
                # Build the complete URL with the backend host
                try:
                    base = request.host_url.rstrip('/')
                    r['url'] = f"{base}{file_url}"
                    r['file_url'] = f"{base}{file_url}"  # Add file_url for compatibility
                    print(f"DEBUG: Added URLs - url: {r['url']}, file_url: {r['file_url']}")
                except Exception:
                    # Fallback to the relative URL
                    r['url'] = file_url
                    r['file_url'] = file_url  # Add file_url for compatibility
                    print(f"DEBUG: Added fallback URLs - url: {r['url']}, file_url: {r['file_url']}")
            # include doc_type if present
            if r.get('doc_type'):
                r['doc_type'] = r.get('doc_type')
            print(f"DEBUG: Final record: {r}")
        return jsonify(rows)
    except mysql.connector.Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Username and password required'}), 400
        
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
        user = cursor.fetchone()
        
        if not user:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Test password verification
        is_valid = verify_password_comprehensive(password, user.get('password'))
        
        if user and is_valid:
            token = jwt.encode({
                'user_id': user['id'],
                'username': user['username'],
                'role': user['role'],
                'exp': datetime.utcnow() + timedelta(hours=24)
            }, app.config['SECRET_KEY'])
            
            return jsonify({
                'token': token,
                'user': {
                    'id': user['id'],
                    'username': user['username'],
                    'role': user['role'],
                    'full_name': user['full_name']
                }
            })
        else:
            return jsonify({'error': 'Invalid credentials'}), 401
    
    except Exception as e:
        print(f"Login error: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/register', methods=['POST'])
def register():
    """
    Temporary registration endpoint for testing purposes
    """
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        full_name = data.get('full_name', username)
        role = data.get('role', 'user')
        
        if not username or not password:
            return jsonify({'error': 'Username and password required'}), 400
        
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Check if user already exists
        cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
        existing_user = cursor.fetchone()
        
        if existing_user:
            return jsonify({'error': 'Username already exists'}), 400
        
        # Create users table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                full_name VARCHAR(255),
                role VARCHAR(50) DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        """)
        
        # Insert new user
        cursor.execute("""
            INSERT INTO users (username, password, full_name, role)
            VALUES (%s, %s, %s, %s)
        """, (username, password, full_name, role))
        
        connection.commit()
        
        return jsonify({
            'message': 'User created successfully',
            'user': {
                'username': username,
                'full_name': full_name,
                'role': role
            }
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

    # DELETE route for deals
@app.route('/api/deals/<int:deal_id>', methods=['DELETE'])
@token_required
def delete_deal(current_user, deal_id):
    """
    Delete a deal and all its associated data (owners, buyers, investors, expenses, documents)
    """
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        
        # First check if deal exists
        cursor.execute("SELECT id FROM deals WHERE id = %s", (deal_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Deal not found'}), 404
        
        # Delete all associated data in the correct order (foreign key constraints)
        
        # 1. Delete owner documents first (if table exists)
        try:
            cursor.execute("""
                DELETE od FROM owner_documents od 
                INNER JOIN owners o ON od.owner_id = o.id 
                WHERE o.deal_id = %s
            """, (deal_id,))
        except Exception as e:
            # Table might not exist, continue
            pass
        
        # 2. Delete deal documents (if table exists)
        try:
            cursor.execute("DELETE FROM deal_documents WHERE deal_id = %s", (deal_id,))
        except Exception as e:
            # Table might not exist, continue
            pass
        
        # 3. Delete owners associated with this deal
        cursor.execute("DELETE FROM owners WHERE deal_id = %s", (deal_id,))
        
        # 4. Delete buyers associated with this deal  
        cursor.execute("DELETE FROM buyers WHERE deal_id = %s", (deal_id,))
        
        # 5. Delete investors associated with this deal
        cursor.execute("DELETE FROM investors WHERE deal_id = %s", (deal_id,))
        
        # 6. Delete expenses associated with this deal
        cursor.execute("DELETE FROM expenses WHERE deal_id = %s", (deal_id,))
        
        # 7. Finally delete the deal itself
        cursor.execute("DELETE FROM deals WHERE id = %s", (deal_id,))
        
        connection.commit()
        
        return jsonify({
            'message': 'Deal and all associated data deleted successfully',
            'deleted_deal_id': deal_id
        })
        
    except Exception as e:
        if connection:
            connection.rollback()
        return jsonify({'error': f'Failed to delete deal: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/cleanup/orphaned-owners', methods=['DELETE'])
@token_required  
def cleanup_orphaned_owners(current_user):
    """
    Clean up orphaned owners whose associated deals have been deleted
    """
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        
        # Find owners whose deal_id no longer exists in deals table
        cursor.execute("""
            SELECT o.id, o.name, o.deal_id 
            FROM owners o 
            LEFT JOIN deals d ON o.deal_id = d.id 
            WHERE d.id IS NULL
        """)
        orphaned_owners = cursor.fetchall()
        
        if not orphaned_owners:
            return jsonify({
                'message': 'No orphaned owners found',
                'deleted_count': 0
            })
        
        orphaned_owner_ids = [owner[0] for owner in orphaned_owners]
        
        # Delete documents for orphaned owners (if table exists)
        try:
            if orphaned_owner_ids:
                placeholders = ','.join(['%s'] * len(orphaned_owner_ids))
                cursor.execute(f"""
                    DELETE FROM owner_documents 
                    WHERE owner_id IN ({placeholders})
                """, orphaned_owner_ids)
        except Exception as e:
            # Table might not exist, continue
            pass
        
        # Delete the orphaned owners
        if orphaned_owner_ids:
            placeholders = ','.join(['%s'] * len(orphaned_owner_ids))
            cursor.execute(f"""
                DELETE FROM owners 
                WHERE id IN ({placeholders})
            """, orphaned_owner_ids)
        
        connection.commit()
        
        return jsonify({
            'message': f'Successfully cleaned up {len(orphaned_owners)} orphaned owners',
            'deleted_count': len(orphaned_owners),
            'deleted_owners': [{'id': owner[0], 'name': owner[1], 'deal_id': owner[2]} for owner in orphaned_owners]
        })
        
    except Exception as e:
        if connection:
            connection.rollback()
        return jsonify({'error': f'Failed to cleanup orphaned owners: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/cleanup/all-orphaned-data', methods=['DELETE'])
@token_required
def cleanup_all_orphaned_data(current_user):
    """
    Clean up all orphaned data (owners, buyers, investors, expenses) whose deals have been deleted
    """
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        
        cleanup_results = {}
        
        # 1. Clean up orphaned owners
        cursor.execute("""
            SELECT o.id, o.name, o.deal_id 
            FROM owners o 
            LEFT JOIN deals d ON o.deal_id = d.id 
            WHERE d.id IS NULL
        """)
        orphaned_owners = cursor.fetchall()
        
        if orphaned_owners:
            orphaned_owner_ids = [owner[0] for owner in orphaned_owners]
            
            # Delete owner documents first
            try:
                placeholders = ','.join(['%s'] * len(orphaned_owner_ids))
                cursor.execute(f"""
                    DELETE FROM owner_documents 
                    WHERE owner_id IN ({placeholders})
                """, orphaned_owner_ids)
            except Exception:
                pass
            
            # Delete orphaned owners
            placeholders = ','.join(['%s'] * len(orphaned_owner_ids))
            cursor.execute(f"""
                DELETE FROM owners 
                WHERE id IN ({placeholders})
            """, orphaned_owner_ids)
            
            cleanup_results['owners'] = {
                'count': len(orphaned_owners),
                'names': [owner[1] for owner in orphaned_owners]
            }
        else:
            cleanup_results['owners'] = {'count': 0, 'names': []}
        
        # 2. Clean up orphaned buyers
        cursor.execute("""
            SELECT b.id, b.name, b.deal_id 
            FROM buyers b 
            LEFT JOIN deals d ON b.deal_id = d.id 
            WHERE d.id IS NULL
        """)
        orphaned_buyers = cursor.fetchall()
        
        if orphaned_buyers:
            orphaned_buyer_ids = [buyer[0] for buyer in orphaned_buyers]
            placeholders = ','.join(['%s'] * len(orphaned_buyer_ids))
            cursor.execute(f"""
                DELETE FROM buyers 
                WHERE id IN ({placeholders})
            """, orphaned_buyer_ids)
            
            cleanup_results['buyers'] = {
                'count': len(orphaned_buyers),
                'names': [buyer[1] for buyer in orphaned_buyers]
            }
        else:
            cleanup_results['buyers'] = {'count': 0, 'names': []}
        
        # 3. Clean up orphaned investors
        cursor.execute("""
            SELECT i.id, i.investor_name, i.deal_id 
            FROM investors i 
            LEFT JOIN deals d ON i.deal_id = d.id 
            WHERE d.id IS NULL
        """)
        orphaned_investors = cursor.fetchall()
        
        if orphaned_investors:
            orphaned_investor_ids = [investor[0] for investor in orphaned_investors]
            placeholders = ','.join(['%s'] * len(orphaned_investor_ids))
            cursor.execute(f"""
                DELETE FROM investors 
                WHERE id IN ({placeholders})
            """, orphaned_investor_ids)
            
            cleanup_results['investors'] = {
                'count': len(orphaned_investors),
                'names': [investor[1] for investor in orphaned_investors]
            }
        else:
            cleanup_results['investors'] = {'count': 0, 'names': []}
        
        # 4. Clean up orphaned expenses
        cursor.execute("""
            SELECT e.id, e.expense_type, e.deal_id 
            FROM expenses e 
            LEFT JOIN deals d ON e.deal_id = d.id 
            WHERE d.id IS NULL
        """)
        orphaned_expenses = cursor.fetchall()
        
        if orphaned_expenses:
            orphaned_expense_ids = [expense[0] for expense in orphaned_expenses]
            placeholders = ','.join(['%s'] * len(orphaned_expense_ids))
            cursor.execute(f"""
                DELETE FROM expenses 
                WHERE id IN ({placeholders})
            """, orphaned_expense_ids)
            
            cleanup_results['expenses'] = {
                'count': len(orphaned_expenses),
                'types': [expense[1] for expense in orphaned_expenses]
            }
        else:
            cleanup_results['expenses'] = {'count': 0, 'types': []}
        
        connection.commit()
        
        total_cleaned = sum(result['count'] for result in cleanup_results.values())
        
        return jsonify({
            'message': f'Successfully cleaned up {total_cleaned} orphaned records',
            'cleanup_results': cleanup_results,
            'total_deleted': total_cleaned
        })
        
    except Exception as e:
        if connection:
            connection.rollback()
        return jsonify({'error': f'Failed to cleanup orphaned data: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/deals/<int:deal_id>', methods=['PUT'])
@token_required
def update_deal(current_user, deal_id):
    """Update an existing deal with all its related data"""
    try:
        data = request.get_json()
        
        connection = get_db_connection()
        cursor = connection.cursor()
        
        # Check if deal exists
        cursor.execute("SELECT id FROM deals WHERE id = %s", (deal_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Deal not found'}), 404
        
        # Handle empty strings for numeric fields
        total_area = data.get('total_area') if data.get('total_area') != '' else None

        # Validate and clean status field
        status = data.get('status', 'open')
        if status:
            status = str(status).strip().lower()
        
        # Map valid status values
        valid_statuses = {
            'open': 'open',
            'closed': 'closed', 
            'commission': 'commission',
            'for sale': 'For Sale',
            'sold': 'Sold',
            'in progress': 'In Progress',
            'completed': 'Completed',
            'on hold': 'On Hold',
            'cancelled': 'Cancelled'
        }
        
        # Use mapped status or default to 'open'
        final_status = valid_statuses.get(status, 'open')

        # Update main deal record
        cursor.execute("""
            UPDATE deals SET 
                project_name = %s, survey_number = %s, location = %s, 
                taluka = %s, village = %s, total_area = %s, area_unit = %s, 
                status = %s, payment_mode = %s, profit_allocation = %s, 
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (
            data.get('project_name'),
            data.get('survey_number'),
            data.get('location'),
            data.get('taluka'),
            data.get('village'),
            total_area,
            data.get('area_unit'),
            final_status,
            data.get('payment_mode'),
            data.get('profit_allocation'),
            deal_id
        ))

        # Update owners - delete existing and insert new ones
        cursor.execute("DELETE FROM owners WHERE deal_id = %s", (deal_id,))
        owners = data.get('owners', [])
        for owner in owners:
            if owner.get('name'):
                cursor.execute("""
                    INSERT INTO owners (deal_id, name, mobile, email, aadhar_card, pan_card, address)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    deal_id,
                    owner.get('name'),
                    owner.get('mobile'),
                    owner.get('email'),
                    owner.get('aadhar_card'),
                    owner.get('pan_card'),
                    owner.get('address')
                ))

        # Update buyers - delete existing and insert new ones
        cursor.execute("DELETE FROM buyers WHERE deal_id = %s", (deal_id,))
        buyers = data.get('buyers', [])
        for buyer in buyers:
            if buyer.get('name'):
                cursor.execute("""
                    INSERT INTO buyers (deal_id, name, mobile, email, aadhar_card, pan_card)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    deal_id,
                    buyer.get('name'),
                    buyer.get('mobile'),
                    buyer.get('email'),
                    buyer.get('aadhar_card'),
                    buyer.get('pan_card')
                ))
        
        # Update investors - delete existing and insert new ones
        cursor.execute("DELETE FROM investors WHERE deal_id = %s", (deal_id,))
        investors = data.get('investors', [])
        for investor in investors:
            if investor.get('investor_name'):
                # Normalize investment_amount -> always send a numeric (0 if empty/invalid)
                inv_amt_raw = investor.get('investment_amount')
                if isinstance(inv_amt_raw, str):
                    inv_amt_raw = inv_amt_raw.strip()
                    if inv_amt_raw.lower() == 'null':
                        inv_amt_raw = None
                if inv_amt_raw is None or inv_amt_raw == '':
                    investment_amount = 0
                else:
                    try:
                        investment_amount = float(inv_amt_raw)
                    except Exception:
                        investment_amount = 0

                # Normalize investment_percentage -> None if empty or invalid
                inv_pct_raw = investor.get('investment_percentage')
                if isinstance(inv_pct_raw, str):
                    inv_pct_raw = inv_pct_raw.strip()
                    if inv_pct_raw == '':
                        investment_percentage = None
                    else:
                        try:
                            investment_percentage = float(inv_pct_raw)
                        except Exception:
                            investment_percentage = None
                else:
                    investment_percentage = inv_pct_raw if inv_pct_raw is not None else None
                    
                cursor.execute("""
                    INSERT INTO investors (deal_id, investor_name, investment_amount, 
                                         investment_percentage, mobile, email, 
                                         aadhar_card, pan_card)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    deal_id,
                    investor.get('investor_name'),
                    investment_amount,
                    investment_percentage,
                    investor.get('mobile'),
                    investor.get('email'),
                    investor.get('aadhar_card'),
                    investor.get('pan_card')
                ))

        # Update expenses - delete existing and insert new ones
        cursor.execute("DELETE FROM expenses WHERE deal_id = %s", (deal_id,))
        expenses = data.get('expenses', [])
        for expense in expenses:
            if expense.get('expense_type') and expense.get('amount'):
                cursor.execute("""
                    INSERT INTO expenses (deal_id, expense_type, expense_description, amount, paid_by, expense_date, receipt_number)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    deal_id,
                    expense.get('expense_type'),
                    expense.get('expense_description'),
                    expense.get('amount'),
                    expense.get('paid_by'),
                    expense.get('expense_date'),
                    expense.get('receipt_number')
                ))

        connection.commit()
        return jsonify({'message': 'Deal updated successfully', 'deal_id': deal_id})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/deals/<int:deal_id>/status', methods=['PUT'])
@token_required
def update_deal_status(current_user, deal_id):
    """Update deal status only"""
    try:
        data = request.get_json()
        new_status = data.get('status')
        
        if not new_status:
            return jsonify({'error': 'Status is required'}), 400
        
        connection = get_db_connection()
        cursor = connection.cursor()
        
        # Check if deal exists
        cursor.execute("SELECT id FROM deals WHERE id = %s", (deal_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Deal not found'}), 404
        
        # Validate and clean status field
        status = str(new_status).strip().lower()
        
        # Map valid status values
        valid_statuses = {
            'open': 'open',
            'closed': 'closed', 
            'commission': 'commission',
            'for sale': 'For Sale',
            'sold': 'Sold',
            'in progress': 'In Progress',
            'completed': 'Completed',
            'on hold': 'On Hold',
            'cancelled': 'Cancelled'
        }
        
        # Use mapped status or return error for invalid status
        final_status = valid_statuses.get(status)
        if not final_status:
            return jsonify({'error': f'Invalid status: {new_status}'}), 400

        # Update only the status
        cursor.execute("""
            UPDATE deals SET 
                status = %s, 
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (final_status, deal_id))

        connection.commit()
        return jsonify({'message': 'Deal status updated successfully', 'deal_id': deal_id})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/deals', methods=['GET'])
@token_required
def get_deals(current_user):
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT d.*, u.full_name as created_by_name 
            FROM deals d 
            LEFT JOIN users u ON d.created_by = u.id 
            ORDER BY d.created_at DESC
        """)
        deals = cursor.fetchall()
        
        # Convert datetime objects to strings for JSON serialization
        for deal in deals:
            for key, value in deal.items():
                if isinstance(value, datetime):
                    deal[key] = value.isoformat()
        
        return jsonify(deals)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/deals', methods=['POST'])
@token_required
def create_deal(current_user):
    try:
        data = request.get_json()
        
        # Ensure schema is up to date (non-blocking)
        try:
            ensure_deals_schema()
        except Exception as e:
            pass  # Log to application logs instead of console
        
        connection = get_db_connection()
        cursor = connection.cursor()
        
        # Handle empty strings for numeric fields
        total_area = data.get('total_area') if data.get('total_area') != '' else None

        # Validate and clean status field
        status = data.get('status', 'open')
        if status:
            status = str(status).strip().lower()
        
        # Map valid status values
        valid_statuses = {
            'open': 'open',
            'closed': 'closed', 
            'commission': 'commission',
            'for sale': 'For Sale',
            'sold': 'Sold',
            'in progress': 'In Progress',
            'completed': 'Completed',
            'on hold': 'On Hold',
            'cancelled': 'Cancelled'
        }
        
        # Use mapped status or default to 'open'
        final_status = valid_statuses.get(status, 'open')

        # Insert deal with new fields excluding state and district
        cursor.execute("""
            INSERT INTO deals (project_name, survey_number, purchase_date,
                             taluka, village, total_area, area_unit, 
                             created_by, status, payment_mode, profit_allocation)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            data.get('project_name'),
            data.get('survey_number'),
            data.get('purchase_date') if data.get('purchase_date') else None,
            data.get('taluka'),
            data.get('village'),
            total_area,
            data.get('area_unit'),
            current_user,
            final_status,
            data.get('payment_mode'),
            data.get('profit_allocation')
        ))
        deal_id = cursor.lastrowid
        # Insert owners
        owners = data.get('owners', [])
        for owner in owners:
            if owner.get('existing_owner_id'):
                # Associate existing owner with this deal
                cursor.execute("""
                    INSERT INTO owners (deal_id, name, mobile, email, aadhar_card, pan_card)
                    SELECT %s, name, mobile, email, aadhar_card, pan_card
                    FROM owners 
                    WHERE id = %s
                    LIMIT 1
                """, (deal_id, owner.get('existing_owner_id')))
            elif owner.get('name'):
                # Create new owner
                cursor.execute("""
                    INSERT INTO owners (deal_id, name, mobile, aadhar_card, pan_card)
                    VALUES (%s, %s, %s, %s, %s)
                """, (
                    deal_id,
                    owner.get('name'),
                    owner.get('mobile'),
                    owner.get('aadhar_card'),
                    owner.get('pan_card')
                ))

        # Insert buyers
        buyers = data.get('buyers', [])
        for buyer in buyers:
            if buyer.get('name'):
                cursor.execute("""
                    INSERT INTO buyers (deal_id, name, mobile, aadhar_card, pan_card)
                    VALUES (%s, %s, %s, %s, %s)
                """, (
                    deal_id,
                    buyer.get('name'),
                    buyer.get('mobile'),
                    buyer.get('aadhar_card'),
                    buyer.get('pan_card')
                ))
        
        # Insert investors
        investors = data.get('investors', [])
        for investor in investors:
            if investor.get('existing_investor_id'):
                # Link to existing investor instead of duplicating
                # Create a new record but mark it as linked to the original with parent_investor_id
                cursor.execute("""
                    INSERT INTO investors (deal_id, investor_name, investment_amount, 
                                         investment_percentage, mobile, email,
                                         aadhar_card, pan_card, is_starred, parent_investor_id)
                    SELECT %s, investor_name, investment_amount, investment_percentage, 
                           mobile, email, aadhar_card, pan_card, is_starred, %s
                    FROM investors 
                    WHERE id = %s
                    LIMIT 1
                """, (deal_id, investor.get('existing_investor_id'), investor.get('existing_investor_id')))
            elif investor.get('investor_name'):
                # Create new investor
                # Normalize investment_amount -> always send a numeric (0 if empty/invalid)
                inv_amt_raw = investor.get('investment_amount')
                if isinstance(inv_amt_raw, str):
                    inv_amt_raw = inv_amt_raw.strip()
                    if inv_amt_raw.lower() == 'null':
                        inv_amt_raw = None
                if inv_amt_raw is None or inv_amt_raw == '':
                    investment_amount = 0
                else:
                    try:
                        investment_amount = float(inv_amt_raw)
                    except Exception:
                        investment_amount = 0

                # Normalize investment_percentage -> None if empty or invalid
                inv_pct_raw = investor.get('investment_percentage')
                if isinstance(inv_pct_raw, str):
                    inv_pct_raw = inv_pct_raw.strip()
                    if inv_pct_raw == '':
                        investment_percentage = None
                    else:
                        try:
                            investment_percentage = float(inv_pct_raw)
                        except Exception:
                            investment_percentage = None
                else:
                    investment_percentage = inv_pct_raw if inv_pct_raw is not None else None

                cursor.execute("""
                    INSERT INTO investors (deal_id, investor_name, investment_amount, 
                                         investment_percentage, mobile, 
                                         aadhar_card, pan_card)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    deal_id,
                    investor.get('investor_name'),
                    investment_amount,
                    investment_percentage,
                    investor.get('mobile'),
                    investor.get('aadhar_card'),
                    investor.get('pan_card')
                ))

        # Insert expenses
        expenses = data.get('expenses', [])
        for expense in expenses:
            if expense.get('expense_type') and expense.get('amount'):
                cursor.execute("""
                    INSERT INTO expenses (deal_id, expense_type, expense_description, amount, paid_by, expense_date, receipt_number)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    deal_id,
                    expense.get('expense_type'),
                    expense.get('expense_description'),
                    expense.get('amount'),
                    expense.get('paid_by'),
                    expense.get('expense_date'),
                    expense.get('receipt_number')
                ))

        connection.commit()

        return jsonify({'message': 'Deal created successfully', 'deal_id': deal_id})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/deals/<int:deal_id>', methods=['GET'])
@token_required
def get_deal(current_user, deal_id):
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        # Get deal details
        cursor.execute("SELECT * FROM deals WHERE id = %s", (deal_id,))
        deal = cursor.fetchone()

        # Get owners
        cursor.execute("SELECT * FROM owners WHERE deal_id = %s", (deal_id,))
        owners = cursor.fetchall()

        # Get buyers
        cursor.execute("SELECT * FROM buyers WHERE deal_id = %s", (deal_id,))
        buyers = cursor.fetchall()

        if not deal:
            return jsonify({'error': 'Deal not found'}), 404

        # Get investors
        cursor.execute("SELECT * FROM investors WHERE deal_id = %s", (deal_id,))
        investors = cursor.fetchall()

        # Get expenses
        cursor.execute("""
            SELECT e.*, i.investor_name as paid_by_name 
            FROM expenses e 
            LEFT JOIN investors i ON e.paid_by = i.id 
            WHERE e.deal_id = %s
        """, (deal_id,))
        expenses = cursor.fetchall()

        # Get documents
        cursor.execute("SELECT * FROM documents WHERE deal_id = %s", (deal_id,))
        documents = cursor.fetchall()

        # Convert datetime objects
        for item in [deal] + owners + buyers + investors + expenses + documents:
            if item:
                for key, value in item.items():
                    if isinstance(value, datetime):
                        item[key] = value.isoformat()

        return jsonify({
            'deal': deal,
            'owners': owners,
            'buyers': buyers,
            'investors': investors,
            'expenses': expenses,
            'documents': documents
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/deals/<int:deal_id>/purchase-amount', methods=['PUT'])
@token_required
def update_purchase_amount(current_user, deal_id):
    """Update the purchase amount for a specific deal"""
    try:
        data = request.get_json()
        purchase_amount = data.get('purchase_amount')
        
        # Validate purchase_amount - allow null/empty for clearing, or positive decimal
        if purchase_amount is not None and purchase_amount != '':
            try:
                purchase_amount = float(purchase_amount)
                if purchase_amount < 0:
                    return jsonify({'error': 'Purchase amount cannot be negative'}), 400
            except (ValueError, TypeError):
                return jsonify({'error': 'Invalid purchase amount format'}), 400
        else:
            purchase_amount = None
        
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
            
        cursor = connection.cursor()
        
        # Check if deal exists
        cursor.execute("SELECT id FROM deals WHERE id = %s", (deal_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Deal not found'}), 404
        
        # Update purchase amount
        cursor.execute(
            "UPDATE deals SET purchase_amount = %s WHERE id = %s",
            (purchase_amount, deal_id)
        )
        connection.commit()
        
        return jsonify({
            'success': True,
            'message': 'Purchase amount updated successfully',
            'purchase_amount': purchase_amount
        })
        
    except mysql.connector.Error as e:
        if connection:
            connection.rollback()
        app.logger.error(f"Database error updating purchase amount: {e}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        if connection:
            connection.rollback()
        app.logger.error(f"Error updating purchase amount: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/deals/<int:deal_id>/owner-shares', methods=['PUT'])
@token_required
def update_owner_shares(current_user, deal_id):
    """Update owner share percentages and investment amounts for a specific deal"""
    try:
        data = request.get_json()
        owners = data.get('owners', [])
        
        if not owners:
            return jsonify({'error': 'No owners provided'}), 400
        
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
            
        cursor = connection.cursor()
        
        # Check if deal exists
        cursor.execute("SELECT id FROM deals WHERE id = %s", (deal_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Deal not found'}), 404
        
        # Update owner share percentages and amounts
        for owner_data in owners:
            owner_id = owner_data.get('id')
            percentage_share = float(owner_data.get('percentage_share', 0))
            investment_amount = int(owner_data.get('investment_amount', 0))
            
            if owner_id:
                # Check if owner exists for this deal
                cursor.execute(
                    "SELECT id FROM owners WHERE id = %s AND deal_id = %s", 
                    (owner_id, deal_id)
                )
                if cursor.fetchone():
                    # Update owner's share percentage and investment amount
                    cursor.execute(
                        "UPDATE owners SET percentage_share = %s, investment_amount = %s WHERE id = %s AND deal_id = %s",
                        (percentage_share, investment_amount, owner_id, deal_id)
                    )
        
        connection.commit()
        
        return jsonify({
            'success': True,
            'message': 'Owner shares updated successfully',
            'owners': owners
        })
        
    except mysql.connector.Error as e:
        if connection:
            connection.rollback()
        app.logger.error(f"Database error updating owner shares: {e}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        if connection:
            connection.rollback()
        app.logger.error(f"Error updating owner shares: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

# ORIGINAL ENDPOINT FOR PURCHASING SECTION - RESTORED
@app.route('/api/deals/<int:deal_id>/investor-shares', methods=['PUT'])
@token_required
def update_investor_shares(current_user, deal_id):
    """Update investor share percentages and investment amounts for a specific deal"""
    try:
        data = request.get_json()
        print(f"Received data: {data}")  # Debug log
        
        investors = data.get('investors', [])
        print(f"Investors data: {investors}")  # Debug log
        
        if not investors:
            return jsonify({'error': 'No investors provided'}), 400
        
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
            
        cursor = connection.cursor()
        
        # Ensure autocommit is off for transaction control
        connection.autocommit = False
        
        # Check if deal exists
        cursor.execute("SELECT id FROM deals WHERE id = %s", (deal_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Deal not found'}), 404
        
        # Update investor share percentages and amounts
        updated_count = 0
        for investor_data in investors:
            investor_id = investor_data.get('id')
            percentage_share = float(investor_data.get('percentage_share', 0))
            investment_amount = int(investor_data.get('investment_amount', 0))
            
            print(f"Processing investor {investor_id}: percentage={percentage_share}, amount={investment_amount}")  # Debug log
            
            if investor_id:
                # Check if investor exists for this deal
                cursor.execute(
                    "SELECT id FROM investors WHERE id = %s AND deal_id = %s", 
                    (investor_id, deal_id)
                )
                if cursor.fetchone():
                    # Update investor's share percentage and investment amount
                    cursor.execute(
                        "UPDATE investors SET percentage_share = %s, investment_amount = %s WHERE id = %s AND deal_id = %s",
                        (percentage_share, investment_amount, investor_id, deal_id)
                    )
                    updated_count += 1
                    print(f"Updated investor {investor_id}")  # Debug log
                else:
                    print(f"Investor {investor_id} not found for deal {deal_id}")  # Debug log
        
        connection.commit()
        print(f"Successfully updated {updated_count} investors")  # Debug log
        
        # Verify the changes were actually saved
        print("Verifying changes were saved...")
        for investor_data in investors:
            investor_id = investor_data.get('id')
            if investor_id:
                cursor.execute(
                    "SELECT percentage_share, investment_amount FROM investors WHERE id = %s AND deal_id = %s",
                    (investor_id, deal_id)
                )
                result = cursor.fetchone()
                if result:
                    print(f"Verified investor {investor_id}: percentage={result[0]}, amount={result[1]}")
                else:
                    print(f"WARNING: Could not verify investor {investor_id}")
        
        return jsonify({
            'success': True,
            'message': f'Updated {updated_count} investor shares successfully',
            'investors': investors
        })
        
    except mysql.connector.Error as e:
        if connection:
            connection.rollback()
        app.logger.error(f"Database error updating investor shares: {e}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        if connection:
            connection.rollback()
        app.logger.error(f"Error updating investor shares: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/deals/<int:deal_id>/investors/percentage-shares', methods=['PUT'])
@token_required
def update_investor_percentage_shares(current_user, deal_id):
    """Update percentage shares for investors of a deal"""
    try:
        data = request.get_json()
        investor_shares = data.get('investor_shares', [])
        
        # Validate that investor_shares is a list
        if not isinstance(investor_shares, list):
            return jsonify({'error': 'investor_shares must be a list'}), 400
        
        # Validate total percentage equals 100%
        total_percentage = sum(float(share.get('percentage_share', 0)) for share in investor_shares)
        if abs(total_percentage - 100.0) > 0.01:  # Allow small floating point differences
            return jsonify({'error': f'Total percentage must equal 100%. Current total: {total_percentage}%'}), 400
        
        # Validate each investor share
        for share in investor_shares:
            if 'investor_id' not in share or 'percentage_share' not in share:
                return jsonify({'error': 'Each investor share must have investor_id and percentage_share'}), 400
            
            try:
                percentage = float(share['percentage_share'])
                if percentage < 0 or percentage > 100:
                    return jsonify({'error': 'Percentage share must be between 0 and 100'}), 400
            except (ValueError, TypeError):
                return jsonify({'error': 'Invalid percentage_share value'}), 400
        
        # Get database connection
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Check if deal exists and user has permission
        cursor.execute("SELECT id FROM deals WHERE id = %s", (deal_id,))
        deal = cursor.fetchone()
        if not deal:
            return jsonify({'error': 'Deal not found'}), 404
        
        # Update each investor's percentage share
        for share in investor_shares:
            investor_id = share['investor_id']
            percentage_share = float(share['percentage_share'])
            
            # Verify investor belongs to this deal
            cursor.execute("SELECT id FROM investors WHERE id = %s AND deal_id = %s", (investor_id, deal_id))
            investor = cursor.fetchone()
            if not investor:
                return jsonify({'error': f'Investor {investor_id} not found for deal {deal_id}'}), 400
            
            # Update the percentage share (following owners pattern exactly)
            cursor.execute(
                "UPDATE investors SET investment_percentage = %s WHERE id = %s AND deal_id = %s",
                (percentage_share, investor_id, deal_id)
            )
        
        conn.commit()
        
        # Return updated investors data
        cursor.execute("SELECT * FROM investors WHERE deal_id = %s ORDER BY id", (deal_id,))
        updated_investors = cursor.fetchall()
        
        return jsonify({
            'message': 'Investor percentage shares updated successfully',
            'investors': updated_investors
        }), 200
        
    except Exception as e:
        print(f"Error updating investor percentage shares: {e}")
        return jsonify({'error': 'Failed to update investor percentage shares'}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/deals/<int:deal_id>/buyers', methods=['POST'])
@token_required
def add_buyer_to_deal(current_user, deal_id):
    """Add a new buyer to an existing deal"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('name'):
            return jsonify({'error': 'Buyer name is required'}), 400
        
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
            
        cursor = connection.cursor()
        
        # Check if deal exists
        cursor.execute("SELECT id FROM deals WHERE id = %s", (deal_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Deal not found'}), 404
        
        # Insert new buyer
        cursor.execute("""
            INSERT INTO buyers (deal_id, name, mobile, email, aadhar_card, pan_card, address)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            deal_id,
            data.get('name'),
            data.get('mobile', ''),
            data.get('email', ''),
            data.get('aadhar_card', ''),
            data.get('pan_card', ''),
            data.get('address', '')
        ))
        
        buyer_id = cursor.lastrowid
        connection.commit()
        
        return jsonify({
            'success': True,
            'message': 'Buyer added successfully',
            'buyer_id': buyer_id
        })
        
    except mysql.connector.Error as e:
        if connection:
            connection.rollback()
        app.logger.error(f"Database error adding buyer: {e}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        if connection:
            connection.rollback()
        app.logger.error(f"Error adding buyer: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/deals/<int:deal_id>/buyers/<int:buyer_id>', methods=['DELETE'])
@token_required
def delete_buyer_from_deal(current_user, deal_id, buyer_id):
    """Delete a buyer from a deal"""
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
            
        cursor = connection.cursor()
        
        # Check if deal exists
        cursor.execute("SELECT id FROM deals WHERE id = %s", (deal_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Deal not found'}), 404
        
        # Check if buyer exists and belongs to this deal
        cursor.execute("SELECT id FROM buyers WHERE id = %s AND deal_id = %s", (buyer_id, deal_id))
        if not cursor.fetchone():
            return jsonify({'error': 'Buyer not found'}), 404
        
        # Delete the buyer
        cursor.execute("DELETE FROM buyers WHERE id = %s AND deal_id = %s", (buyer_id, deal_id))
        connection.commit()
        
        return jsonify({
            'success': True,
            'message': 'Buyer deleted successfully'
        })
        
    except mysql.connector.Error as e:
        if connection:
            connection.rollback()
        app.logger.error(f"Database error deleting buyer: {e}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        if connection:
            connection.rollback()
        app.logger.error(f"Error deleting buyer: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/deals/<int:deal_id>/selling-amount', methods=['PUT'])
@token_required
def update_selling_amount(current_user, deal_id):
    """Update the selling amount for a specific deal"""
    try:
        data = request.get_json()
        asking_price = data.get('asking_price')
        sold_price = data.get('sold_price')
        
        # Validate amounts - allow null/empty for clearing, or positive decimal
        for amount, field_name in [(asking_price, 'asking_price'), (sold_price, 'sold_price')]:
            if amount is not None and amount != '':
                try:
                    amount_val = float(amount)
                    if amount_val < 0:
                        return jsonify({'error': f'{field_name.replace("_", " ").title()} cannot be negative'}), 400
                except (ValueError, TypeError):
                    return jsonify({'error': f'Invalid {field_name.replace("_", " ")} format'}), 400
        
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
            
        cursor = connection.cursor()
        
        # Check if deal exists
        cursor.execute("SELECT id FROM deals WHERE id = %s", (deal_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Deal not found'}), 404
        
        # Prepare update fields
        update_fields = []
        update_values = []
        
        if asking_price is not None:
            if asking_price == '':
                asking_price = None
            else:
                asking_price = float(asking_price)
            update_fields.append("asking_price = %s")
            update_values.append(asking_price)
        
        if sold_price is not None:
            if sold_price == '':
                sold_price = None
            else:
                sold_price = float(sold_price)
            update_fields.append("sold_price = %s")
            update_values.append(sold_price)
        
        if not update_fields:
            return jsonify({'error': 'No selling amount data provided'}), 400
        
        # Update selling amounts
        update_values.append(deal_id)
        cursor.execute(
            f"UPDATE deals SET {', '.join(update_fields)} WHERE id = %s",
            update_values
        )
        connection.commit()
        
        return jsonify({
            'success': True,
            'message': 'Selling amount updated successfully',
            'asking_price': asking_price,
            'sold_price': sold_price
        })
        
    except mysql.connector.Error as e:
        if connection:
            connection.rollback()
        app.logger.error(f"Database error updating selling amount: {e}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        if connection:
            connection.rollback()
        app.logger.error(f"Error updating selling amount: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/deals/<int:deal_id>/expenses', methods=['POST'])
@token_required
def add_expense(current_user, deal_id):
    try:
        data = request.get_json()
        
        connection = get_db_connection()
        cursor = connection.cursor()
        
        cursor.execute("""
            INSERT INTO expenses (deal_id, expense_type, expense_description, 
                                amount, paid_by, expense_date, receipt_number)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            deal_id,
            data.get('expense_type'),
            data.get('expense_description'),
            data.get('amount'),
            data.get('paid_by'),
            data.get('expense_date'),
            data.get('receipt_number')
        ))
        
        connection.commit()
        
        return jsonify({'message': 'Expense added successfully'})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

# Owners API endpoints
@app.route('/api/owners', methods=['GET'])
@token_required
@user_access_control
def get_all_owners(current_user):
    """Get owners with pagination, search, and sorting - filtered by user access level"""
    try:
        # Get pagination parameters
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 5))
        search = request.args.get('search', '').strip()
        sort_by = request.args.get('sort_by', 'name')
        sort_order = request.args.get('sort_order', 'asc')
        starred_only = request.args.get('starred_only', 'false').lower() == 'true'
        
        # Validate sort parameters
        valid_sort_fields = ['name', 'mobile', 'aadhar_card', 'pan_card', 'id']
        if sort_by not in valid_sort_fields:
            sort_by = 'name'
        
        sort_order = 'ASC' if sort_order.lower() == 'asc' else 'DESC'
        
        # Calculate offset
        offset = (page - 1) * limit
        
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Build base query based on user access level
        if request.user_access['can_access_all']:
            # Admin/Auditor can see all owners
            base_query = """
                FROM owners o
                LEFT JOIN deals d ON o.deal_id = d.id
            """
            where_conditions = []
            query_params = []
            
            # Add starred filter if requested
            if starred_only:
                where_conditions.append("o.is_starred = TRUE")
            
            # Add search conditions
            if search:
                search_condition = """(
                    o.name LIKE %s OR 
                    o.mobile LIKE %s OR 
                    o.aadhar_card LIKE %s OR 
                    o.pan_card LIKE %s
                )"""
                where_conditions.append(search_condition)
                search_param = f"%{search}%"
                query_params.extend([search_param, search_param, search_param, search_param])
            
            where_clause = " WHERE " + " AND ".join(where_conditions) if where_conditions else ""
            
            # Get total count
            count_query = f"""
                SELECT COUNT(DISTINCT CONCAT(o.name, '|', COALESCE(o.mobile, ''), '|', COALESCE(o.email, ''), '|', COALESCE(o.aadhar_card, ''), '|', COALESCE(o.pan_card, '')))
                {base_query}
                {where_clause}
            """
            cursor.execute(count_query, query_params)
            total_count = cursor.fetchone()['COUNT(DISTINCT CONCAT(o.name, \'|\', COALESCE(o.mobile, \'\'), \'|\', COALESCE(o.email, \'\'), \'|\', COALESCE(o.aadhar_card, \'\'), \'|\', COALESCE(o.pan_card, \'\')))']
            
            # Get paginated data
            data_query = f"""
                SELECT 
                    MIN(o.id) as id,
                    o.name,
                    o.mobile,
                    o.email,
                    o.aadhar_card,
                    o.pan_card,
                    COALESCE(MAX(o.is_starred), FALSE) as is_starred,
                    COUNT(DISTINCT o.deal_id) as total_projects,
                    COUNT(DISTINCT CASE WHEN d.status = 'active' THEN d.id END) as active_projects,
                    0 as total_investment
                {base_query}
                {where_clause}
                GROUP BY o.name, o.mobile, o.email, o.aadhar_card, o.pan_card
                ORDER BY {sort_by} {sort_order}
                LIMIT %s OFFSET %s
            """
            cursor.execute(data_query, query_params + [limit, offset])
            
        elif request.user_access['owner_id']:
            # Regular user linked to owner - can only see their own data
            where_conditions = ["o.id = %s"]
            query_params = [request.user_access['owner_id']]
            
            if starred_only:
                where_conditions.append("o.is_starred = TRUE")
            
            if search:
                search_condition = """(
                    o.name LIKE %s OR 
                    o.mobile LIKE %s OR 
                    o.aadhar_card LIKE %s OR 
                    o.pan_card LIKE %s
                )"""
                where_conditions.append(search_condition)
                search_param = f"%{search}%"
                query_params.extend([search_param, search_param, search_param, search_param])
            
            where_clause = " WHERE " + " AND ".join(where_conditions)
            
            # Count query
            count_query = f"""
                SELECT COUNT(DISTINCT CONCAT(o.name, '|', COALESCE(o.mobile, ''), '|', COALESCE(o.email, ''), '|', COALESCE(o.aadhar_card, ''), '|', COALESCE(o.pan_card, '')))
                FROM owners o
                LEFT JOIN deals d ON o.deal_id = d.id
                {where_clause}
            """
            cursor.execute(count_query, query_params)
            total_count = cursor.fetchone()['COUNT(DISTINCT CONCAT(o.name, \'|\', COALESCE(o.mobile, \'\'), \'|\', COALESCE(o.email, \'\'), \'|\', COALESCE(o.aadhar_card, \'\'), \'|\', COALESCE(o.pan_card, \'\')))']
            
            # Data query
            data_query = f"""
                SELECT 
                    MIN(o.id) as id,
                    o.name,
                    o.mobile,
                    o.email,
                    o.aadhar_card,
                    o.pan_card,
                    COALESCE(MAX(o.is_starred), FALSE) as is_starred,
                    COUNT(DISTINCT o.deal_id) as total_projects,
                    COUNT(DISTINCT CASE WHEN d.status = 'active' THEN d.id END) as active_projects,
                    0 as total_investment
                FROM owners o
                LEFT JOIN deals d ON o.deal_id = d.id
                {where_clause}
                GROUP BY o.name, o.mobile, o.email, o.aadhar_card, o.pan_card
                ORDER BY {sort_by} {sort_order}
                LIMIT %s OFFSET %s
            """
            cursor.execute(data_query, query_params + [limit, offset])
        else:
            # User linked to investor or no link - return empty result for owners
            return jsonify({
                'data': [],
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total': 0,
                    'pages': 0
                }
            })
        
        owners = cursor.fetchall()
        total_pages = (total_count + limit - 1) // limit  # Ceiling division
        
        return jsonify({
            'data': owners,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total_count,
                'pages': total_pages
            }
        })
    
    except Exception as e:
        print(f"Error in get_all_owners: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/owners/<int:owner_id>', methods=['GET'])
@token_required
def get_owner_details(current_user, owner_id):
    """Get detailed owner information including all their projects"""
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Get owner details
        cursor.execute("""
            SELECT DISTINCT o.id, o.name, o.mobile, o.email, o.aadhar_card, o.pan_card
            FROM owners o
            WHERE o.id = %s
        """, (owner_id,))
        owner = cursor.fetchone()
        
        if not owner:
            return jsonify({'error': 'Owner not found'}), 404
        
        # Get all projects for this owner (find by matching owner details, not just this ID)
        cursor.execute("""
            SELECT DISTINCT
                d.id,
                d.project_name,
                s.name as state,
                dist.name as district,
                d.taluka,
                d.village,
                d.total_area,
                d.area_unit,
                d.status,
                d.created_at
            FROM deals d
            INNER JOIN owners o ON d.id = o.deal_id
            LEFT JOIN states s ON d.state_id = s.id
            LEFT JOIN districts dist ON d.district_id = dist.id
            WHERE o.name = %s 
                AND (o.mobile = %s OR o.mobile IS NULL OR %s IS NULL)
                AND (o.email = %s OR o.email IS NULL OR %s IS NULL)
            ORDER BY d.created_at DESC
        """, (owner['name'], owner['mobile'], owner['mobile'], owner['email'], owner['email']))
        projects = cursor.fetchall()
        
        # Convert datetime objects for projects
        for item in projects:
            if item:
                for key, value in item.items():
                    if isinstance(value, datetime):
                        item[key] = value.isoformat()
        
        return jsonify({
            'owner': owner,
            'projects': projects
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/owners', methods=['POST'])
@token_required
def create_owner(current_user):
    """Create a new owner"""
    try:
        data = request.get_json()
        
        connection = get_db_connection()
        cursor = connection.cursor()
        
        cursor.execute("""
            INSERT INTO owners (deal_id, name, mobile, email, aadhar_card, pan_card, address)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            data.get('deal_id'),
            data.get('name'),
            data.get('mobile'),
            data.get('email'),
            data.get('aadhar_card'),
            data.get('pan_card'),
            data.get('address')
        ))
        
        owner_id = cursor.lastrowid
        connection.commit()
        
        return jsonify({'message': 'Owner created successfully', 'owner_id': owner_id})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/owners/<int:owner_id>/star', methods=['POST'])
@token_required
def star_owner(current_user, owner_id):
    """Star/unstar an owner (Gmail-style)"""
    try:
        data = request.get_json()
        is_starred = data.get('starred', True)
        
        connection = get_db_connection()
        cursor = connection.cursor()
        
        # Update the star status
        cursor.execute(
            "UPDATE owners SET is_starred = %s WHERE id = %s", 
            (is_starred, owner_id)
        )
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Owner not found'}), 404
        
        connection.commit()
        
        action = 'starred' if is_starred else 'unstarred'
        return jsonify({
            'message': f'Owner {action} successfully',
            'owner_id': owner_id,
            'starred': is_starred
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/owners/starred', methods=['GET'])
@token_required
def get_starred_owners(current_user):
    """Get all starred owners"""
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Query starred owners
        cursor.execute("""
            SELECT id, name, mobile, email, aadhar_card, pan_card, 
                   is_starred
            FROM owners 
            WHERE is_starred = TRUE 
            ORDER BY name ASC
        """)
        
        starred_owners = cursor.fetchall()
        
        return jsonify(starred_owners)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/owners/<int:owner_id>', methods=['DELETE'])
@token_required
def delete_owner(current_user, owner_id):
    """Delete an owner"""
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        
        cursor.execute("DELETE FROM owners WHERE id = %s", (owner_id,))
        connection.commit()
        
        return jsonify({'message': 'Owner deleted successfully'})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/owners/<int:owner_id>/documents', methods=['POST'])
@token_required
def upload_owner_document(current_user, owner_id):
    """Upload document for an owner"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        document_type = request.form.get('document_type')
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Get owner name for folder
        cursor.execute("SELECT name FROM owners WHERE id = %s LIMIT 1", (owner_id,))
        owner = cursor.fetchone()
        if not owner:
            return jsonify({'error': 'Owner not found'}), 404
        
        owner_folder_name = f"owner_{owner_id}"
        
        # Create folder for the owner
        owner_folder = os.path.join(app.config['UPLOAD_FOLDER'], secure_filename(owner_folder_name))
        os.makedirs(owner_folder, exist_ok=True)
        
        filename = secure_filename(file.filename)
        filepath = os.path.join(owner_folder, filename)
        file.save(filepath)
        
        # Save to database - handle table not existing
        try:
            cursor = connection.cursor()
            cursor.execute("""
                INSERT INTO owner_documents (owner_id, document_type, document_name, 
                                           file_path, file_size, uploaded_by)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                owner_id,
                document_type,
                filename,
                os.path.relpath(filepath, app.config['UPLOAD_FOLDER']),
                os.path.getsize(filepath),
                current_user
            ))
            connection.commit()
        except mysql.connector.Error as e:
            # If owner_documents table doesn't exist, return a specific error
            return jsonify({'error': 'Document management not yet set up. Please contact administrator.'}), 503
        
        return jsonify({'message': 'Document uploaded successfully', 'filename': filename})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/owners/<int:owner_id>/documents', methods=['GET'])
@token_required
def get_owner_documents(current_user, owner_id):
    """Get all documents for an owner"""
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Check if owner exists and get their details
        cursor.execute("SELECT id, name, mobile, email FROM owners WHERE id = %s LIMIT 1", (owner_id,))
        owner = cursor.fetchone()
        if not owner:
            return jsonify({'error': 'Owner not found'}), 404
        
        # Get documents - find all owner IDs with same person details, then get their documents
        try:
            # First get all owner IDs for this person
            cursor.execute("""
                SELECT DISTINCT o.id
                FROM owners o
                WHERE o.name = %s 
                    AND (o.mobile = %s OR o.mobile IS NULL OR %s IS NULL)
                    AND (o.email = %s OR o.email IS NULL OR %s IS NULL)
            """, (owner['name'], owner['mobile'], owner['mobile'], owner['email'], owner['email']))
            owner_ids = [row['id'] for row in cursor.fetchall()]
            
            documents = []
            if owner_ids:
                # Get documents for all owner IDs
                placeholders = ','.join(['%s'] * len(owner_ids))
                cursor.execute(f"""
                    SELECT id, document_type, document_name, file_path, file_size, 
                           created_at, uploaded_by
                    FROM owner_documents 
                    WHERE owner_id IN ({placeholders})
                    ORDER BY document_type, created_at DESC
                """, owner_ids)
                documents = cursor.fetchall()
            
            # Group documents by type
            grouped_docs = {}
            for doc in documents:
                doc_type = doc['document_type']
                if doc_type not in grouped_docs:
                    grouped_docs[doc_type] = []
                grouped_docs[doc_type].append({
                    'id': doc['id'],
                    'name': doc['document_name'],
                    'file_path': doc['file_path'],
                    'file_size': doc['file_size'],
                    'created_at': doc['created_at'].isoformat() if doc['created_at'] else None,
                    'uploaded_by': doc['uploaded_by']
                })
            
            return jsonify({
                'owner': owner,
                'documents': grouped_docs
            })
            
        except mysql.connector.Error as e:
            # If owner_documents table doesn't exist, return empty documents
            return jsonify({
                'owner': owner,
                'documents': {}
            })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

# ===== INVESTORS ENDPOINTS =====

@app.route('/api/investors', methods=['GET'])
@token_required
@user_access_control
def get_investors(current_user):
    """Get investors with pagination, search, and sorting - filtered by user access level"""
    connection = None
    try:
        # Get pagination parameters
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 5))
        search = request.args.get('search', '').strip()
        sort_by = request.args.get('sort_by', 'investor_name')
        sort_order = request.args.get('sort_order', 'asc')
        starred_only = request.args.get('starred_only', 'false').lower() == 'true'
        
        # Validate sort parameters
        valid_sort_fields = ['investor_name', 'mobile', 'aadhar_card', 'pan_card', 'id', 'investment_amount', 'investment_percentage']
        if sort_by not in valid_sort_fields:
            sort_by = 'investor_name'
        
        sort_order = 'ASC' if sort_order.lower() == 'asc' else 'DESC'
        
        # Calculate offset
        offset = (page - 1) * limit
        
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
            
        cursor = connection.cursor(dictionary=True)
        
        # Build query based on user access level
        if request.user_access['can_access_all']:
            # Admin/Auditor can see all investors
            base_query = """
                FROM investors i
                LEFT JOIN deals d ON i.deal_id = d.id
            """
            where_conditions = ["i.parent_investor_id IS NULL"]  # Exclude duplicate investors
            query_params = []
            
            # Add starred filter if requested
            if starred_only:
                where_conditions.append("i.is_starred = TRUE")
            
            # Add search conditions
            if search:
                search_condition = """(
                    i.investor_name LIKE %s OR 
                    i.mobile LIKE %s OR 
                    i.aadhar_card LIKE %s OR 
                    i.pan_card LIKE %s OR
                    i.email LIKE %s
                )"""
                where_conditions.append(search_condition)
                search_param = f"%{search}%"
                query_params.extend([search_param, search_param, search_param, search_param, search_param])
            
            where_clause = " WHERE " + " AND ".join(where_conditions) if where_conditions else ""
            
            # Get total count
            count_query = f"""
                SELECT COUNT(*)
                {base_query}
                {where_clause}
            """
            cursor.execute(count_query, query_params)
            total_count = cursor.fetchone()['COUNT(*)']
            
            # Get paginated data
            data_query = f"""
                SELECT i.*, d.project_name as deal_title
                {base_query}
                {where_clause}
                ORDER BY {sort_by} {sort_order}
                LIMIT %s OFFSET %s
            """
            cursor.execute(data_query, query_params + [limit, offset])
            
        elif request.user_access['investor_id']:
            # Regular user linked to investor - can only see their own data
            where_conditions = ["i.id = %s", "i.parent_investor_id IS NULL"]  # Exclude duplicates
            query_params = [request.user_access['investor_id']]
            
            if starred_only:
                where_conditions.append("i.is_starred = TRUE")
            
            if search:
                search_condition = """(
                    i.investor_name LIKE %s OR 
                    i.mobile LIKE %s OR 
                    i.aadhar_card LIKE %s OR 
                    i.pan_card LIKE %s OR
                    i.email LIKE %s
                )"""
                where_conditions.append(search_condition)
                search_param = f"%{search}%"
                query_params.extend([search_param, search_param, search_param, search_param, search_param])
            
            where_clause = " WHERE " + " AND ".join(where_conditions)
            
            # Get count for user's own data
            count_query = f"""
                SELECT COUNT(*)
                FROM investors i
                LEFT JOIN deals d ON i.deal_id = d.id
                {where_clause}
            """
            cursor.execute(count_query, query_params)
            total_count = cursor.fetchone()['COUNT(*)']
            
            # Get paginated data for user's own data
            data_query = f"""
                SELECT i.*, d.project_name as deal_title
                FROM investors i
                LEFT JOIN deals d ON i.deal_id = d.id
                {where_clause}
                ORDER BY {sort_by} {sort_order}
                LIMIT %s OFFSET %s
            """
            cursor.execute(data_query, query_params + [limit, offset])
            
        else:
            # User linked to owner or no link - return empty result for investors
            return jsonify({
                'data': [],
                'pagination': {
                    'current_page': page,
                    'total_pages': 0,
                    'total': 0,
                    'per_page': limit
                }
            })
        
        investors = cursor.fetchall()
        
        # Format the data
        formatted_investors = []
        for investor in investors:
            formatted_investors.append({
                'id': investor['id'],
                'deal_id': investor['deal_id'],
                'deal_title': investor['deal_title'],
                'investor_name': investor['investor_name'],
                'investment_amount': float(investor['investment_amount']) if investor['investment_amount'] else 0,
                'investment_percentage': float(investor['investment_percentage']) if investor['investment_percentage'] else 0,
                'mobile': investor['mobile'],
                'email': investor['email'],
                'aadhar_card': investor['aadhar_card'],
                'pan_card': investor['pan_card'],
                'address': investor['address'],
                'is_starred': bool(investor.get('is_starred', False)),
                'created_at': investor['created_at'].isoformat() if investor['created_at'] else None
            })
        
        # Calculate pagination info
        total_pages = (total_count + limit - 1) // limit
        
        return jsonify({
            'data': formatted_investors,
            'pagination': {
                'current_page': page,
                'total_pages': total_pages,
                'total': total_count,
                'per_page': limit
            }
        })
    
    except Exception as e:
        print(f"Error in get_investors: {str(e)}")  # Add logging to see the actual error
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/investors/<int:investor_id>', methods=['GET'])
@token_required
def get_investor_details(current_user, investor_id):
    """Get detailed investor information including all their projects"""
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Get investor details
        cursor.execute("""
            SELECT DISTINCT i.id, i.investor_name, i.mobile, i.email, i.aadhar_card, i.pan_card
            FROM investors i
            WHERE i.id = %s
        """, (investor_id,))
        investor = cursor.fetchone()
        
        if not investor:
            return jsonify({'error': 'Investor not found'}), 404
        
        # Get all projects for this investor with deal-specific investment data
        # Each row in investors table represents a specific investor-deal relationship
        cursor.execute("""
            SELECT 
                d.id as deal_id,
                d.project_name,
                s.name as state,
                dist.name as district,
                d.taluka,
                d.village,
                d.total_area,
                d.area_unit,
                d.status,
                d.created_at,
                i.investment_amount as deal_investment_amount,
                i.investment_percentage as deal_investment_percentage,
                i.id as investor_record_id,
                i.deal_id as investor_deal_id
            FROM deals d
            INNER JOIN investors i ON d.id = i.deal_id
            LEFT JOIN states s ON d.state_id = s.id
            LEFT JOIN districts dist ON d.district_id = dist.id
            WHERE (i.id = %s OR i.parent_investor_id = %s OR 
                   (i.investor_name = %s 
                    AND (i.mobile = %s OR i.mobile IS NULL OR %s IS NULL)
                    AND (i.email = %s OR i.email IS NULL OR %s IS NULL)
                   ))
            ORDER BY d.created_at DESC
        """, (investor_id, investor_id, investor['investor_name'], investor['mobile'], investor['mobile'], investor['email'], investor['email']))
        projects = cursor.fetchall()
        
        print(f"[DEBUG] Found {len(projects)} deal-investor relationships for investor {investor_id}")
        for i, project in enumerate(projects):
            print(f"[DEBUG] Deal {i+1}: ID={project.get('deal_id')}, Name={project.get('project_name')}, Investment%={project.get('deal_investment_percentage')}, Amount={project.get('deal_investment_amount')}, InvestorRecordID={project.get('investor_record_id')}")
        
        # Convert datetime objects for projects
        for item in projects:
            if item:
                for key, value in item.items():
                    if isinstance(value, datetime):
                        item[key] = value.isoformat()
        
        return jsonify({
            'investor': investor,
            'projects': projects
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/investors', methods=['POST'])
@token_required
def create_investor(current_user):
    """Create a new investor"""
    try:
        data = request.get_json()
        print(f"DEBUG: Received data for investor creation: {data}")  # Debug log
        
        connection = get_db_connection()
        cursor = connection.cursor()
        
        # Helper function to convert empty strings to None
        def empty_to_none(value):
            return None if value == '' or value is None else value
            
        cursor.execute("""
            INSERT INTO investors (deal_id, investor_name, investment_amount, investment_percentage,
                                 mobile, email, aadhar_card, pan_card, address)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            data.get('deal_id'),
            data.get('investor_name'),
            0.00,  # investment_amount - default to 0 until set later
            0.00,  # investment_percentage - default to 0 until set later
            empty_to_none(data.get('mobile')),
            empty_to_none(data.get('email')),
            empty_to_none(data.get('aadhar_card')),
            empty_to_none(data.get('pan_card')),
            empty_to_none(data.get('address'))
        ))
        
        investor_id = cursor.lastrowid
        connection.commit()
        
        return jsonify({'message': 'Investor created successfully', 'investor_id': investor_id})
    
    except Exception as e:
        print(f"ERROR in create_investor: {str(e)}")  # Debug log
        import traceback
        traceback.print_exc()  # Print full traceback
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/investors/<int:investor_id>', methods=['PUT'])
@token_required
def update_investor(current_user, investor_id):
    """Update an existing investor"""
    try:
        data = request.get_json()
        
        connection = get_db_connection()
        cursor = connection.cursor()
        
        # Check if investor exists
        cursor.execute("SELECT id FROM investors WHERE id = %s", (investor_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Investor not found'}), 404
        
        # Build update query dynamically
        update_fields = []
        update_values = []
        
        updatable_fields = ['deal_id', 'investor_name', 'investment_amount', 'investment_percentage',
                           'mobile', 'email', 'aadhar_card', 'pan_card', 'address']
        
        for field in updatable_fields:
            if field in data:
                update_fields.append(f"{field} = %s")
                update_values.append(data[field])
        
        if not update_fields:
            return jsonify({'error': 'No fields to update'}), 400
        
        # If deal_id is being updated, check if the new deal exists
        if 'deal_id' in data:
            cursor.execute("SELECT id FROM deals WHERE id = %s", (data['deal_id'],))
            if not cursor.fetchone():
                return jsonify({'error': 'Deal not found'}), 404
        
        update_values.append(investor_id)
        query = f"UPDATE investors SET {', '.join(update_fields)} WHERE id = %s"
        
        cursor.execute(query, update_values)
        connection.commit()
        
        return jsonify({'message': 'Investor updated successfully'})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/investors/<int:investor_id>', methods=['DELETE'])
@token_required
def delete_investor(current_user, investor_id):
    """Delete an investor"""
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        
        # Check if investor exists
        cursor.execute("SELECT id FROM investors WHERE id = %s", (investor_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Investor not found'}), 404
        
        # Delete investor
        cursor.execute("DELETE FROM investors WHERE id = %s", (investor_id,))
        connection.commit()
        
        return jsonify({'message': 'Investor deleted successfully'})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/investors/<int:investor_id>/star', methods=['POST'])
@token_required
def star_investor(current_user, investor_id):
    """Star/unstar an investor (Gmail-style)"""
    try:
        data = request.get_json()
        is_starred = data.get('starred', True)
        
        connection = get_db_connection()
        cursor = connection.cursor()
        
        # Update the star status
        cursor.execute(
            "UPDATE investors SET is_starred = %s WHERE id = %s", 
            (is_starred, investor_id)
        )
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Investor not found'}), 404
        
        connection.commit()
        
        action = 'starred' if is_starred else 'unstarred'
        return jsonify({
            'message': f'Investor {action} successfully',
            'investor_id': investor_id,
            'starred': is_starred
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/investors/starred', methods=['GET'])
@token_required
def get_starred_investors(current_user):
    """Get all starred investors"""
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Query starred investors
        cursor.execute("""
            SELECT id, investor_name, mobile, email, investment_amount, 
                   investment_percentage, aadhar_card, pan_card, is_starred
            FROM investors 
            WHERE is_starred = TRUE AND parent_investor_id IS NULL
            ORDER BY investor_name ASC
        """)
        
        starred_investors = cursor.fetchall()
        
        return jsonify(starred_investors)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/investors/<int:investor_id>/documents', methods=['POST'])
@token_required
def upload_investor_document(current_user, investor_id):
    """Upload document for an investor"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        document_type = request.form.get('document_type')
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Get investor name for folder
        cursor.execute("SELECT investor_name FROM investors WHERE id = %s LIMIT 1", (investor_id,))
        investor = cursor.fetchone()
        if not investor:
            return jsonify({'error': 'Investor not found'}), 404
        
        investor_folder_name = f"investor_{investor_id}"
        
        # Create folder for the investor
        investor_folder = os.path.join(app.config['UPLOAD_FOLDER'], secure_filename(investor_folder_name))
        os.makedirs(investor_folder, exist_ok=True)
        
        filename = secure_filename(file.filename)
        filepath = os.path.join(investor_folder, filename)
        file.save(filepath)
        
        # Save to database - handle table not existing
        try:
            cursor = connection.cursor()
            cursor.execute("""
                INSERT INTO investor_documents (investor_id, document_type, document_name, 
                                              file_path, file_size, uploaded_by)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                investor_id,
                document_type,
                filename,
                os.path.relpath(filepath, app.config['UPLOAD_FOLDER']),
                os.path.getsize(filepath),
                current_user
            ))
            connection.commit()
        except mysql.connector.Error as e:
            # If investor_documents table doesn't exist, return a specific error
            return jsonify({'error': 'Document management not yet set up. Please contact administrator.'}), 503
        
        return jsonify({'message': 'Document uploaded successfully', 'filename': filename})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/investors/<int:investor_id>/documents', methods=['GET'])
@token_required
def get_investor_documents(current_user, investor_id):
    """Get all documents for an investor"""
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Check if investor exists and get their details
        cursor.execute("SELECT id, investor_name, mobile, email FROM investors WHERE id = %s LIMIT 1", (investor_id,))
        investor = cursor.fetchone()
        if not investor:
            return jsonify({'error': 'Investor not found'}), 404
        
        # Get documents - find all investor IDs with same person details, then get their documents
        try:
            # First get all investor IDs for this person
            cursor.execute("""
                SELECT DISTINCT i.id
                FROM investors i
                WHERE i.investor_name = %s 
                    AND (i.mobile = %s OR i.mobile IS NULL OR %s IS NULL)
                    AND (i.email = %s OR i.email IS NULL OR %s IS NULL)
            """, (investor['investor_name'], investor['mobile'], investor['mobile'], investor['email'], investor['email']))
            investor_ids = [row['id'] for row in cursor.fetchall()]
            
            documents = []
            if investor_ids:
                # Get documents for all investor IDs
                placeholders = ','.join(['%s'] * len(investor_ids))
                cursor.execute(f"""
                    SELECT id, document_type, document_name, file_path, file_size, 
                           created_at, uploaded_by
                    FROM investor_documents 
                    WHERE investor_id IN ({placeholders})
                    ORDER BY document_type, created_at DESC
                """, investor_ids)
                documents = cursor.fetchall()
            
            # Group documents by type
            grouped_docs = {}
            for doc in documents:
                doc_type = doc['document_type']
                if doc_type not in grouped_docs:
                    grouped_docs[doc_type] = []
                grouped_docs[doc_type].append({
                    'id': doc['id'],
                    'name': doc['document_name'],
                    'file_path': doc['file_path'],
                    'file_size': doc['file_size'],
                    'created_at': doc['created_at'].isoformat() if doc['created_at'] else None,
                    'uploaded_by': doc['uploaded_by']
                })
            
            return jsonify({
                'investor': investor,
                'documents': grouped_docs
            })
            
        except mysql.connector.Error as e:
            # If investor_documents table doesn't exist, return empty documents
            return jsonify({
                'investor': investor,
                'documents': {}
            })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

# ===== END INVESTORS ENDPOINTS =====

@app.route('/api/upload', methods=['POST'])
@token_required
def upload_file(current_user):
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        deal_id = request.form.get('deal_id')
        document_type = request.form.get('document_type')
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Get project_name for the deal
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT project_name FROM deals WHERE id = %s", (deal_id,))
        deal = cursor.fetchone()
        project_folder_name = f"deal_{deal_id}"

        # Create folder for the deal
        deal_folder = os.path.join(app.config['UPLOAD_FOLDER'], secure_filename(project_folder_name))
        os.makedirs(deal_folder, exist_ok=True)

        filename = secure_filename(file.filename)
        filepath = os.path.join(deal_folder, filename)
        file.save(filepath)

        # Save to database
        cursor = connection.cursor()
        cursor.execute("""
            INSERT INTO documents (deal_id, document_type, document_name, 
                                 file_path, file_size, uploaded_by)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            deal_id,
            document_type,
            filename,
            os.path.relpath(filepath, app.config['UPLOAD_FOLDER']),
            os.path.getsize(filepath),
            current_user
        ))
        
        connection.commit()
        
        return jsonify({'message': 'File uploaded successfully', 'filename': filename})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/uploads/<path:filename>')
def serve_file(filename):
    """Serve uploaded files with proper MIME types for browser viewing"""
    try:
        # resolve and ensure path is under the uploads directory to prevent traversal
        requested = os.path.normpath(filename)
        file_path = os.path.abspath(os.path.join(app.config['UPLOAD_FOLDER'], requested))
        uploads_root = os.path.abspath(app.config['UPLOAD_FOLDER'])
        if not file_path.startswith(uploads_root) or not os.path.exists(file_path):
            print(f"File not found or outside uploads: {file_path}")
            abort(404)
        
        # Get the directory and filename
        directory = os.path.dirname(file_path)
        file_name = os.path.basename(file_path)
        
        # Determine MIME type
        mime_type, _ = mimetypes.guess_type(file_path)
        
        # Enhanced MIME type detection for common file types
        file_extension = os.path.splitext(file_name)[1].lower()
        if mime_type is None:
            mime_type_mapping = {
                '.pdf': 'application/pdf',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.doc': 'application/msword',
                '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                '.txt': 'text/plain',
            }
            mime_type = mime_type_mapping.get(file_extension, 'application/octet-stream')
        
        print(f"Serving file: {filename}, MIME type: {mime_type}")
        
        # Create response with proper headers
        response = send_from_directory(
            directory, 
            file_name, 
            mimetype=mime_type,
            as_attachment=False
        )
        
        # Add headers for better browser compatibility
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        
        # For PDFs, ensure they open in browser
        if mime_type == 'application/pdf':
            response.headers['Content-Disposition'] = 'inline'
            response.headers['X-Content-Type-Options'] = 'nosniff'
        
        # For images, add appropriate headers
        elif mime_type.startswith('image/'):
            response.headers['Content-Disposition'] = 'inline'
        
        return response
            
    except Exception as e:
        print(f"Error serving file {filename}: {str(e)}")
        abort(404)

# Test route to verify backend is working
@app.route('/', methods=['GET'])
def home():
    return jsonify({
        'message': 'Land Deals Backend API is running!',
        'status': 'success',
        'endpoints': [
            '/api/login',
            '/api/deals',
            '/api/upload'
        ]
    })

@app.route('/api/test', methods=['GET'])
def test():
    return jsonify({'message': 'API is working correctly!'})

@app.route('/api/status', methods=['GET'])
def get_status():
    """Get comprehensive application and database status"""
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({
                'status': 'error',
                'database': 'disconnected',
                'message': 'Database connection failed'
            }), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Get database info
        cursor.execute("SELECT VERSION() as version")
        db_version = cursor.fetchone()['version']
        
        cursor.execute("SELECT DATABASE() as db_name")
        db_name = cursor.fetchone()['db_name']
        
        # Get table counts
        cursor.execute("SHOW TABLES")
        tables_result = cursor.fetchall()
        tables = [list(table.values())[0] for table in tables_result]
        
        table_counts = {}
        for table in tables:
            cursor.execute(f"SELECT COUNT(*) as count FROM `{table}`")
            table_counts[table] = cursor.fetchone()['count']
        
        return jsonify({
            'status': 'success',
            'database': {
                'connected': True,
                'host': DB_CONFIG['host'],
                'database': db_name,
                'version': db_version,
                'ssl_enabled': True
            },
            'tables': table_counts,
            'message': 'Application is running successfully with cloud database connection'
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'database': 'error',
            'message': f'Error: {str(e)}'
        }), 500
    finally:
        if 'connection' in locals() and connection:
            connection.close()

# Location API endpoints
@app.route('/api/locations/states', methods=['GET'])
def get_states():
    """Deprecated endpoint: states are now provided from the frontend static list.
    Return a 410 to indicate the endpoint is intentionally removed, but keep
    the route so existing clients don't break with a 404. Frontend uses
    local static data from `lib/locationAPI.js`.
    """
    return jsonify({'message': 'This endpoint is deprecated. Use local frontend data.'}), 410

@app.route('/api/locations/districts', methods=['GET'])
def get_districts():
    """Deprecated endpoint: district lookups are now handled via frontend inputs.
    Return a 410 to indicate the endpoint is intentionally removed but keep
    the route to avoid 404s for older clients.
    """
    return jsonify({'message': 'This endpoint is deprecated. Use frontend inputs.'}), 410

@app.route('/api/test-districts/<state_name>', methods=['GET'])
def test_districts_debug(state_name):
    """Debug endpoint to test district fetching for a specific state"""
    try:
        # Test postal API directly
        response = requests.get(f'https://api.postalpincode.in/postoffice/jaipur', timeout=5)
        if response.status_code == 200:
            postal_data = response.json()
            if postal_data and len(postal_data) > 0 and postal_data[0].get('Status') == 'Success':
                districts = set()
                for post_office in postal_data[0].get('PostOffice', []):
                    if post_office.get('District'):
                        districts.add(post_office['District'])
                
                return jsonify({
                    'state_requested': state_name,
                    'postal_api_working': True,
                    'districts_found': list(districts),
                    'count': len(districts)
                })
        
        return jsonify({
            'state_requested': state_name,
            'postal_api_working': False,
            'error': 'Postal API failed'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/api/add-sample-locations', methods=['POST'])
def add_sample_locations():
    """Add sample location data to existing deals for testing"""
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Get deals that don't have complete location data
        cursor.execute("SELECT id, state, district FROM deals LIMIT 10")
        deals = cursor.fetchall()
        
        if not deals:
            return jsonify({'message': 'No deals found in database'})
        
        # Sample location data from different states
        sample_locations = [
            {'state': 'Maharashtra', 'district': 'Pune'},
            {'state': 'Maharashtra', 'district': 'Mumbai'},
            {'state': 'Karnataka', 'district': 'Bangalore'},
            {'state': 'Tamil Nadu', 'district': 'Chennai'},
            {'state': 'Gujarat', 'district': 'Ahmedabad'},
            {'state': 'Maharashtra', 'district': 'Thane'},
            {'state': 'Karnataka', 'district': 'Mysore'},
            {'state': 'Tamil Nadu', 'district': 'Coimbatore'},
            {'state': 'Gujarat', 'district': 'Surat'},
            {'state': 'Maharashtra', 'district': 'Nashik'}
        ]
        
        updated_count = 0
        # Sample locations data no longer needed since we removed state/district
        # Location can still be manually entered as free text in other fields
        
        connection.commit()
        
        return jsonify({
            'message': f'Successfully added location data to {updated_count} deals',
            'updated_deals': updated_count,
            'deals_processed': len(deals)
        })
        
    except Exception as e:
        return jsonify({'error': f'Error adding sample locations: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/test-db', methods=['GET'])
def test_db():
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Check users count
        cursor.execute("SELECT COUNT(*) as user_count FROM users")
        user_result = cursor.fetchone()
        
        # Check deals count and if any have state data
        cursor.execute("SELECT COUNT(*) as deal_count FROM deals")
        deal_result = cursor.fetchone()
        
        cursor.execute("SELECT COUNT(*) as deals_with_state FROM deals WHERE state IS NOT NULL AND state != ''")
        state_result = cursor.fetchone()
        
        # Get sample states if any exist
        cursor.execute("SELECT DISTINCT state FROM deals WHERE state IS NOT NULL AND state != '' LIMIT 5")
        sample_states = cursor.fetchall()
        
        return jsonify({
            'message': 'Database connection successful!',
            'users_in_db': user_result['user_count'],
            'deals_in_db': deal_result['deal_count'],
            'deals_with_state': state_result['deals_with_state'],
            'sample_states': [s['state'] for s in sample_states]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        try:
            if connection:
                connection.close()
        except Exception:
            pass


@app.route('/api/admin/users', methods=['GET'])
@token_required
def admin_list_users(current_user):
    # only allow admin role
    try:
        if request.user.get('role') != 'admin':
            return jsonify({'error': 'Forbidden'}), 403
    except Exception:
        return jsonify({'error': 'Forbidden'}), 403

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT u.id, u.username, u.role, u.owner_id, u.investor_id,
                   o.name as linked_owner_name,
                   i.investor_name as linked_investor_name
            FROM users u
            LEFT JOIN owners o ON u.owner_id = o.id
            LEFT JOIN investors i ON u.investor_id = i.id
            ORDER BY u.id
        """)
        rows = cur.fetchall() or []
        return jsonify(rows)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()



@app.route('/api/admin/users', methods=['POST'])
@token_required
def admin_create_user(current_user):
    try:
        if request.user.get('role') != 'admin':
            return jsonify({'error': 'Forbidden'}), 403
    except Exception:
        return jsonify({'error': 'Forbidden'}), 403

    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')
    role = data.get('role', 'user')
    owner_id = data.get('owner_id') or None  # Convert empty string to None
    investor_id = data.get('investor_id') or None  # Convert empty string to None

    # sanitize role to known allowed values to avoid DB truncation or invalid enum values
    try:
        role = (role or 'user').strip().lower()
    except Exception:
        role = 'user'
    allowed_roles = {'user', 'admin', 'auditor'}
    if role not in allowed_roles:
        role = 'user'

    # Validate that user is linked to either owner or investor, but not both
    if owner_id and investor_id:
        return jsonify({'error': 'User cannot be linked to both owner and investor'}), 400
    
    # For regular users, they must be linked to either an owner or investor
    # Admin and auditor users can exist without being linked to anyone
    if role == 'user' and not owner_id and not investor_id:
        return jsonify({'error': 'Regular users must be linked to an owner or investor'}), 400

    if not username or not password:
        return jsonify({'error': 'username and password required'}), 400

    # hash password
    try:
        hashed = generate_password_hash(password)
    except Exception:
        hashed = password

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('INSERT INTO users (username, password, role, full_name, owner_id, investor_id) VALUES (%s, %s, %s, %s, %s, %s)', 
                   (username, hashed, role, username, owner_id, investor_id))
        conn.commit()
        return jsonify({'message': 'user created'}), 201
    except mysql.connector.IntegrityError as e:
        # duplicate username
        return jsonify({'error': 'username already exists'}), 400
    except mysql.connector.DataError as e:
        # catch truncation / data errors and return helpful message
        return jsonify({'error': 'Invalid input: data too long or malformed'}), 400
    except Exception as e:
        # MySQL sometimes reports truncation as general errors — attempt to surface clearer message
        msg = str(e)
        if 'Data truncated for column' in msg or '1265' in msg:
            return jsonify({'error': 'Invalid input: role or other field truncated'}), 400
        return jsonify({'error': msg}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/admin/users/<int:user_id>', methods=['PUT'])
@token_required
def admin_update_user(current_user, user_id):
    try:
        if request.user.get('role') != 'admin':
            return jsonify({'error': 'Forbidden'}), 403
    except Exception:
        return jsonify({'error': 'Forbidden'}), 403

    data = request.get_json() or {}
    role = data.get('role')
    owner_id = data.get('owner_id')
    investor_id = data.get('investor_id')
    password = data.get('password')

    # Validate that user is linked to either owner or investor, but not both
    if owner_id and investor_id:
        return jsonify({'error': 'User cannot be linked to both owner and investor'}), 400

    updates = []
    params = []
    if role is not None:
        # sanitize incoming role
        try:
            r = (role or '').strip().lower()
        except Exception:
            r = 'user'
        if r not in {'user', 'admin', 'auditor'}:
            r = 'user'
        updates.append('role = %s')
        params.append(r)
    if owner_id is not None:
        updates.append('owner_id = %s')
        params.append(owner_id if owner_id else None)
    if investor_id is not None:
        updates.append('investor_id = %s')
        params.append(investor_id if investor_id else None)
    if password is not None:
        try:
            hashed = generate_password_hash(password)
        except Exception:
            hashed = password
        updates.append('password = %s')
        params.append(hashed)

    if not updates:
        return jsonify({'error': 'nothing to update'}), 400

    params.append(user_id)
    sql = 'UPDATE users SET ' + ', '.join(updates) + ' WHERE id = %s'

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(sql, tuple(params))
        conn.commit()
        return jsonify({'message': 'user updated'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@token_required
def admin_delete_user(current_user, user_id):
    try:
        if request.user.get('role') != 'admin':
            return jsonify({'error': 'Forbidden'}), 403
    except Exception:
        return jsonify({'error': 'Forbidden'}), 403

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('DELETE FROM users WHERE id = %s', (user_id,))
        conn.commit()
        return jsonify({'message': 'user deleted'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


# ============================================================================
# STRUCTURED DOCUMENT MANAGEMENT ENDPOINTS
# ============================================================================

@app.route('/api/deals/<int:deal_id>/land-documents', methods=['POST'])
@token_required
def upload_land_document(current_user, deal_id):
    """Upload land document with structured folder organization"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        document_type = request.form.get('document_type')
        
        if not document_type:
            return jsonify({'error': 'Document type is required'}), 400
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Verify deal exists
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
            
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT id FROM deals WHERE id = %s", (deal_id,))
        if not cursor.fetchone():
            connection.close()
            return jsonify({'error': 'Deal not found'}), 404
        
        # Use document manager
        doc_manager = get_document_manager(app.config['UPLOAD_FOLDER'])
        result = doc_manager.save_document(
            file=file,
            category='land',
            deal_id=deal_id,
            document_type=document_type,
            uploaded_by=current_user
        )
        
        if 'error' in result:
            connection.close()
            return jsonify({'error': result['error']}), 400
        
        # Save to database with structured path
        try:
            cursor.execute("""
                INSERT INTO documents (deal_id, document_type, document_name, file_path, file_size, uploaded_by)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                deal_id,
                document_type,
                result['filename'],
                result['web_path'],
                result['file_size'],
                current_user
            ))
            connection.commit()
        except Exception as db_error:
            connection.rollback()
            connection.close()
            return jsonify({'error': f'Database error: {str(db_error)}'}), 500
        
        return jsonify({
            'message': 'Land document uploaded successfully',
            'filename': result['filename'],
            'document_type': document_type,
            'file_url': doc_manager.get_document_url(result['web_path'])
        })
        
    except Exception as e:
        print(f"Error uploading land document: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500
    finally:
        if 'connection' in locals() and connection:
            connection.close()

@app.route('/api/deals/<int:deal_id>/owners/<int:owner_id>/documents', methods=['POST'])
@token_required
def upload_owner_document_structured(current_user, deal_id, owner_id):
    """Upload owner document with structured folder organization"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        document_type = request.form.get('document_type')
        
        if not document_type:
            return jsonify({'error': 'Document type is required'}), 400
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Verify deal and owner exist
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
            
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("SELECT id FROM deals WHERE id = %s", (deal_id,))
        if not cursor.fetchone():
            connection.close()
            return jsonify({'error': 'Deal not found'}), 404
            
        cursor.execute("SELECT id FROM owners WHERE id = %s AND deal_id = %s", (owner_id, deal_id))
        if not cursor.fetchone():
            connection.close()
            return jsonify({'error': 'Owner not found'}), 404
        
        # Use document manager
        doc_manager = get_document_manager(app.config['UPLOAD_FOLDER'])
        result = doc_manager.save_document(
            file=file,
            category='owner',
            deal_id=deal_id,
            document_type=document_type,
            person_id=owner_id,
            uploaded_by=current_user
        )
        
        if 'error' in result:
            connection.close()
            return jsonify({'error': result['error']}), 400
        
        # Save to database with structured path and owner reference
        try:
            cursor.execute("""
                INSERT INTO documents (deal_id, document_type, document_name, file_path, file_size, uploaded_by, owner_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                deal_id,
                f"owner_{owner_id}_{document_type}",  # Include owner ID in document type
                result['filename'],
                result['web_path'],
                result['file_size'],
                current_user,
                owner_id
            ))
            connection.commit()
        except Exception as db_error:
            connection.rollback()
            connection.close()
            return jsonify({'error': f'Database error: {str(db_error)}'}), 500
        
        return jsonify({
            'message': 'Owner document uploaded successfully',
            'filename': result['filename'],
            'document_type': document_type,
            'owner_id': owner_id,
            'file_url': doc_manager.get_document_url(result['web_path'])
        })
        
    except Exception as e:
        print(f"Error uploading owner document: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500
    finally:
        if 'connection' in locals() and connection:
            connection.close()

@app.route('/api/deals/<int:deal_id>/investors/<int:investor_id>/documents', methods=['POST'])
@token_required
def upload_investor_document_structured(current_user, deal_id, investor_id):
    """Upload investor document with structured folder organization"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        document_type = request.form.get('document_type')
        
        if not document_type:
            return jsonify({'error': 'Document type is required'}), 400
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Verify deal and investor exist
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
            
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("SELECT id FROM deals WHERE id = %s", (deal_id,))
        if not cursor.fetchone():
            connection.close()
            return jsonify({'error': 'Deal not found'}), 404
            
        cursor.execute("SELECT id FROM investors WHERE id = %s AND deal_id = %s", (investor_id, deal_id))
        if not cursor.fetchone():
            connection.close()
            return jsonify({'error': 'Investor not found'}), 404
        
        # Use document manager
        doc_manager = get_document_manager(app.config['UPLOAD_FOLDER'])
        result = doc_manager.save_document(
            file=file,
            category='investor',
            deal_id=deal_id,
            document_type=document_type,
            person_id=investor_id,
            uploaded_by=current_user
        )
        
        if 'error' in result:
            connection.close()
            return jsonify({'error': result['error']}), 400
        
        # Save to database with structured path and investor reference
        try:
            cursor.execute("""
                INSERT INTO documents (deal_id, document_type, document_name, file_path, file_size, uploaded_by, investor_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                deal_id,
                f"investor_{investor_id}_{document_type}",  # Include investor ID in document type
                result['filename'],
                result['web_path'],
                result['file_size'],
                current_user,
                investor_id
            ))
            connection.commit()
        except Exception as db_error:
            connection.rollback()
            connection.close()
            return jsonify({'error': f'Database error: {str(db_error)}'}), 500
        
        return jsonify({
            'message': 'Investor document uploaded successfully',
            'filename': result['filename'],
            'document_type': document_type,
            'investor_id': investor_id,
            'file_url': doc_manager.get_document_url(result['web_path'])
        })
        
    except Exception as e:
        print(f"Error uploading investor document: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500
    finally:
        if 'connection' in locals() and connection:
            connection.close()

@app.route('/api/deals/<int:deal_id>/documents/structure', methods=['GET'])
@token_required
def get_deal_documents_structured(current_user, deal_id):
    """Get all documents for a deal in structured format"""
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Verify deal exists
        cursor.execute("SELECT id FROM deals WHERE id = %s", (deal_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Deal not found'}), 404
        
        # Get all documents for this deal
        cursor.execute("""
            SELECT d.*, o.name as owner_name, i.investor_name
            FROM documents d
            LEFT JOIN owners o ON d.owner_id = o.id
            LEFT JOIN investors i ON d.investor_id = i.id
            WHERE d.deal_id = %s
            ORDER BY d.uploaded_at DESC
        """, (deal_id,))
        
        documents = cursor.fetchall()
        
        # Structure the response
        structured_docs = {
            'land_documents': [],
            'owner_documents': {},
            'investor_documents': {},
            'total_count': len(documents)
        }
        
        doc_manager = get_document_manager(app.config['UPLOAD_FOLDER'])
        
        for doc in documents:
            doc_info = {
                'id': doc['id'],
                'document_name': doc['document_name'],
                'document_type': doc['document_type'],
                'file_size': doc['file_size'],
                'uploaded_by': doc['uploaded_by'],
                'uploaded_at': doc['uploaded_at'].isoformat() if doc['uploaded_at'] else None,
                'file_url': doc_manager.get_document_url(doc['file_path']) if doc['file_path'] else None
            }
            
            # Categorize documents
            if doc['owner_id']:
                owner_id = doc['owner_id']
                if owner_id not in structured_docs['owner_documents']:
                    structured_docs['owner_documents'][owner_id] = {
                        'owner_name': doc['owner_name'],
                        'documents': []
                    }
                structured_docs['owner_documents'][owner_id]['documents'].append(doc_info)
                
            elif doc['investor_id']:
                investor_id = doc['investor_id']
                if investor_id not in structured_docs['investor_documents']:
                    structured_docs['investor_documents'][investor_id] = {
                        'investor_name': doc['investor_name'],
                        'documents': []
                    }
                structured_docs['investor_documents'][investor_id]['documents'].append(doc_info)
                
            else:
                # Land document
                structured_docs['land_documents'].append(doc_info)
        
        return jsonify(structured_docs)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/document-types', methods=['GET'])
@token_required  
def get_document_types(current_user):
    """Get all available document types for each category"""
    doc_manager = get_document_manager(app.config['UPLOAD_FOLDER'])
    
    return jsonify({
        'land_document_types': doc_manager.document_types['land'],
        'owner_document_types': doc_manager.document_types['owner'],
        'investor_document_types': doc_manager.document_types['investor']
    })

# ===== DOCUMENT DELETE ENDPOINTS =====

@app.route('/api/deals/<int:deal_id>/land-documents/<int:document_id>', methods=['DELETE'])
@token_required
def delete_land_document(current_user, deal_id, document_id):
    """Delete a land document"""
    connection = None
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Get document info first
        cursor.execute("""
            SELECT id, file_path, document_name 
            FROM documents 
            WHERE id = %s AND deal_id = %s AND owner_id IS NULL AND investor_id IS NULL
        """, (document_id, deal_id))
        
        document = cursor.fetchone()
        if not document:
            return jsonify({'error': 'Land document not found'}), 404
        
        # Delete file from filesystem
        doc_manager = get_document_manager(app.config['UPLOAD_FOLDER'])
        if document['file_path']:
            doc_manager.delete_document(document['file_path'])
        
        # Delete from database
        cursor.execute("DELETE FROM documents WHERE id = %s", (document_id,))
        connection.commit()
        
        return jsonify({
            'success': True,
            'message': f"Land document '{document['document_name']}' deleted successfully"
        })
        
    except mysql.connector.Error as e:
        if connection:
            connection.rollback()
        app.logger.error(f"Database error deleting land document: {e}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        if connection:
            connection.rollback()
        app.logger.error(f"Error deleting land document: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/deals/<int:deal_id>/owners/<int:owner_id>/documents/<int:document_id>', methods=['DELETE'])
@token_required
def delete_owner_document(current_user, deal_id, owner_id, document_id):
    """Delete an owner document"""
    connection = None
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Get document info first
        cursor.execute("""
            SELECT id, file_path, document_name 
            FROM documents 
            WHERE id = %s AND deal_id = %s AND owner_id = %s
        """, (document_id, deal_id, owner_id))
        
        document = cursor.fetchone()
        if not document:
            return jsonify({'error': 'Owner document not found'}), 404
        
        # Delete file from filesystem
        doc_manager = get_document_manager(app.config['UPLOAD_FOLDER'])
        if document['file_path']:
            doc_manager.delete_document(document['file_path'])
        
        # Delete from database
        cursor.execute("DELETE FROM documents WHERE id = %s", (document_id,))
        connection.commit()
        
        return jsonify({
            'success': True,
            'message': f"Owner document '{document['document_name']}' deleted successfully"
        })
        
    except mysql.connector.Error as e:
        if connection:
            connection.rollback()
        app.logger.error(f"Database error deleting owner document: {e}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        if connection:
            connection.rollback()
        app.logger.error(f"Error deleting owner document: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/deals/<int:deal_id>/investors/<int:investor_id>/documents/<int:document_id>', methods=['DELETE'])
@token_required
def delete_investor_document(current_user, deal_id, investor_id, document_id):
    """Delete an investor document"""
    connection = None
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Get document info first
        cursor.execute("""
            SELECT id, file_path, document_name 
            FROM documents 
            WHERE id = %s AND deal_id = %s AND investor_id = %s
        """, (document_id, deal_id, investor_id))
        
        document = cursor.fetchone()
        if not document:
            return jsonify({'error': 'Investor document not found'}), 404
        
        # Delete file from filesystem
        doc_manager = get_document_manager(app.config['UPLOAD_FOLDER'])
        if document['file_path']:
            doc_manager.delete_document(document['file_path'])
        
        # Delete from database
        cursor.execute("DELETE FROM documents WHERE id = %s", (document_id,))
        connection.commit()
        
        return jsonify({
            'success': True,
            'message': f"Investor document '{document['document_name']}' deleted successfully"
        })
        
    except mysql.connector.Error as e:
        if connection:
            connection.rollback()
        app.logger.error(f"Database error deleting investor document: {e}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        if connection:
            connection.rollback()
        app.logger.error(f"Error deleting investor document: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

# ===== LAND SELLING FEATURES =====

# Audit logging utility
def log_activity(user_id, action, entity_type, entity_id, entity_name=None, changes=None, request_obj=None):
    """Log user activity for audit trail"""
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

@app.route('/api/test/add-selling-columns', methods=['POST'])
def add_selling_columns():
    """Add missing selling columns to deals table"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Add selling columns one by one with error handling
        columns_to_add = [
            "ALTER TABLE deals ADD COLUMN asking_price DECIMAL(15, 2) NULL",
            "ALTER TABLE deals ADD COLUMN listing_date DATE NULL",
            "ALTER TABLE deals ADD COLUMN sold_date DATE NULL", 
            "ALTER TABLE deals ADD COLUMN sold_price DECIMAL(15, 2) NULL",
            "ALTER TABLE deals ADD COLUMN latitude DECIMAL(10, 8) NULL",
            "ALTER TABLE deals ADD COLUMN longitude DECIMAL(11, 8) NULL"
        ]
        
        results = []
        for sql in columns_to_add:
            try:
                cursor.execute(sql)
                results.append(f"Success: {sql}")
            except Exception as e:
                results.append(f"Error: {sql} - {str(e)}")
        
        conn.commit()
        
        return jsonify({
            'message': 'Column addition attempted',
            'results': results
        }), 200
        
    except Exception as e:
        print(f"Error adding columns: {e}")
        return jsonify({'error': 'Failed to add columns', 'details': str(e)}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/test/selling-data', methods=['GET'])
def test_selling_data():
    """Test selling data without authentication"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get deals that are marked for sale or sold - simplified query without offers table
        cursor.execute("""
            SELECT d.*
            FROM deals d
            WHERE d.asking_price IS NOT NULL 
               OR d.listing_date IS NOT NULL
               OR d.sold_date IS NOT NULL
            ORDER BY d.listing_date DESC, d.created_at DESC
            LIMIT 10
        """)
        
        deals = cursor.fetchall() or []
        
        # Format the deals data
        formatted_deals = []
        for deal in deals:
            deal_data = {
                'id': deal.get('id'),
                'project_name': deal.get('project_name'),
                'location': deal.get('location'),
                'status': deal.get('status'),
                'asking_price': float(deal.get('asking_price')) if deal.get('asking_price') else None,
                'listing_date': deal.get('listing_date').isoformat() if deal.get('listing_date') else None,
                'sold_date': deal.get('sold_date').isoformat() if deal.get('sold_date') else None,
                'offer_count': 0,  # Default to 0 for now
                'created_at': deal.get('created_at').isoformat() if deal.get('created_at') else None
            }
            formatted_deals.append(deal_data)
        
        return jsonify({
            'deals': formatted_deals,
            'count': len(formatted_deals),
            'message': 'Success'
        }), 200
        
    except Exception as e:
        print(f"Error in test_selling_data: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Failed to fetch selling deals', 'details': str(e)}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/test/table-structure', methods=['GET'])
def check_table_structure():
    """Check the deals table structure"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Check the table structure
        cursor.execute('DESCRIBE deals')
        columns = cursor.fetchall()
        
        # Get a sample deal
        cursor.execute('SELECT * FROM deals LIMIT 1')
        sample_deal = cursor.fetchone()
        
        return jsonify({
            'columns': [col['Field'] for col in columns],
            'sample_deal_keys': list(sample_deal.keys()) if sample_deal else [],
            'sample_deal': sample_deal
        }), 200
        
    except Exception as e:
        print(f"Error checking table structure: {e}")
        return jsonify({'error': 'Failed to check table structure', 'details': str(e)}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/test/setup-selling-data', methods=['POST'])
def setup_selling_data():
    """Setup some test selling data"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # First check the table structure
        cursor.execute('DESCRIBE deals')
        columns = cursor.fetchall()
        print("Deals table columns:", [col['Field'] for col in columns])
        
        # Get first few deals
        cursor.execute('SELECT id FROM deals ORDER BY id LIMIT 3')
        deals = cursor.fetchall()
        
        if not deals:
            return jsonify({'error': 'No deals found in database'}), 404
        
        # Update first deal with selling data
        cursor.execute('''
            UPDATE deals 
            SET asking_price = 500000, 
                listing_date = NOW(),
                latitude = 19.0760,
                longitude = 72.8777,
                status = 'For Sale'
            WHERE id = %s
        ''', (deals[0]['id'],))
        
        # Update second deal if exists
        if len(deals) > 1:
            cursor.execute('''
                UPDATE deals 
                SET asking_price = 750000, 
                    listing_date = NOW(),
                    status = 'For Sale',
                    latitude = 18.5204,
                    longitude = 73.8567
                WHERE id = %s
            ''', (deals[1]['id'],))
        
        # Update third deal as sold if exists
        if len(deals) > 2:
            cursor.execute('''
                UPDATE deals 
                SET asking_price = 600000, 
                    listing_date = DATE_SUB(NOW(), INTERVAL 30 DAY),
                    sold_date = DATE_SUB(NOW(), INTERVAL 5 DAY),
                    sold_price = 580000,
                    status = 'Sold',
                    latitude = 20.0000,
                    longitude = 73.0000
                WHERE id = %s
            ''', (deals[2]['id'],))
        
        conn.commit()
        
        return jsonify({
            'message': 'Test selling data created successfully',
            'updated_deals': len(deals)
        }), 200
        
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error setting up selling data: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Failed to setup selling data', 'details': str(e)}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/deals/<int:deal_id>/offers', methods=['GET'])
@token_required
def get_deal_offers(current_user, deal_id):
    """Get all offers for a specific deal"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT o.*, u.username as created_by_name
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

@app.route('/api/deals/<int:deal_id>/logs', methods=['GET'])
@token_required
def get_deal_logs(current_user, deal_id):
    """Get audit logs for a specific deal"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT al.*, u.username as user_name
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

# ===== END LAND SELLING FEATURES =====

# Payment Reminders Endpoints
@app.route('/api/deals/<int:deal_id>/payment-reminders', methods=['GET'])
@token_required
def get_payment_reminders(current_user, deal_id):
    """Get payment reminders for all payments in a deal"""
    conn = None
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
            
        cursor = conn.cursor(dictionary=True)
        
        # Get payment reminders for all payments in this deal
        cursor.execute("""
            SELECT pr.*, p.amount as payment_amount, p.payment_date, p.reference
            FROM payment_reminders pr
            JOIN payments p ON pr.payment_id = p.id
            WHERE p.deal_id = %s 
            ORDER BY pr.reminder_date ASC
        """, (deal_id,))
        
        reminders = cursor.fetchall() or []
        
        # Convert dates to ISO format
        for reminder in reminders:
            for date_field in ['reminder_date', 'sent_at', 'created_at', 'payment_date']:
                if reminder.get(date_field) and isinstance(reminder[date_field], datetime):
                    reminder[date_field] = reminder[date_field].isoformat()
                elif reminder.get(date_field):
                    reminder[date_field] = str(reminder[date_field])
            
            # Convert payment amount to float
            if reminder.get('payment_amount'):
                reminder['payment_amount'] = float(reminder['payment_amount'])
        
        return jsonify(reminders), 200
        
    except mysql.connector.Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/deals/<int:deal_id>/payment-reminders', methods=['POST'])
@token_required
def create_payment_reminder(current_user, deal_id):
    conn = None
    try:
        data = request.get_json()
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
            
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO payment_reminders 
            (deal_id, description, due_date, reminder_date, amount, priority, notes, status, created_by) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'pending', %s)
        """, (
            deal_id,
            data.get('description'),
            data.get('due_date'),
            data.get('reminder_date'), 
            data.get('amount'),
            data.get('priority', 'medium'),
            data.get('notes'),
            current_user
        ))
        
        reminder_id = cursor.lastrowid
        conn.commit()
        cursor.close()
        
        # Log the activity
        log_activity(
            current_user,
            'CREATE',
            'payment_reminder',
            reminder_id,
            data.get('description', f'Payment Reminder #{reminder_id}'),
            None,
            request.remote_addr
        )
        
        return jsonify({'message': 'Payment reminder created successfully', 'id': reminder_id}), 201
        
    except Exception as e:
        print(f"Error creating payment reminder: {e}")
        return jsonify({'error': 'Failed to create payment reminder'}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/payment-reminders/<int:reminder_id>/status', methods=['PUT'])
@token_required
def update_payment_reminder_status(current_user, reminder_id):
    conn = None
    try:
        data = request.get_json()
        new_status = data.get('status')
        
        if new_status not in ['pending', 'completed', 'overdue']:
            return jsonify({'error': 'Invalid status'}), 400
            
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
            
        cursor = conn.cursor()
        
        # Get current reminder for logging
        cursor.execute("SELECT status, description FROM payment_reminders WHERE id = %s", (reminder_id,))
        current_reminder = cursor.fetchone()
        if not current_reminder:
            return jsonify({'error': 'Payment reminder not found'}), 404
            
        old_status = current_reminder[0]
        description = current_reminder[1]
        
        cursor.execute("""
            UPDATE payment_reminders 
            SET status = %s, updated_at = NOW() 
            WHERE id = %s
        """, (new_status, reminder_id))
        
        conn.commit()
        cursor.close()
        
        # Log the activity
        log_activity(
            current_user,
            'UPDATE',
            'payment_reminder',
            reminder_id,
            description,
            {'status': {'old': old_status, 'new': new_status}},
            request.remote_addr
        )
        
        return jsonify({'message': 'Payment reminder status updated successfully'}), 200
        
    except Exception as e:
        print(f"Error updating payment reminder status: {e}")
        return jsonify({'error': 'Failed to update payment reminder status'}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/payment-reminders/<int:reminder_id>', methods=['DELETE'])
@token_required
def delete_payment_reminder(current_user, reminder_id):
    conn = None
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
            
        cursor = conn.cursor()
        
        # Get reminder details for logging
        cursor.execute("SELECT description FROM payment_reminders WHERE id = %s", (reminder_id,))
        reminder = cursor.fetchone()
        if not reminder:
            return jsonify({'error': 'Payment reminder not found'}), 404
            
        description = reminder[0]
        
        cursor.execute("DELETE FROM payment_reminders WHERE id = %s", (reminder_id,))
        conn.commit()
        cursor.close()
        
        # Log the activity
        log_activity(
            current_user,
            'DELETE',
            'payment_reminder',
            reminder_id,
            description,
            None,
            request.remote_addr
        )
        
        return jsonify({'message': 'Payment reminder deleted successfully'}), 200
        
    except Exception as e:
        print(f"Error deleting payment reminder: {e}")
        return jsonify({'error': 'Failed to delete payment reminder'}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/deals/<int:deal_id>/owners/percentage-shares', methods=['PUT'])
@token_required
def update_owner_percentage_shares(current_user, deal_id):
    """Update percentage shares for owners of a deal"""
    try:
        data = request.get_json()
        owner_shares = data.get('owner_shares', [])
        
        # Validate that owner_shares is a list
        if not isinstance(owner_shares, list):
            return jsonify({'error': 'owner_shares must be a list'}), 400
        
        # Validate total percentage equals 100%
        total_percentage = sum(float(share.get('percentage_share', 0)) for share in owner_shares)
        if abs(total_percentage - 100.0) > 0.01:  # Allow small floating point differences
            return jsonify({'error': f'Total percentage must equal 100%. Current total: {total_percentage}%'}), 400
        
        # Validate each owner share
        for share in owner_shares:
            if 'owner_id' not in share or 'percentage_share' not in share:
                return jsonify({'error': 'Each owner share must have owner_id and percentage_share'}), 400
            
            try:
                percentage = float(share['percentage_share'])
                if percentage < 0 or percentage > 100:
                    return jsonify({'error': 'Percentage share must be between 0 and 100'}), 400
            except (ValueError, TypeError):
                return jsonify({'error': 'Invalid percentage_share value'}), 400
        
        # Get database connection
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Check if deal exists and user has permission
        cursor.execute("SELECT id FROM deals WHERE id = %s", (deal_id,))
        deal = cursor.fetchone()
        if not deal:
            return jsonify({'error': 'Deal not found'}), 404
        
        # Update each owner's percentage share
        for share in owner_shares:
            owner_id = share['owner_id']
            percentage_share = float(share['percentage_share'])
            
            # Verify owner belongs to this deal
            cursor.execute("SELECT id FROM owners WHERE id = %s AND deal_id = %s", (owner_id, deal_id))
            owner = cursor.fetchone()
            if not owner:
                return jsonify({'error': f'Owner {owner_id} not found for deal {deal_id}'}), 400
            
            # Update the percentage share
            cursor.execute(
                "UPDATE owners SET percentage_share = %s WHERE id = %s AND deal_id = %s",
                (percentage_share, owner_id, deal_id)
            )
        
        conn.commit()
        
        # Return updated owners data
        cursor.execute("SELECT * FROM owners WHERE deal_id = %s ORDER BY id", (deal_id,))
        updated_owners = cursor.fetchall()
        
        return jsonify({
            'message': 'Owner percentage shares updated successfully',
            'owners': updated_owners
        }), 200
        
    except Exception as e:
        print(f"Error updating owner percentage shares: {e}")
        return jsonify({'error': 'Failed to update owner percentage shares'}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/test-db', methods=['GET'])
def test_db_connection():
    """Test database connection"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
            
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT 1 as test")
        result = cursor.fetchone()
        
        # Also test investors table
        cursor.execute("SELECT COUNT(*) as count FROM investors")
        investor_count = cursor.fetchone()
        
        return jsonify({
            'status': 'Database connection successful',
            'test_query': result,
            'investor_count': investor_count
        }), 200
        
    except Exception as e:
        return jsonify({
            'error': f'Database test failed: {str(e)}',
            'type': str(type(e))
        }), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/test-investors-simple/<int:deal_id>', methods=['GET'])
def test_investors_simple(deal_id):
    """Test endpoint for available investors without authentication"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
            
        cursor = conn.cursor(dictionary=True)
        
        # Simple query to check basic functionality
        cursor.execute("SELECT COUNT(*) as total FROM investors WHERE deal_id != %s", (deal_id,))
        count_result = cursor.fetchone()
        
        cursor.execute("SELECT id, investor_name, deal_id FROM investors WHERE deal_id != %s LIMIT 5", (deal_id,))
        sample_investors = cursor.fetchall()
        
        return jsonify({
            'status': 'success',
            'deal_id': deal_id,
            'total_other_investors': count_result['total'],
            'sample_investors': sample_investors
        }), 200
        
    except Exception as e:
        return jsonify({
            'error': f'Test failed: {str(e)}',
            'type': str(type(e))
        }), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/investors/available/<int:deal_id>', methods=['GET'])
@token_required
def get_available_investors(current_user, deal_id):
    """Get investors that are not already part of the specified deal"""
    try:
        print(f"DEBUG: Getting available investors for deal {deal_id}")
        conn = get_db_connection()
        if not conn:
            print("DEBUG: Failed to get database connection")
            return jsonify({'error': 'Database connection failed'}), 500
            
        cursor = conn.cursor(dictionary=True)
        
        # Check if deal exists
        cursor.execute("SELECT id FROM deals WHERE id = %s", (deal_id,))
        if not cursor.fetchone():
            print(f"DEBUG: Deal {deal_id} not found")
            return jsonify({'error': 'Deal not found'}), 404
        
        print(f"DEBUG: Deal {deal_id} found, getting available investors")
        # Get all investors from other deals (simplified approach)
        query = """
            SELECT DISTINCT i1.id, i1.investor_name, i1.mobile, i1.email, 
                   i1.aadhar_card, i1.pan_card, i1.address, i1.bank_name, 
                   i1.account_number, i1.created_at
            FROM investors i1
            WHERE i1.deal_id != %s 
            AND i1.investor_name IS NOT NULL
            AND i1.investor_name != ''
            AND i1.parent_investor_id IS NULL
            ORDER BY i1.investor_name
        """
        
        print(f"DEBUG: Executing simplified query with deal_id={deal_id}")
        cursor.execute(query, (deal_id,))
        available_investors = cursor.fetchall()
        print(f"DEBUG: Found {len(available_investors)} available investors")
        
        # Filter out duplicates based on name and contact info on the backend
        seen_investors = set()
        unique_investors = []
        
        # Get current deal investors for comparison
        cursor.execute("SELECT investor_name, mobile, email FROM investors WHERE deal_id = %s", (deal_id,))
        current_investors = cursor.fetchall()
        current_names = set()
        current_contacts = set()
        
        for current in current_investors:
            if current['investor_name']:
                current_names.add(current['investor_name'].lower().strip())
            if current['mobile']:
                current_contacts.add(current['mobile'].strip())
            if current['email']:
                current_contacts.add(current['email'].lower().strip())
        
        print(f"DEBUG: Current deal has {len(current_names)} investor names and {len(current_contacts)} contacts")
        
        for investor in available_investors:
            name = investor['investor_name']
            if not name:
                continue
                
            name_key = name.lower().strip()
            mobile = investor['mobile'] or ''
            email = investor['email'] or ''
            
            # Skip if already in current deal
            if name_key in current_names:
                continue
            if mobile.strip() in current_contacts:
                continue
            if email.lower().strip() in current_contacts:
                continue
                
            # Skip if we've already seen this investor
            investor_key = (name_key, mobile.strip(), email.lower().strip())
            if investor_key in seen_investors:
                continue
                
            seen_investors.add(investor_key)
            unique_investors.append(investor)
        
        print(f"DEBUG: After filtering, found {len(unique_investors)} unique available investors")
        
        # Format the data
        formatted_investors = []
        for investor in unique_investors:
            formatted_investors.append({
                'id': investor['id'],
                'investor_name': investor['investor_name'],
                'mobile': investor['mobile'],
                'email': investor['email'],
                'aadhar_card': investor['aadhar_card'],
                'pan_card': investor['pan_card'],
                'address': investor['address'],
                'bank_name': investor['bank_name'],
                'account_number': investor['account_number'],
                'created_at': investor['created_at'].isoformat() if investor['created_at'] else None
            })
        
        print(f"DEBUG: Returning {len(formatted_investors)} formatted investors")
        return jsonify(formatted_investors), 200
        
    except Exception as e:
        print(f"ERROR getting available investors: {e}")
        print(f"ERROR type: {type(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Failed to get available investors'}), 500
    finally:
        if conn:
            conn.close()

# ============================================================================
# PERFORMANCE OPTIMIZATION ENDPOINTS - Fast direct lookups
# ============================================================================

@app.route('/api/owners/<int:owner_id>/direct', methods=['GET'])
def get_owner_direct(owner_id):
    """Fast owner lookup - avoids searching all deals"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Single optimized query with JOIN
        cursor.execute("""
            SELECT 
                o.id as owner_id,
                o.owner_name,
                o.mobile,
                o.email,
                o.address,
                o.aadhar_card,
                o.pan_card,
                o.created_at as owner_created_at,
                d.id as deal_id,
                d.project_name,
                d.location,
                d.status,
                d.total_area,
                d.asking_price
            FROM owners o 
            LEFT JOIN deals d ON o.deal_id = d.id 
            WHERE o.id = %s
        """, (owner_id,))
        
        result = cursor.fetchone()
        if result:
            return jsonify({
                'success': True,
                'data': {
                    'owner': {
                        'id': result['owner_id'],
                        'owner_name': result['owner_name'],
                        'mobile': result['mobile'],
                        'email': result['email'],
                        'address': result['address'],
                        'aadhar_card': result['aadhar_card'],
                        'pan_card': result['pan_card'],
                        'created_at': result['owner_created_at']
                    },
                    'deal': {
                        'id': result['deal_id'],
                        'project_name': result['project_name'],
                        'location': result['location'],
                        'status': result['status'],
                        'total_area': result['total_area'],
                        'asking_price': result['asking_price']
                    } if result['deal_id'] else None
                }
            })
        else:
            return jsonify({'success': False, 'message': 'Owner not found'}), 404
            
    except Exception as e:
        print(f"Error in get_owner_direct: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/investors/<int:investor_id>/direct', methods=['GET'])  
def get_investor_direct(investor_id):
    """Fast investor lookup - gets investor with all their deals"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get investor with all their deals in one query
        cursor.execute("""
            SELECT 
                i.id as investor_id,
                i.investor_name,
                i.investment_amount,
                i.investment_percentage,
                i.mobile,
                i.email,
                i.address,
                i.created_at as investor_created_at,
                d.id as deal_id,
                d.project_name,
                d.location,
                d.status,
                d.total_area,
                d.asking_price
            FROM investors i 
            LEFT JOIN deals d ON i.deal_id = d.id 
            WHERE i.id = %s
        """, (investor_id,))
        
        results = cursor.fetchall()
        if results:
            # Process results - investor info and their deals
            investor_data = {
                'id': results[0]['investor_id'],
                'investor_name': results[0]['investor_name'], 
                'investment_amount': float(results[0]['investment_amount']) if results[0]['investment_amount'] else 0,
                'investment_percentage': float(results[0]['investment_percentage']) if results[0]['investment_percentage'] else 0,
                'mobile': results[0]['mobile'],
                'email': results[0]['email'],
                'address': results[0]['address'],
                'created_at': results[0]['investor_created_at']
            }
            
            deals = []
            for row in results:
                if row['deal_id']:  # Only add if deal exists
                    deal = {
                        'id': row['deal_id'],
                        'project_name': row['project_name'],
                        'location': row['location'],
                        'status': row['status'],
                        'total_area': float(row['total_area']) if row['total_area'] else 0,
                        'asking_price': float(row['asking_price']) if row['asking_price'] else 0,
                        'investment_amount': float(row['investment_amount']) if row['investment_amount'] else 0
                    }
                    deals.append(deal)
            
            return jsonify({
                'success': True,
                'data': {
                    'investor': investor_data,
                    'deals': deals
                }
            })
        else:
            return jsonify({'success': False, 'message': 'Investor not found'}), 404
            
    except Exception as e:
        print(f"Error in get_investor_direct: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()

# ============================================================================

if __name__ == '__main__':
    debug_mode = os.getenv('FLASK_DEBUG', 'False').lower() in ['true', '1', 'yes']
    host = os.getenv('FLASK_HOST', '0.0.0.0')
    port = int(os.getenv('FLASK_PORT', 5000))
    app.run(debug=debug_mode, host=host, port=port)