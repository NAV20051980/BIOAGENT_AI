"""
BioAgent AI — main.py
OWNER: Member 2B (Backend API & Data Layer)

This file owns FastAPI, SQLite, and all HTTP endpoints. It imports
`decide_irrigation()` and `force_weather_scenario()` from agent.py (Member 2A's
file) and doesn't need to know how the reasoning inside it works.

Run with:
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

import os
import time
import sqlite3
from contextlib import contextmanager
import bcrypt
from jose import jwt as jose_jwt, JWTError

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status as http_status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Union, Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
load_dotenv()

from agent import (
    decide_irrigation,
    get_weather_forecast,
    force_weather_scenario,
    set_plant_profile,
    get_plant_profile,
)
from plant_id import identify_plant_from_bytes

DB_PATH = "bioagent.db"
app = FastAPI(title="BioAgent AI Backend")

# Enable CORS for dashboard and plant camera UI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# AUTHENTICATION & SECURITY CONFIGURATION
# ============================================================
JWT_SECRET = os.getenv("JWT_SECRET", "bioagent-jwt-super-secret-key-2026")
JWT_ALGORITHM = "HS256"
JWT_EXPIRES_HOURS = 24

security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Hash plaintext password with bcrypt."""
    pwd_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plaintext password against bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def create_access_token(data: dict, expires_delta_hours: int = JWT_EXPIRES_HOURS) -> str:
    """Generate signed JWT token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=expires_delta_hours)
    to_encode.update({"exp": expire})
    return jose_jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(security)) -> dict:
    """FastAPI Dependency: extracts and validates user_id from Bearer JWT.
    Raises HTTP 401 Unauthorized on missing, invalid, or expired tokens.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=http_status.HTTP_401_UNAUTHORIZED,
            detail="Authorization token missing or invalid",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    try:
        payload = jose_jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(
                status_code=http_status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: user_id missing",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return {"user_id": user_id, "username": payload.get("username")}
    except JWTError as e:
        raise HTTPException(
            status_code=http_status.HTTP_401_UNAUTHORIZED,
            detail=f"Token invalid or expired: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_401_UNAUTHORIZED,
            detail=f"Token authentication failed: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ============================================================
# DATABASE
# ============================================================
@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS decisions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp REAL NOT NULL,
                device_id TEXT,
                soil_moisture_pct REAL,
                temperature_c REAL,
                humidity_pct REAL,
                trigger_pump INTEGER,
                duration_sec INTEGER,
                reason TEXT
            )
        """)
        # 1. users table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        # 2. plants table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS plants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                species TEXT NOT NULL,
                scientific_name TEXT,
                confidence REAL,
                ideal_moisture_min INT,
                ideal_moisture_max INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        # 3. irrigation_history table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS irrigation_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                plant_id INTEGER,
                soil_moisture INT,
                decision TEXT,
                duration_sec INT,
                reason TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        # 4. telemetry table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS telemetry (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                soil_moisture INT,
                temperature FLOAT,
                humidity FLOAT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)

        # Demo Account & Demo Plant Initialization
        demo_user = conn.execute(
            "SELECT id FROM users WHERE username = ?", ("demo",)
        ).fetchone()

        if not demo_user:
            demo_hash = hash_password("demo123")
            cursor = conn.execute(
                """INSERT INTO users (username, email, password_hash)
                   VALUES (?, ?, ?)""",
                ("demo", "demo@bioagent.local", demo_hash),
            )
            demo_user_id = cursor.lastrowid
        else:
            demo_user_id = demo_user["id"]

        demo_plant = conn.execute(
            "SELECT id FROM plants WHERE user_id = ?", (demo_user_id,)
        ).fetchone()

        if not demo_plant:
            plant_cursor = conn.execute(
                """INSERT INTO plants
                   (user_id, species, scientific_name, confidence, ideal_moisture_min, ideal_moisture_max)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (demo_user_id, "Bael", "Aegle marmelos", 95.0, 40, 60),
            )
            demo_plant_id = plant_cursor.lastrowid
        else:
            demo_plant_id = demo_plant["id"]

        # Seed initial history & telemetry for demo account if empty
        history_count = conn.execute(
            "SELECT COUNT(*) as cnt FROM irrigation_history WHERE user_id = ?", (demo_user_id,)
        ).fetchone()["cnt"]

        if history_count == 0:
            now_sec = time.time()
            conn.execute(
                """INSERT INTO irrigation_history
                   (user_id, plant_id, soil_moisture, decision, duration_sec, reason, timestamp)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (
                    demo_user_id,
                    demo_plant_id,
                    48,
                    "DO NOT WATER",
                    0,
                    "Soil moisture 48% is within optimal range (40% - 60%) for Bael. Weather forecast stable.",
                    now_sec - 120,
                ),
            )
            conn.execute(
                """INSERT INTO irrigation_history
                   (user_id, plant_id, soil_moisture, decision, duration_sec, reason, timestamp)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (
                    demo_user_id,
                    demo_plant_id,
                    38,
                    "WATER",
                    5,
                    "Soil moisture 38% fell below minimum threshold (40%) for Bael. Micro-irrigation pulse triggered.",
                    now_sec - 720,
                ),
            )
            conn.execute(
                """INSERT INTO telemetry
                   (user_id, soil_moisture, temperature, humidity, timestamp)
                   VALUES (?, ?, ?, ?, ?)""",
                (demo_user_id, 48, 24.5, 52.0, now_sec - 120),
            )
            conn.execute(
                """INSERT INTO telemetry
                   (user_id, soil_moisture, temperature, humidity, timestamp)
                   VALUES (?, ?, ?, ?, ?)""",
                (demo_user_id, 38, 25.1, 49.0, now_sec - 720),
            )


