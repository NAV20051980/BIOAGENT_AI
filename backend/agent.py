"""
BioAgent AI — agent.py
OWNER: Member 2A (AI Agent & Weather Intelligence)

OPEN-SOURCE VERSION
--------------------
- LLM reasoning:  local Ollama (Llama 3.2 3B / Phi-3-mini) — no external LLM API.
- Weather:        Open-Meteo — free, keyless, no rate-limit risk on demo day.
- Plant profile:  dynamic, set by plant_id.py after a local CV species lookup
                   (falls back to a generic default if nothing has been identified yet).

Contract with main.py (Member 2B) — UNCHANGED, so main.py doesn't need to change:

    decide_irrigation(telemetry: dict, history: list[dict]) -> dict

    Return value is ALWAYS this shape, never anything else:
        {"trigger_pump": bool, "duration_sec": int, "reason": str}

    This function must NEVER raise — always return a safe dict, even on
    total failure. 2B's endpoint will store/serve whatever you return as-is.
"""

import os
import time
import json
import requests

# ---------------- CONFIG ----------------
OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.2:latest")  # matches `ollama list` tag

LAT = float(os.environ.get("BIOAGENT_LAT", "12.9716"))   # default: Bengaluru
LON = float(os.environ.get("BIOAGENT_LON", "77.5946"))

MAX_PUMP_RUNTIME_SEC = 30  # must match the firmware's hard cap — don't drift from this

# Generic fallback profile, used until plant_id.py identifies something real.
DEFAULT_PLANT_PROFILE = {
    "species": "Unknown (generic houseplant defaults)",
    "growth_stage": "unknown",
    "ideal_moisture_range_pct": [35, 60],
    "notes": "No plant has been identified yet via /identify-plant — using safe generic defaults.",
}

_plant_profile = dict(DEFAULT_PLANT_PROFILE)


def set_plant_profile(profile: dict):
    """Called by main.py after plant_id.py identifies a species from a photo.
    Expected keys: species, growth_stage, ideal_moisture_range_pct, notes.
    """
    global _plant_profile
    merged = dict(DEFAULT_PLANT_PROFILE)
    merged.update(profile or {})
    _plant_profile = merged


def get_plant_profile() -> dict:
    return _plant_profile


WEATHER_CACHE_TTL_SEC = 60 * 60  # 1 hour
_weather_cache = {"data": None, "fetched_at": 0}

# For demo reliability — lets you force a weather scenario without waiting on
# real weather to cooperate. Set via force_weather_scenario(), see bottom of file.
_forced_weather = None


# ============================================================
# WEATHER TOOL — Open-Meteo (free, no API key)
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
        url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": LAT,
            "longitude": LON,
            "hourly": "precipitation_probability,precipitation",
            "forecast_days": 1,
            "timezone": "auto",
        }
        resp = requests.get(url, params=params, timeout=6)
        resp.raise_for_status()
        raw = resp.json()

        hourly = raw.get("hourly", {})
        probs = hourly.get("precipitation_probability", []) or []
        rains = hourly.get("precipitation", []) or []

        max_rain_prob = max(probs) if probs else 0.0
        total_rain_mm = sum(rains) if rains else 0.0

        result = {
            "max_rain_probability_pct": round(float(max_rain_prob), 1),
            "expected_rain_mm_24h": round(float(total_rain_mm), 2),
        }
        _weather_cache["data"] = result
        _weather_cache["fetched_at"] = now
        return result
    except Exception as e:
        print(f"[agent.py] Weather fetch failed: {e}")
        return {"max_rain_probability_pct": None, "expected_rain_mm_24h": None, "error": str(e)}


def force_weather_scenario(scenario: str | None):
    """Demo helper. Call with 'rain', 'clear', or None (to un-force and use real weather)."""
    global _forced_weather
    if scenario == "rain":
        _forced_weather = {"max_rain_probability_pct": 90.0, "expected_rain_mm_24h": 12.0}
    elif scenario == "clear":
        _forced_weather = {"max_rain_probability_pct": 5.0, "expected_rain_mm_24h": 0.0}
    else:
        _forced_weather = None


