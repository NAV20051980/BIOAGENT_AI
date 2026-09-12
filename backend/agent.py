"""
BioAgent AI — agent.py
OWNER: Member 2A (AI Agent & Weather Intelligence)

This file is YOUR file. Member 2B's api.py imports `decide_irrigation()`
from here and doesn't need to know anything about how it works internally.

Your contract with Member 2B (agree on this in the first 30 min, then don't
change it without telling them):

    decide_irrigation(telemetry: dict, history: list[dict]) -> dict

    telemetry looks like:
        {"soil_moisture_pct": 22.0, "temperature_c": 31.0, "humidity_pct": 40.0}

    history is a list of past decisions (2B gives you this from the DB),
    most recent last, each shaped like:
        {"timestamp": 1234567890.0, "soil_moisture_pct": 25, "decision": {...}}

    Return value is ALWAYS this shape, never anything else:
        {"trigger_pump": bool, "duration_sec": int, "reason": str}

    This function must NEVER raise — always return a safe dict, even on
    total failure. 2B's endpoint will store/serve whatever you return as-is.
"""

import os
import time
import json
import requests
from openai import OpenAI

# ---------------- CONFIG ----------------
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
OPENWEATHER_API_KEY = os.environ.get("OPENWEATHER_API_KEY", "")
LAT = float(os.environ.get("BIOAGENT_LAT", "12.9716"))   # default: Bengaluru
LON = float(os.environ.get("BIOAGENT_LON", "77.5946"))

MAX_PUMP_RUNTIME_SEC = 30  # must match the firmware's hard cap — don't drift from this

PLANT_PROFILE = {
    "species": "Monstera Deliciosa",
    "growth_stage": "active vegetative growth",
    "ideal_moisture_range_pct": [40, 65],
    "notes": "Prefers evenly moist soil; sensitive to both drought stress and root rot from overwatering.",
}

client = OpenAI(
    api_key=GROQ_API_KEY,
    base_url="https://api.groq.com/openai/v1"
)

WEATHER_CACHE_TTL_SEC = 60 * 60  # 1 hour
_weather_cache = {"data": None, "fetched_at": 0}

# For demo reliability — lets you force a weather scenario without waiting on
# real weather to cooperate. Set via force_weather_scenario(), see bottom of file.
_forced_weather = None


# ============================================================
# WEATHER TOOL
# ============================================================
def get_weather_forecast() -> dict:
    """Fetch 24h precipitation forecast, cached for WEATHER_CACHE_TTL_SEC.
    Never raises — returns a dict with error info instead if the API fails.
    """
    if _forced_weather is not None:
        return _forced_weather

    now = time.time()
    if _weather_cache["data"] and (now - _weather_cache["fetched_at"] < WEATHER_CACHE_TTL_SEC):
        return _weather_cache["data"]

    try:
        url = "https://api.openweathermap.org/data/2.5/forecast"
        params = {"lat": LAT, "lon": LON, "appid": OPENWEATHER_API_KEY, "units": "metric", "cnt": 8}
        resp = requests.get(url, params=params, timeout=6)
        resp.raise_for_status()
        raw = resp.json()

        max_rain_prob = 0.0
        total_rain_mm = 0.0
        for entry in raw.get("list", []):
            pop = entry.get("pop", 0.0)
            max_rain_prob = max(max_rain_prob, pop)
            total_rain_mm += entry.get("rain", {}).get("3h", 0.0)

        result = {
            "max_rain_probability_pct": round(max_rain_prob * 100, 1),
            "expected_rain_mm_24h": round(total_rain_mm, 2),
        }
        _weather_cache["data"] = result
        _weather_cache["fetched_at"] = now
        return result
    except Exception as e:
        print(f"[agent.py] Weather fetch failed: {e}")
        return {"max_rain_probability_pct": None, "expected_rain_mm_24h": None, "error": str(e)}


def force_weather_scenario(scenario: str | None):
    """Demo helper. Call with 'rain', 'clear', or None (to un-force and use real weather).
    2B can expose this via a demo-scenario endpoint so the live demo is reliable
    regardless of what the actual sky is doing on the day.
    """
    global _forced_weather
    if scenario == "rain":
        _forced_weather = {"max_rain_probability_pct": 90.0, "expected_rain_mm_24h": 12.0}
    elif scenario == "clear":
        _forced_weather = {"max_rain_probability_pct": 5.0, "expected_rain_mm_24h": 0.0}
    else:
        _forced_weather = None


