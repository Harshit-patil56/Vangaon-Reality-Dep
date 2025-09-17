#!/bin/bash
# DigitalOcean Droplet Setup Script for Land Deals Manager
# Run this script as root on a fresh Ubuntu 22.04 droplet

set -e

echo "🚀 Starting Land Deals Manager setup on DigitalOcean droplet..."

# Configuration variables (UPDATE THESE)
DROPLET_IP="64.227.128.245"
DOMAIN_NAME=""  # Optional: your domain name
DB_PASSWORD="$(openssl rand -base64 16)"
SECRET_KEY="$(openssl rand -base64 32)"
GITHUB_REPO="https://github.com/Harshit-patil56/Vangaon-Reality-Dep.git"

echo "📦 Updating system packages..."
apt update && apt upgrade -y

echo "📦 Installing essential packages..."
apt install -y curl wget git unzip software-properties-common

echo "📦 Installing Node.js 18 LTS..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

echo "📦 Installing Python 3 and pip..."
apt install -y python3 python3-pip python3-venv python3-dev

echo "📦 Installing MySQL Server..."
apt install -y mysql-server

echo "📦 Installing Nginx..."
apt install -y nginx

echo "📦 Installing PM2..."
npm install -g pm2

echo "🔒 Securing MySQL installation..."
echo "Please run 'mysql_secure_installation' manually after this script completes"

echo "🗄️ Setting up database..."
mysql -u root -p << EOF
CREATE DATABASE land_deals_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'land_deals_user'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON land_deals_db.* TO 'land_deals_user'@'localhost';
FLUSH PRIVILEGES;
EOF

echo "📂 Cloning repository..."
cd /var/www
git clone $GITHUB_REPO
cd Land-deals-manager

echo "🐍 Setting up backend..."
cd land-deals-backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

echo "⚙️ Creating backend environment file..."
cat > .env << EOF
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=land_deals_user
DB_PASSWORD=$DB_PASSWORD
DB_NAME=land_deals_db

# Application Configuration
SECRET_KEY=$SECRET_KEY
FLASK_ENV=production
FLASK_DEBUG=false
FLASK_HOST=0.0.0.0
FLASK_PORT=5000

# File Upload Configuration
UPLOAD_FOLDER=/var/www/Land-deals-manager/land-deals-backend/uploads
MAX_CONTENT_LENGTH=16777216

# CORS Configuration
FRONTEND_URL=http://$DROPLET_IP:3000

# Security Configuration
SSL_DISABLED=true
EOF

echo "🗄️ Importing database schema..."
mysql -u land_deals_user -p$DB_PASSWORD land_deals_db < init_schema.sql
mysql -u land_deals_user -p$DB_PASSWORD land_deals_db < sql/create_payments_table.sql
mysql -u land_deals_user -p$DB_PASSWORD land_deals_db < sql/create_payment_proofs_table_v2.sql
mysql -u land_deals_user -p$DB_PASSWORD land_deals_db < sql/create_payment_parties_table.sql

echo "⚛️ Setting up frontend..."
cd ../land-deals-frontend/my-app
npm install

echo "⚙️ Creating frontend environment file..."
cat > .env.production << EOF
NEXT_PUBLIC_API_URL=http://$DROPLET_IP:5000/api
EOF

echo "🏗️ Building frontend..."
npm run build

echo "⚙️ Creating PM2 configuration..."
cd /var/www/Land-deals-manager
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'land-deals-backend',
      script: '/var/www/Land-deals-manager/land-deals-backend/venv/bin/python',
      args: '/var/www/Land-deals-manager/land-deals-backend/app.py',
      cwd: '/var/www/Land-deals-manager/land-deals-backend',
      env: {
        FLASK_ENV: 'production'
      },
      error_file: '/var/log/pm2/land-deals-backend-error.log',
      out_file: '/var/log/pm2/land-deals-backend-out.log',
      log_file: '/var/log/pm2/land-deals-backend.log'
    },
    {
      name: 'land-deals-frontend',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/Land-deals-manager/land-deals-frontend/my-app',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/var/log/pm2/land-deals-frontend-error.log',
      out_file: '/var/log/pm2/land-deals-frontend-out.log',
      log_file: '/var/log/pm2/land-deals-frontend.log'
    }
  ]
}
EOF

echo "🔧 Setting up file permissions..."
chown -R www-data:www-data /var/www/Land-deals-manager
chmod 600 /var/www/Land-deals-manager/land-deals-backend/.env
mkdir -p /var/log/pm2

echo "🌐 Configuring Nginx..."
cat > /etc/nginx/sites-available/land-deals-manager << EOF
server {
    listen 80;
    server_name $DROPLET_IP;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Frontend (Next.js)
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
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Upload files
    location /uploads/ {
        alias /var/www/Land-deals-manager/land-deals-backend/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

ln -s /etc/nginx/sites-available/land-deals-manager /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

echo "🔥 Configuring firewall..."
ufw --force enable
ufw allow ssh
ufw allow 80
ufw allow 443

echo "🚀 Starting applications..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup ubuntu

nginx -t
systemctl restart nginx

echo "✅ Setup completed successfully!"
echo ""
echo "🔐 IMPORTANT - Save these credentials:"
echo "Database Password: $DB_PASSWORD"
echo "Secret Key: $SECRET_KEY"
echo ""
echo "🌐 Your application should be accessible at:"
echo "http://$DROPLET_IP"
echo ""
echo "📊 To monitor your applications:"
echo "pm2 status"
echo "pm2 logs"
echo ""
echo "🔒 Next steps:"
echo "1. Run 'mysql_secure_installation' to secure MySQL"
echo "2. Set up SSL certificate with 'certbot --nginx -d yourdomain.com'"
echo "3. Configure regular backups"
echo ""
echo "🎉 Land Deals Manager is now deployed!"