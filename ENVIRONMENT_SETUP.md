# Environment Configuration Guide for DigitalOcean Deployment

## Overview

This project uses environment variables to manage configuration for both the backend and frontend when deployed on a DigitalOcean droplet with local MySQL database.

## Backend Environment Setup

### 1. Create Backend Environment File

Navigate to the backend directory and create a `.env` file:

```bash
cd /var/www/Land-deals-manager/land-deals-backend
cp .env.example .env
```

### 2. Configure Backend Environment Variables

Edit the `.env` file with your DigitalOcean MySQL values:

```bash
# Database Configuration (Local MySQL on DigitalOcean Droplet)
DB_HOST=localhost
DB_PORT=3306
DB_USER=land_deals_user
DB_PASSWORD=your_secure_mysql_password
DB_NAME=land_deals_db

# Application Configuration
SECRET_KEY=your-very-secure-secret-key-minimum-32-characters-long
FLASK_ENV=production
FLASK_DEBUG=false
FLASK_HOST=0.0.0.0
FLASK_PORT=5000

# File Upload Configuration
UPLOAD_FOLDER=/var/www/Land-deals-manager/land-deals-backend/uploads
MAX_CONTENT_LENGTH=16777216

# CORS Configuration (Update with your droplet IP or domain)
FRONTEND_URL=http://YOUR_DROPLET_IP:3000

# Security Configuration
SSL_DISABLED=true
```

### 3. Backend Security Notes

- **Never commit the `.env` file** to version control
- Use strong passwords for MySQL database user
- `SECRET_KEY` should be at least 32 characters long and completely random
- For production, consider using HTTPS and setting `SSL_DISABLED=false`
- Set proper file permissions: `chmod 600 .env`

## Frontend Environment Setup

### 1. Create Frontend Environment Files

Navigate to the frontend directory and create environment files:

```bash
cd /var/www/Land-deals-manager/land-deals-frontend/my-app

# For development
cp .env.example .env.local

# For production (DigitalOcean deployment)
cp .env.example .env.production
```

### 2. Configure Frontend Environment Variables

#### Development (.env.local)
```bash
# Backend API Configuration (for local development)
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

#### Production (.env.production)
```bash
# Backend API Configuration (for DigitalOcean deployment)
NEXT_PUBLIC_API_URL=http://YOUR_DROPLET_IP:5000/api

# If using domain with SSL:
# NEXT_PUBLIC_API_URL=https://your-domain.com/api
```

### 3. Frontend Security Notes

- **Never commit environment files** to version control
- Environment variables starting with `NEXT_PUBLIC_` are exposed to the browser
- For production, update the URL to your DigitalOcean droplet IP or domain
- Use HTTPS in production for better security

## DigitalOcean Production Deployment

### Environment Variable Template for Droplet

#### Backend Production Environment (/var/www/Land-deals-manager/land-deals-backend/.env)
```bash
# Database Configuration (Local MySQL)
DB_HOST=localhost
DB_PORT=3306
DB_USER=land_deals_user
DB_PASSWORD=your_secure_mysql_password
DB_NAME=land_deals_db

# Application Configuration
SECRET_KEY=your-very-secure-secret-key-minimum-32-characters-long
FLASK_ENV=production
FLASK_DEBUG=false
FLASK_HOST=0.0.0.0
FLASK_PORT=5000

# File Upload Configuration
UPLOAD_FOLDER=/var/www/Land-deals-manager/land-deals-backend/uploads
MAX_CONTENT_LENGTH=16777216

# CORS Configuration
FRONTEND_URL=http://YOUR_DROPLET_IP:3000

# Security Configuration
SSL_DISABLED=true
```

#### Frontend Production Environment (/var/www/Land-deals-manager/land-deals-frontend/my-app/.env.production)
```bash
# Backend API Configuration
NEXT_PUBLIC_API_URL=http://YOUR_DROPLET_IP:5000/api
```
## DigitalOcean Deployment Configuration Steps

### Step 1: Database Setup
```bash
# 1. Login to MySQL as root
mysql -u root -p

# 2. Create database and user
CREATE DATABASE land_deals_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'land_deals_user'@'localhost' IDENTIFIED BY 'your_secure_password_here';
GRANT ALL PRIVILEGES ON land_deals_db.* TO 'land_deals_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# 3. Test connection
mysql -u land_deals_user -p land_deals_db
```

### Step 2: Backend Environment Configuration
```bash
# Navigate to backend directory
cd /var/www/Land-deals-manager/land-deals-backend

# Create production environment file
cat > .env << 'EOF'
# Database Configuration (Local MySQL)
DB_HOST=localhost
DB_PORT=3306
DB_USER=land_deals_user
DB_PASSWORD=your_secure_mysql_password
DB_NAME=land_deals_db

# Application Configuration
SECRET_KEY=$(openssl rand -base64 32)
FLASK_ENV=production
FLASK_DEBUG=false
FLASK_HOST=0.0.0.0
FLASK_PORT=5000

# File Upload Configuration
UPLOAD_FOLDER=/var/www/Land-deals-manager/land-deals-backend/uploads
MAX_CONTENT_LENGTH=16777216

# CORS Configuration
FRONTEND_URL=http://YOUR_DROPLET_IP:3000

# Security Configuration
SSL_DISABLED=true
EOF

# Set secure permissions
chmod 600 .env
chown www-data:www-data .env
```

### Step 3: Frontend Environment Configuration
```bash
# Navigate to frontend directory
cd /var/www/Land-deals-manager/land-deals-frontend/my-app

