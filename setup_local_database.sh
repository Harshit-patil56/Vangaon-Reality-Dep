#!/bin/bash

# Database Setup Script for DigitalOcean Droplet
# Run this script on your droplet to set up the local MySQL database

echo "🚀 Setting up Land Deals Database on DigitalOcean Droplet..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install MySQL Server
echo "🗄️  Installing MySQL Server..."
sudo apt install -y mysql-server

# Start and enable MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

echo "🔐 Setting up database and user..."

# Create database and user
sudo mysql -e "
CREATE DATABASE IF NOT EXISTS land_deals_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'land_deals_user'@'localhost' IDENTIFIED BY 'SecurePassword123!';
GRANT ALL PRIVILEGES ON land_deals_db.* TO 'land_deals_user'@'localhost';
FLUSH PRIVILEGES;
"

echo "✅ Database setup completed!"

# Test connection
echo "🧪 Testing database connection..."
mysql -u land_deals_user -pSecurePassword123! land_deals_db -e "SELECT 'Database connection successful!' as status;"

if [ $? -eq 0 ]; then
    echo "✅ Database connection test passed!"
else
    echo "❌ Database connection test failed!"
    exit 1
fi

echo "📋 Database setup summary:"
echo "- Database: land_deals_db"
echo "- User: land_deals_user"
echo "- Password: SecurePassword123!"
echo "- Host: localhost"
echo "- Port: 3306"

echo "🎉 Database setup completed successfully!"
echo "Next steps:"
echo "1. Import your data using: mysql -u land_deals_user -p land_deals_db < your_backup.sql"
echo "2. Copy the .env.production file to your droplet"
echo "3. Deploy your application"