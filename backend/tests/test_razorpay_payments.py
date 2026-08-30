"""Razorpay payment integration tests (config, pricing, checkout, verify, status, webhook)."""
import hashlib
import hmac
import subprocess
import uuid
from datetime import datetime, timezone

import pytest
import requests

from conftest import BASE_URL, RZP_KEY_ID, RZP_SECRET


def _reset_demo_user():
    subprocess.run(
        ["mongosh", "test_database", "--quiet", "--eval",
         'db.users.updateOne({email:"demo@truelense.app"},{$set:{plan:"free"},$unset:{plan_valid_until:""}});'
         'db.usage.deleteMany({});'],
        capture_output=True,
    )


@pytest.fixture(scope="module", autouse=True)
def reset_state():
    _reset_demo_user()
    yield
    _reset_demo_user()


# --- /api/config ---
class TestConfig:
    def test_config_exposes_only_key_id(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/config", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert data == {"razorpay_key_id": RZP_KEY_ID}
        assert RZP_SECRET not in r.text

    def test_secret_not_leaked_on_public_endpoints(self, api_client):
        for path in ["/api/", "/api/config", "/api/pricing"]:
            r = api_client.get(f"{BASE_URL}{path}", timeout=30)
            assert RZP_SECRET not in r.text, f"secret leaked at {path}"


# --- /api/pricing ---
class TestPricing:
    def test_pricing_plans(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/pricing", timeout=30)
        assert r.status_code == 200
        plans = r.json()["plans"]
        assert len(plans) == 4
        by_id = {p["id"]: p for p in plans}
        assert set(by_id) == {"free", "starter", "business", "enterprise"}
        assert by_id["free"]["price_inr"] == 0
        assert by_id["starter"]["price_inr"] == 799
        assert by_id["business"]["price_inr"] == 2499
        assert by_id["enterprise"]["price_inr"] == 8299
        assert by_id["free"]["monthly_limit"] == 5
        assert by_id["starter"]["monthly_limit"] == 100
        assert by_id["business"]["monthly_limit"] == -1
        assert by_id["enterprise"]["monthly_limit"] == -1


# --- /api/payments/checkout ---
class TestCheckout:
    def test_checkout_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/payments/checkout",
                          json={"plan_id": "starter", "origin_url": BASE_URL}, timeout=30)
        assert r.status_code == 401

    def test_checkout_starter(self, auth_client):
        r = auth_client.post(f"{BASE_URL}/api/payments/checkout",
                             json={"plan_id": "starter", "origin_url": BASE_URL}, timeout=60)
        assert r.status_code == 200, r.text[:500]
        d = r.json()
        assert d["order_id"].startswith("order_")
        assert d["key_id"] == RZP_KEY_ID
        assert d["amount_paise"] == 79900
        assert d["amount_inr"] == 799
        assert d["plan_id"] == "starter"
        assert d["currency"] == "INR"

    @pytest.mark.parametrize("plan_id,paise", [("business", 249900), ("enterprise", 829900)])
    def test_checkout_other_paid_plans(self, auth_client, plan_id, paise):
        r = auth_client.post(f"{BASE_URL}/api/payments/checkout",
                             json={"plan_id": plan_id, "origin_url": BASE_URL}, timeout=60)
        assert r.status_code == 200, r.text[:500]
        assert r.json()["amount_paise"] == paise

    def test_checkout_free_plan_rejected(self, auth_client):
        r = auth_client.post(f"{BASE_URL}/api/payments/checkout",
                             json={"plan_id": "free", "origin_url": BASE_URL}, timeout=30)
        assert r.status_code == 400

    def test_checkout_unknown_plan_rejected(self, auth_client):
        r = auth_client.post(f"{BASE_URL}/api/payments/checkout",
                             json={"plan_id": "bogus", "origin_url": BASE_URL}, timeout=30)
        assert r.status_code == 400


# --- /api/payments/verify ---
class TestVerify:
    def test_verify_invalid_signature(self, auth_client):
        order = auth_client.post(f"{BASE_URL}/api/payments/checkout",
                                 json={"plan_id": "starter", "origin_url": BASE_URL}, timeout=60).json()
        r = auth_client.post(f"{BASE_URL}/api/payments/verify", json={
            "razorpay_order_id": order["order_id"],
            "razorpay_payment_id": "pay_TESTinvalid123",
            "razorpay_signature": "deadbeef" * 8,
        }, timeout=30)
        assert r.status_code == 400
        assert "Invalid signature" in r.text

    def test_verify_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/payments/verify", json={
            "razorpay_order_id": "order_x", "razorpay_payment_id": "pay_x", "razorpay_signature": "x",
        }, timeout=30)
        assert r.status_code == 401

    def test_verify_valid_signature_accepted_but_no_plan_without_razorpay_paid(self, auth_client):
        """Post-fix behaviour: signature valid -> 200, but plan is granted only after
        rzp.order.fetch confirms status == 'paid'. Order is 'created' here => stays free."""
        _reset_demo_user()
        order = auth_client.post(f"{BASE_URL}/api/payments/checkout",
                                 json={"plan_id": "starter", "origin_url": BASE_URL}, timeout=60).json()
        order_id = order["order_id"]
        payment_id = f"pay_TEST{uuid.uuid4().hex[:12]}"
        sig = hmac.new(RZP_SECRET.encode(), f"{order_id}|{payment_id}".encode(), hashlib.sha256).hexdigest()
        r = auth_client.post(f"{BASE_URL}/api/payments/verify", json={
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": sig,
        }, timeout=60)
        assert r.status_code == 200, r.text[:500]
        d = r.json()
        assert d["ok"] is True
        assert d["plan_id"] == "starter"
        assert d["payment_status"] != "paid"

        me = auth_client.get(f"{BASE_URL}/api/auth/me", timeout=30)
        assert me.status_code == 200
        mu = me.json()
        assert mu["plan"] == "free"
        assert mu["usage"]["limit"] == 5

        st = auth_client.get(f"{BASE_URL}/api/payments/status/{order_id}", timeout=60)
        assert st.status_code == 200
        assert st.json()["payment_status"] == "pending"
        _reset_demo_user()

    def test_verify_signature_of_other_users_order(self, auth_client):
        """Signature valid but tx belongs to another user -> 404."""
        email = f"TEST_{uuid.uuid4().hex[:8]}@qa-truelense.com"
        s = requests.post(f"{BASE_URL}/api/auth/signup",
                          json={"email": email, "password": "testpass123"}, timeout=30)
        assert s.status_code == 200, s.text[:300]
        other_token = s.json()["token"]
        order = requests.post(f"{BASE_URL}/api/payments/checkout",
                              json={"plan_id": "starter", "origin_url": BASE_URL},
                              headers={"Authorization": f"Bearer {other_token}"}, timeout=60).json()
        order_id = order["order_id"]
        payment_id = f"pay_TEST{uuid.uuid4().hex[:12]}"
        sig = hmac.new(RZP_SECRET.encode(), f"{order_id}|{payment_id}".encode(), hashlib.sha256).hexdigest()
        r = auth_client.post(f"{BASE_URL}/api/payments/verify", json={
            "razorpay_order_id": order_id, "razorpay_payment_id": payment_id,
            "razorpay_signature": sig}, timeout=30)
        assert r.status_code == 404, r.text[:300]


