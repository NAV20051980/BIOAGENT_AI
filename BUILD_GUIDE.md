# BioAgent AI — Full Build Guide
**Team stdIO.H | INFERENTIA 3rd Edition**

This is the step-by-step guide to take the project from zero to working demo. Starter code for firmware and backend is already written — your job is to wire it up, plug in real credentials, and integrate.

**Files included:**
```
bioagent/
├── firmware/
│   └── bioagent_firmware.ino     ← ESP32 Arduino code
├── backend/
│   ├── main.py                   ← FastAPI + LLM agent
│   ├── requirements.txt
│   └── .env.example
└── BUILD_GUIDE.md                ← this file
```

---

## Phase 0 — Setup (Hr 0–1, everyone)

1. **Get API keys** (do this first, it's the most common blocker):
   - OpenAI API key: https://platform.openai.com/api-keys
   - OpenWeatherMap free API key: https://openweathermap.org/api (sign up, free tier = 60 calls/min)
2. **Install Arduino IDE** (for firmware) — https://www.arduino.cc/en/software
   - Add ESP32 board support: File → Preferences → Additional Board URLs → add `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
   - Install libraries via Library Manager: `DHT sensor library` (Adafruit), `ArduinoJson`
3. **Install Python 3.10+ and pip** on the backend laptop
4. **Confirm everyone is on the same Wi-Fi network** at the venue — the ESP32 and the backend laptop MUST be on the same network for local testing (unless you deploy the backend to the cloud, see Phase 5)

---

## Phase 1 — Hardware Wiring (Member 1, Hr 1–3)

| Component | ESP32 Pin |
|---|---|
| Soil moisture sensor (analog out) | GPIO 34 (ADC1) |
| DHT11 data pin | GPIO 27 |
| Relay module signal pin | GPIO 26 |
| Sensors/relay VCC | 3.3V or 5V (check your relay module's spec — most need 5V) |
| All grounds | Common GND |

**Important:** Most cheap relay modules are **active-LOW** (LOW signal = relay ON). The firmware code assumes this. If your pump doesn't turn off/on as expected, flip the `HIGH`/`LOW` in `runPump()` and `setup()` in the `.ino` file.

**Test in isolation before integrating:**
- Upload a bare test sketch that just toggles `RELAY_PIN` every 2 seconds — confirm the pump physically fires before touching sensor code.
- Read raw `analogRead(SOIL_PIN)` values in dry air vs. dipped in water — note these numbers, you'll need them for calibration.

---

## Phase 2 — Firmware Setup (Member 1, Hr 3–8)

1. Open `firmware/bioagent_firmware.ino` in Arduino IDE
2. Fill in:
   ```cpp
   const char* WIFI_SSID     = "your venue wifi name";
   const char* WIFI_PASSWORD = "your venue wifi password";
   const char* BACKEND_URL   = "http://<BACKEND_LAPTOP_IP>:8000/telemetry";
   ```
   Find your backend laptop's local IP with `ipconfig` (Windows) or `ifconfig`/`ip addr` (Mac/Linux).
3. Calibrate soil sensor: update `SOIL_DRY` and `SOIL_WET` with the raw values you measured in Phase 1.
4. For faster demo iteration, temporarily lower `POLL_INTERVAL_MS` to something like `30UL * 1000UL` (30 seconds) instead of 15 minutes. Set it back to a sensible interval for the actual pitch if judges ask about production behavior.
5. Upload to the ESP32, open Serial Monitor (115200 baud), confirm:
   - Wi-Fi connects
   - Sensor readings print every poll interval
   - It attempts to POST (will fail until backend is running — that's expected right now)

---

## Phase 3 — Backend Setup (Member 2, Hr 1–8)

1. ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate       # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```
2. Copy `.env.example` to `.env` and fill in your real keys:
   ```bash
   cp .env.example .env
   ```
   Then either `export` these vars in your shell, or use a tool like `python-dotenv` (add `from dotenv import load_dotenv; load_dotenv()` at the top of `main.py` if you want auto-loading — install with `pip install python-dotenv`).
3. Update `PLANT_PROFILE` in `main.py` to match whatever plant you're actually demoing with.
4. Update `BIOAGENT_LAT` / `BIOAGENT_LON` to your venue's coordinates for accurate forecasts.
5. Run it:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```
   `--host 0.0.0.0` is important — it makes the server reachable from the ESP32 over the local network, not just localhost.
6. Test it's alive: open `http://localhost:8000/docs` in a browser — you should see the FastAPI interactive docs with `/telemetry`, `/history`, `/health`.
7. **Test without hardware first** using curl or the `/docs` UI:
   ```bash
   curl -X POST http://localhost:8000/telemetry \
     -H "Content-Type: application/json" \
     -d '{"soil_moisture_pct": 22, "temperature_c": 31, "humidity_pct": 40}'
   ```
   You should get back JSON like `{"trigger_pump": true, "duration_sec": 5, "reason": "..."}`.

---

## Phase 4 — Integration (Member 3, Hr 5–15)

1. Once Phase 2 and Phase 3 both work in isolation, point the ESP32's `BACKEND_URL` at the running backend and power-cycle it.
2. Watch both Serial Monitor (firmware) and the backend terminal (should print `Decision: {...}`) simultaneously.
3. **Test all 3 demo scenarios:**
   - **Dry soil, no rain expected** → pump should fire
   - **Dry soil, high rain probability** (you can temporarily hardcode a fake high `max_rain_probability_pct` in `get_weather_forecast()` to force this for demo reliability — real weather won't cooperate on command) → pump should NOT fire, `reason` should mention rain
   - **Wet soil** → pump should not fire regardless of weather
4. **Fail-safe testing:**
   - Turn off the backend laptop's Wi-Fi mid-run → confirm ESP32 falls back to local threshold logic (check Serial Monitor for "Running LOCAL FAIL-SAFE logic")
   - Temporarily break the backend response (e.g. comment out `trigger_pump` from the return dict) → confirm ESP32 logs "rejecting command" and does nothing
5. Log every decision — the `/history` endpoint already gives you this. Consider a simple script that polls `/history` and prints it nicely for the demo screen.

---

## Phase 5 — Demo Day Reliability (Member 4 + Member 3, Hr 15–21)

- **Record a backup video** of a full successful run in case venue Wi-Fi is unreliable on stage. This is not optional — assume the live demo has a real chance of failing due to conference Wi-Fi congestion.
- Consider whether to run the backend on a laptop hotspot instead of venue Wi-Fi — often more reliable for a live demo since you control it.
- Print or screen-share the `/history` endpoint output during the pitch so judges see the decision log, not just "trust me, it worked."
- Have the exact curl commands from Phase 3 step 7 ready as a fallback if the physical hardware has any last-minute issue — you can still demo the reasoning layer via API even if a wire comes loose.

---

## Common Failure Points (check these first if something breaks)

| Symptom | Likely Cause |
|---|---|
| ESP32 can't reach backend | Not on same Wi-Fi network, or wrong IP/port, or firewall blocking port 8000 |
| Pump never turns off | Relay wiring is active-HIGH not active-LOW — flip logic in firmware |
| `duration_sec` always 0 | Check OpenAI API key is valid and has credit; check backend terminal for errors |
| Weather always shows `null` | OpenWeatherMap key not activated yet (can take up to 2 hours after signup) or wrong lat/lon |
| Agent always says don't water | Check `PLANT_PROFILE` ideal range isn't set unrealistically high |
| `main.py` won't start | Missing `httpx==0.27.2` pin — version conflicts with newer httpx are common with `openai` package |

---

## Final Pre-Demo Checklist
- [ ] Hardware fires reliably on manual test
- [ ] Firmware ↔ backend integration confirmed on all 3 scenarios
- [ ] Fail-safe behavior confirmed (Wi-Fi drop + malformed response)
- [ ] Backup video recorded
- [ ] `/history` log ready to show on screen
- [ ] Laptop hotspot tested as Wi-Fi fallback
- [ ] Everyone knows the one-line pitch and the 6 anticipated Q&A answers
