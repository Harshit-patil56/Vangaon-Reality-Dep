# Environment Configuration Guide

## Overview

This project uses environment variables to manage configuration for both the backend and frontend. This guide explains how to set up your environment files properly.

## Backend Environment Setup

### 1. Create Backend Environment File

Navigate to the backend directory and create a `.env` file:

```bash
cd land-deals-backend
cp .env.example .env
```

### 2. Configure Backend Environment Variables

Edit the `.env` file with your actual values:

```bash
# Database Configuration (Aiven Cloud MySQL)
DB_HOST=your-database-host.aivencloud.com
DB_PORT=17231
DB_USER=avnadmin
DB_PASSWORD=your_actual_database_password
DB_NAME=land_deals_db

# Application Configuration
SECRET_KEY=your-actual-secret-key-here
FLASK_ENV=production
FLASK_DEBUG=false

# File Upload Configuration
UPLOAD_FOLDER=uploads
MAX_CONTENT_LENGTH=16777216

# CORS Configuration
FRONTEND_URL=http://localhost:3000
```

### 3. Important Notes for Backend

- **Never commit the `.env` file** to version control
- The SSL configuration is automatically applied for Aiven cloud databases
- For local MySQL, omit SSL settings
- `SECRET_KEY` should be a long, random string for production

## Frontend Environment Setup

### 1. Create Frontend Environment File

Navigate to the frontend directory and create a `.env.local` file:

```bash
cd land-deals-frontend/my-app
cp .env.example .env.local
```

### 2. Configure Frontend Environment Variables

Edit the `.env.local` file:

```bash
# Backend API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000/api

# For production deployment, update to your backend URL:
# NEXT_PUBLIC_API_URL=https://your-backend-domain.com/api
```

### 3. Important Notes for Frontend

- **Never commit the `.env.local` file** to version control
- Environment variables starting with `NEXT_PUBLIC_` are exposed to the browser
- For production, update the URL to your deployed backend

## Production Deployment

### Backend (Vercel/Cloud Hosting)

Set these environment variables in your hosting platform:

```bash
DB_HOST=your-database-host.aivencloud.com
DB_PORT=17231
DB_USER=avnadmin
DB_PASSWORD=your_database_password
DB_NAME=land_deals_db
SECRET_KEY=your-production-secret-key
FLASK_ENV=production
UPLOAD_FOLDER=uploads
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

### Frontend (Vercel)

Set these environment variables in Vercel:

```bash
NEXT_PUBLIC_API_URL=https://your-backend-domain.com/api
```

## Migration from Hardcoded Values

This project has been updated to remove all hardcoded database configurations and API URLs. The changes include:

### Backend Changes
- `app.py`: Database configuration now uses environment variables
- `init_db.py`: Updated to use environment variables
- `migrate_database.py`: Updated to use environment variables
- All utility scripts now use environment variables

### Frontend Changes
- `lib/api.js`: Uses `NEXT_PUBLIC_API_URL` environment variable
- `lib/auth.js`: Uses `NEXT_PUBLIC_API_URL` environment variable
- `pages/deals/[id].js`: All hardcoded URLs replaced with environment variables
- `components/StructuredDocumentViewer.js`: Uses environment variables

### Test Files (Unchanged)
Test files retain hardcoded URLs for local testing:
- `test_*.py` files
- `check_*.py` files (some updated to use env vars for flexibility)

## Development vs Production

### Development Setup
```bash
# Backend .env
DB_HOST=localhost  # For local MySQL
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_local_password
DB_NAME=landdeals
SECRET_KEY=dev-secret-key
FRONTEND_URL=http://localhost:3000

# Frontend .env.local
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### Production Setup
```bash
# Backend environment variables
DB_HOST=mysql-3ca7d4a2-romitmeher-d46c.g.aivencloud.com
DB_PORT=17231
DB_USER=avnadmin
DB_PASSWORD=production_password
DB_NAME=land_deals_db
SECRET_KEY=strong-production-secret
FRONTEND_URL=https://your-frontend.vercel.app

# Frontend environment variables
NEXT_PUBLIC_API_URL=https://your-backend.vercel.app/api
```

## Security Best Practices

1. **Never commit `.env` files** to version control
2. Use strong, unique passwords and secret keys
3. Use different credentials for development and production
4. Regularly rotate passwords and secret keys
5. Limit database access to required IP addresses
6. Use SSL/TLS for all database connections in production

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