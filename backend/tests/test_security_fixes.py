"""Iteration-3 security fix verification: webhook fail-closed, /payments/status auth+ownership,
plan_valid_until expiry enforcement, stripe dependency removal."""
import hashlib
import hmac
import json
import subprocess
import uuid
from pathlib import Path

import pytest
import requests

from conftest import BASE_URL, WEBHOOK_SECRET

DB = "test_database"


def _mongo(script: str) -> str:
    r = subprocess.run(["mongosh", DB, "--quiet", "--eval", script], capture_output=True, text=True)
    return (r.stdout or "") + (r.stderr or "")


def _reset_demo_user():
    _mongo('db.users.updateOne({email:"demo@truelense.app"},{$set:{plan:"free"},$unset:{plan_valid_until:""}});')


@pytest.fixture(scope="module", autouse=True)
def reset_state():
    _reset_demo_user()
    yield
    _reset_demo_user()


def _new_order(auth_client, plan_id="starter"):
    r = auth_client.post(f"{BASE_URL}/api/payments/checkout",
                         json={"plan_id": plan_id, "origin_url": BASE_URL}, timeout=60)
    assert r.status_code == 200, r.text[:400]
    return r.json()["order_id"]


# --- FIX 1: webhook must fail closed when RAZORPAY_WEBHOOK_SECRET is empty ---
class TestWebhookFailClosed:
    def test_webhook_secret_is_empty_by_design(self):
        assert WEBHOOK_SECRET == "", "Test assumes RAZORPAY_WEBHOOK_SECRET is empty in backend/.env"

    def test_unsigned_webhook_returns_503_and_does_not_upgrade(self, auth_client):
        _reset_demo_user()
        order_id = _new_order(auth_client, "business")
        body = {"event": "payment.captured",
                "payload": {"payment": {"entity": {"order_id": order_id, "id": "pay_TESTwh1"}}}}
        r = requests.post(f"{BASE_URL}/api/webhook/razorpay", json=body, timeout=30)
        assert r.status_code == 503, f"expected 503, got {r.status_code}: {r.text[:300]}"
        assert "Webhook secret not configured" in r.text

        # No upgrade happened
        me = auth_client.get(f"{BASE_URL}/api/auth/me", timeout=30).json()
        assert me["plan"] == "free", f"user was upgraded by unsigned webhook: {me['plan']}"
        assert me["usage"]["limit"] == 5
        st = auth_client.get(f"{BASE_URL}/api/payments/status/{order_id}", timeout=60).json()
        assert st["payment_status"] == "pending"

    def test_signed_webhook_also_503_while_secret_empty(self, auth_client):
        """Even a client-computed 'signature' cannot bypass the missing-secret guard."""
        order_id = _new_order(auth_client, "starter")
        raw = json.dumps({"event": "payment.captured",
                          "payload": {"payment": {"entity": {"order_id": order_id}}}})
        sig = hmac.new(b"", raw.encode(), hashlib.sha256).hexdigest()
        r = requests.post(f"{BASE_URL}/api/webhook/razorpay", data=raw, timeout=30,
                          headers={"Content-Type": "application/json", "X-Razorpay-Signature": sig})
        assert r.status_code == 503
        me = auth_client.get(f"{BASE_URL}/api/auth/me", timeout=30).json()
        assert me["plan"] == "free"

    def test_payment_failed_event_also_blocked(self, auth_client):
        order_id = _new_order(auth_client, "starter")
        r = requests.post(f"{BASE_URL}/api/webhook/razorpay", json={
            "event": "payment.failed",
            "payload": {"payment": {"entity": {"order_id": order_id}}}}, timeout=30)
        assert r.status_code == 503
        st = auth_client.get(f"{BASE_URL}/api/payments/status/{order_id}", timeout=60).json()
        assert st["payment_status"] == "pending"


# --- FIX 1b: _upgrade_user_for_order re-verifies with Razorpay (order status='created' -> no upgrade) ---
class TestUpgradeRequiresRazorpayConfirmation:
    def test_valid_local_signature_on_unpaid_order_does_not_grant_plan(self, auth_client):
        """Signature over order|payment is valid, but Razorpay says the order is 'created',
        so no plan must be granted."""
        from conftest import RZP_SECRET
        _reset_demo_user()
        order_id = _new_order(auth_client, "business")
        payment_id = f"pay_TEST{uuid.uuid4().hex[:12]}"
        sig = hmac.new(RZP_SECRET.encode(), f"{order_id}|{payment_id}".encode(), hashlib.sha256).hexdigest()
        r = auth_client.post(f"{BASE_URL}/api/payments/verify", json={
            "razorpay_order_id": order_id, "razorpay_payment_id": payment_id,
            "razorpay_signature": sig}, timeout=60)
        assert r.status_code == 200, r.text[:400]
        d = r.json()
        assert d["payment_status"] != "paid", "unpaid order was marked paid"

        me = auth_client.get(f"{BASE_URL}/api/auth/me", timeout=30).json()
        assert me["plan"] == "free", f"plan granted without real payment: {me['plan']}"
        assert me["usage"]["limit"] == 5

    def test_status_poll_on_unpaid_order_does_not_upgrade(self, auth_client):
        _reset_demo_user()
        order_id = _new_order(auth_client, "enterprise")
        st = auth_client.get(f"{BASE_URL}/api/payments/status/{order_id}", timeout=60)
        assert st.status_code == 200
        assert st.json()["payment_status"] == "pending"
        me = auth_client.get(f"{BASE_URL}/api/auth/me", timeout=30).json()
        assert me["plan"] == "free"


