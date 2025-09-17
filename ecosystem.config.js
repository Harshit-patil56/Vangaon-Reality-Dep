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
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/var/log/pm2/land-deals-backend-error.log',
      out_file: '/var/log/pm2/land-deals-backend-out.log',
      log_file: '/var/log/pm2/land-deals-backend.log',
      time: true
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
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/var/log/pm2/land-deals-frontend-error.log',
      out_file: '/var/log/pm2/land-deals-frontend-out.log',
      log_file: '/var/log/pm2/land-deals-frontend.log',
      time: true
    }
  ],

  deploy: {
    production: {
      user: 'root',
      host: 'YOUR_DROPLET_IP',
      ref: 'origin/main',
      repo: 'https://github.com/YOUR_USERNAME/Land-deals-manager.git',
      path: '/var/www/Land-deals-manager',
      'pre-deploy-local': '',
      'post-deploy': 'cd land-deals-backend && source venv/bin/activate && pip install -r requirements.txt && cd ../land-deals-frontend/my-app && npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};