init_db()


def save_decision(telemetry: dict, decision: dict, device_id: str):
    with get_db() as conn:
        conn.execute(
            """INSERT INTO decisions
               (timestamp, device_id, soil_moisture_pct, temperature_c, humidity_pct,
                trigger_pump, duration_sec, reason)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                time.time(),
                device_id,
                telemetry.get("soil_moisture_pct"),
                telemetry.get("temperature_c"),
                telemetry.get("humidity_pct"),
                int(decision["trigger_pump"]),
                decision["duration_sec"],
                decision["reason"],
            ),
        )


def get_recent_decisions(limit: int = 20) -> list:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM decisions ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
    return [dict(r) for r in reversed(rows)]


def rows_to_history_shape(rows: list) -> list:
    """Convert DB rows into the {timestamp, soil_moisture_pct, decision} shape
    that agent.py's decide_irrigation() expects for its `history` argument.
    """
    return [
        {
            "timestamp": r["timestamp"],
            "soil_moisture_pct": r["soil_moisture_pct"],
            "decision": {
                "trigger_pump": bool(r["trigger_pump"]),
                "duration_sec": r["duration_sec"],
                "reason": r["reason"],
            },
        }
        for r in rows
    ]


# ============================================================
# SCHEMAS
# ============================================================
class Telemetry(BaseModel):
    soil_moisture_pct: float
    temperature_c: float
    humidity_pct: float
    device_id: str = "esp32-01"
    demo_weather_override: dict | None = None


class DemoScenario(BaseModel):
    scenario: str | None = None  # "rain" | "clear" | "storm" | "heatwave" | "cloudy" | "off" | "custom"
    condition: str | None = None  # e.g. "Clear / Sunny", "Light Rain", "Heavy Thunderstorm", "Cloudy", "Heatwave"
    rain_probability_pct: float | None = None
    max_rain_probability_pct: float | None = None
    expected_rain_mm_24h: float | None = None
    expected_rainfall_mm: float | None = None
    temperature_c: float | None = None
    temperature_offset_c: float | None = None


class SignupRequest(BaseModel):
    username: str
    email: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class VerifyTokenRequest(BaseModel):
    token: str | None = None


class PlantProfileStoreRequest(BaseModel):
    species: str
    scientific_name: str | None = None
    confidence: float | None = 1.0
    ideal_moisture_min: int = 40
    ideal_moisture_max: int = 60


class IrrigateDecisionStoreRequest(BaseModel):
    plant_id: int | None = None
    soil_moisture: int
    decision: str
    duration_sec: int = 0
    reason: str = ""


class UserTelemetryStoreRequest(BaseModel):
    soil_moisture: int
    temperature: float = 24.0
    humidity: float = 50.0
    age_seconds: int | None = None


class PumpActivateRequest(BaseModel):
    duration_sec: int = 5
    reason: str = "Manual pump activation requested via dashboard"
    plant_id: int | None = None
    soil_moisture: int | None = None

class PlantHealthComponents(BaseModel):
    moisture: float
    temperature: float
    humidity: float
    watering: float

class PlantHealthResponse(BaseModel):
    health_score: float
    trend: str
    components: PlantHealthComponents
class WaterSavingsResponse(BaseModel):
    water_saved_liters: float
    percentage_saved: float
    cost_saved_inr: float
    co2_saved_kg: float
    co2_equivalent_km: float
    period_days: int
    manual_estimate_liters: float
    actual_usage_liters: float


# ============================================================
# ENDPOINTS
# ============================================================
@app.get("/")
def root():
    return {
        "project": "BioAgent AI",
        "status": "running",
        "endpoints": [
            "/auth/signup (POST)",
            "/auth/login (POST)",
            "/auth/verify (POST)",
            "/plant-profile (POST, user-authenticated)",
            "/plant-profile (GET)",
            "/irrigate-decision (POST, user-authenticated)",
            "/irrigation-history (GET, user-authenticated)",
            "/user-plants (GET, user-authenticated)",
            "/telemetry (POST)",
            "/latest-decision",
            "/history",
            "/weather",
            "/status",
            "/demo/weather-scenario (POST)",
            "/identify-plant (POST, image upload)",
            "/docs",
        ],
    }


# ============================================================
# AUTHENTICATION ENDPOINTS
# ============================================================
@app.post("/auth/signup", status_code=201)
def signup(payload: SignupRequest):
    """Create new user account with hashed password."""
    username = payload.username.strip()
    email = payload.email.strip().lower()
    password = payload.password

    if not username or not email or not password:
        raise HTTPException(
            status_code=400,
            detail="Username, email, and password are required",
        )

    with get_db() as conn:
        existing = conn.execute(
            "SELECT id FROM users WHERE username = ? OR email = ?",
            (username, email),
        ).fetchone()
        if existing:
            raise HTTPException(
                status_code=400,
                detail="Username or email already registered",
            )

        password_hash = hash_password(password)
        cursor = conn.execute(
            "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
            (username, email, password_hash),
        )
        user_id = cursor.lastrowid

    return {
        "message": "User account created successfully",
        "user_id": user_id,
        "username": username,
        "email": email,
    }


@app.post("/auth/login")
def login(payload: LoginRequest):
    """Authenticate credentials and return JWT bearer access token."""
    username = payload.username.strip()
    password = payload.password

    with get_db() as conn:
        user = conn.execute(
            "SELECT id, username, email, password_hash FROM users WHERE username = ?",
            (username,),
        ).fetchone()

    if not user or not verify_password(password, user["password_hash"]):
        raise HTTPException(
            status_code=http_status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token({"user_id": user["id"], "username": user["username"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": user["id"],
        "username": user["username"],
    }


@app.post("/auth/verify")
def verify_token(
    payload: VerifyTokenRequest | None = None,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
):
    """Validate JWT token from Authorization header or JSON body."""
    token = None
    if credentials and credentials.credentials:
        token = credentials.credentials
    elif payload and payload.token:
        token = payload.token

    if not token:
        raise HTTPException(
            status_code=http_status.HTTP_401_UNAUTHORIZED,
            detail="Token missing or invalid",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        decoded = jose_jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = decoded.get("user_id")
        if user_id is None:
            raise HTTPException(
                status_code=http_status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload: user_id missing",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return {
            "valid": True,
            "user_id": user_id,
            "username": decoded.get("username"),
        }
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_401_UNAUTHORIZED,
            detail=f"Token invalid or expired: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ============================================================
# USER-AUTHENTICATED PER-USER STORAGE ENDPOINTS
# ============================================================
@app.post("/plant-profile")
def store_user_plant_profile(
    plant: PlantProfileStoreRequest,
    current_user: dict = Depends(get_current_user),
):
    """Store plant profile associated with authenticated user_id from JWT."""
    user_id = current_user["user_id"]
    with get_db() as conn:
        cursor = conn.execute(
            """INSERT INTO plants
               (user_id, species, scientific_name, confidence, ideal_moisture_min, ideal_moisture_max)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                user_id,
                plant.species,
                plant.scientific_name,
                plant.confidence,
                plant.ideal_moisture_min,
                plant.ideal_moisture_max,
            ),
        )
        plant_id = cursor.lastrowid

    # Update active reasoning profile
    set_plant_profile({
        "species": plant.species,
        "scientific_name": plant.scientific_name,
        "ideal_moisture_range_pct": [plant.ideal_moisture_min, plant.ideal_moisture_max],
    })

    return {
        "message": "Plant profile saved successfully",
        "plant_id": plant_id,
        "user_id": user_id,
        "species": plant.species,
        "scientific_name": plant.scientific_name,
        "confidence": plant.confidence,
        "ideal_moisture_min": plant.ideal_moisture_min,
        "ideal_moisture_max": plant.ideal_moisture_max,
    }


