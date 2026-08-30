import os
import re
from pathlib import Path

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
backend_env = dotenv_values("/app/backend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")
RZP_SECRET = backend_env.get("RAZORPAY_KEY_SECRET", "")
RZP_KEY_ID = backend_env.get("RAZORPAY_KEY_ID", "")
WEBHOOK_SECRET = backend_env.get("RAZORPAY_WEBHOOK_SECRET", "") or ""


@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def test_credentials():
    p = Path("/app/memory/test_credentials.md")
    if not p.exists():
        pytest.skip("Missing test_credentials.md")
    c = p.read_text(encoding="utf-8")
    e = re.search(r'(?im)^\s*(?:[-*]\s*)?(?:\*\*)?email(?:\*\*)?\s*:\s*`?([^`\s]+)', c)
    pw = re.search(r'(?im)^\s*(?:[-*]\s*)?(?:\*\*)?password(?:\*\*)?\s*:\s*`?([^`\s]+)', c)
    if not e or not pw:
        pytest.skip("No credentials found")
    return {"email": e.group(1), "password": pw.group(1)}


@pytest.fixture(scope="session")
def auth_token(test_credentials):
    r = requests.post(f"{BASE_URL}/api/auth/login", json=test_credentials, timeout=30)
    if r.status_code != 200:
        pytest.fail(f"Login failed {r.status_code}: {r.text[:300]}")
    t = r.json().get("token")
    if not t:
        pytest.fail("No token in login response")
    return t


@pytest.fixture(scope="session")
def auth_client(auth_token):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json", "Authorization": f"Bearer {auth_token}"})
    return s