# --- /api/payments/status (auth required post-fix) ---
class TestStatus:
    def test_status_unknown_order(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/payments/status/order_doesnotexist123", timeout=60)
        assert r.status_code == 404

    def test_status_initiated_order(self, auth_client):
        order = auth_client.post(f"{BASE_URL}/api/payments/checkout",
                                 json={"plan_id": "business", "origin_url": BASE_URL}, timeout=60).json()
        r = auth_client.get(f"{BASE_URL}/api/payments/status/{order['order_id']}", timeout=60)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert set(d) == {"order_id", "status", "payment_status", "plan_id"}
        assert d["order_id"] == order["order_id"]
        assert d["payment_status"] == "pending"
        assert d["plan_id"] == "business"


# --- /api/webhook/razorpay (fails closed while secret is unset) + stripe removal ---
class TestWebhook:
    def test_stripe_webhook_removed(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/webhook/stripe", json={}, timeout=30)
        assert r.status_code == 404

    def test_razorpay_webhook_unsigned_refused(self, auth_client):
        _reset_demo_user()
        order = auth_client.post(f"{BASE_URL}/api/payments/checkout",
                                 json={"plan_id": "business", "origin_url": BASE_URL}, timeout=60).json()
        order_id = order["order_id"]
        r = requests.post(f"{BASE_URL}/api/webhook/razorpay", json={
            "event": "payment.captured",
            "payload": {"payment": {"entity": {"order_id": order_id, "id": "pay_TESTwh1"}}},
        }, timeout=30)
        assert r.status_code == 503, r.text[:300]

        st = auth_client.get(f"{BASE_URL}/api/payments/status/{order_id}", timeout=60).json()
        assert st["payment_status"] == "pending"
        assert st["status"] != "completed"

        me = auth_client.get(f"{BASE_URL}/api/auth/me", timeout=30).json()
        assert me["plan"] == "free"
        assert me["usage"]["limit"] == 5
        _reset_demo_user()

    def test_razorpay_webhook_payment_failed_refused(self, auth_client):
        order = auth_client.post(f"{BASE_URL}/api/payments/checkout",
                                 json={"plan_id": "starter", "origin_url": BASE_URL}, timeout=60).json()
        order_id = order["order_id"]
        r = requests.post(f"{BASE_URL}/api/webhook/razorpay", json={
            "event": "payment.failed",
            "payload": {"payment": {"entity": {"order_id": order_id}}},
        }, timeout=30)
        assert r.status_code == 503
        st = auth_client.get(f"{BASE_URL}/api/payments/status/{order_id}", timeout=60).json()
        assert st["payment_status"] == "pending"

    def test_razorpay_webhook_unknown_order_refused(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/webhook/razorpay", json={
            "event": "payment.captured",
            "payload": {"payment": {"entity": {"order_id": "order_unknown_xyz"}}},
        }, timeout=30)
        assert r.status_code == 503
