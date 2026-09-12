# BioAgent AI
### Autonomous Edge-IoT Smart Agriculture Agent

> *"AI proposes, deterministic safety validation validates, and the ESP32 actuates."*

---

## 📖 Project Overview

**BioAgent AI** is an end-to-end Edge-IoT intelligent agriculture system that replaces crude, static threshold-based watering with contextual multimodal AI reasoning. By combining on-device plant identification (Groq Vision), real-time capacitive sensor telemetry (ESP32), hyper-local meteorological forecasts (OpenWeatherMap), and LLM-driven multi-step reasoning, BioAgent AI makes dynamic, weather-aware, species-specific irrigation decisions while enforcing hard deterministic safety guardrails.

---

## 🛑 The Problem

Traditional automated irrigation systems rely on simplistic, static soil moisture thresholds (e.g., *"if moisture < 40%, turn pump on"*). This leads to critical failure modes in real-world agriculture:
1. **Water Waste & Root Rot:** Watering soil right before a torrential rainstorm leads to soil waterlogging, nutrient leaching, and root damage.
2. **Species Blindness:** A desert succulent (e.g., Cactus), a tropical foliage plant (e.g., Monstera), and a medicinal tree (e.g., Bael) have vastly different moisture tolerances and watering cycles.
3. **Sensor Drift & Single-Point Failure:** Sensor miscalibration or transient glitches can cause runaway pump actuation, draining reservoirs and flooding crops.
4. **LLM Hallucination Risk in Physical Systems:** Pure end-to-end LLM control without deterministic validation is unsafe for real-world physical actuators.

---

## 💡 The Solution

BioAgent AI bridges edge hardware and cloud LLM intelligence with a multi-tiered architecture:
- **Multimodal Botanical Onboarding:** Uses Groq Vision (`qwen/qwen3.8-27b`) to identify plant species from a single photo and automatically set species-specific moisture targets and water tolerance profiles.
- **Context-Aware Reasoning:** Ingests live telemetry (soil moisture, ambient temperature, humidity) and live 3-hour precipitation probability forecasts into an LLM reasoning engine (`openai/gpt-oss-20b`).
- **5-Step Decision Hierarchy:** Strict decision priority that accounts for soil moisture deficit, approaching rainfall, evaporation rates, and historical watering actions.
- **Three-Layer Deterministic Fail-Safe:** Hardcoded Python validator clamps pump duration and overrides invalid LLM outputs before telemetry responses are returned to the microcontroller.

---

## ✨ Key Innovation

1. **Multimodal Plant Profile Ingestion:** Dynamic calibration of irrigation thresholds based on visual botanical recognition rather than manual parameter tuning.
2. **Rain-Aware Predictive Irrigation:** Explicit mathematical and semantic awareness of upcoming precipitation, skipping unnecessary watering cycles when natural rain is imminent.
3. **Defense-in-Depth Safety Architecture:** Zero hallucination risk reaches the actuator. The LLM acts as an advisory reasoning core; deterministic rules strictly clamp and validate all physical outputs.

---

## 🏗️ System Architecture

```text
Plant Image
   ↓
Groq Vision (qwen/qwen3.8-27b)
   ↓
Plant Identification & Taxonomy
   ↓
Plant Care Profile (Moisture Range, Water Need, Sun Need)
   ↓
ESP32 Soil Moisture & DHT11 Sensors
   ↓
Telemetry Ingestion (POST /telemetry)
   ↓
OpenWeatherMap API (Precipitation Forecast & Humidity)
   ↓
AI Irrigation Reasoning (openai/gpt-oss-20b via Groq)
   ↓
Deterministic Safety Validator (Clamping, Invariant Checks)
   ↓
ESP32 HTTP Response (JSON Contract)
   ↓
Relay Module
   ↓
Submersible Water Pump
```

---

## 🔌 Hardware Architecture

