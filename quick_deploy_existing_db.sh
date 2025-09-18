#!/bin/bash

# Quick Deployment Script for Existing Database
# Use this when your MySQL database is already set up with data

echo "🚀 Quick deployment for existing database setup..."

PROJECT_DIR="/var/www/Vangaon-Reality-Dep"
REPO_URL="https://github.com/Harshit-patil56/Vangaon-Reality-Dep.git"

# Update system
echo "📦 Updating system..."
sudo apt update && sudo apt upgrade -y

# Install essential packages
echo "📋 Installing required packages..."
sudo apt install -y curl wget git nginx python3 python3-pip python3-venv nodejs npm

# Clone/update repository
echo "📥 Setting up application code..."
if [ -d "$PROJECT_DIR" ]; then
    echo "Directory exists, pulling latest changes..."
    cd $PROJECT_DIR
    sudo git pull origin master
else
    echo "Cloning repository..."
    sudo git clone $REPO_URL $PROJECT_DIR
    cd $PROJECT_DIR
fi

# Set permissions
sudo chown -R www-data:www-data $PROJECT_DIR

# Setup Backend
echo "⚙️  Setting up backend..."
cd $PROJECT_DIR/land-deals-backend

# Create virtual environment
sudo -u www-data python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
pip install python-dotenv mysql-connector-python

# Copy environment file (with your password majorProject@1v)
cp .env.production .env

# Test database connection
echo "🧪 Testing database connection..."
python3 -c "
import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

try:
    config = {
        'host': 'localhost',
        'user': 'land_deals_user', 
        'password': 'majorProject@1v',
        'database': 'land_deals_db',
        'port': 3306
    }
    
    conn = mysql.connector.connect(**config)
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM deals')
    result = cursor.fetchone()
    print(f'✅ Database connection successful! Found {result[0]} deals.')
    cursor.execute('SHOW TABLES')
    tables = cursor.fetchall()
    print(f'📋 Tables: {[t[0] for t in tables]}')
    conn.close()
except Exception as e:
    print(f'❌ Database connection failed: {e}')
    exit(1)
"

if [ $? -eq 0 ]; then
    echo "✅ Database connection verified!"
else
    echo "❌ Database connection failed! Please check your database setup."
    exit 1
fi

# Setup Frontend
echo "🎨 Setting up frontend..."
cd $PROJECT_DIR/land-deals-frontend/my-app

# Install dependencies and build
sudo -u www-data npm install
sudo -u www-data npm run build

# Create production environment
echo "NEXT_PUBLIC_API_URL=http://localhost:5000" > .env.production
echo "NEXT_PUBLIC_APP_ENV=production" >> .env.production

# Create uploads directory
sudo mkdir -p $PROJECT_DIR/uploads
sudo chown -R www-data:www-data $PROJECT_DIR/uploads

# Create systemd services
echo "⚙️  Creating systemd services..."

# Backend service
sudo tee /etc/systemd/system/land-deals-backend.service > /dev/null <<EOF
[Unit]
Description=Land Deals Backend API
After=network.target mysql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=$PROJECT_DIR/land-deals-backend
Environment=PATH=$PROJECT_DIR/land-deals-backend/venv/bin
ExecStart=$PROJECT_DIR/land-deals-backend/venv/bin/python app.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Frontend service  
sudo tee /etc/systemd/system/land-deals-frontend.service > /dev/null <<EOF
[Unit]
Description=Land Deals Frontend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=$PROJECT_DIR/land-deals-frontend/my-app
Environment=PATH=/usr/bin:/usr/local/bin
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Setup Nginx
echo "🌐 Setting up Nginx..."
sudo tee /etc/nginx/sites-available/land-deals > /dev/null <<EOF
server {
    listen 80;
    server_name _;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # File uploads
    location /uploads {
        alias $PROJECT_DIR/uploads;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    client_max_body_size 16M;
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/land-deals /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx
sudo nginx -t

# Enable and start services
echo "🚀 Starting services..."
sudo systemctl daemon-reload
sudo systemctl enable land-deals-backend land-deals-frontend nginx

sudo systemctl start land-deals-backend
sudo systemctl start land-deals-frontend  
sudo systemctl restart nginx

# Setup firewall
echo "🔒 Setting up firewall..."
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

echo "✅ Deployment completed successfully!"
echo ""
echo "🎉 Your Land Deals application is now running!"
echo ""
echo "🌐 Access your application at: http://$(curl -s ifconfig.me)"
echo "📊 Backend API: http://$(curl -s ifconfig.me)/api"
echo ""
echo "📋 Service Status:"
sudo systemctl status land-deals-backend --no-pager -l
echo ""
sudo systemctl status land-deals-frontend --no-pager -l
echo ""
echo "🗄️  Database Info:"
echo "- Host: localhost"
echo "- Database: land_deals_db"
echo "- User: land_deals_user"
echo "- Password: majorProject@1v"