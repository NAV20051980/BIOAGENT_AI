Transform this existing design template into a polished, modern AI + IoT smart agriculture dashboard called “BioAgent AI”.

IMPORTANT:
- Keep the existing template’s overall visual style, spacing, typography hierarchy, card style, and professional feel.
- Do NOT make it look like a generic agriculture website.
- Make it look like a premium AI/IoT control dashboard suitable for a Smart India Hackathon final demo.
- Prioritize clarity, real-time system status, AI reasoning, and physical pump control.
- The UI should be desktop-first and responsive.
- Use realistic sample data, but clearly label simulated/demo data where appropriate.
- Do not add unnecessary features that are unrelated to the system.

PROJECT:
BioAgent AI is an intelligent irrigation agent that combines:
1. Plant identification using an uploaded plant image
2. Plant-specific moisture requirements
3. Live ESP32 sensor telemetry
4. Real-time weather/rain forecast
5. AI reasoning
6. Deterministic safety validation
7. Physical water-pump actuation through ESP32 + relay

CREATE THE FOLLOWING DASHBOARD:

1. TOP HEADER
- BioAgent AI logo/name
- Subtitle: “Autonomous AI Irrigation Agent”
- System status indicator: ONLINE
- ESP32 connection status
- Backend/API status
- Current time
- Small user/profile area
- Clean notification indicator

2. SYSTEM OVERVIEW / KPI CARDS
Create prominent cards for:
- Soil Moisture
- Temperature
- Humidity
- Rain Probability
- Expected Rainfall
- Pump Status

Each card should have:
- Current value
- Unit
- Status
- Small trend indicator
- Last updated time

Example:
Soil Moisture: 33%
Status: Moderately Dry

Temperature: 23°C
Humidity: 49%

Rain Probability: 0%
Expected Rainfall: 0 mm

Pump: ON
Runtime: 15 sec

3. PLANT IDENTIFICATION SECTION
Create a dedicated “Plant Intelligence” card.

Include:
- Plant image preview
- Upload/change plant image button
- “Identify Plant” action
- Identified plant name
- Scientific name
- Confidence score
- Identification status

Example:
Bael
Aegle marmelos
Confidence: 29.8%

Also display:
“Active irrigation profile”

4. PLANT PROFILE
Show the currently active plant's irrigation requirements.

Include:
- Plant name
- Scientific name
- Ideal moisture range
- Growth stage
- Watering notes
- Current moisture vs ideal moisture visualization

Example:
Bael
Ideal moisture: 40–60%
Growth stage: Active vegetative growth

Use a clean moisture-range indicator showing:
DRY → IDEAL → WET

Make the active range visually obvious.

5. LIVE SENSOR TELEMETRY
Create a section titled:
“Live Sensor Telemetry”

Show:
- Soil moisture percentage
- Raw soil sensor value
- Temperature
- Humidity
- ESP32 device ID
- Last telemetry received
- Connection status

Include a line chart for soil moisture history.

6. WEATHER INTELLIGENCE
Create a “Weather Intelligence” section.

Show:
- Rain probability
- Expected rainfall in next 24 hours
- Weather condition
- Forecast summary
- Whether natural rainfall is sufficient to delay irrigation

Example:
Rain probability: 0%
Expected rainfall: 0 mm
Natural watering: Unlikely

Make this section visually connected to the AI decision.

7. AI IRRIGATION DECISION — MOST IMPORTANT SECTION
Create a large prominent card titled:

“AI Irrigation Decision”

Show:
- WATER / DO NOT WATER decision
- Requested pump duration
- AI reasoning
- Decision timestamp

Example:

WATER

Duration:
15 seconds

Reason:
“Current soil moisture is 33%, below the Bael ideal range of 40–60%. No rain is forecast, so irrigation is required.”

Use a very clear visual distinction between:
WATER
and
DO NOT WATER.

8. AI REASONING PANEL
Create an expandable/visible “Why did AI decide this?” section.

Show the reasoning inputs as separate items:

Soil moisture
33%

Plant requirement
40–60%

Rain probability
0%

