# BioAgent AI

**Team stdIO.H — INFERENTIA 3rd Edition, 24hr National Level Hackathon, PES University**

An edge-IoT smart agriculture agent that replaces static threshold-based irrigation with an LLM reasoning agent that evaluates live sensor telemetry alongside real-time weather forecasts before triggering physical pump actuation.

> "It's not a threshold — it's an agent that weighs plant biology, weather confidence, and watering history to output a graded irrigation decision, with three layers of fail-safes so a bad AI response can never flood a plant."

---

## Repo Structure

```
bioagent/
├── firmware/
│   └── bioagent_firmware.ino   # ESP32 — Member 1
├── backend/
│   ├── agent.py                 # AI reasoning + weather — Member 2A
│   ├── main.py                  # FastAPI + SQLite + endpoints — Member 2B
│   ├── requirements.txt
│   └── .env.example
├── dashboard/                    # Member 4 builds here
├── BUILD_GUIDE.md                # Full step-by-step setup guide
└── GIT_WORKFLOW.md               # How we branch, commit, and merge
```

## Team & Ownership

| Member | Owns |
|---|---|
| 1 | `firmware/` |
| 2A | `backend/agent.py` |
| 2B | `backend/main.py` |
| 3 | Integration, testing, demo runbook (touches everything, breaks nothing) |
| 4 | `dashboard/`, pitch deck, demo video |

See `BUILD_GUIDE.md` for setup instructions and `GIT_WORKFLOW.md` for how we use branches.

## Quick Start (Backend)

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # fill in your real API keys
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Visit `http://localhost:8000/docs` to test endpoints interactively.

## Quick Start (Firmware)

Open `firmware/bioagent_firmware.ino` in Arduino IDE, fill in Wi-Fi credentials and backend IP, upload to ESP32. See `BUILD_GUIDE.md` for pin wiring.
