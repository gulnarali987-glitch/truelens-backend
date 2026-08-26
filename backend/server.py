"""TrueLense backend - AI content verification"""
import os
import uuid
import base64
import re
import logging
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from urllib.parse import urlparse

import httpx
import bcrypt
import jwt as pyjwt
from PIL import Image
from pyzbar.pyzbar import decode as qr_decode
from io import BytesIO
import trafilatura

from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form, Request, Depends, Cookie, Response, Header
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from dotenv import load_dotenv

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionRequest, CheckoutSessionResponse, CheckoutStatusResponse
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# --- Config ---
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
WINSTON_API_KEY = os.environ.get("WINSTON_API_KEY", "")
SIGHTENGINE_USER = os.environ.get("SIGHTENGINE_API_USER", "")
SIGHTENGINE_SECRET = os.environ.get("SIGHTENGINE_API_SECRET", "")
JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret")
STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "sk_test_emergent")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="TrueLense API")
api = APIRouter(prefix="/api")

log = logging.getLogger("truelense")
logging.basicConfig(level=logging.INFO)

# --- Plans / usage ---
PLANS = {
    "free": {"name": "Free", "monthly_limit": 5, "price_usd": 0.0},
    "starter": {"name": "Starter", "monthly_limit": 100, "price_usd": 9.0},
    "business": {"name": "Business", "monthly_limit": -1, "price_usd": 29.0},
    "enterprise": {"name": "Enterprise", "monthly_limit": -1, "price_usd": 99.0},
}

# --- Models ---
class SignupIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: Optional[str] = None

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class TextCheckIn(BaseModel):
    text: str = Field(min_length=1)

class QRCheckIn(BaseModel):
    url: Optional[str] = None  # decoded URL if provided directly

class URLCheckIn(BaseModel):
    url: str = Field(min_length=4)

class SessionExchangeIn(BaseModel):
    session_id: str

class CheckoutIn(BaseModel):
    plan_id: str  # "starter" | "business" | "enterprise"
    origin_url: str

# --- Helpers ---
def now_utc():
    return datetime.now(timezone.utc)

def month_key(dt: datetime | None = None) -> str:
    dt = dt or now_utc()
    return dt.strftime("%Y-%m")

def make_jwt(user_id: str) -> str:
    payload = {"user_id": user_id, "exp": now_utc() + timedelta(days=7), "iat": now_utc()}
    return pyjwt.encode(payload, JWT_SECRET, algorithm="HS256")

def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def check_pw(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

async def get_current_user(
    request: Request,
    session_token: Optional[str] = Cookie(None),
    authorization: Optional[str] = Header(None),
) -> Optional[Dict[str, Any]]:
    """Returns user dict or None. Checks session_token cookie (Emergent Auth) then Authorization Bearer JWT."""
    # 1) Emergent session cookie
    token = session_token
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
    if token:
        # Try Emergent session lookup
        sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
        if sess:
            expires_at = sess.get("expires_at")
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at and expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at and expires_at > now_utc():
                user = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0, "password_hash": 0})
                if user:
                    return user
        # Try JWT
        try:
            payload = pyjwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            user = await db.users.find_one({"user_id": payload["user_id"]}, {"_id": 0, "password_hash": 0})
            if user:
                return user
        except Exception:
            pass
    return None

async def require_user(user=Depends(get_current_user)):
    if not user:
        raise HTTPException(401, "Not authenticated")
    return user

# --- Usage tracking ---
async def get_usage(user_id: str) -> Dict[str, Any]:
    """Return {plan, used, limit, month}"""
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    plan = (user or {}).get("plan", "free")
    mk = month_key()
    doc = await db.usage.find_one({"user_id": user_id, "month": mk}, {"_id": 0}) or {"count": 0}
    limit = PLANS[plan]["monthly_limit"]
    return {"plan": plan, "used": doc.get("count", 0), "limit": limit, "month": mk}

async def check_and_increment(user: Dict[str, Any]) -> None:
    """Enforce quota + increment usage. Raises HTTPException on limit."""
    usage = await get_usage(user["user_id"])
    if usage["limit"] != -1 and usage["used"] >= usage["limit"]:
        raise HTTPException(402, {"error": "quota_exceeded", "plan": usage["plan"], "used": usage["used"], "limit": usage["limit"]})
    await db.usage.update_one(
        {"user_id": user["user_id"], "month": usage["month"]},
        {"$inc": {"count": 1}, "$setOnInsert": {"user_id": user["user_id"], "month": usage["month"], "created_at": now_utc().isoformat()}},
        upsert=True,
    )

