# ============================================================
# MineSafe AI — Unit & Integration Test for Register / Auth
# ============================================================

import sys
import os

# Ensure backend root is on PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.models.user import User

# Use an in-memory SQLite database for isolated unit testing
TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

def run_tests():
    print("[TEST] Creating test User table in SQLite in-memory DB...")
    User.__table__.create(bind=test_engine)

    client = TestClient(app)

    print("\n--- 1. Testing Registration Endpoint (/api/v1/auth/register) ---")
    reg_payload = {
        "name": "Dr. Rajesh Sharma",
        "username": "rsharma_test",
        "password": "securepassword123",
        "role": "Safety Officer",
    }
    response = client.post("/api/v1/auth/register", json=reg_payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    assert response.status_code == 201, f"Expected 201, got {response.status_code}"
    data = response.json()
    assert "access_token" in data, "access_token missing in response"
    assert data["token_type"] == "bearer"
    assert data["user"]["username"] == "rsharma_test"
    assert data["user"]["name"] == "Dr. Rajesh Sharma"
    assert data["user"]["role"] == "Safety Officer"
    print("[PASS] Registration successful!")

    print("\n--- 2. Testing Duplicate Username Rejection ---")
    dup_response = client.post("/api/v1/auth/register", json=reg_payload)
    print(f"Status Code: {dup_response.status_code}")
    print(f"Response: {dup_response.json()}")
    assert dup_response.status_code == 400, f"Expected 400, got {dup_response.status_code}"
    assert "already registered" in dup_response.json()["detail"].lower()
    print("[PASS] Duplicate username correctly rejected!")

    print("\n--- 3. Testing Short Password Validation ---")
    short_pw_payload = {
        "name": "Test User",
        "username": "shortpw_user",
        "password": "123",
        "role": "Safety Officer",
    }
    short_pw_resp = client.post("/api/v1/auth/register", json=short_pw_payload)
    print(f"Status Code: {short_pw_resp.status_code}")
    print(f"Response: {short_pw_resp.json()}")
    assert short_pw_resp.status_code == 400
    print("[PASS] Short password correctly rejected!")

    print("\n--- 4. Testing Login with Newly Registered User (/api/v1/auth/login) ---")
    login_payload = {
        "username": "rsharma_test",
        "password": "securepassword123",
    }
    login_resp = client.post("/api/v1/auth/login", json=login_payload)
    print(f"Status Code: {login_resp.status_code}")
    print(f"Response: {login_resp.json()}")
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    assert "access_token" in login_data
    token = login_data["access_token"]
    print("[PASS] Login with newly registered credentials successful!")

    print("\n--- 5. Testing Protected /me Endpoint with Bearer Token ---")
    me_resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    print(f"Status Code: {me_resp.status_code}")
    print(f"Response: {me_resp.json()}")
    assert me_resp.status_code == 200
    assert me_resp.json()["username"] == "rsharma_test"
    print("[PASS] Profile fetched via Bearer token successfully!")

    print("\n==========================================")
    print("ALL 5 AUTH & REGISTER TESTS PASSED CLEANLY!")
    print("==========================================")

if __name__ == "__main__":
    run_tests()
