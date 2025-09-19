#!/bin/bash

# Complete Deployment Script for DigitalOcean Droplet
# This script will deploy your Land Deals application with local MySQL database

set -e  # Exit on any error

echo "🚀 Starting Land Deals Application Deployment..."

# Variables
PROJECT_DIR="/var/www/Vangaon-Reality-Dep"
REPO_URL="https://github.com/Harshit-patil56/Vangaon-Reality-Dep.git"

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install essential packages
echo "📋 Installing essential packages..."
sudo apt install -y curl wget git nginx certbot python3-certbot-nginx build-essential

# Install Node.js 18
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Python and pip
echo "🐍 Installing Python dependencies..."
sudo apt install -y python3 python3-pip python3-venv default-libmysqlclient-dev

# Setup MySQL Database
echo "🗄️  Setting up MySQL database..."
sudo apt install -y mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql

# Create database and user
echo "🔐 Creating database and user..."
sudo mysql -e "
CREATE DATABASE IF NOT EXISTS land_deals_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'land_deals_user'@'localhost' IDENTIFIED BY 'majorProject@1v';
GRANT ALL PRIVILEGES ON land_deals_db.* TO 'land_deals_user'@'localhost';
FLUSH PRIVILEGES;
"

# Clone repository
echo "📥 Cloning repository..."
sudo rm -rf $PROJECT_DIR
sudo git clone $REPO_URL $PROJECT_DIR
cd $PROJECT_DIR

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

# Copy environment file
cp .env.production .env

# Setup Frontend
echo "🎨 Setting up frontend..."
cd $PROJECT_DIR/land-deals-frontend/my-app

# Install dependencies
sudo -u www-data npm install

# Create production environment
echo "NEXT_PUBLIC_API_URL=http://localhost:5000" > .env.production
echo "NEXT_PUBLIC_APP_ENV=production" >> .env.production

# Build frontend
sudo -u www-data npm run build

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
    server_name vangaonreality.dpdns.org www.vangaonreality.dpdns.org;

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

# Test nginx configuration
sudo nginx -t

# Enable and start services
echo "🚀 Starting services..."
sudo systemctl daemon-reload
sudo systemctl enable land-deals-backend
sudo systemctl enable land-deals-frontend
sudo systemctl enable nginx

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
echo "📋 Service Status:"
sudo systemctl status land-deals-backend --no-pager -l
sudo systemctl status land-deals-frontend --no-pager -l
sudo systemctl status nginx --no-pager -l
echo ""
echo "🌐 Access your application at: http://$(curl -s ifconfig.me)"
echo "📊 Backend API: http://$(curl -s ifconfig.me)/api"
echo ""
echo "📝 Next steps:"
echo "1. Import your database backup if you have one"
echo "2. Configure your domain name (optional)"
echo "3. Setup SSL certificate with Let's Encrypt (optional)"
echo ""
echo "🗄️  Database Info:"
echo "- Host: localhost"
echo "- Database: land_deals_db"
echo "- User: land_deals_user"
echo "- Password: majorProject@1v"