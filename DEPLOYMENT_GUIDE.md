# Land Deals Manager - DigitalOcean Droplet Deployment Guide

## Prerequisites
- DigitalOcean account
- Domain name (optional but recommended)
- SSH key for secure access

## 1. DigitalOcean Droplet Setup

### Create Droplet
1. Log into DigitalOcean Dashboard
2. Create new droplet:
   - **OS**: Ubuntu 22.04 LTS x64
   - **Size**: Basic plan, $12/month (2GB RAM, 1 CPU, 50GB SSD)
   - **Region**: Choose closest to your users
   - **Authentication**: SSH keys (recommended) or password
   - **Hostname**: land-deals-manager

### Initial Server Setup
```bash
# Connect to your droplet
ssh root@YOUR_DROPLET_IP

# Update system packages
apt update && apt upgrade -y

# Install essential packages
apt install -y curl wget git unzip software-properties-common

# Create non-root user (optional but recommended)
adduser deploy
usermod -aG sudo deploy
```

## 2. Install Required Software

### Install Node.js (v18 LTS)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# Verify installation
node --version
npm --version
```

### Install Python 3 and pip
```bash
apt install -y python3 python3-pip python3-venv python3-dev

# Verify installation
python3 --version
pip3 --version
```

### Install MySQL Server
```bash
apt install -y mysql-server

# Secure MySQL installation
mysql_secure_installation

# Follow prompts:
# - Set root password: YES (choose strong password)
# - Remove anonymous users: YES
# - Disallow root login remotely: YES
# - Remove test database: YES
# - Reload privilege tables: YES
```

### Install Nginx
```bash
apt install -y nginx

# Start and enable Nginx
systemctl start nginx
systemctl enable nginx
```

### Install PM2 (Process Manager)
```bash
npm install -g pm2
```

## 3. Database Setup

### Create Database and User
```bash
# Login to MySQL as root
mysql -u root -p

# Create database
CREATE DATABASE land_deals_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Create dedicated user
CREATE USER 'land_deals_user'@'localhost' IDENTIFIED BY 'your_secure_password_here';

# Grant privileges
GRANT ALL PRIVILEGES ON land_deals_db.* TO 'land_deals_user'@'localhost';
FLUSH PRIVILEGES;

# Exit MySQL
EXIT;
```

### Test Database Connection
```bash
mysql -u land_deals_user -p land_deals_db
```

## 4. Deploy Application

### Clone Repository
```bash
cd /var/www
git clone https://github.com/YOUR_USERNAME/Land-deals-manager.git
cd Land-deals-manager

# Set ownership
chown -R www-data:www-data /var/www/Land-deals-manager
```

### Backend Setup
```bash
cd /var/www/Land-deals-manager/land-deals-backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Create production environment file
cp .env.example .env
nano .env
```

### Environment Configuration (.env)
```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=land_deals_user
DB_PASSWORD=your_secure_password_here
DB_NAME=land_deals_db

# Flask Configuration
SECRET_KEY=your_very_secure_secret_key_here_minimum_32_characters
FLASK_ENV=production
FLASK_HOST=0.0.0.0
FLASK_PORT=5000

# Upload Configuration
UPLOAD_FOLDER=/var/www/Land-deals-manager/land-deals-backend/uploads
MAX_CONTENT_LENGTH=16777216

# Security
SSL_DISABLED=false
```

### Initialize Database Schema
```bash
# Import database schema
mysql -u land_deals_user -p land_deals_db < init_schema.sql

# Apply any additional SQL migrations
mysql -u land_deals_user -p land_deals_db < sql/create_payments_table.sql
mysql -u land_deals_user -p land_deals_db < sql/create_payment_proofs_table_v2.sql
mysql -u land_deals_user -p land_deals_db < sql/create_payment_parties_table.sql
```

### Frontend Setup
```bash
cd /var/www/Land-deals-manager/land-deals-frontend/my-app

# Install dependencies
npm install

# Create production environment file
echo "NEXT_PUBLIC_API_URL=http://YOUR_DROPLET_IP:5000/api" > .env.production

# Build the application
npm run build
```

## 5. Process Management with PM2

### Create PM2 Configuration
```bash
# Create ecosystem.config.js in project root
cat > /var/www/Land-deals-manager/ecosystem.config.js << 'EOF'
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

# Create log directory
mkdir -p /var/log/pm2

# Start applications
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup ubuntu
# Run the command that PM2 outputs
```

## 6. Nginx Configuration

### Create Nginx Site Configuration
```bash
cat > /etc/nginx/sites-available/land-deals-manager << 'EOF'
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Frontend (Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Upload files
    location /uploads/ {
        alias /var/www/Land-deals-manager/land-deals-backend/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;
}
EOF

# Enable the site
ln -s /etc/nginx/sites-available/land-deals-manager /etc/nginx/sites-enabled/

# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx
```

## 7. Firewall Configuration

```bash
# Enable UFW firewall
ufw enable

# Allow SSH
ufw allow ssh

# Allow HTTP and HTTPS
ufw allow 80
ufw allow 443

# Check status
ufw status
```

## 8. SSL Certificate (Optional but Recommended)

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
certbot --nginx -d YOUR_DOMAIN

# Auto-renewal (should be set up automatically)
systemctl status certbot.timer
```

## 9. Monitoring and Maintenance

### Check Application Status
```bash
# PM2 status
pm2 status
pm2 logs

# Nginx status
systemctl status nginx

# MySQL status
systemctl status mysql
```

### Update Application
```bash
cd /var/www/Land-deals-manager
git pull origin main

# Backend updates
cd land-deals-backend
source venv/bin/activate
pip install -r requirements.txt

# Frontend updates
cd ../land-deals-frontend/my-app
npm install
npm run build

# Restart applications
pm2 restart all
```

### Backup Database
```bash
# Create backup directory
mkdir -p /var/backups/land-deals

# Backup database
mysqldump -u land_deals_user -p land_deals_db > /var/backups/land-deals/backup_$(date +%Y%m%d_%H%M%S).sql

# Setup automatic daily backups (crontab)
crontab -e
# Add: 0 2 * * * mysqldump -u land_deals_user -pYOUR_PASSWORD land_deals_db > /var/backups/land-deals/backup_$(date +\%Y\%m\%d_\%H\%M\%S).sql
```

## 10. Troubleshooting

### Common Issues

1. **Port already in use**: Check with `netstat -tlnp | grep :5000`
2. **Database connection errors**: Verify credentials and MySQL service status
3. **File permissions**: Ensure www-data owns the application files
4. **PM2 not starting**: Check logs with `pm2 logs`

### Useful Commands
```bash
# View application logs
pm2 logs land-deals-backend
pm2 logs land-deals-frontend

# Restart specific app
pm2 restart land-deals-backend

# Check system resources
htop
df -h

# Check open ports
netstat -tlnp
```

## 11. Security Checklist

- [ ] Changed default MySQL root password
- [ ] Created dedicated database user with limited privileges
- [ ] UFW firewall enabled and configured
- [ ] SSL certificate installed (if using domain)
- [ ] Strong secret keys in environment variables
- [ ] Regular security updates scheduled
- [ ] Non-root user for deployment (recommended)
- [ ] File permissions properly set (www-data)

## Success!

Your Land Deals Manager should now be accessible at:
- **HTTP**: http://YOUR_DROPLET_IP
- **HTTPS**: https://YOUR_DOMAIN (if SSL configured)

The application includes:
- User authentication and role-based access
- Deal management system
- Payment tracking with file uploads
- Investor and owner management
- Financial reporting and analytics
