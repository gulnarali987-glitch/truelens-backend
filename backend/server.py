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
import razorpay
import hmac
import hashlib
from PIL import Image
try:
    import cv2
    import numpy as np
    _QR_OK = True
except Exception as _qr_err:
    cv2 = None
    np = None
    _QR_OK = False
    logging.getLogger("truelense").warning(f"opencv disabled: {_qr_err}")
from io import BytesIO
import trafilatura

from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form, Request, Depends, Cookie, Response, Header
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# --- Config ---
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
WINSTON_API_KEY = os.environ.get("WINSTON_API_KEY", "")
SIGHTENGINE_USER = os.environ.get("SIGHTENGINE_API_USER", "")
SIGHTENGINE_SECRET = os.environ.get("SIGHTENGINE_API_SECRET", "")
JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret")
RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")
RAZORPAY_WEBHOOK_SECRET = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "")

rzp = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)) if (RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET) else None

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="TrueLense API")
api = APIRouter(prefix="/api")

log = logging.getLogger("truelense")
logging.basicConfig(level=logging.INFO)

# --- Plans / usage ---
# price_inr is what Razorpay charges; price_usd kept for legacy display but unused for billing
# yearly = ~20% off vs 12x monthly
PLANS = {
    "free":       {"name": "Free",       "monthly_limit": 5,   "price_usd": 0.0,  "price_inr": 0,     "price_inr_yearly": 0,     "period": None},
    "starter":    {"name": "Starter",    "monthly_limit": 100, "price_usd": 9.0,  "price_inr": 799,   "price_inr_yearly": 7670,  "period": "monthly"},
    "business":   {"name": "Business",   "monthly_limit": -1,  "price_usd": 29.0, "price_inr": 2499,  "price_inr_yearly": 23990, "period": "monthly"},
    "enterprise": {"name": "Enterprise", "monthly_limit": -1,  "price_usd": 99.0, "price_inr": 8299,  "price_inr_yearly": 79670, "period": "monthly"},
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
    cycle: Optional[str] = "monthly"  # "monthly" | "yearly"

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
    """Return {plan, used, limit, month}. Falls back to 'free' if plan_valid_until has passed."""
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    plan = (user or {}).get("plan", "free")
    valid_until = (user or {}).get("plan_valid_until")
    if plan != "free" and valid_until:
        try:
            vu = datetime.fromisoformat(valid_until) if isinstance(valid_until, str) else valid_until
            if vu.tzinfo is None:
                vu = vu.replace(tzinfo=timezone.utc)
            if vu < now_utc():
                # Plan has expired — drop to free
                await db.users.update_one({"user_id": user_id}, {"$set": {"plan": "free"}})
                plan = "free"
        except Exception:
            pass
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
        if not _QR_OK:
            raise HTTPException(503, "QR image decoding is temporarily unavailable on the server. Please paste the decoded URL directly.")
              content = await file.read()
        try:
            img = Image.open(BytesIO(content)).convert("RGB")
            arr = np.array(img)
            arr_bgr = arr[:, :, ::-1].copy()
            detector = cv2.QRCodeDetector()
            data, points, _ = detector.detectAndDecode(arr_bgr)
        except Exception as e:
            raise HTTPException(400, f"Could not read image: {e}")
        if not data:
            raise HTTPException(400, "No QR code detected in the image")
        decoded_url = data 
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

# --- Payments (Razorpay Orders — one-time monthly payments) ---
# Note: We use Razorpay Orders (not Subscriptions) because Subscriptions requires
# enabling the Subscriptions feature in the Razorpay Dashboard. Orders work out-of-the-box.
# To upgrade to auto-renewing Subscriptions later: enable Subscriptions in Razorpay Dashboard
# and swap `rzp.order.create` for `rzp.subscription.create` with a Plan.

@api.get("/config")
async def config():
    """Public config — only the Razorpay Key ID is exposed to the frontend."""
    return {"razorpay_key_id": RAZORPAY_KEY_ID}

@api.get("/pricing")
async def pricing():
    return {"plans": [{"id": pid, **p} for pid, p in PLANS.items()]}

@api.post("/payments/checkout")
async def create_checkout(inp: CheckoutIn, user=Depends(require_user)):
    """Creates a Razorpay Order and returns the id + key for frontend Checkout."""
    if inp.plan_id not in PLANS or inp.plan_id == "free":
        raise HTTPException(400, "Invalid plan")
    if not rzp:
        raise HTTPException(500, "Razorpay is not configured")
    cycle = (inp.cycle or "monthly").lower()
    if cycle not in ("monthly", "yearly"):
        raise HTTPException(400, "Invalid cycle")
    amount_inr = int(PLANS[inp.plan_id]["price_inr_yearly"] if cycle == "yearly" else PLANS[inp.plan_id]["price_inr"])
    amount_paise = amount_inr * 100
    receipt = f"tl_{user['user_id'][:16]}_{int(now_utc().timestamp())}"[:40]
    try:
        order = rzp.order.create({
            "amount": amount_paise,
            "currency": "INR",
            "receipt": receipt,
            "payment_capture": 1,
            "notes": {
                "user_id": user["user_id"],
                "plan_id": inp.plan_id,
                "cycle": cycle,
                "email": user.get("email", ""),
            },
        })
    except Exception as e:
        log.error(f"Razorpay order create failed: {e}")
        raise HTTPException(502, f"Razorpay error: {str(e)[:200]}")
    await db.payment_transactions.insert_one({
        "order_id": order["id"],
        "user_id": user["user_id"],
        "plan_id": inp.plan_id,
        "cycle": cycle,
        "amount_inr": amount_inr,
        "amount_paise": amount_paise,
        "currency": "INR",
        "provider": "razorpay",
        "status": "initiated",
        "payment_status": "pending",
        "created_at": now_utc().isoformat(),
        "updated_at": now_utc().isoformat(),
    })
    return {
        "order_id": order["id"],
        "key_id": RAZORPAY_KEY_ID,
        "plan_id": inp.plan_id,
        "cycle": cycle,
        "amount_inr": amount_inr,
        "amount_paise": amount_paise,
        "currency": "INR",
    }

class VerifyIn(BaseModel):
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str

def _verify_signature(payload: str, signature: str, secret: str) -> bool:
    expected = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)

