#!/usr/bin/env python3
import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

# Get admin token first
try:
    login_response = requests.post('http://localhost:5000/api/login', json={
        'username': 'admin',
        'password': 'admin123'
    })
    
    if login_response.status_code == 200:
        token = login_response.json().get('token')
        print(f"Login successful, token: {token[:20]}...")
        
        # Try to create a user
        user_data = {
            'username': 'testuser123',
            'password': 'testpass123',
            'role': 'user',
            'owner_id': None,
            'investor_id': None
        }
        
        headers = {'Authorization': f'Bearer {token}'}
        create_response = requests.post('http://localhost:5000/api/admin/users', 
                                      json=user_data, 
                                      headers=headers)
        
        print(f"Create user response status: {create_response.status_code}")
        print(f"Create user response: {create_response.text}")
        
    else:
        print(f"Login failed: {login_response.status_code} - {login_response.text}")
        
except Exception as e:
    print(f"Error: {e}")