# --- Auth routes ---
@api.post("/auth/signup")
async def signup(inp: SignupIn, response: Response):
    existing = await db.users.find_one({"email": inp.email.lower()})
    if existing:
        raise HTTPException(400, "Email already registered")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    doc = {
        "user_id": user_id,
        "email": inp.email.lower(),
        "name": inp.name or inp.email.split("@")[0],
        "password_hash": hash_pw(inp.password),
        "plan": "free",
        "created_at": now_utc().isoformat(),
        "auth_provider": "password",
    }
    await db.users.insert_one(doc)
    token = make_jwt(user_id)
    response.set_cookie("session_token", token, httponly=True, secure=True, samesite="none", path="/", max_age=7*24*3600)
    return {"user_id": user_id, "email": doc["email"], "name": doc["name"], "plan": "free", "token": token}

@api.post("/auth/login")
async def login(inp: LoginIn, response: Response):
    user = await db.users.find_one({"email": inp.email.lower()})
    if not user or not user.get("password_hash") or not check_pw(inp.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    token = make_jwt(user["user_id"])
    response.set_cookie("session_token", token, httponly=True, secure=True, samesite="none", path="/", max_age=7*24*3600)
    return {"user_id": user["user_id"], "email": user["email"], "name": user.get("name"), "plan": user.get("plan", "free"), "token": token}

@api.post("/auth/logout")
async def logout(response: Response, session_token: Optional[str] = Cookie(None)):
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}

@api.get("/auth/me")
async def me(user=Depends(require_user)):
    usage = await get_usage(user["user_id"])
    return {**user, "usage": usage}

@api.post("/auth/emergent/session")
async def emergent_session(inp: SessionExchangeIn, response: Response):
    """Exchange Emergent session_id → session_token; upsert user."""
    async with httpx.AsyncClient(timeout=15.0) as c:
        r = await c.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": inp.session_id},
        )
    if r.status_code != 200:
        raise HTTPException(401, "Invalid Emergent session")
    data = r.json()
    email = data["email"].lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = {
            "user_id": user_id,
            "email": email,
            "name": data.get("name") or email.split("@")[0],
            "picture": data.get("picture"),
            "plan": "free",
            "auth_provider": "emergent_google",
            "created_at": now_utc().isoformat(),
        }
        await db.users.insert_one(user)
    session_token = data["session_token"]
    expires_at = now_utc() + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user["user_id"],
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": now_utc().isoformat(),
    })
    response.set_cookie("session_token", session_token, httponly=True, secure=True, samesite="none", path="/", max_age=7*24*3600)
    return {"user_id": user["user_id"], "email": email, "name": user.get("name"), "picture": user.get("picture"), "plan": user.get("plan", "free")}

# --- Anonymous quota (session-based header) ---
async def anon_check_and_increment(anon_id: str):
    ANON_FREE = 5
    doc = await db.anon_usage.find_one({"anon_id": anon_id}, {"_id": 0}) or {"count": 0}
    if doc.get("count", 0) >= ANON_FREE:
        raise HTTPException(402, {"error": "anon_limit", "used": doc.get("count", 0), "limit": ANON_FREE, "message": "Anonymous free scans exhausted. Please sign up to continue."})
    await db.anon_usage.update_one(
        {"anon_id": anon_id},
        {"$inc": {"count": 1}, "$setOnInsert": {"anon_id": anon_id, "created_at": now_utc().isoformat()}},
        upsert=True,
    )

async def enforce_quota(user: Optional[Dict[str, Any]], anon_id: Optional[str]):
    if user:
        await check_and_increment(user)
    else:
        if not anon_id:
            raise HTTPException(400, "Missing anon_id or authentication")
        await anon_check_and_increment(anon_id)

# --- Checker routes ---
@api.post("/check/text")
async def check_text(
    inp: TextCheckIn,
    user=Depends(get_current_user),
    x_anon_id: Optional[str] = Header(None),
):
    await enforce_quota(user, x_anon_id)
    data = await _winston_score(inp.text)
    # Winston returns "score": human-likeness 0-100 (higher = more human)
    human_score = float(data.get("score", 50))
    ai_prob = 100.0 - human_score
    verdict = "ai" if ai_prob >= 50 else "real"
    return {
        "verdict": verdict,
        "ai_probability": round(ai_prob, 1),
        "human_probability": round(human_score, 1),
        "confidence": round(max(ai_prob, human_score), 1),
        "details": {"raw": {"score": human_score, "words": data.get("words")}},
        "checker": "text",
    }

