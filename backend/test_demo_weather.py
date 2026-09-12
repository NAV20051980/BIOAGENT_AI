"""
Test Suite for Demo Weather Forecast Override & AI Decision Integration
Verifies:
- POST /demo/weather-scenario accepts presets ('rain', 'clear', 'storm', 'heatwave', 'cloudy', 'off')
- POST /demo/weather-scenario accepts custom structured parameters (condition, rain_prob, rainfall_mm, temp)
- GET /weather returns active simulated weather
- POST /telemetry accepts demo_weather_override and suspends watering when rain probability >= 60%
"""

import os
import sys
import unittest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import app
from agent import force_weather_scenario

client = TestClient(app)


class TestDemoWeatherIntegration(unittest.TestCase):

    def tearDown(self):
        # Reset forced weather after each test
        force_weather_scenario(None)

    def test_01_set_weather_preset(self):
        """Test setting preset scenarios ('rain', 'clear', 'off')."""
        resp = client.post("/demo/weather-scenario", json={"scenario": "rain"})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("active_weather", data)
        self.assertGreaterEqual(data["active_weather"]["max_rain_probability_pct"], 80.0)

        # Verify GET /weather reflects the forced scenario
        weather_resp = client.get("/weather")
        self.assertEqual(weather_resp.status_code, 200)
        self.assertEqual(weather_resp.json()["max_rain_probability_pct"], data["active_weather"]["max_rain_probability_pct"])

    def test_02_set_custom_weather_parameters(self):
        """Test setting custom weather parameters via POST /demo/weather-scenario."""
        custom_payload = {
            "scenario": "custom",
            "condition": "Heavy Thunderstorm",
            "rain_probability_pct": 92.5,
            "expected_rain_mm_24h": 22.0,
            "temperature_c": 18.5,
        }
        resp = client.post("/demo/weather-scenario", json=custom_payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        active = data["active_weather"]
        self.assertEqual(active["condition"], "Heavy Thunderstorm")
        self.assertEqual(active["max_rain_probability_pct"], 92.5)
        self.assertEqual(active["expected_rain_mm_24h"], 22.0)
        self.assertEqual(active["temperature_c"], 18.5)

    def test_03_telemetry_with_weather_override_suspends_irrigation(self):
        """Telemetry with rain probability >= 60% should deterministically suspend watering."""
        telemetry_payload = {
            "soil_moisture_pct": 32.0,  # moderately dry
            "temperature_c": 22.0,
            "humidity_pct": 70.0,
            "demo_weather_override": {
                "condition": "Heavy Thunderstorm",
                "max_rain_probability_pct": 85.0,
                "expected_rain_mm_24h": 15.0,
                "temperature_c": 20.0,
            },
        }
        resp = client.post("/telemetry", json=telemetry_payload)
        self.assertEqual(resp.status_code, 200)
        decision = resp.json()
        self.assertFalse(decision["trigger_pump"])
        self.assertEqual(decision["duration_sec"], 0)
        self.assertIn("Watering Suspended: Rain Predicted", decision["reason"])

    def test_04_reset_weather_scenario(self):
        """Test resetting weather scenario to real-world live forecast."""
        client.post("/demo/weather-scenario", json={"scenario": "rain"})
        reset_resp = client.post("/demo/weather-scenario", json={"scenario": "off"})
        self.assertEqual(reset_resp.status_code, 200)
        self.assertIn("off", reset_resp.json()["forced_scenario"])


if __name__ == "__main__":
    unittest.main()
