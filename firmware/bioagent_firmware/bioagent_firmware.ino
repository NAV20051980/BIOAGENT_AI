

/*
  ============================================================
  BioAgent AI — ESP32 Smart Irrigation Firmware
  Team stdIO.H — INFERENTIA Hackathon
  ============================================================

  SYSTEM
  ------------------------------------------------------------
  ESP32 WROOM-32
      ↓ Wi-Fi
  FastAPI Backend
      ↓
  AI Irrigation Agent
      ↓
  Deterministic Safety Validation
      ↓
  ESP32
      ↓
  Relay
      ↓
  Water Pump

  HARDWARE
  ------------------------------------------------------------
  Soil Moisture Sensor → GPIO 34
  DHT11                → GPIO 18
  Relay IN             → GPIO 33
  Relay Logic          → ACTIVE LOW
  Pump Power           → External 3×AAA battery supply

  SAFETY
  ------------------------------------------------------------
  • Maximum AI pump runtime: 30 seconds
  • Backend failure: local fail-safe
  • Invalid soil reading: hardware safety lockout
  • Invalid JSON: command rejected
  • Invalid duration: clamped to 30 seconds
  • AI/failsafe watering protected by cooldowns
  • Relay defaults to OFF
  ============================================================
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DFRobot_DHT11.h>


// ============================================================
// OFFLINE TELEMETRY BUFFER
// ============================================================

#define MAX_BUFFER_SIZE 360
#define FLUSH_CHUNK_SIZE 25
#define DEBUG_BUFFER 1

struct TelemetryData
{
  unsigned long sampleMillis;
  int moisture;
  float temperature;
  float humidity;
};

TelemetryData telemetryBuffer[MAX_BUFFER_SIZE];

int bufferStart = 0;
int bufferCount = 0;


// ============================================================
// WIFI CONFIGURATION
// ============================================================

const char* WIFI_SSID = "OnePlus Nord CE4 Lite 5G";
const char* WIFI_PASSWORD = "navaneet10";


// ============================================================
// FASTAPI BACKEND
// ============================================================

// IMPORTANT:
// The FastAPI endpoint is /telemetry.

const char* BACKEND_URL =
  "http://10.162.3.74:8000/telemetry";


// ============================================================
// HARDWARE PIN CONFIGURATION
// ============================================================

#define SOIL_PIN   34
#define DHT_PIN    18
#define RELAY_PIN  33


// ============================================================
// TIMING
// ============================================================

// Telemetry interval.
// 30 seconds is suitable for hackathon demonstration.

const unsigned long POLL_INTERVAL_MS = 30000;

// Maximum time to wait for backend response.

const unsigned long HTTP_TIMEOUT_MS = 8000;


// ============================================================
// SAFETY LIMITS
// ============================================================

// Absolute maximum pump runtime.

const int MAX_PUMP_RUNTIME_SEC = 30;


// ------------------------------------------------------------
// LOCAL FAIL-SAFE
// ------------------------------------------------------------

const int FAILSAFE_MOISTURE_PCT = 18;
const int FAILSAFE_DURATION_SEC = 4;

// 10-minute failsafe cooldown.

const unsigned long FAILSAFE_COOLDOWN_MS = 600000UL;

unsigned long lastFailsafeWaterMs = 0;

// ----------------------------------------------------------
// OPERATION MODE
// ----------------------------------------------------------
enum OperatingMode {
  MODE_AI,
  MODE_DEMO
};
OperatingMode currentMode = MODE_AI;

// Demo timer variables
unsigned long demoStartMs = 0;
const unsigned long DEMO_DURATION_MS = 5000; // 5 seconds
bool demoActive = false;


// ============================================================
// SOIL SENSOR CALIBRATION
// ============================================================

// Existing calibration values.

const int SOIL_DRY = 2480;
const int SOIL_WET = 790;


// Safety threshold for detecting a potentially removed/
// invalid sensor reading.
//
// IMPORTANT:
// This value is currently set to 2400 based on the present
// calibration and should be recalibrated later using a real
// air/removal reading.

#define SOIL_MAX_AIR_RAW 2400


// ============================================================
// DHT11
// ============================================================

DFRobot_DHT11 dht11;


// ============================================================
// WIFI CONNECTION
// ============================================================

void connectWiFi()
{
  Serial.println();
  Serial.println("Connecting to phone hotspot...");

  WiFi.mode(WIFI_STA);

  WiFi.begin(
    WIFI_SSID,
    WIFI_PASSWORD
  );

  int attempts = 0;

  while (
    WiFi.status() != WL_CONNECTED &&
    attempts < 30
  )
  {
    delay(500);

    Serial.print(".");

    attempts++;
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED)
  {
    Serial.println("WiFi connected!");

    Serial.print("ESP32 IP: ");
    Serial.println(WiFi.localIP());

    Serial.print("Backend: ");
    Serial.println(BACKEND_URL);
  }
  else
  {
    Serial.println("WiFi connection FAILED.");

    Serial.println(
      "Local fail-safe will be used."
    );
  }
}


// ============================================================
// SOIL MOISTURE READING
// ============================================================

int readSoilMoisturePercent()
{
  int raw = analogRead(SOIL_PIN);

  Serial.print("Soil Raw: ");
  Serial.println(raw);


  // ----------------------------------------------------------
  // SENSOR VALIDATION
  // ----------------------------------------------------------

  if (raw > SOIL_MAX_AIR_RAW)
  {
    // ACTIVE LOW relay:
    // HIGH = OFF

    digitalWrite(
      RELAY_PIN,
      HIGH
    );

    Serial.println(
      "SOIL SENSOR INVALID - SAFETY LOCKOUT"
    );

    Serial.print(
      "RAW ADC = "
    );

    Serial.println(raw);

    return -1;
  }


  // ----------------------------------------------------------
  // CONVERT RAW ADC TO MOISTURE %
  // ----------------------------------------------------------

  int moisture = map(
    raw,
    SOIL_DRY,
    SOIL_WET,
    0,
    100
  );

  moisture = constrain(
    moisture,
    0,
    100
  );


  Serial.print(
    "Soil Moisture: "
  );

  Serial.print(
    moisture
  );

  Serial.println("%");


  return moisture;
}


// ============================================================
// PUMP CONTROL
// ============================================================

void runPump(int durationSec)
{
  // ----------------------------------------------------------
  // HARD SAFETY LIMIT
  // ----------------------------------------------------------

  int safeDuration = constrain(
    durationSec,
    0,
    MAX_PUMP_RUNTIME_SEC
  );


  if (safeDuration <= 0)
  {
    Serial.println(
      "Pump command rejected."
    );

    return;
  }


  Serial.println();
  Serial.println("--------------------------------");

  Serial.print(
    "PUMP ON"
  );

  Serial.print(
    " | Requested: "
  );

  Serial.print(
    durationSec
  );

  Serial.print(
    " sec"
  );

  Serial.print(
    " | Safe: "
  );

  Serial.print(
    safeDuration
  );

  Serial.println(
    " sec"
  );


  // ----------------------------------------------------------
  // RELAY ON
  // ACTIVE LOW
  // LOW = ON
  // ----------------------------------------------------------

  digitalWrite(
    RELAY_PIN,
    LOW
  );


  delay(
    safeDuration * 1000UL
  );


  // ----------------------------------------------------------
  // RELAY OFF
  // HIGH = OFF
  // ----------------------------------------------------------

  digitalWrite(
    RELAY_PIN,
    HIGH
  );

  Serial.println(
    "PUMP OFF"
  );

  Serial.println(
    "--------------------------------"
  );
}


// ============================================================
// TELEMETRY BUFFER
// ============================================================

void bufferTelemetry(
  int m,
  float t,
  float h
)
{
  unsigned long now = millis();

  int idx =
    (bufferStart + bufferCount)
    % MAX_BUFFER_SIZE;


  telemetryBuffer[idx].sampleMillis =
    now;

  telemetryBuffer[idx].moisture =
    m;

  telemetryBuffer[idx].temperature =
    t;

  telemetryBuffer[idx].humidity =
    h;


  if (
    bufferCount < MAX_BUFFER_SIZE
  )
  {
    bufferCount++;
  }
  else
  {
    // Buffer full:
    // overwrite oldest entry.

    bufferStart =
      (bufferStart + 1)
      % MAX_BUFFER_SIZE;
  }


#if DEBUG_BUFFER

  Serial.print(
    "Buffered telemetry (count="
  );

  Serial.print(
    bufferCount
  );

  Serial.println(
    ")"
  );

#endif
}


// ============================================================
// FLUSH OFFLINE TELEMETRY
// ============================================================

void flushTelemetryBuffer()
{
  while (bufferCount > 0)
  {
    int chunkSize =
      min(
        bufferCount,
        FLUSH_CHUNK_SIZE
      );


    StaticJsonDocument<1024>
      batchDoc;

    JsonArray arr =
      batchDoc.to<JsonArray>();


    for (
      int i = 0;
      i < chunkSize;
      i++
    )
    {
      int idx =
        (bufferStart + i)
        % MAX_BUFFER_SIZE;


      JsonObject obj =
        arr.createNestedObject();


      unsigned long ageMs =
        millis()
        - telemetryBuffer[idx].sampleMillis;


      obj["age_seconds"] =
        ageMs / 1000;

      obj["soil_moisture_pct"] =
        telemetryBuffer[idx].moisture;

      obj["temperature_c"] =
        telemetryBuffer[idx].temperature;

      obj["humidity_pct"] =
        telemetryBuffer[idx].humidity;

      obj["device_id"] =
        "esp32-01";
    }


    String payload;

    serializeJson(
      batchDoc,
      payload
    );


    HTTPClient http;

    http.setTimeout(
      HTTP_TIMEOUT_MS
    );

    http.begin(
      BACKEND_URL
    );

    http.addHeader(
      "Content-Type",
      "application/json"
    );


    int httpCode =
      http.POST(payload);


    http.end();


    if (httpCode == 200)
    {
      bufferStart =
        (bufferStart + chunkSize)
        % MAX_BUFFER_SIZE;

      bufferCount -=
        chunkSize;


#if DEBUG_BUFFER

      Serial.print(
        "Flushed "
      );

      Serial.print(
        chunkSize
      );

      Serial.println(
        " telemetry entries"
      );

#endif
    }
    else
    {
#if DEBUG_BUFFER

      Serial.print(
        "Failed to flush telemetry, HTTP code: "
      );

      Serial.println(
        httpCode
      );

#endif

      // Stop flushing.
      // Retry during a later cycle.

      break;
    }
  }
}


// ============================================================
// BACKEND REQUEST
// ============================================================

bool callBackend(
  int moisturePct,
  float tempC,
  float humidity,
  bool &pumpOn,
  int &durationSec
)
{
  // ----------------------------------------------------------
  // WIFI CHECK
  // ----------------------------------------------------------

  if (
    WiFi.status() != WL_CONNECTED
  )
  {
    Serial.println(
      "WiFi not connected. Buffering telemetry."
    );


    bufferTelemetry(
      moisturePct,
      tempC,
      humidity
    );


    return false;
  }


  HTTPClient http;

  http.setTimeout(
    HTTP_TIMEOUT_MS
  );


  http.begin(
    BACKEND_URL
  );


  http.addHeader(
    "Content-Type",
    "application/json"
  );


  // ----------------------------------------------------------
  // CREATE TELEMETRY JSON
  // ----------------------------------------------------------

  StaticJsonDocument<256>
    requestDoc;


  requestDoc["soil_moisture_pct"] =
    moisturePct;

  requestDoc["temperature_c"] =
    tempC;

  requestDoc["humidity_pct"] =
    humidity;

  requestDoc["device_id"] =
    "esp32-01";


  String payload;

  serializeJson(
    requestDoc,
    payload
  );


  Serial.println();
  Serial.println(
    "Sending telemetry:"
  );

  Serial.println(
    payload
  );


  // ----------------------------------------------------------
  // SEND POST REQUEST
  // ----------------------------------------------------------

  int httpCode =
    http.POST(payload);


  if (httpCode != 200)
  {
    Serial.print(
      "Backend HTTP error: "
    );

    Serial.println(
      httpCode
    );


    Serial.print(
      "HTTP error: "
    );

    Serial.println(
      http.errorToString(
        httpCode
      )
    );


    http.end();

    return false;
  }


  // ----------------------------------------------------------
  // READ BACKEND RESPONSE
  // ----------------------------------------------------------

  String response =
    http.getString();


  http.end();


  Serial.println();
  Serial.println(
    "Backend response:"
  );

  Serial.println(
    response
  );


  // ----------------------------------------------------------
  // PARSE JSON
  // ----------------------------------------------------------

  StaticJsonDocument<256>
    responseDoc;


  DeserializationError error =
    deserializeJson(
      responseDoc,
      response
    );


  if (error)
  {
    Serial.println(
      "Invalid JSON response."
    );

    Serial.println(
      "Command rejected."
    );

    return false;
  }


  // ----------------------------------------------------------
  // STRICT RESPONSE VALIDATION
  // ----------------------------------------------------------

  if (
    !responseDoc.containsKey(
      "trigger_pump"
    )
    ||
    !responseDoc.containsKey(
      "duration_sec"
    )
  )
  {
    Serial.println(
      "Backend response missing required fields."
    );

    Serial.println(
      "Command rejected."
    );

    return false;
  }


  // ----------------------------------------------------------
  // READ AI DECISION
  // ----------------------------------------------------------

  pumpOn =
    responseDoc[
      "trigger_pump"
    ].as<bool>();


  durationSec =
    responseDoc[
      "duration_sec"
    ].as<int>();


  // ----------------------------------------------------------
  // HARD DURATION VALIDATION
  // ----------------------------------------------------------

  if (
    durationSec < 0 ||
    durationSec > MAX_PUMP_RUNTIME_SEC
  )
  {
    Serial.println(
      "Unsafe duration received."
    );

    Serial.println(
      "Applying 30-second HARD LIMIT."
    );


    durationSec =
      constrain(
        durationSec,
        0,
        MAX_PUMP_RUNTIME_SEC
      );
  }


  // ----------------------------------------------------------
  // DISPLAY AI DECISION
  // ----------------------------------------------------------

  Serial.println();
  Serial.println(
    "AI DECISION:"
  );


  Serial.print(
    "Trigger Pump: "
  );

  Serial.println(
    pumpOn
      ? "YES"
      : "NO"
  );


  Serial.print(
    "Duration: "
  );

  Serial.print(
    durationSec
  );

  Serial.println(
    " seconds"
  );


  // ----------------------------------------------------------
  // DISPLAY AI REASON
  // ----------------------------------------------------------

  if (
    responseDoc.containsKey(
      "reason"
    )
  )
  {
    Serial.print(
      "Reason: "
    );

    Serial.println(
      responseDoc[
        "reason"
      ].as<const char*>()
    );
  }


  return true;
}


// ============================================================
// LOCAL FAIL-SAFE
// ============================================================

void runFailsafe(
  int moisturePct
)
{
  Serial.println();
  Serial.println(
    "================================"
  );

  Serial.println(
    "LOCAL FAIL-SAFE ACTIVE"
  );

  Serial.println(
    "Backend unavailable."
  );


  // ----------------------------------------------------------
  // DRY SOIL
  // ----------------------------------------------------------

  if (
    moisturePct <
    FAILSAFE_MOISTURE_PCT
  )
  {
    Serial.println(
      "Soil is DRY."
    );


    unsigned long now =
      millis();


    // --------------------------------------------------------
    // FAIL-SAFE COOLDOWN
    // --------------------------------------------------------

    if (
      lastFailsafeWaterMs != 0
      &&
      (
        now
        - lastFailsafeWaterMs
        <
        FAILSAFE_COOLDOWN_MS
      )
    )
    {
      // Force pump OFF.

      digitalWrite(
        RELAY_PIN,
        HIGH
      );


      Serial.println(
        "[FAILSAFE] Cooldown active - pump locked."
      );


      Serial.print(
        "Cooldown remaining: "
      );


      Serial.print(
        (
          FAILSAFE_COOLDOWN_MS
          -
          (
            now
            - lastFailsafeWaterMs
          )
        )
        / 1000UL
      );


      Serial.println(
        " sec"
      );
    }


    // --------------------------------------------------------
    // FAIL-SAFE WATERING
    // --------------------------------------------------------

    else
    {
      Serial.println(
        "Running 4-second fail-safe watering."
      );


      lastFailsafeWaterMs =
        now;


      runPump(
        FAILSAFE_DURATION_SEC
      );
    }
  }


  // ----------------------------------------------------------
  // SOIL MOISTURE SUFFICIENT
  // ----------------------------------------------------------

  else
  {
    Serial.println(
      "Soil moisture sufficient."
    );

    Serial.println(
      "No watering required."
    );
  }


  Serial.println(
    "================================"
  );
}


// ============================================================
// SETUP
// ============================================================

void setup()
{
  Serial.begin(
    115200
  );


  // ----------------------------------------------------------
  // RELAY INITIALIZATION
  // ----------------------------------------------------------

  pinMode(
    RELAY_PIN,
    OUTPUT
  );


  // ACTIVE LOW:
  // HIGH = Pump OFF

  digitalWrite(
    RELAY_PIN,
    HIGH
  );


  delay(1000);


  // ----------------------------------------------------------
  // STARTUP INFORMATION
  // ----------------------------------------------------------

  Serial.println();

  Serial.println(
    "================================================"
  );

  Serial.println(
    "              BioAgent AI"
  );

  Serial.println(
    "              Team stdIO.H"
  );

  Serial.println(
    "================================================"
  );


  Serial.println();

  Serial.println(
    "Hardware:"
  );

  Serial.println(
    "Soil Sensor : GPIO 34"
  );

  Serial.println(
    "DHT11       : GPIO 18"
  );

  Serial.println(
    "Relay       : GPIO 33"
  );

  Serial.println(
    "Relay Logic : ACTIVE LOW"
  );


  Serial.println();

  Serial.println(
    "Backend:"
  );

  Serial.println(
    BACKEND_URL
  );


  Serial.println();


  connectWiFi();
}


// ============================================================
// MAIN LOOP
// ============================================================

unsigned long lastPoll = 0;


void loop()
{
  // ----------------------------------------------------------
  // WIFI CHECK
  // ----------------------------------------------------------

  if (
    WiFi.status() != WL_CONNECTED
  )
  {
    Serial.println();

    Serial.println(
      "WiFi disconnected."
    );


    connectWiFi();
  } // end WiFi check

    // ----------------------------------------------------------
    // SERIAL COMMAND HANDLING
    // ----------------------------------------------------------
    if (Serial.available() > 0) {
      String cmd = Serial.readStringUntil('\n');
      cmd.trim();
      cmd.toUpperCase();

      if (cmd == "D") {
        if (!demoActive) {
          currentMode = MODE_DEMO;
          demoActive = true;
          demoStartMs = millis();
          Serial.println("================================");
          Serial.println("BIOAGENT AI — DEMO MODE");
          Serial.println("================================");
          Serial.println("Physical pump demonstration");
          Serial.println("Pump duration: 5 seconds");
          Serial.println("Relay: ON");
          Serial.println("Pump: ON");
          Serial.println("================================");
          digitalWrite(RELAY_PIN, LOW); // Relay ON => pump ON
        }
      } else if (cmd == "AI") {
        currentMode = MODE_AI;
        Serial.println("================================");
        Serial.println("BIOAGENT AI — AI MODE");
        Serial.println("================================");
        Serial.println("Backend AI control restored.");
        Serial.println("================================");
      } else if (cmd == "STATUS") {
        Serial.print("Mode: ");
        Serial.println(currentMode == MODE_AI ? "AI" : "DEMO");
        Serial.print("Pump: ");
        Serial.println(digitalRead(RELAY_PIN) == LOW ? "ON" : "OFF");
        Serial.print("Relay: ");
        Serial.println(digitalRead(RELAY_PIN) == LOW ? "LOW (ON)" : "HIGH (OFF)");
        Serial.print("Backend: ");
        Serial.println(WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected");
      } else if (cmd == "OFF") {
        demoActive = false;
        digitalWrite(RELAY_PIN, HIGH);
        Serial.println("EMERGENCY MANUAL OFF");
        Serial.println("Pump: OFF");
      }
    }

    // Demo timer check
    if (demoActive && (millis() - demoStartMs >= DEMO_DURATION_MS)) {
      digitalWrite(RELAY_PIN, HIGH);
      demoActive = false;
      Serial.println("Pump: OFF");
      Serial.println("Demo complete.");
      Serial.println("================================");
  



  // ----------------------------------------------------------
  // TELEMETRY CYCLE
  // ----------------------------------------------------------

  if (
    ( (millis() - lastPoll >= POLL_INTERVAL_MS) || (lastPoll == 0) ) && !demoActive
  )
  {
    lastPoll =
      millis();


    Serial.println();
    Serial.println();

    Serial.println(
      "================================================"
    );

    Serial.println(
      "             NEW TELEMETRY CYCLE"
    );

    Serial.println(
      "================================================"
    );


    // --------------------------------------------------------
    // SOIL SENSOR
    // --------------------------------------------------------

    int moisturePct =
      readSoilMoisturePercent();


    // Invalid sensor reading.
    // Do not continue with DHT or backend request.

    if (
      moisturePct < 0
    )
    {
      Serial.println();

      Serial.println(
        "Waiting 30 seconds for next cycle..."
      );

      Serial.println(
        "================================================"
      );


      return;
    }


    // --------------------------------------------------------
    // DHT11 SENSOR
    // --------------------------------------------------------

    dht11.read(
      DHT_PIN
    );


    float tempC =
      dht11.temperature;


    float humidity =
      dht11.humidity;


    Serial.print(
      "Temperature: "
    );

    Serial.print(
      tempC
    );

    Serial.println(
      " C"
    );


    Serial.print(
      "Humidity: "
    );

    Serial.print(
      humidity
    );

    Serial.println(
      " %"
    );


    // --------------------------------------------------------
    // DHT11 VALIDATION
    // --------------------------------------------------------

    if (
      tempC < -40
      ||
      tempC > 80
      ||
      humidity < 0
      ||
      humidity > 100
    )
    {
      Serial.println(
        "DHT11 reading invalid."
      );

      Serial.println(
        "Using fallback values."
      );


      tempC = 25.0;

      humidity = 50.0;
    }


    // --------------------------------------------------------
    // BACKEND / AI REQUEST
    // --------------------------------------------------------

    bool pumpOn = false;

    int durationSec = 0;


    bool backendOK =
      callBackend(
        moisturePct,
        tempC,
        humidity,
        pumpOn,
        durationSec
      );


    // --------------------------------------------------------
    // BACKEND SUCCESS
    // --------------------------------------------------------

    if (
      backendOK
    )
    {
      Serial.println();

      Serial.println(
        "Backend responded successfully."
      );


      if (
        pumpOn
      )
      {
        Serial.println(
          "AI DECISION: WATER"
        );


        runPump(
          durationSec
        );
      }
      else
      {
        Serial.println(
          "AI DECISION: DO NOT WATER"
        );


        Serial.println(
          "Pump remains OFF."
        );
      }
    }


    // --------------------------------------------------------
    // BACKEND FAILURE
    // --------------------------------------------------------

    else
    {
      Serial.println();

      Serial.println(
        "Backend unavailable."
      );


      runFailsafe(
        moisturePct
      );
    }


    // --------------------------------------------------------
    // WAIT FOR NEXT CYCLE
    // --------------------------------------------------------

    Serial.println();

    Serial.println(
      "Waiting 30 seconds for next cycle..."
    );

    Serial.println(
      "================================================"
    );
  }
}