Expected rainfall
0 mm

Recent watering history
No recent recovery

Then show:

AI conclusion:
“Irrigation required.”

Make this feel like an explainable AI system, NOT a chatbot.

9. SAFETY VALIDATION LAYER
Create a separate section called:

“Deterministic Safety Layer”

This is extremely important.

Visually show:

AI proposes decision
        ↓
Safety Validator
        ↓
ESP32 Actuation

Display validation checks:
✓ Valid JSON response
✓ Pump duration within 1–30 seconds
✓ Trigger value validated
✓ Safety constraints passed
✓ Hardware command approved

Use the tagline:

“AI proposes. Safety layer validates. ESP32 actuates.”

10. PUMP CONTROL
Create a “Pump Control” card.

Show:
- Current pump status: ON/OFF
- Runtime
- Last activation
- Requested duration
- Safety-approved duration

Include a manual test control ONLY for demonstration:
- Test Pump
- Duration selector
- Start/Stop

Clearly label:
“Manual test mode”

Do not make manual control look like the primary operating mode.

11. IRRIGATION FLOW VISUALIZATION
Create a horizontal process flow:

ESP32 Sensors
↓
Plant Identification
↓
Plant Profile
↓
Weather Data
↓
AI Reasoning
↓
Safety Validation
↓
Pump Actuation

Use connected nodes/cards and make the current active stage visually highlighted.

12. MOISTURE HISTORY GRAPH
Create a professional line chart showing:
- Soil moisture over time
- Ideal minimum
- Ideal maximum
- Watering events

Example data:
10:00 — 33%
10:15 — 31%
10:30 — 29%
10:45 — 27%
11:00 — Pump ON
11:15 — 41%

Make the ideal moisture band visually clear.

13. IRRIGATION HISTORY
Create a table titled:
“Irrigation History”

Columns:
- Time
- Plant
- Soil Moisture
- Rain Probability
- AI Decision
- Duration
- Safety Status

Example:
10:42 | Bael | 33% | 0% | WATER | 15s | APPROVED

14. SCENARIO TESTING PANEL
Create a “Demo Scenarios” section for hackathon presentation.

Include buttons:
- Dry + No Rain
- Wet Soil
- Dry + Rain
- Critical Dryness

When selected, show:
- Input conditions
- AI decision
- Expected behavior

This should look like a testing/demo console, not a production control.

15. SYSTEM HEALTH
Create a compact “System Health” panel showing:

ESP32
● Connected

FastAPI Backend
● Online

Groq AI
● Connected

PlantNet
● Connected

OpenWeather
● Connected

Safety Validator
● Active

Pump Relay
● Ready

16. ERROR / ALERT AREA
Create an unobtrusive alert area for:
- ESP32 disconnected
- Backend unavailable
- AI response invalid
- Weather API unavailable
- Plant identification failed
- Safety validation rejected

Show clear but non-alarming messages.

17. DEMO MODE
Add a small “Hackathon Demo Mode” indicator.

The dashboard should clearly communicate that this is a live prototype controlling a physical irrigation pump.

DESIGN DIRECTION:
- Premium futuristic AI/IoT dashboard
- Clean and minimal
- Strong visual hierarchy
- Professional engineering product feel
- Modern cards with subtle borders/shadows
- Clear status badges
- Large readable numbers
- Elegant charts
- Avoid excessive gradients
- Avoid cartoonish farming graphics
- Avoid excessive green/agriculture clichés
- Use a restrained technology-focused color palette
- Use green primarily for healthy/safe/approved states
- Use amber for warnings
- Use red only for critical/errors
- Make WATER and DO NOT WATER immediately understandable
- Keep the dashboard presentation-ready for judges

IMPORTANT UX:
The most important story on screen should be:

LIVE SENSOR DATA
        +
PLANT PROFILE
        +
WEATHER
        ↓
AI REASONING
        ↓
SAFETY VALIDATION
        ↓
PHYSICAL PUMP

Make this relationship visually obvious.

The final interface should feel like a real autonomous AI irrigation control center rather than a simple CRUD dashboard.