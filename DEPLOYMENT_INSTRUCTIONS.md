# Instructions for deploying to DigitalOcean Droplet with Local MySQL

## Quick Start (Easiest Method)

1. **Copy the deployment script to your droplet:**
   ```bash
   scp deploy_to_droplet.sh root@your-droplet-ip:/root/
   ```

2. **SSH into your droplet:**
   ```bash
   ssh root@your-droplet-ip
   ```

3. **Run the deployment script:**
   ```bash
   chmod +x /root/deploy_to_droplet.sh
   /root/deploy_to_droplet.sh
   ```

4. **Import your database backup:**
   ```bash
   mysql -u land_deals_user -pmajorProject@1v land_deals_db < land_deals_backup.sql
   ```

## Manual Step-by-Step Deployment

### 1. Setup Database
```bash
# Install MySQL
sudo apt update
sudo apt install -y mysql-server

# Create database and user
sudo mysql -e "
CREATE DATABASE land_deals_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'land_deals_user'@'localhost' IDENTIFIED BY 'majorProject@1v';
GRANT ALL PRIVILEGES ON land_deals_db.* TO 'land_deals_user'@'localhost';
FLUSH PRIVILEGES;
"
```

### 2. Clone Repository
```bash
cd /var/www
git clone https://github.com/Harshit-patil56/Vangaon-Reality-Dep.git
cd Vangaon-Reality-Dep
```

### 3. Setup Backend
```bash
cd land-deals-backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.production .env
```

### 4. Setup Frontend
```bash
cd ../land-deals-frontend/my-app
npm install
npm run build
```

### 5. Import Database
```bash
mysql -u land_deals_user -pmajorProject@1v land_deals_db < your_backup.sql
```

## Database Configuration

Your application is now configured to use these local database settings:

- **Host:** localhost
- **Database:** land_deals_db  
- **User:** land_deals_user
- **Password:** majorProject@1v
- **Port:** 3306

## Environment Files Created

1. **`.env.production`** - Backend environment configuration for local MySQL
2. **`setup_local_database.sh`** - Database setup script
3. **`deploy_to_droplet.sh`** - Complete deployment automation script

## Testing the Deployment

After deployment, test your application:

```bash
# Test backend API
curl http://localhost:5000/api/health

# Test database connection
mysql -u land_deals_user -pmajorProject@1v land_deals_db -e "SELECT COUNT(*) FROM deals;"

# Check service status
systemctl status land-deals-backend
systemctl status land-deals-frontend
```

## Accessing Your Application

- **Frontend:** http://your-droplet-ip
- **Backend API:** http://your-droplet-ip/api
- **Admin Panel:** http://your-droplet-ip/admin

## Security Notes

1. **Change the default password:** Update `majorProject@1v` to a stronger password if needed
2. **Setup SSL:** Use Let's Encrypt for HTTPS
3. **Configure firewall:** Only allow necessary ports
4. **Regular backups:** Schedule automatic database backups

## Troubleshooting

### Check logs:
```bash
journalctl -u land-deals-backend -f
journalctl -u land-deals-frontend -f
tail -f /var/log/nginx/error.log
```

### Restart services:
```bash
systemctl restart land-deals-backend
systemctl restart land-deals-frontend
systemctl restart nginx
```

### Test database connection:
```bash
mysql -u land_deals_user -pmajorProject@1v land_deals_db -e "SHOW TABLES;"
```