async def _upgrade_user_for_order(order_id: str) -> Optional[Dict[str, Any]]:
    tx = await db.payment_transactions.find_one({"order_id": order_id}, {"_id": 0})
    if not tx:
        return None
    if tx.get("payment_status") == "paid":
        return tx
    # Fail closed: always verify with Razorpay that the order was actually paid
    if not rzp:
        return tx
    try:
        order = rzp.order.fetch(order_id)
    except Exception as e:
        log.warning(f"Razorpay order fetch failed for {order_id}: {e}")
        return tx
    is_paid = (order.get("status") == "paid") or (
        order.get("amount_paid", 0) >= order.get("amount", 0) and order.get("amount", 0) > 0
    )
    if not is_paid:
        return tx
    await db.payment_transactions.update_one(
        {"order_id": order_id, "payment_status": {"$ne": "paid"}},
        {"$set": {"status": "completed", "payment_status": "paid", "updated_at": now_utc().isoformat()}},
    )
    # Grant plan for 30 days (monthly) or 365 days (yearly)
    days = 365 if (tx.get("cycle") == "yearly") else 30
    valid_until = (now_utc() + timedelta(days=days)).isoformat()
    await db.users.update_one(
        {"user_id": tx["user_id"]},
        {"$set": {"plan": tx["plan_id"], "plan_updated_at": now_utc().isoformat(), "plan_valid_until": valid_until, "plan_cycle": tx.get("cycle", "monthly")}},
    )
    return await db.payment_transactions.find_one({"order_id": order_id}, {"_id": 0})

@api.post("/payments/verify")
async def verify_payment(inp: VerifyIn, user=Depends(require_user)):
    """Called by frontend after Razorpay Checkout success handler."""
    payload = f"{inp.razorpay_order_id}|{inp.razorpay_payment_id}"
    if not RAZORPAY_KEY_SECRET or not _verify_signature(payload, inp.razorpay_signature, RAZORPAY_KEY_SECRET):
        raise HTTPException(400, "Invalid signature")
    tx = await db.payment_transactions.find_one({"order_id": inp.razorpay_order_id}, {"_id": 0})
    if not tx or tx.get("user_id") != user["user_id"]:
        raise HTTPException(404, "Transaction not found")
    await db.payment_transactions.update_one(
        {"order_id": inp.razorpay_order_id},
        {"$set": {"razorpay_payment_id": inp.razorpay_payment_id, "signature_verified": True, "updated_at": now_utc().isoformat()}},
    )
    tx = await _upgrade_user_for_order(inp.razorpay_order_id)
    return {"ok": True, "plan_id": tx.get("plan_id") if tx else None, "payment_status": tx.get("payment_status") if tx else None}

@api.get("/payments/status/{order_id}")
async def payment_status(order_id: str, user=Depends(require_user)):
    tx = await db.payment_transactions.find_one({"order_id": order_id}, {"_id": 0})
    if not tx:
        raise HTTPException(404, "Transaction not found")
    if tx.get("user_id") != user["user_id"]:
        raise HTTPException(404, "Transaction not found")
    if tx.get("payment_status") != "paid" and rzp:
        # _upgrade_user_for_order will only upgrade if Razorpay confirms the order is paid
        try:
            tx = await _upgrade_user_for_order(order_id) or tx
        except Exception as e:
            log.warning(f"Razorpay order poll failed: {e}")
    return {
        "order_id": tx["order_id"],
        "status": tx.get("status"),
        "payment_status": tx.get("payment_status"),
        "plan_id": tx.get("plan_id"),
    }

@api.post("/webhook/razorpay")
async def razorpay_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")
    # Fail closed: refuse if webhook secret isn't configured OR signature is invalid.
    if not RAZORPAY_WEBHOOK_SECRET:
        log.warning("Razorpay webhook received but RAZORPAY_WEBHOOK_SECRET is not set — refusing")
        raise HTTPException(503, "Webhook secret not configured on server")
    if not _verify_signature(body.decode("utf-8"), signature, RAZORPAY_WEBHOOK_SECRET):
        raise HTTPException(400, "Invalid webhook signature")
    try:
        event = await request.json()
    except Exception:
        raise HTTPException(400, "Invalid webhook payload")
    event_name = event.get("event", "")
    payload = event.get("payload", {})
    payment_entity = (payload.get("payment") or {}).get("entity") or {}
    order_entity = (payload.get("order") or {}).get("entity") or {}
    order_id = payment_entity.get("order_id") or order_entity.get("id")
    if event_name in ("payment.captured", "order.paid") and order_id:
        # _upgrade_user_for_order re-verifies with Razorpay before granting the plan
        await _upgrade_user_for_order(order_id)
    elif event_name == "payment.failed" and order_id:
        await db.payment_transactions.update_one(
            {"order_id": order_id},
            {"$set": {"status": "failed", "payment_status": "failed", "updated_at": now_utc().isoformat()}},
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
