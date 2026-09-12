"""
BioAgent AI — main.py
OWNER: Member 2B (Backend API & Data Layer)

This file owns FastAPI, SQLite, and all HTTP endpoints. It imports
`decide_irrigation()` and `force_weather_scenario()` from agent.py (Member 2A's
file) and doesn't need to know how the reasoning inside it works.

Run with:
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

import time
import sqlite3
from contextlib import contextmanager
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
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


class DemoScenario(BaseModel):
    scenario: str  # "rain" | "clear" | "off"


# ============================================================
# ENDPOINTS
# ============================================================
@app.get("/")
def root():
    return {
        "project": "BioAgent AI",
        "status": "running",
        "endpoints": [
            "/telemetry (POST)",
            "/latest-decision",
            "/history",
            "/weather",
            "/status",
            "/demo/weather-scenario (POST)",
            "/identify-plant (POST, image upload)",
            "/plant-profile",
            "/docs",
        ],
    }


@app.post("/identify-plant")
async def identify_plant(file: UploadFile = File(...)):
    """Upload a photo of the plant once during onboarding. Runs Groq Vision
    (qwen/qwen3.8-27b) for botanical plant identification, sets the resulting
    care profile as the active profile, and returns the identification details.
    """
    image_bytes = await file.read()
    result = identify_plant_from_bytes(image_bytes)
    set_plant_profile(result.get("profile"))
    return result


@app.get("/plant-profile")
def plant_profile():
    """Returns the plant profile currently being used by the agent's reasoning."""
    return get_plant_profile()


@app.post("/telemetry")
def receive_telemetry(telemetry: Telemetry):
    history = rows_to_history_shape(get_recent_decisions(limit=5))
    decision = decide_irrigation(telemetry.model_dump(), history=history)
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
    """Lets Member 3/4 force a weather scenario for a reliable live demo,
    without needing real weather to cooperate on stage.
    scenario: "rain" | "clear" | "off" (off = use real weather again)
    """
    scenario = payload.scenario if payload.scenario in ("rain", "clear") else None
    force_weather_scenario(scenario)
    return {"forced_scenario": scenario or "off (using real weather)"}
