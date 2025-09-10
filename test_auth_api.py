import requests
import json

# Test login and then starred owners endpoint
base_url = "http://localhost:5000/api"

print("Testing login:")
login_data = {
    "username": "admin",  # Default username - adjust if needed
    "password": "admin"   # Default password - adjust if needed
}

try:
    login_response = requests.post(f"{base_url}/login", json=login_data)
    print(f"Login Status: {login_response.status_code}")
    
    if login_response.status_code == 200:
        token = login_response.json().get('token')
        print(f"Token received: {token[:20]}..." if token else "No token")
        
        if token:
            headers = {"Authorization": f"Bearer {token}"}
            
            print("\nTesting starred owners with auth:")
            starred_response = requests.get(f"{base_url}/owners/starred", headers=headers)
            print(f"Starred Status: {starred_response.status_code}")
            print(f"Starred Response: {starred_response.text}")
            
            print("\nTesting regular owners with auth:")
            owners_response = requests.get(f"{base_url}/owners", headers=headers)
            print(f"Owners Status: {owners_response.status_code}")
            if owners_response.status_code == 200:
                owners = owners_response.json()
                print(f"Number of owners: {len(owners)}")
                if owners:
                    print(f"First owner: {owners[0]}")
    else:
        print(f"Login failed: {login_response.text}")
        
except Exception as e:
    print(f"Error: {e}")