| Component | Purpose | Interface |
|---|---|---|
| **ESP32 DevKit V1** | Edge telemetry aggregation, HTTP client, relay actuation | Wi-Fi (802.11 b/g/n) |
| **Capacitive Soil Moisture Sensor v1.2** | Corrosion-resistant analog soil moisture sensing | Analog Input (`GPIO 34` / `A0`) |
| **DHT11 / DHT22 Sensor** | Ambient temperature and air humidity | Digital Input (`GPIO 4`) |
| **5V Single-Channel Relay Module** | Pump circuit switching (Active LOW / HIGH) | Digital Output (`GPIO 18`) |
| **5V/12V DC Submersible Pump** | Physical irrigation actuation | Relay Controlled |
| **Status LED / Onboard LED** | Actuation & Wi-Fi connectivity indicator | Digital Output (`GPIO 2`) |

---

## 🧠 AI Architecture

### 1. Plant Identification (`backend/plant_id.py`)
- **Multimodal Engine:** `qwen/qwen3.8-27b` hosted on Groq API.
- **Workflow:** Accepts raw image uploads (JPEG/PNG/WebP), encodes to base64 data URLs, and prompts the vision model for conservative botanical identification with taxonomy verification.
- **Output:** Returns common name, scientific name, confidence score, visual diagnostic evidence, and an active care profile (`ideal_moisture_range_pct`, `water_need`, `sun_need`, `watering_notes`).
- **Fail-Safe Fallback:** If an image is non-plant or ambiguous, it safely falls back to a balanced general plant baseline (`[40, 60]%`).

### 2. Irrigation Reasoning Core (`backend/agent.py`)
- **Reasoning Model:** `openai/gpt-oss-20b` hosted on Groq API with temperature 0.1 for high determinism.
- **5-Step Decision Hierarchy:**
  1. **Optimal Moisture:** If moisture is within or above the plant's ideal range $\rightarrow$ **DO NOT WATER** (`trigger_pump = false`, `duration_sec = 0`).
  2. **Moderately Dry + Rain Imminent ($\ge 40\%$ rain probability):** Natural rainfall will supply water $\rightarrow$ **DO NOT WATER** to avoid waterlogging.
  3. **Critically Dry + Rain Imminent:** Soil is dangerously depleted $\rightarrow$ If heavy rain ($\ge 70\%$) is coming, delay watering; if moderate rain, supply a minimal survival dose ($5\text{--}10\text{s}$).
  4. **Dry + No Rain Expected ($< 40\%$ rain probability):** Deficit must be resolved $\rightarrow$ **WATER** proportionally ($10\text{--}25\text{s}$).
  5. **Recent Irrigation:** If irrigated within the last 15 minutes, allow water percolation before re-evaluating $\rightarrow$ **DO NOT WATER**.

### 3. Weather Integration (`backend/agent.py`)
- **Provider:** OpenWeatherMap 5-day / 3-hour Forecast API.
- **Metrics Extracted:** Max rain probability in next 3 hours (`pop`), forecast temperature, ambient humidity, weather condition description.
- **Caching:** 1-hour in-memory cache to prevent external API quota exhaustion.
- **Demo Mode:** Interactive override endpoint (`POST /demo/weather-scenario`) to simulate `"rain"`, `"clear"`, or `"off"` for live presentations and offline testing.

### 4. Deterministic Safety Validator (`backend/agent.py`)
All LLM proposals pass through a deterministic validation barrier:
- **Duration Clamping:** `duration_sec` is strictly clamped to $[0, 30]$ seconds.
- **Safety Overrides:** If `trigger_pump` is `true` but proposed `duration_sec == 0`, defaults to 10 seconds. If `trigger_pump` is `false`, forces `duration_sec = 0`.
- **Hardware Fail-Safe:** If backend or Wi-Fi is unreachable, the ESP32 enforces an offline safety shutdown.

---

## 📡 API Endpoints

| Method | Endpoint | Description | Payload / Query |
|---|---|---|---|
| `GET` | `/` | System index & endpoint registry | None |
| `POST` | `/identify-plant` | Upload image for Groq Vision identification & active profile update | `multipart/form-data` (`file`) |
| `GET` | `/plant-profile` | Get current active plant care profile | None |
| `POST` | `/telemetry` | Ingest sensor data, run AI reasoning + safety validator, log decision | `{"soil_moisture_pct": float, "temperature_c": float, "humidity_pct": float, "device_id": str}` |
| `GET` | `/latest-decision` | Fetch the most recent irrigation decision | None |
| `GET` | `/history` | Fetch historical telemetry & decisions | `?limit=20` |
| `GET` | `/weather` | Fetch current cached or live weather forecast | None |
| `GET` | `/status` | Check system health and total decisions logged | None |
| `POST` | `/demo/weather-scenario` | Force demo weather condition (`rain`, `clear`, `off`) | `{"scenario": "rain"}` |
| `GET` | `/docs` | Interactive Swagger UI API documentation | None |

