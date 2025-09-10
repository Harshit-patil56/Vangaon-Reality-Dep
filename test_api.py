import requests
import json

# Test the starred owners endpoint
url = "http://localhost:5000/api/owners/starred"

# First test without auth to see the error
print("Testing without authentication:")
try:
    response = requests.get(url)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")

print("\n" + "="*50 + "\n")

# Test the regular owners endpoint
print("Testing regular owners endpoint:")
try:
    response = requests.get("http://localhost:5000/api/owners")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text[:200]}...")
except Exception as e:
    print(f"Error: {e}")
