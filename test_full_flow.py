import requests
import json

# Test registration, login, and starred owners endpoint
base_url = "http://localhost:5000/api"

print("Step 1: Register a test user")
register_data = {
    "username": "testuser",
    "password": "testpass123",
    "email": "test@example.com"
}

try:
    register_response = requests.post(f"{base_url}/register", json=register_data)
    print(f"Register Status: {register_response.status_code}")
    if register_response.status_code != 201:
        print(f"Register Response: {register_response.text}")
        # Maybe user already exists, try to login anyway
    
    print("\nStep 2: Login with test user")
    login_data = {
        "username": "testuser",
        "password": "testpass123"
    }
    
    login_response = requests.post(f"{base_url}/login", json=login_data)
    print(f"Login Status: {login_response.status_code}")
    
    if login_response.status_code == 200:
        token = login_response.json().get('token')
        print(f"Token received: {token[:20]}..." if token else "No token")
        
        if token:
            headers = {"Authorization": f"Bearer {token}"}
            
            print("\nStep 3: Test starred owners endpoint")
            starred_response = requests.get(f"{base_url}/owners/starred", headers=headers)
            print(f"Starred Status: {starred_response.status_code}")
            print(f"Starred Response: {starred_response.text}")
            
            print("\nStep 4: Test regular owners endpoint")
            owners_response = requests.get(f"{base_url}/owners", headers=headers)
            print(f"Owners Status: {owners_response.status_code}")
            if owners_response.status_code == 200:
                owners = owners_response.json()
                print(f"Number of owners: {len(owners)}")
                # Check if any owner has is_starred field
                if owners:
                    first_owner = owners[0]
                    print(f"First owner fields: {list(first_owner.keys())}")
                    if 'is_starred' in first_owner:
                        print("✓ is_starred field exists")
                    else:
                        print("✗ is_starred field missing")
            else:
                print(f"Owners error: {owners_response.text}")
    else:
        print(f"Login failed: {login_response.text}")
        
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