---

## ⚙️ Installation & Setup

### Prerequisites
- Python 3.10+ (tested on Python 3.10–3.13)
- ESP32 Development Board + Arduino IDE (with ESP32 board package)
- Groq API Key ([console.groq.com](https://console.groq.com))
- OpenWeatherMap API Key ([openweathermap.org](https://openweathermap.org))

### 1. Clone & Configure Environment

```bash
git clone <YOUR_REPOSITORY_URL>
cd BioAgent-AI

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r backend/requirements.txt
```

### 2. Environment Variables

Create a `.env` file inside the `backend/` directory:

```env
GROQ_API_KEY=gsk_your_groq_api_key_here
OPENWEATHER_API_KEY=your_openweathermap_api_key_here
BIOAGENT_LAT=12.9716
BIOAGENT_LON=77.5946
AGENT_MODEL=openai/gpt-oss-20b
VISION_MODEL=qwen/qwen3.8-27b
```

---

## 🚀 Running the Backend

Start the FastAPI application from the project root or backend directory:

```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The server will initialize SQLite database `bioagent.db` and start listening on `http://0.0.0.0:8000`.
Visit `http://localhost:8000/docs` for interactive API testing.

---

## ⚡ ESP32 Firmware Operation

1. Open `firmware/bioagent_firmware/bioagent_firmware.ino` in Arduino IDE.
2. Install required Arduino libraries: `WiFi`, `HTTPClient`, `ArduinoJson`, `DHT sensor library`.
3. Update configuration constants:
   ```cpp
   const char* WIFI_SSID     = "YOUR_WIFI_SSID";
   const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
   const char* BACKEND_URL   = "http://<YOUR_LOCAL_IP>:8000/telemetry";
   ```
4. Calibrate the capacitive soil moisture sensor analog thresholds:
   ```cpp
   const int SOIL_AIR_VALUE   = 3200; // Dry reading in open air
   const int SOIL_WATER_VALUE = 1400; // Submerged in water reading
   ```
5. Select **ESP32 Dev Module** and upload.

---

## 🧪 Verification & Testing

### 1. Botanical Identification Test
```bash
curl -X POST "http://localhost:8000/identify-plant" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@sample_plant.jpg"
```

### 2. Sensor Telemetry & Reasoning Test
```bash
curl -X POST "http://localhost:8000/telemetry" \
  -H "Content-Type: application/json" \
  -d '{"soil_moisture_pct": 22.5, "temperature_c": 29.0, "humidity_pct": 52.0, "device_id": "esp32-01"}'
```

### 3. Rain Scenario Verification
```bash
# Force rain scenario for demonstration
curl -X POST "http://localhost:8000/demo/weather-scenario" \
  -H "Content-Type: application/json" \
  -d '{"scenario": "rain"}'

# Send telemetry for dry soil (35% moisture) - Should NOT water due to rain forecast
curl -X POST "http://localhost:8000/telemetry" \
  -H "Content-Type: application/json" \
  -d '{"soil_moisture_pct": 35.0, "temperature_c": 28.0, "humidity_pct": 75.0}'
```

---

## 🔮 Future Improvements

- **Multi-Zone Solenoid Valves:** Expand single-pump actuation to multiplexed irrigation zones for greenhouse scaling.
- **Edge TinyML Vision:** Quantize botanical classification models for direct on-device execution on ESP32-CAM.
- **Nutrient & NPK Sensing:** Integrate optical/conductive NPK soil probes to dynamically recommend fertilization cycles.
- **Solar Energy Optimization:** Synchronize high-draw pump actuation cycles with peak solar PV charging windows.

---

## 📄 License
This project is open source and available under the [MIT License](LICENSE).