async def _winston_score(text: str) -> Dict[str, Any]:
    if not WINSTON_API_KEY:
        raise HTTPException(500, "Winston API key not configured")
    payload = {"text": text, "sentences": False, "language": "en"}
    async with httpx.AsyncClient(timeout=60.0) as c:
        r = await c.post(
            "https://api.gowinston.ai/v2/ai-content-detection",
            headers={"Authorization": f"Bearer {WINSTON_API_KEY}", "Content-Type": "application/json"},
            json=payload,
        )
    if r.status_code >= 400:
        log.error(f"Winston error {r.status_code}: {r.text}")
        try:
            j = r.json()
            desc = j.get("description") or j.get("error") or r.text
        except Exception:
            desc = r.text
        if r.status_code == 402:
            raise HTTPException(502, f"AI-detection service credits exhausted. {desc}")
        raise HTTPException(502, f"Winston API error: {desc[:200]}")
    return r.json()

@api.post("/check/url")
async def check_url(
    inp: URLCheckIn,
    user=Depends(get_current_user),
    x_anon_id: Optional[str] = Header(None),
):
    await enforce_quota(user, x_anon_id)
    url = inp.url.strip()
    if "://" not in url:
        url = "https://" + url
    try:
        p = urlparse(url)
        if p.scheme not in ("http", "https"):
            raise HTTPException(400, "Only http/https URLs are supported")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(400, "Invalid URL")

    # Fetch the page
    try:
        async with httpx.AsyncClient(timeout=25.0, follow_redirects=True, headers={
            "User-Agent": "Mozilla/5.0 (compatible; TrueLenseBot/1.0; +https://truelense.app)"
        }) as c:
            r = await c.get(url)
        if r.status_code >= 400:
            raise HTTPException(400, f"Could not fetch page ({r.status_code})")
        html = r.text
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Fetch failed: {str(e)[:120]}")

    # Extract main content only (drops menus/ads/sidebars/footers)
    extracted = trafilatura.extract(
        html,
        include_comments=False,
        include_tables=False,
        favor_precision=True,
        no_fallback=False,
    ) or ""
    extracted = extracted.strip()
    if len(extracted) < 100:
        raise HTTPException(400, "Could not extract meaningful article text from that page.")

    # Truncate to keep Winston API happy on long articles (~5k chars keeps credit cost low)
    scan_text = extracted[:5000]
    winston = await _winston_score(scan_text)
    human_score = float(winston.get("score", 50))
    ai_prob = 100.0 - human_score
    verdict = "ai" if ai_prob >= 50 else "real"

    # Extract page title if possible
    title = None
    try:
        meta = trafilatura.extract_metadata(html)
        if meta:
            title = meta.title
    except Exception:
        pass

    return {
        "verdict": verdict,
        "ai_probability": round(ai_prob, 1),
        "human_probability": round(human_score, 1),
        "confidence": round(max(ai_prob, human_score), 1),
        "source_url": url,
        "title": title,
        "word_count": len(extracted.split()),
        "scanned_chars": len(scan_text),
        "excerpt": extracted[:280] + ("…" if len(extracted) > 280 else ""),
        "checker": "url",
    }

async def _sightengine_image(img_bytes: bytes, filename: str) -> Dict[str, Any]:
    if not (SIGHTENGINE_USER and SIGHTENGINE_SECRET):
        raise HTTPException(500, "Sightengine credentials not configured")
    async with httpx.AsyncClient(timeout=90.0) as c:
        files = {"media": (filename, img_bytes)}
        data = {"models": "genai", "api_user": SIGHTENGINE_USER, "api_secret": SIGHTENGINE_SECRET}
        r = await c.post("https://api.sightengine.com/1.0/check.json", data=data, files=files)
    if r.status_code >= 400:
        log.error(f"Sightengine error {r.status_code}: {r.text}")
        raise HTTPException(502, f"Sightengine API error: {r.text[:200]}")
    return r.json()

