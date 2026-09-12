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

DEFAULT_PLANT_PROFILE = {
    "species": "Monstera Deliciosa",
    "growth_stage": "active vegetative growth",
    "ideal_moisture_range_pct": [40, 65],
    "notes": "Prefers evenly moist soil; sensitive to both drought stress and root rot from overwatering.",
}
_plant_profile = dict(DEFAULT_PLANT_PROFILE)
PLANT_PROFILE = _plant_profile  # backward compatibility alias


def set_plant_profile(profile: dict | None):
    """Update the active plant profile used by the Groq reasoning agent.
    Merges with DEFAULT_PLANT_PROFILE so all expected fields remain present.
    """
    global _plant_profile
    merged = dict(DEFAULT_PLANT_PROFILE)
    if profile:
        merged.update(profile)
    _plant_profile = merged


def get_plant_profile() -> dict:
    """Return the active plant profile."""
    return _plant_profile

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
    profile = get_plant_profile()
    moisture_range = profile.get("ideal_moisture_range_pct", [40, 60])
    min_moisture = moisture_range[0] if len(moisture_range) > 0 else 40
    max_moisture = moisture_range[1] if len(moisture_range) > 1 else 60

    # Format history human-readably for the LLM
    formatted_history = []
    now = time.time()
    for h in (history or [])[-5:]:
        ts = h.get("timestamp")
        min_ago = round((now - ts) / 60.0, 1) if isinstance(ts, (int, float)) else None
        formatted_history.append({
            "minutes_ago": min_ago,
            "soil_moisture_pct": h.get("soil_moisture_pct"),
            "watered": h.get("decision", {}).get("trigger_pump", False),
            "duration_sec": h.get("decision", {}).get("duration_sec", 0),
        })

    system_prompt = f"""You are BioAgent AI, an edge-IoT smart agriculture reasoning agent controlling a physical water pump relay.
Active Plant Profile: {json.dumps(profile)}
Recent telemetry history (most recent last): {json.dumps(formatted_history)}

Follow this strict 5-step Decision Hierarchy:

1. Safety & Physical Constraints:
   - duration_sec must be an integer between 0 and {MAX_PUMP_RUNTIME_SEC} seconds.
   - If trigger_pump is false, duration_sec MUST be 0.
   - If trigger_pump is true, duration_sec MUST be between 5 and {MAX_PUMP_RUNTIME_SEC} seconds.
   - Watering History: If water was triggered in the immediate prior cycle (< 10 minutes ago) and soil moisture is recovering, avoid rapid double-watering. If soil remains dry and no rain is imminent, proceed with irrigation.

2. Soil Moisture vs. Plant Profile:
   - Compare current soil moisture ({telemetry.get('soil_moisture_pct')}%) against the plant's ideal range ({min_moisture}% - {max_moisture}%).
   - OPTIMAL / WET (moisture >= {min_moisture}%): DO NOT WATER (trigger_pump=false, duration_sec=0).
   - MODERATELY DRY (within 15 percentage points below {min_moisture}%): Soil is dry, but natural rainfall can easily resolve it.
   - CRITICALLY DRY (>15 percentage points below {min_moisture}%): Plant is under acute water stress.

3. Rain Forecast Integration (24h Precipitation):
   - High Rain Probability (>= 50% or expected rainfall >= 2.0 mm):
     * If soil is Moderately Dry: WITHHOLD WATER (trigger_pump=false, duration_sec=0) because upcoming natural rainfall is expected soon and will hydrate the soil without wasting water.
     * If soil is Critically Dry: Prefer withholding if significant rain (>= 2.0 mm) is imminent, OR supply a brief emergency irrigation (10-15s) only if expected rainfall is negligible (< 1.0 mm) and insufficient to relieve acute stress.
   - Low Rain Probability (< 50% and expected rainfall < 2.0 mm):
     * If soil is Dry (moisture < {min_moisture}%): WATER (trigger_pump=true, duration_sec=10-30s scaled to deficit).

4. Explanation & Transparency (reason field):
   - Always state the current soil moisture relative to the plant's ideal range ({min_moisture}% - {max_moisture}%).
   - Explicitly cite the rain probability ({weather.get('max_rain_probability_pct')}%) and expected rainfall ({weather.get('expected_rain_mm_24h')} mm).
   - Clearly explain whether water is applied, withheld for rain, or overridden for emergency critical dryness.

5. Function Call Requirement:
   - Always call the irrigation_decision function. Never respond with plain text.
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
            temperature=0.1,
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

    if not trigger:
        duration = 0
    elif duration < 0 or duration > MAX_PUMP_RUNTIME_SEC:
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
