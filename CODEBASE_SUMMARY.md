# Codebase Summary - Land-deals-manager

This document is an automated summary of the repository located at the workspace root. It highlights languages, entry points, key files, deployment hints and recommended next steps to run or work on the project locally.

## Languages & Package Managers
- Python (backend) — `requirements.txt` in `land-deals-backend/` (Flask app)
- JavaScript / TypeScript (frontend) — Next.js app in `land-deals-frontend/my-app/` (`package.json`, `next.config.ts`)
- Node tooling at repo root `package.json` (small dev deps)

## Key Entry Points
- Backend:
  - `land-deals-backend/app.py` — main Flask application
  - `land-deals-backend/wsgi.py` — WSGI entry used for deployments
  - `land-deals-backend/requirements.txt` — Python dependencies
- Frontend:
  - `land-deals-frontend/my-app/package.json` — Next.js scripts (`dev`, `build`, `start`)
  - `land-deals-frontend/my-app/next.config.ts`
  - `land-deals-frontend/my-app/pages/` — Next.js pages

## Deployment & Config Hints
- `ecosystem.config.js` — PM2 configuration referencing the Python venv and frontend `npm start`.
- `nginx-domain.conf` — example Nginx reverse proxy rules for frontend on port 3000 and backend on port 5000; static `uploads` served from disk.
- `DEPLOYMENT_GUIDE.md` — step-by-step DigitalOcean droplet deployment instructions.

## Observations / Code Notes
- Backend uses Flask 3.0 and several extensions (`Flask-Cors`, `Flask-Compress`, `gunicorn`, `mysql-connector-python`) and includes a large `app.py` with many routes and utilities.
- `app.py` contains runtime attempts to install optional packages (e.g., `bcrypt`) using `subprocess` if import fails — this is unusual for production code and may be removed in favor of proper environment setup.
- Frontend is a Next.js 15 app using React 19 and TailwindCSS. Pages are implemented under `pages/` (classic Next.js routing) rather than App Router.

## Quick Local Run (development)

1) Backend (Windows / PowerShell):

```powershell
cd "c:\Users\shit1\Downloads\Vangaon reality\Land-deals-manager\land-deals-backend"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
# Create a .env file (copy .env.example) and set DB_HOST to a local MySQL or use a remote DB
python wsgi.py
```

2) Frontend:

```powershell
cd "c:\Users\shit1\Downloads\Vangaon reality\Land-deals-manager\land-deals-frontend\my-app"
npm install
npm run dev
```

3) Notes:
- Set `NEXT_PUBLIC_API_URL` in frontend `.env` to `http://localhost:5000/api` for local development.
- The backend `UPLOAD_FOLDER` defaults to `uploads` inside the backend folder; ensure write permissions.

## Recommended Next Steps
- (Optional) Split `app.py` into modules (routes, auth, db) for maintainability.
- Remove runtime pip installs and rely on `requirements.txt` for reproducible environments.
- Add a small `Makefile` or `scripts` for common dev tasks (create venv, install, run).
- Add lightweight tests for critical backend endpoints and frontend smoke tests.

---
Generated: 2025-09-19