# Create production environment file
cat > .env.production << 'EOF'
# Backend API Configuration
NEXT_PUBLIC_API_URL=http://YOUR_DROPLET_IP:5000/api
EOF

# If using domain with SSL certificate:
# echo "NEXT_PUBLIC_API_URL=https://your-domain.com/api" > .env.production
```

### Step 4: Environment Variable Validation
```bash
# Test backend environment loading
cd /var/www/Land-deals-manager/land-deals-backend
python3 -c "
import os
from dotenv import load_dotenv
load_dotenv()
print('DB_HOST:', os.getenv('DB_HOST'))
print('DB_NAME:', os.getenv('DB_NAME'))
print('FLASK_ENV:', os.getenv('FLASK_ENV'))
"

# Test database connection
python3 -c "
import mysql.connector
import os
from dotenv import load_dotenv
load_dotenv()

try:
    conn = mysql.connector.connect(
        host=os.getenv('DB_HOST'),
        port=os.getenv('DB_PORT'),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD'),
        database=os.getenv('DB_NAME')
    )
    print('Database connection successful!')
    conn.close()
except Exception as e:
    print('Database connection failed:', e)
"
```

## Development vs Production Differences

### Development Environment (Local Development)
```bash
# Backend .env (for local development)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_local_password
DB_NAME=land_deals_dev
SECRET_KEY=dev-secret-key-not-for-production
FLASK_ENV=development
FLASK_DEBUG=true
FRONTEND_URL=http://localhost:3000

# Frontend .env.local
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### Production Environment (DigitalOcean Droplet)
```bash
# Backend .env (production)
DB_HOST=localhost
DB_PORT=3306
DB_USER=land_deals_user
DB_PASSWORD=very_secure_production_password
DB_NAME=land_deals_db
SECRET_KEY=very-long-random-production-secret-key
FLASK_ENV=production
FLASK_DEBUG=false
FRONTEND_URL=http://YOUR_DROPLET_IP:3000

# Frontend .env.production
NEXT_PUBLIC_API_URL=http://YOUR_DROPLET_IP:5000/api
```

## Quick Setup Script for DigitalOcean

Create an automated setup script:

```bash
#!/bin/bash
# save as setup_env.sh

# Set your values
DROPLET_IP="YOUR_DROPLET_IP"
DB_PASSWORD="your_secure_mysql_password"
SECRET_KEY=$(openssl rand -base64 32)

# Backend environment
cat > /var/www/Land-deals-manager/land-deals-backend/.env << EOF
DB_HOST=localhost
DB_PORT=3306
DB_USER=land_deals_user
DB_PASSWORD=$DB_PASSWORD
DB_NAME=land_deals_db
SECRET_KEY=$SECRET_KEY
FLASK_ENV=production
FLASK_DEBUG=false
FLASK_HOST=0.0.0.0
FLASK_PORT=5000
UPLOAD_FOLDER=/var/www/Land-deals-manager/land-deals-backend/uploads
MAX_CONTENT_LENGTH=16777216
FRONTEND_URL=http://$DROPLET_IP:3000
SSL_DISABLED=true
EOF

# Frontend environment
cat > /var/www/Land-deals-manager/land-deals-frontend/my-app/.env.production << EOF
NEXT_PUBLIC_API_URL=http://$DROPLET_IP:5000/api
EOF

# Set permissions
chmod 600 /var/www/Land-deals-manager/land-deals-backend/.env
chown www-data:www-data /var/www/Land-deals-manager/land-deals-backend/.env

echo "Environment configuration completed!"
echo "Database password: $DB_PASSWORD"
echo "Secret key: $SECRET_KEY"
echo "Remember to save these securely!"
```

## Security Best Practices for DigitalOcean

1. **File Permissions**
   ```bash
   chmod 600 .env
   chown www-data:www-data .env
   ```

2. **Strong Passwords**
   ```bash
   # Generate secure password
   openssl rand -base64 32
   ```

3. **Database Security**
   ```bash
   # Remove test database and secure MySQL
   mysql_secure_installation
   ```

4. **Environment Isolation**
   - Never use development credentials in production
   - Use different secret keys for each environment
   - Regularly rotate passwords and keys

5. **Backup Environment Configuration**
   ```bash
   # Backup environment files (without sensitive data)
   cp .env .env.backup
   # Store securely outside the server
   ```

## Troubleshooting

### Common Issues

1. **Connection Refused**: Check if environment variables are loaded correctly
2. **SSL Errors**: Ensure `ca-certificate.pem` exists for cloud databases
3. **API Errors**: Verify `NEXT_PUBLIC_API_URL` matches your backend URL
4. **CORS Errors**: Ensure `FRONTEND_URL` is set correctly in backend

### Debugging Environment Variables

Add this to your backend code to debug environment loading:

```python
print("DB_HOST:", os.environ.get('DB_HOST'))
print("DB_PORT:", os.environ.get('DB_PORT'))
print("FRONTEND_URL:", os.environ.get('FRONTEND_URL'))
```

Add this to your frontend code to debug:

```javascript
console.log("API_URL:", process.env.NEXT_PUBLIC_API_URL)
```

## Support

For additional help with environment configuration, refer to:
- [Next.js Environment Variables Documentation](https://nextjs.org/docs/basic-features/environment-variables)
- [Flask Configuration Documentation](https://flask.palletsprojects.com/en/2.3.x/config/)
- [python-dotenv Documentation](https://pypi.org/project/python-dotenv/)