@app.post("/irrigate-decision")
def store_user_irrigate_decision(
    data: IrrigateDecisionStoreRequest,
    current_user: dict = Depends(get_current_user),
):
    """Store irrigation decision associated with authenticated user_id from JWT."""
    user_id = current_user["user_id"]
    now_ts = time.time()
    with get_db() as conn:
        cursor = conn.execute(
            """INSERT INTO irrigation_history
               (user_id, plant_id, soil_moisture, decision, duration_sec, reason, timestamp)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                user_id,
                data.plant_id,
                data.soil_moisture,
                data.decision,
                data.duration_sec,
                data.reason,
                now_ts,
            ),
        )
        history_id = cursor.lastrowid

        # Also store into telemetry table
        conn.execute(
            """INSERT INTO telemetry
               (user_id, soil_moisture, temperature, humidity, timestamp)
               VALUES (?, ?, ?, ?, ?)""",
            (
                user_id,
                data.soil_moisture,
                24.0,
                50.0,
                now_ts,
            ),
        )

    return {
        "message": "Irrigation decision stored successfully",
        "id": history_id,
        "user_id": user_id,
        "plant_id": data.plant_id,
        "soil_moisture": data.soil_moisture,
        "decision": data.decision,
        "duration_sec": data.duration_sec,
        "reason": data.reason,
        "timestamp": now_ts,
    }


@app.get("/irrigation-history")
def get_user_irrigation_history(
    limit: int = 50,
    current_user: dict = Depends(get_current_user),
):
    """Fetch history filtered strictly by authenticated user_id from JWT."""
    user_id = current_user["user_id"]
    with get_db() as conn:
        rows = conn.execute(
            """SELECT * FROM irrigation_history
               WHERE user_id = ?
               ORDER BY id DESC LIMIT ?""",
            (user_id, limit),
        ).fetchall()
    return {"history": [dict(r) for r in rows]}


@app.get("/user-plants")
@app.get("/api/user-plants")
def get_user_plants(
    current_user: dict = Depends(get_current_user),
):
    """List all plants owned by the authenticated user_id from JWT."""
    user_id = current_user["user_id"]
    with get_db() as conn:
        rows = conn.execute(
            """SELECT * FROM plants
               WHERE user_id = ?
               ORDER BY id DESC""",
            (user_id,),
        ).fetchall()
    return {"plants": [dict(r) for r in rows]}


@app.get("/user-profile")
@app.get("/api/user-profile")
def get_user_profile(
    user_id: int | None = None,
    current_user: dict = Depends(get_current_user),
):
    """Fetch user profile metadata and statistics from database."""
    target_user_id = user_id or current_user["user_id"]
    with get_db() as conn:
        user_row = conn.execute(
            "SELECT id, username, email, created_at FROM users WHERE id = ?",
            (target_user_id,),
        ).fetchone()

        plant_count = conn.execute(
            "SELECT COUNT(*) as count FROM plants WHERE user_id = ?",
            (target_user_id,),
        ).fetchone()["count"]

    if not user_row:
        return {
            "user_id": target_user_id,
            "username": current_user.get("username", "User"),
            "email": current_user.get("email", ""),
            "total_plants": plant_count,
            "auto_irrigation_enabled": True,
            "last_login": "recently",
            "created_at": "recently",
        }

    return {
        "user_id": user_row["id"],
        "username": user_row["username"],
        "email": user_row["email"],
        "created_at": user_row["created_at"],
        "total_plants": plant_count,
        "auto_irrigation_enabled": True,
        "last_login": "recently",
    }


@app.get("/telemetry-history")
def get_telemetry_history(
    limit: int = 24,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
):
    """Fetch recent telemetry readings for sparkline & analytics."""
    user_id = 1
    if credentials and credentials.credentials:
        try:
            payload = jose_jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            if payload.get("user_id"):
                user_id = payload.get("user_id")
        except Exception:
            pass

    with get_db() as conn:
        rows = conn.execute(
            """SELECT soil_moisture, temperature, humidity, timestamp FROM telemetry
               WHERE user_id = ?
               ORDER BY id DESC LIMIT ?""",
            (user_id, limit),
        ).fetchall()

        if not rows:
            rows = conn.execute(
                """SELECT soil_moisture_pct as soil_moisture, temperature_c as temperature,
                          humidity_pct as humidity, timestamp FROM decisions
                   ORDER BY id DESC LIMIT ?""",
                (limit,),
            ).fetchall()

    data = [dict(r) for r in reversed(rows)]
    return {"telemetry": data}


@app.post("/user-telemetry")
def store_user_telemetry(
    payload: Union[UserTelemetryStoreRequest, List[UserTelemetryStoreRequest]],
    current_user: dict = Depends(get_current_user),
):
    """Store raw telemetry associated with authenticated user_id from JWT.

    Accepts either a single telemetry object or an array of objects (batch).
    Each object may include an optional `age_seconds` field to offset the
    stored timestamp backward from the current time, enabling offline-buffered
    readings sent after WiFi reconnection.
    """
    user_id = current_user["user_id"]

    # Normalise to a list so both single and batch payloads use the same path
    items: List[UserTelemetryStoreRequest] = (
        payload if isinstance(payload, list) else [payload]
    )

    results = []
    now_ts = time.time()

    with get_db() as conn:
        for item in items:
            ts = now_ts - (item.age_seconds or 0)
            cursor = conn.execute(
                """INSERT INTO telemetry
                   (user_id, soil_moisture, temperature, humidity, timestamp)
                   VALUES (?, ?, ?, ?, ?)""",
                (
                    user_id,
                    item.soil_moisture,
                    item.temperature,
                    item.humidity,
                    ts,
                ),
            )
            results.append({
                "id": cursor.lastrowid,
                "status": "stored",
                "soil_moisture": item.soil_moisture,
                "temperature": item.temperature,
                "humidity": item.humidity,
                "timestamp": ts,
            })

    return {
        "message": "Telemetry stored successfully",
        "user_id": user_id,
        "processed": len(results),
        "results": results,
    }


@app.post("/identify-plant")
@app.post("/api/identify-plant")
async def identify_plant(
    file: UploadFile | None = File(None),
    image: UploadFile | None = File(None),
    plant_id: Optional[str] = Form(None),
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
):
    """Upload a photo of the plant once during onboarding or diagnosis. Runs Groq Vision
    (qwen/qwen3.8-27b) for botanical plant identification, sets the resulting
    care profile as the active profile, and returns the identification details.
    """
    upload = file or image
    if not upload:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Unable to analyze image. Please upload a clear JPG/PNG under 5MB.",
        )

    image_bytes = await upload.read()
    if not image_bytes or len(image_bytes) == 0:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Unable to analyze image. Please upload a clear JPG/PNG under 5MB.",
        )

    if len(image_bytes) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=http_status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Unable to analyze image. Please upload a clear JPG/PNG under 5MB.",
        )

    result = identify_plant_from_bytes(image_bytes)
    if result.get("profile_activated") is True:
        profile = result.get("profile") or {}
        set_plant_profile(profile)

        # Also store to user's plants table if user identified
        user_id = 1
        if credentials and credentials.credentials:
            try:
                payload = jose_jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
                if payload.get("user_id"):
                    user_id = payload.get("user_id")
            except Exception:
                pass

        try:
            ideal_range = profile.get("ideal_moisture_range_pct") or [40, 60]
            with get_db() as conn:
                conn.execute(
                    """INSERT INTO plants
                       (user_id, species, scientific_name, confidence, ideal_moisture_min, ideal_moisture_max)
                       VALUES (?, ?, ?, ?, ?, ?)""",
                    (
                        user_id,
                        result.get("species") or "Identified Plant",
                        result.get("scientific_name") or "",
                        float(result.get("confidence") or 0.95),
                        int(ideal_range[0]),
                        int(ideal_range[1]),
                    ),
                )
        except Exception as e:
            print(f"Notice: could not save plant to DB: {e}")

    return result


@app.post("/pump/activate")
def activate_pump(
    payload: PumpActivateRequest | None = None,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
):
    """Activates the irrigation pump relay for duration_sec seconds."""
    duration = payload.duration_sec if payload and payload.duration_sec else 5
    reason = payload.reason if payload and payload.reason else "Manual pump activation requested via dashboard"
    soil_moisture = payload.soil_moisture if payload and payload.soil_moisture is not None else 35
    now_ts = time.time()

    user_id = 1
    if credentials and credentials.credentials:
        try:
            tok_payload = jose_jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            if tok_payload.get("user_id"):
                user_id = tok_payload.get("user_id")
        except Exception:
            pass

    response_data = {
        "decision": "WATER",
        "trigger_pump": True,
        "duration_sec": duration,
        "reason": reason,
        "timestamp": now_ts,
        "soil_moisture": soil_moisture,
        "temp": 24.5,
        "humidity": 50.0,
    }

    # Save to decisions & telemetry & history tables
    with get_db() as conn:
        conn.execute(
            """INSERT INTO decisions
               (timestamp, device_id, soil_moisture_pct, temperature_c, humidity_pct,
                trigger_pump, duration_sec, reason)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                now_ts,
                "esp32-01",
                soil_moisture,
                24.5,
                50.0,
                1,
                duration,
                reason,
            ),
        )
        conn.execute(
            """INSERT INTO irrigation_history
               (user_id, plant_id, soil_moisture, decision, duration_sec, reason, timestamp)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                user_id,
                payload.plant_id if payload else 1,
                soil_moisture,
                "WATER",
                duration,
                reason,
                now_ts,
            ),
        )
        conn.execute(
            """INSERT INTO telemetry
               (user_id, soil_moisture, temperature, humidity, timestamp)
               VALUES (?, ?, ?, ?, ?)""",
            (
                user_id,
                soil_moisture,
                24.5,
                50.0,
                now_ts,
            ),
        )

    return response_data


@app.get("/plant-profile")
def plant_profile():
    """Returns the plant profile currently being used by the agent's reasoning."""
    return get_plant_profile()


@app.post("/telemetry")
def receive_telemetry(
    telemetry: Telemetry,
    demo_weather_override: str | None = None,
):
    history = rows_to_history_shape(get_recent_decisions(limit=5))
    override = telemetry.demo_weather_override
    if not override and demo_weather_override:
        try:
            override = json.loads(demo_weather_override)
        except Exception:
            pass
    decision = decide_irrigation(telemetry.model_dump(), history=history, weather_override=override)
    save_decision(telemetry.model_dump(), decision, telemetry.device_id)
    return decision


@app.get("/latest-decision")
def latest_decision():
    rows = get_recent_decisions(limit=1)
    if not rows:
        return {"message": "no decisions yet"}
    return rows[0]


@app.get("/history")
def history(limit: int = 20):
    return {"history": get_recent_decisions(limit=limit)}


@app.get("/weather")
def weather():
    return get_weather_forecast()


@app.get("/status")
def status():
    rows = get_recent_decisions(limit=1)
    return {
        "status": "ok",
        "total_decisions_logged": len(get_recent_decisions(limit=10000)),
        "last_decision_at": rows[0]["timestamp"] if rows else None,
    }


@app.post("/demo/weather-scenario")
def set_demo_weather(payload: DemoScenario):
    """Lets Member 3/4 force a weather scenario or custom parameters for live demo simulations,
    without needing real weather to cooperate on stage.
    scenario: "rain" | "clear" | "storm" | "heatwave" | "cloudy" | "off" | "custom"
    """
    raw_dict = payload.model_dump(exclude_none=True)
    if not raw_dict or raw_dict.get("scenario") == "off":
        force_weather_scenario(None)
        return {
            "forced_scenario": "off (using real weather)",
            "active_weather": get_weather_forecast(),
        }

    has_custom_fields = any(
        k in raw_dict
        for k in (
            "condition",
            "rain_probability_pct",
            "max_rain_probability_pct",
            "expected_rain_mm_24h",
            "expected_rainfall_mm",
            "temperature_c",
        )
    )

    if has_custom_fields:
        force_weather_scenario(raw_dict)
    else:
        force_weather_scenario(raw_dict.get("scenario"))

    active = get_weather_forecast()
    return {
        "forced_scenario": raw_dict.get("scenario") or "custom",
        "active_weather": active,
    }

@app.get("/plant-health/{plant_id}", response_model=PlantHealthResponse)
@app.get("/api/plant-health/{plant_id}", response_model=PlantHealthResponse)
async def get_plant_health(plant_id: str, current_user: dict = Depends(get_current_user)):
    """Get plant health score (0-100%) with trend and component breakdown.
    Accepts integer IDs, prefixed IDs (e.g. 'plant-1'), or species strings.
    """
    user_id = current_user['user_id']

    numeric_id = None
    if str(plant_id).isdigit():
        numeric_id = int(plant_id)
    elif str(plant_id).startswith("plant-") and str(plant_id).replace("plant-", "").isdigit():
        numeric_id = int(str(plant_id).replace("plant-", ""))

    with get_db() as conn:
        plant_row = None
        if numeric_id is not None:
            plant_row = conn.execute(
                "SELECT * FROM plants WHERE id = ? AND user_id = ?",
                (numeric_id, user_id),
            ).fetchone()

        if not plant_row:
            clean_name = str(plant_id).replace("plant-", "").replace("-", " ")
            plant_row = conn.execute(
                "SELECT * FROM plants WHERE (species LIKE ? OR scientific_name LIKE ?) AND user_id = ?",
                (f"%{clean_name}%", f"%{clean_name}%", user_id),
            ).fetchone()

        if not plant_row:
            plant_row = conn.execute(
                "SELECT * FROM plants WHERE user_id = ? ORDER BY id DESC LIMIT 1",
                (user_id,),
            ).fetchone()

        latest_telemetry = conn.execute(
            "SELECT soil_moisture, temperature, humidity FROM telemetry WHERE user_id = ? ORDER BY id DESC LIMIT 1",
            (user_id,),
        ).fetchone()

        history_rows = conn.execute(
            "SELECT decision FROM irrigation_history WHERE user_id = ? ORDER BY id DESC LIMIT 20",
            (user_id,),
        ).fetchall()

    if not plant_row:
        plant_dict = {'ideal_moisture_min': 40, 'ideal_moisture_max': 60}
    else:
        plant_dict = {
            'ideal_moisture_min': plant_row['ideal_moisture_min'],
            'ideal_moisture_max': plant_row['ideal_moisture_max']
        }

    if not latest_telemetry:
        telemetry_dict = {'soil_moisture': 50, 'temperature': 24.0, 'humidity': 50.0}
    else:
        telemetry_dict = {
            'soil_moisture': latest_telemetry['soil_moisture'],
            'temperature': latest_telemetry['temperature'],
            'humidity': latest_telemetry['humidity']
        }

    history_list = [dict(r) for r in history_rows] if history_rows else []
    from agent import calculate_plant_health_score
    health = calculate_plant_health_score(plant_dict, telemetry_dict, history_list)
    return PlantHealthResponse(
        health_score=health['health_score'],
        trend=health['trend'],
        components=PlantHealthComponents(**health['components'])
    )


@app.post("/plant-health/upload")
@app.post("/api/plant-health/upload")
@app.post("/plant-health/analyze")
@app.post("/api/plant-health/analyze")
async def upload_plant_health_image(
    file: UploadFile | None = File(None),
    image: UploadFile | None = File(None),
    plant_id: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user),
):
    """Upload specimen photo for visual health analysis."""
    upload = file or image
    if not upload:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Unable to analyze image. Please upload a clear JPG/PNG under 5MB.",
        )

    image_bytes = await upload.read()
    if not image_bytes or len(image_bytes) == 0:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Unable to analyze image. Please upload a clear JPG/PNG under 5MB.",
        )

    if len(image_bytes) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=http_status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Unable to analyze image. Please upload a clear JPG/PNG under 5MB.",
        )

    result = identify_plant_from_bytes(image_bytes)
    user_id = current_user['user_id']
    from agent import calculate_plant_health_score

    ideal_min = result.get("profile", {}).get("ideal_moisture_range_pct", [40, 60])[0]
    ideal_max = result.get("profile", {}).get("ideal_moisture_range_pct", [40, 60])[1]
    plant_dict = {
        'ideal_moisture_min': ideal_min,
        'ideal_moisture_max': ideal_max,
    }

    with get_db() as conn:
        latest_telemetry = conn.execute(
            "SELECT soil_moisture, temperature, humidity FROM telemetry WHERE user_id = ? ORDER BY id DESC LIMIT 1",
            (user_id,),
        ).fetchone()

        history_rows = conn.execute(
            "SELECT decision FROM irrigation_history WHERE user_id = ? ORDER BY id DESC LIMIT 20",
            (user_id,),
        ).fetchall()

    telemetry_dict = {
        'soil_moisture': latest_telemetry['soil_moisture'] if latest_telemetry else 50,
        'temperature': latest_telemetry['temperature'] if latest_telemetry else 24.0,
        'humidity': latest_telemetry['humidity'] if latest_telemetry else 50.0,
    }
    history_list = [dict(r) for r in history_rows] if history_rows else []
    health = calculate_plant_health_score(plant_dict, telemetry_dict, history_list)

    return {
        "status": "success",
        "identification": result,
        "health_score": health['health_score'],
        "trend": health['trend'],
        "components": health['components'],
    }

@app.get("/water-savings", response_model=WaterSavingsResponse)
@app.get("/api/water-savings", response_model=WaterSavingsResponse)
async def get_water_savings(days: int = 30, current_user: dict = Depends(get_current_user)):
    """Get water‑savings metrics for the logged‑in user."""
    from agent import calculate_water_savings
    with get_db() as conn:
        savings = calculate_water_savings(current_user['user_id'], conn, days)
    return WaterSavingsResponse(**savings)


