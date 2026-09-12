
/*
  ============================================================
  BioAgent AI — ESP32 Firmware
  Team stdIO.H — INFERENTIA Hackathon
  ============================================================

  HARDWARE
  ------------------------------------------------------------
  ESP32 WROOM-32

  Soil Moisture Sensor -> GPIO 34
  DHT11                -> GPIO 18
  Relay IN             -> GPIO 33
  Relay                -> ACTIVE LOW
  Pump                 -> External 3xAAA battery supply

  SOFTWARE FLOW
  ------------------------------------------------------------
  ESP32
      |
      | WiFi
      v
  FastAPI Backend
      |
      | AI decision
      v
  ESP32
      |
      v
  Relay -> Pump

  SAFETY
  ------------------------------------------------------------
  Maximum pump runtime = 30 seconds
  Backend failure       = local fail-safe
  Invalid JSON          = command rejected
  Invalid duration      = clamped to safe limit
  ============================================================
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DFRobot_DHT11.h>


// ============================================================
// WIFI
// ============================================================

const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";


// ============================================================
// FASTAPI BACKEND
// ============================================================

// Replace with your backend server's local IP address
const char* BACKEND_URL = "http://<YOUR_BACKEND_IP>:8000/telemetry";


// ============================================================
// HARDWARE PINS
// ============================================================

#define SOIL_PIN   34
#define DHT_PIN    18
#define RELAY_PIN  33


// ============================================================
// TIMING
// ============================================================

// 30 seconds for hackathon demonstration
const unsigned long POLL_INTERVAL_MS = 30000;

// Backend timeout
const unsigned long HTTP_TIMEOUT_MS = 8000;


// ============================================================
// SAFETY LIMITS
// ============================================================

// Absolute maximum pump runtime
const int MAX_PUMP_RUNTIME_SEC = 30;

// Local fail-safe
const int FAILSAFE_MOISTURE_PCT = 18;
const int FAILSAFE_DURATION_SEC = 4;


// ============================================================
// SOIL CALIBRATION
// ============================================================

// Current calibration values
// These were previously measured with your sensor.
// Recalibrate later if required.

const int SOIL_DRY = 2480;
const int SOIL_WET = 790;


// ============================================================
// DHT11 OBJECT
// ============================================================

DFRobot_DHT11 dht11;


// ============================================================
// SETUP
// ============================================================

void setup()
{
  Serial.begin(115200);

  // Relay output
  pinMode(RELAY_PIN, OUTPUT);

  // ACTIVE LOW RELAY
  // HIGH = OFF
  digitalWrite(RELAY_PIN, HIGH);

  delay(1000);

  Serial.println();
  Serial.println("================================================");
  Serial.println("              BioAgent AI");
  Serial.println("              Team stdIO.H");
  Serial.println("================================================");

  Serial.println();
  Serial.println("Hardware:");
  Serial.println("Soil Sensor : GPIO 34");
  Serial.println("DHT11       : GPIO 18");
  Serial.println("Relay       : GPIO 33");
  Serial.println("Relay Logic : ACTIVE LOW");

  Serial.println();
  Serial.println("Backend:");
  Serial.println(BACKEND_URL);

  Serial.println();

  connectWiFi();
}


// ============================================================
// WIFI CONNECTION
// ============================================================

void connectWiFi()
{
  Serial.println();
  Serial.println("Connecting to phone hotspot...");

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

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
      "The ESP32 will use local fail-safe logic."
    );
  }
}


// ============================================================
// SOIL MOISTURE
// ============================================================

int readSoilMoisturePercent()
{
  int raw = analogRead(SOIL_PIN);

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

  Serial.print("Soil Raw: ");
  Serial.println(raw);

  Serial.print("Soil Moisture: ");
  Serial.print(moisture);
  Serial.println("%");

  return moisture;
}


// ============================================================
// PUMP CONTROL
// ============================================================

void runPump(int durationSec)
{
  // HARD SAFETY LIMIT
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

  Serial.print("PUMP ON");
  Serial.print(" | Requested: ");
  Serial.print(durationSec);
  Serial.print(" sec");
  Serial.print(" | Safe: ");
  Serial.print(safeDuration);
  Serial.println(" sec");

  // ACTIVE LOW
  // LOW = relay ON
  digitalWrite(RELAY_PIN, LOW);

  delay(
    safeDuration * 1000UL
  );

  // HIGH = relay OFF
  digitalWrite(RELAY_PIN, HIGH);

  Serial.println("PUMP OFF");

  Serial.println("--------------------------------");
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
  if (WiFi.status() != WL_CONNECTED)
  {
    Serial.println(
      "WiFi not connected."
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
  // CREATE JSON
  // ----------------------------------------------------------

  StaticJsonDocument<256> requestDoc;

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
  // POST
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
  // RESPONSE
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

  StaticJsonDocument<256> responseDoc;

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
  // STRICT VALIDATION
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


  // Read backend decision
  pumpOn =
    responseDoc[
      "trigger_pump"
    ].as<bool>();


  durationSec =
    responseDoc[
      "duration_sec"
    ].as<int>();


  // ----------------------------------------------------------
  // SAFETY LIMIT
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
  // DISPLAY DECISION
  // ----------------------------------------------------------

  Serial.println();
  Serial.println("AI DECISION:");

  Serial.print(
    "Trigger Pump: "
  );

  Serial.println(
    pumpOn ? "YES" : "NO"
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


  // Optional reason from backend
  if (responseDoc.containsKey("reason"))
  {
    Serial.print(
      "Reason: "
    );

    Serial.println(
      responseDoc["reason"].as<const char*>()
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


  if (
    moisturePct <
    FAILSAFE_MOISTURE_PCT
  )
  {
    Serial.println(
      "Soil is DRY."
    );

    Serial.println(
      "Running 4-second fail-safe watering."
    );

    runPump(
      FAILSAFE_DURATION_SEC
    );
  }
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
  }


  // ----------------------------------------------------------
  // TELEMETRY CYCLE
  // ----------------------------------------------------------

  if (
    millis() - lastPoll >=
      POLL_INTERVAL_MS
    ||
    lastPoll == 0
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
    // SOIL
    // --------------------------------------------------------

    int moisturePct =
      readSoilMoisturePercent();


    // --------------------------------------------------------
    // DHT11
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
    // DHT VALIDATION
    // --------------------------------------------------------

    if (
      tempC < -40 ||
      tempC > 80 ||
      humidity < 0 ||
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
    // BACKEND / AI
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

    if (backendOK)
    {
      Serial.println();
      Serial.println(
        "Backend responded successfully."
      );


      if (pumpOn)
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


    Serial.println();
    Serial.println(
      "Waiting 30 seconds for next cycle..."
    );

    Serial.println(
      "================================================"
    );
  }
}