# --- FIX 2: /api/payments/status requires auth + ownership ---
class TestPaymentStatusAuthorization:
    def test_status_without_auth_returns_401(self, auth_client):
        order_id = _new_order(auth_client, "starter")
        r = requests.get(f"{BASE_URL}/api/payments/status/{order_id}", timeout=30)
        assert r.status_code == 401, f"IDOR: got {r.status_code}: {r.text[:300]}"

    def test_status_with_bad_token_returns_401(self, auth_client):
        order_id = _new_order(auth_client, "starter")
        r = requests.get(f"{BASE_URL}/api/payments/status/{order_id}", timeout=30,
                         headers={"Authorization": "Bearer not.a.jwt"})
        assert r.status_code == 401

    def test_status_other_user_returns_404(self, auth_client):
        order_id = _new_order(auth_client, "business")
        email = f"TEST_{uuid.uuid4().hex[:8]}@qa-truelense.com"
        s = requests.post(f"{BASE_URL}/api/auth/signup",
                          json={"email": email, "password": "testpass123"}, timeout=30)
        assert s.status_code == 200, s.text[:300]
        other = s.json()["token"]
        try:
            r = requests.get(f"{BASE_URL}/api/payments/status/{order_id}", timeout=60,
                             headers={"Authorization": f"Bearer {other}"})
            assert r.status_code == 404, f"ownership check failed: {r.status_code} {r.text[:300]}"
        finally:
            _mongo(f'db.users.deleteMany({{email:"{email.lower()}"}});')

    def test_status_owner_returns_200_with_tx(self, auth_client):
        order_id = _new_order(auth_client, "starter")
        r = auth_client.get(f"{BASE_URL}/api/payments/status/{order_id}", timeout=60)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert set(d) == {"order_id", "status", "payment_status", "plan_id"}
        assert d["order_id"] == order_id
        assert d["plan_id"] == "starter"
        assert d["payment_status"] == "pending"

    def test_status_unknown_order_authenticated_404(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/payments/status/order_doesnotexist123", timeout=60)
        assert r.status_code == 404


# --- FIX 3: plan_valid_until expiry enforcement in /api/auth/me ---
class TestPlanExpiry:
    def test_expired_paid_plan_drops_to_free(self, auth_client):
        _mongo('db.users.updateOne({email:"demo@truelense.app"},{$set:{plan:"starter",'
               'plan_valid_until:new Date(Date.now()-86400000).toISOString()}});')
        me = auth_client.get(f"{BASE_URL}/api/auth/me", timeout=30)
        assert me.status_code == 200
        d = me.json()
        assert d["usage"]["plan"] == "free", f"expired plan not enforced: {d['usage']}"
        assert d["usage"]["limit"] == 5
        # persisted downgrade
        out = _mongo('print(db.users.findOne({email:"demo@truelense.app"}).plan);')
        assert "free" in out, out
        _reset_demo_user()

    def test_future_paid_plan_is_kept(self, auth_client):
        _mongo('db.users.updateOne({email:"demo@truelense.app"},{$set:{plan:"business",'
               'plan_valid_until:new Date(Date.now()+86400000).toISOString()}});')
        me = auth_client.get(f"{BASE_URL}/api/auth/me", timeout=30)
        assert me.status_code == 200
        d = me.json()
        assert d["usage"]["plan"] == "business", d["usage"]
        assert d["usage"]["limit"] == -1
        _reset_demo_user()

    def test_expired_plan_blocks_quota_over_free_limit(self, auth_client):
        """Expired starter must be capped at free limit of 5 in usage response."""
        _mongo('db.users.updateOne({email:"demo@truelense.app"},{$set:{plan:"enterprise",'
               'plan_valid_until:"2020-01-01T00:00:00+00:00"}});')
        d = auth_client.get(f"{BASE_URL}/api/auth/me", timeout=30).json()
        assert d["usage"]["limit"] == 5
        _reset_demo_user()


# --- FIX 4/5: dependency + copy cleanup ---
class TestCleanup:
    def test_stripe_not_in_requirements(self):
        txt = Path("/app/backend/requirements.txt").read_text().lower()
        assert "stripe" not in txt

    def test_no_stripe_in_backend_code(self):
        txt = Path("/app/backend/server.py").read_text().lower()
        assert "stripe" not in txt.replace("webhook/stripe", "")

    def test_dashboard_copy_mentions_razorpay_not_stripe(self):
        txt = Path("/app/frontend/src/pages/Dashboard.jsx").read_text()
        assert "Stripe" not in txt
        assert "Razorpay" in txt