# ============================================================
# AGENT REASONING — local Ollama, JSON-constrained output
# ============================================================
def _build_prompts(telemetry: dict, weather: dict, history: list) -> tuple[str, str]:
    profile = get_plant_profile()
    moisture_range = profile.get("ideal_moisture_range_pct", [40, 60])
    min_moisture = moisture_range[0] if len(moisture_range) > 0 else 40
    max_moisture = moisture_range[1] if len(moisture_range) > 1 else 60

    # Format history human-readably for the LLM
    now = time.time()
    formatted_history = []
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

5. Output Format Requirement:
   - Respond with ONLY a single JSON object, no other text, no markdown fences, in exactly this shape:
     {{"trigger_pump": <true or false>, "duration_sec": <integer 0-{MAX_PUMP_RUNTIME_SEC}>, "reason": "<one sentence>"}}
"""

    user_prompt = f"""Current sensor readings:
- Soil moisture: {telemetry.get('soil_moisture_pct')}%
- Temperature: {telemetry.get('temperature_c')}C
- Humidity: {telemetry.get('humidity_pct')}%

Weather forecast (next 24h):
- Max rain probability: {weather.get('max_rain_probability_pct')}%
- Expected rainfall: {weather.get('expected_rain_mm_24h')} mm

Decide whether to irrigate now. Respond with ONLY the JSON object described above."""

    return system_prompt, user_prompt


def _safe_default(reason: str) -> dict:
    """Never-fail fallback. This is what 2B's endpoint gets if anything goes wrong."""
    return {"trigger_pump": False, "duration_sec": 0, "reason": reason}


def _extract_json(text: str) -> dict:
    """Ollama models sometimes wrap JSON in prose or markdown fences even when
    asked not to — pull out the first {...} block rather than trusting raw text.
    """
    text = text.strip()
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end < start:
        raise ValueError("no JSON object found in model output")
    return json.loads(text[start : end + 1])


def _call_ollama(system_prompt: str, user_prompt: str) -> dict:
    url = f"{OLLAMA_HOST}/api/chat"
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "format": "json",  # asks Ollama to constrain output to valid JSON
        "stream": False,
        "options": {"temperature": 0.2},
    }
    resp = requests.post(url, json=payload, timeout=30)
    resp.raise_for_status()
    raw = resp.json()
    content = raw.get("message", {}).get("content", "")
    return _extract_json(content)


def decide_irrigation(telemetry: dict, history: list | None = None) -> dict:
    """Main entry point. NEVER raises. Always returns the
    {trigger_pump, duration_sec, reason} shape.
    """
    history = history or []
    weather = get_weather_forecast()
    system_prompt, user_prompt = _build_prompts(telemetry, weather, history)

    try:
        args = _call_ollama(system_prompt, user_prompt)
    except requests.exceptions.ConnectionError as e:
        print(f"[agent.py] Could not reach Ollama at {OLLAMA_HOST} — is `ollama serve` running? {e}")
        return _safe_default("agent_error: ollama_unreachable")
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
# QUICK LOCAL TEST — run `python agent.py` to sanity check
# (requires `ollama serve` running and the model pulled, e.g.
#  `ollama pull llama3.2:3b`)
# ============================================================
if __name__ == "__main__":
    print(f"Using Ollama model '{OLLAMA_MODEL}' at {OLLAMA_HOST}")
    print("Testing decide_irrigation() with dry soil + no forced weather...")
    test_telemetry = {"soil_moisture_pct": 22, "temperature_c": 33, "humidity_pct": 35}
    result = decide_irrigation(test_telemetry, history=[])
    print(json.dumps(result, indent=2))

    print("\nTesting with forced rain scenario...")
    force_weather_scenario("rain")
    result = decide_irrigation(test_telemetry, history=[])
    print(json.dumps(result, indent=2))
    force_weather_scenario(None)