def _parse_sightengine(data: Dict[str, Any]) -> Dict[str, Any]:
    ai_score = float((data.get("type") or {}).get("ai_generated", 0.0))
    ai_prob = ai_score * 100.0
    verdict = "ai" if ai_score >= 0.5 else "real"
    return {
        "verdict": verdict,
        "ai_probability": round(ai_prob, 1),
        "human_probability": round(100.0 - ai_prob, 1),
        "confidence": round(max(ai_prob, 100.0 - ai_prob), 1),
        "details": {"raw": data.get("type")},
    }

@api.post("/check/image")
async def check_image(
    file: UploadFile = File(...),
    user=Depends(get_current_user),
    x_anon_id: Optional[str] = Header(None),
):
    await enforce_quota(user, x_anon_id)
    content = await file.read()
    data = await _sightengine_image(content, file.filename or "image.jpg")
    parsed = _parse_sightengine(data)
    parsed["checker"] = "image"
    return parsed

@api.post("/check/payment")
async def check_payment(
    file: UploadFile = File(...),
    user=Depends(get_current_user),
    x_anon_id: Optional[str] = Header(None),
):
    await enforce_quota(user, x_anon_id)
    content = await file.read()
    data = await _sightengine_image(content, file.filename or "payment.jpg")
    parsed = _parse_sightengine(data)
    parsed["checker"] = "payment"
    parsed["disclaimer"] = (
        "This only checks if the screenshot looks AI-edited or manipulated. It does NOT "
        "confirm the transaction actually happened. Always verify in your bank or UPI app."
    )
    return parsed

# --- QR checker ---
KNOWN_SHORTENERS = {
    "bit.ly", "tinyurl.com", "goo.gl", "t.co", "ow.ly", "buff.ly", "is.gd",
    "rebrand.ly", "cutt.ly", "shorturl.at", "s.id", "rb.gy", "t.ly", "lnkd.in"
}

def _analyze_url(url: str) -> Dict[str, Any]:
    reasons: List[str] = []
    warns: List[str] = []
    try:
        p = urlparse(url if "://" in url else "http://" + url)
    except Exception:
        return {"safe": False, "reasons": ["URL could not be parsed"], "warnings": [], "url": url}
    scheme = (p.scheme or "").lower()
    host = (p.hostname or "").lower()
    if not host:
        reasons.append("No hostname in URL")
    if scheme == "http":
        reasons.append("Uses HTTP (not encrypted) — could be intercepted")
    if re.match(r"^\d{1,3}(\.\d{1,3}){3}$", host or ""):
        reasons.append("Uses raw IP address instead of a domain")
    if host in KNOWN_SHORTENERS:
        reasons.append(f"Uses URL shortener ({host}) — destination hidden")
    if host and host.count("-") >= 3:
        warns.append("Domain has an unusually high number of hyphens")
    if len(url) > 100:
        warns.append("URL is unusually long (over 100 characters)")
    suspicious_tlds = {".zip", ".mov", ".xyz", ".top", ".click"}
    for tld in suspicious_tlds:
        if host and host.endswith(tld):
            warns.append(f"Uses a TLD often abused for phishing ({tld})")
    upi_pattern = re.match(r"^upi://", url, re.IGNORECASE)
    upi_info = None
    if upi_pattern:
        # Parse UPI intent params
        try:
            from urllib.parse import parse_qs
            q = parse_qs(url.split("?", 1)[1]) if "?" in url else {}
            upi_info = {k: v[0] for k, v in q.items()}
        except Exception:
            upi_info = {}
    safe = len(reasons) == 0
    return {"safe": safe, "reasons": reasons, "warnings": warns, "url": url, "host": host, "scheme": scheme, "upi": upi_info}

@api.post("/check/qr")
async def check_qr(
    file: Optional[UploadFile] = File(None),
    url: Optional[str] = Form(None),
    user=Depends(get_current_user),
    x_anon_id: Optional[str] = Header(None),
):
    await enforce_quota(user, x_anon_id)
    decoded_url: Optional[str] = None
    if url and url.strip():
        decoded_url = url.strip()
    elif file:
        content = await file.read()
        try:
            img = Image.open(BytesIO(content))
            results = qr_decode(img)
        except Exception as e:
            raise HTTPException(400, f"Could not read image: {e}")
        if not results:
            raise HTTPException(400, "No QR code detected in the image")
        decoded_url = results[0].data.decode("utf-8", errors="ignore")
    else:
        raise HTTPException(400, "Provide either a QR image file or a decoded URL")
    analysis = _analyze_url(decoded_url)
    verdict = "safe" if analysis["safe"] and not analysis["warnings"] else ("caution" if analysis["safe"] else "unsafe")
    return {
        "verdict": verdict,
        "decoded_url": decoded_url,
        "analysis": analysis,
        "reminder": "Always double-check in your banking or UPI app before paying.",
        "checker": "qr",
    }