# ============================================================
# AGENT REASONING
# ============================================================
IRRIGATION_TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "irrigation_decision",
        "description": "Decide whether to trigger the water pump and for how long, based on plant biology, soil telemetry, and weather forecast.",
        "parameters": {
            "type": "object",
            "properties": {
                "trigger_pump": {"type": "boolean", "description": "Whether to water the plant now."},
                "duration_sec": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": MAX_PUMP_RUNTIME_SEC,
                    "description": "How long to run the pump, in seconds. 0 if not watering.",
                },
                "reason": {"type": "string", "description": "One-sentence explanation of the decision, for logging/demo purposes."},
            },
            "required": ["trigger_pump", "duration_sec", "reason"],
        },
    },
}


def _build_prompts(telemetry: dict, weather: dict, history: list) -> tuple[str, str]:
    system_prompt = f"""You are BioAgent AI, an irrigation reasoning agent for a real physical pump.
Plant profile: {json.dumps(PLANT_PROFILE)}
Recent watering history (most recent last): {json.dumps(history[-5:])}

Rules:
- Weigh soil moisture against the plant's ideal range, NOT a generic threshold.
- If rain probability is high (e.g. >50%) or significant rain is expected in the next 24h, prefer withholding or reducing irrigation, even if soil is on the dry side — unless moisture is critically low (more than 15 points below the ideal range).
- Avoid watering again too soon after a recent watering event (check history).
- Always call the irrigation_decision function. Never respond with plain text.
- duration_sec must never exceed {MAX_PUMP_RUNTIME_SEC}.
"""

    user_prompt = f"""Current sensor readings:
- Soil moisture: {telemetry.get('soil_moisture_pct')}%
- Temperature: {telemetry.get('temperature_c')}C
- Humidity: {telemetry.get('humidity_pct')}%

Weather forecast (next 24h):
- Max rain probability: {weather.get('max_rain_probability_pct')}%
- Expected rainfall: {weather.get('expected_rain_mm_24h')} mm

Decide whether to irrigate now."""

    return system_prompt, user_prompt


def _safe_default(reason: str) -> dict:
    """Never-fail fallback. This is what 2B's endpoint gets if anything goes wrong."""
    return {"trigger_pump": False, "duration_sec": 0, "reason": reason}


def decide_irrigation(telemetry: dict, history: list | None = None) -> dict:
    """Main entry point. See module docstring for the contract.
    NEVER raises. Always returns the {trigger_pump, duration_sec, reason} shape.
    """
    history = history or []
    weather = get_weather_forecast()
    system_prompt, user_prompt = _build_prompts(telemetry, weather, history)

    try:
        response = client.chat.completions.create(
            model=os.environ.get("AGENT_MODEL", "openai/gpt-oss-20b"),
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            tools=[IRRIGATION_TOOL_SCHEMA],
            tool_choice={"type": "function", "function": {"name": "irrigation_decision"}},
        )
        tool_call = response.choices[0].message.tool_calls[0]
        args = json.loads(tool_call.function.arguments)
    except Exception as e:
        print(f"[agent.py] Agent call failed: {e}")
        return _safe_default(f"agent_error: {e}")

    # ---- Schema validation (this is YOUR safety validator) ----
    if "trigger_pump" not in args or "duration_sec" not in args:
        print("[agent.py] Malformed agent output — missing required fields.")
        return _safe_default("malformed_output_missing_fields")

    try:
        duration = int(args["duration_sec"])
        trigger = bool(args["trigger_pump"])
    except (TypeError, ValueError) as e:
        print(f"[agent.py] Malformed agent output — bad types: {e}")
        return _safe_default("malformed_output_bad_types")

    if duration < 0 or duration > MAX_PUMP_RUNTIME_SEC:
        print(f"[agent.py] duration_sec {duration} out of range — clamping.")
        duration = max(0, min(duration, MAX_PUMP_RUNTIME_SEC))

    return {
        "trigger_pump": trigger,
        "duration_sec": duration,
        "reason": args.get("reason", ""),
    }


# ============================================================
# QUICK LOCAL TEST — run `python agent.py` to sanity check without the API
# ============================================================
if __name__ == "__main__":
    print("Testing decide_irrigation() with dry soil + no forced weather...")
    test_telemetry = {"soil_moisture_pct": 22, "temperature_c": 33, "humidity_pct": 35}
    result = decide_irrigation(test_telemetry, history=[])
    print(json.dumps(result, indent=2))

    print("\nTesting with forced rain scenario...")
    force_weather_scenario("rain")
    result = decide_irrigation(test_telemetry, history=[])
    print(json.dumps(result, indent=2))
    force_weather_scenario(None)
