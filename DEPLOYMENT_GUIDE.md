# Backend deployment instructions

## For Railway Deployment:
1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard:
   - DB_HOST=YOUR_DATABASE_HOST
   - DB_PORT=17231
   - DB_USER=YOUR_DATABASE_USER
   - DB_PASSWORD=YOUR_DATABASE_PASSWORD
   - DB_NAME=land_deals_db
   - SECRET_KEY=YOUR_SECURE_SECRET_KEY
   - FLASK_HOST=0.0.0.0
   - FLASK_PORT=5000
   - FLASK_ENV=production

## For Render Deployment:
1. Connect your GitHub repository to Render
2. Set the same environment variables in Render dashboard
3. Set start command: python app.py

## For Vercel Deployment:
1. Install vercel CLI: npm install -g vercel
2. Run: vercel --prod
3. Set environment variables in Vercel dashboard

## After Backend Deployment:
1. Copy your deployed backend URL
2. Update NEXT_PUBLIC_API_URL in frontend/.env.production
3. Deploy frontend to Vercel/Netlify