# --- Payments (Stripe via emergentintegrations) ---
def _stripe_checkout(host_url: str) -> StripeCheckout:
    webhook_url = f"{host_url.rstrip('/')}/api/webhook/stripe"
    return StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)

@api.get("/pricing")
async def pricing():
    return {"plans": [{"id": pid, **p} for pid, p in PLANS.items()]}

@api.post("/payments/checkout")
async def create_checkout(inp: CheckoutIn, request: Request, user=Depends(require_user)):
    if inp.plan_id not in PLANS or inp.plan_id == "free":
        raise HTTPException(400, "Invalid plan")
    amount = float(PLANS[inp.plan_id]["price_usd"])
    host_url = str(request.base_url)
    checkout = _stripe_checkout(host_url)
    success_url = f"{inp.origin_url.rstrip('/')}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{inp.origin_url.rstrip('/')}/pricing"
    req = CheckoutSessionRequest(
        amount=amount,
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"user_id": user["user_id"], "plan_id": inp.plan_id, "email": user.get("email", "")},
    )
    session: CheckoutSessionResponse = await checkout.create_checkout_session(req)
    await db.payment_transactions.insert_one({
        "session_id": session.session_id,
        "user_id": user["user_id"],
        "plan_id": inp.plan_id,
        "amount": amount,
        "currency": "usd",
        "status": "initiated",
        "payment_status": "pending",
        "created_at": now_utc().isoformat(),
        "updated_at": now_utc().isoformat(),
    })
    return {"checkout_url": session.url, "session_id": session.session_id}

async def _apply_plan_upgrade(session_id: str, status_obj: Any):
    """Idempotent: on paid session, set user's plan."""
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        return
    if tx.get("payment_status") == "paid":
        return  # already applied
    if getattr(status_obj, "payment_status", None) == "paid" or getattr(status_obj, "status", None) == "complete":
        await db.payment_transactions.update_one(
            {"session_id": session_id, "payment_status": {"$ne": "paid"}},
            {"$set": {"status": "completed", "payment_status": "paid", "updated_at": now_utc().isoformat()}},
        )
        await db.users.update_one(
            {"user_id": tx["user_id"]},
            {"$set": {"plan": tx["plan_id"], "plan_updated_at": now_utc().isoformat()}},
        )

@api.get("/payments/status/{session_id}")
async def payment_status(session_id: str, request: Request):
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        raise HTTPException(404, "Transaction not found")
    if tx.get("payment_status") != "paid":
        try:
            checkout = _stripe_checkout(str(request.base_url))
            status_obj: CheckoutStatusResponse = await checkout.get_checkout_status(session_id)
            await _apply_plan_upgrade(session_id, status_obj)
            tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
        except Exception as e:
            log.warning(f"Stripe status poll failed: {e}")
    return {"session_id": tx["session_id"], "status": tx.get("status"), "payment_status": tx.get("payment_status"), "plan_id": tx.get("plan_id")}

@api.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    try:
        checkout = _stripe_checkout(str(request.base_url))
        result = await checkout.handle_webhook(body, sig)
    except Exception as e:
        log.error(f"Webhook error: {e}")
        raise HTTPException(400, "Invalid webhook")
    if result and getattr(result, "session_id", None):
        tx = await db.payment_transactions.find_one({"session_id": result.session_id}, {"_id": 0})
        if tx and tx.get("payment_status") != "paid" and getattr(result, "payment_status", None) == "paid":
            await db.payment_transactions.update_one(
                {"session_id": result.session_id, "payment_status": {"$ne": "paid"}},
                {"$set": {"status": "completed", "payment_status": "paid", "updated_at": now_utc().isoformat()}},
            )
            await db.users.update_one(
                {"user_id": tx["user_id"]},
                {"$set": {"plan": tx["plan_id"], "plan_updated_at": now_utc().isoformat()}},
            )
    return {"ok": True}

# --- Health ---
@api.get("/")
async def root():
    return {"service": "TrueLense", "ok": True}

app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_origin_regex=".*",
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def _shutdown():
    client.close()
