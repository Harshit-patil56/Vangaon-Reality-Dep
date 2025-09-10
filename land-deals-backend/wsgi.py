#!/usr/bin/env python3
"""
WSGI entry point for Render deployment
"""
import os
from app import app

if __name__ == "__main__":
    # Get port from environment variable (Render sets this automatically)
    port = int(os.environ.get("PORT", 5000))
    # Get host from environment variable
    host = os.environ.get("FLASK_HOST", "0.0.0.0")
    
    print(f"Starting server on {host}:{port}")
    app.run(host=host, port=port, debug=False)
