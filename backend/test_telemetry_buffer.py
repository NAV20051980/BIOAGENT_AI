"""
Test Suite for Offline Telemetry Buffering
Verifies:
- POST /user-telemetry accepts a single telemetry JSON object
- POST /user-telemetry accepts a JSON array (batch) of telemetry objects
- age_seconds field correctly offsets stored timestamps
- Per-item success details are returned in the response
"""

import os
import sys
import time
import unittest

from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import app, get_db

client = TestClient(app)


def _create_test_user_and_token(suffix: str = "") -> str:
    """Helper: sign up a unique user and return an auth token."""
    rand = os.urandom(4).hex() + suffix
    username = f"buftest_{rand}"
    email = f"buftest_{rand}@test.com"
    password = "TestPass123!"

    signup_resp = client.post("/auth/signup", json={
        "username": username,
        "email": email,
        "password": password,
    })
    assert signup_resp.status_code == 201, f"Signup failed: {signup_resp.text}"

    login_resp = client.post("/auth/login", json={
        "username": username,
        "password": password,
    })
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    return login_resp.json()["access_token"]


class TestTelemetryBuffer(unittest.TestCase):
    """Tests for the batch-capable /user-telemetry endpoint."""

    @classmethod
    def setUpClass(cls):
        cls.token = _create_test_user_and_token("buf")
        cls.headers = {"Authorization": f"Bearer {cls.token}"}

    # ------------------------------------------------------------------
    # 1. Single object — backwards compatible
    # ------------------------------------------------------------------
    def test_single_payload(self):
        """POST a single telemetry object and verify per-item result."""
        resp = client.post(
            "/user-telemetry",
            json={"soil_moisture": 42, "temperature": 25.0, "humidity": 55.0},
            headers=self.headers,
        )
        self.assertEqual(resp.status_code, 200)
        body = resp.json()

        self.assertEqual(body["processed"], 1)
        self.assertIn("results", body)
        self.assertEqual(len(body["results"]), 1)

        item = body["results"][0]
        self.assertEqual(item["status"], "stored")
        self.assertEqual(item["soil_moisture"], 42)
        self.assertIsNotNone(item["id"])

    # ------------------------------------------------------------------
    # 2. Batch array
    # ------------------------------------------------------------------
    def test_batch_payload(self):
        """POST an array of 3 telemetry objects and verify all are stored."""
        batch = [
            {"soil_moisture": 30, "temperature": 22.0, "humidity": 60.0},
            {"soil_moisture": 35, "temperature": 23.5, "humidity": 58.0},
            {"soil_moisture": 40, "temperature": 24.0, "humidity": 52.0},
        ]
        resp = client.post(
            "/user-telemetry",
            json=batch,
            headers=self.headers,
        )
        self.assertEqual(resp.status_code, 200)
        body = resp.json()

        self.assertEqual(body["processed"], 3)
        self.assertEqual(len(body["results"]), 3)
        for item in body["results"]:
            self.assertEqual(item["status"], "stored")
            self.assertIsNotNone(item["id"])

    # ------------------------------------------------------------------
    # 3. age_seconds offsets timestamps
    # ------------------------------------------------------------------
    def test_age_seconds_offset(self):
        """Verify that age_seconds causes the stored timestamp to be offset."""
        age = 120  # 2 minutes ago
        before = time.time()

        resp = client.post(
            "/user-telemetry",
            json={
                "soil_moisture": 50,
                "temperature": 26.0,
                "humidity": 45.0,
                "age_seconds": age,
            },
            headers=self.headers,
        )
        self.assertEqual(resp.status_code, 200)
        body = resp.json()

        stored_ts = body["results"][0]["timestamp"]
        expected_approx = before - age

        # Allow 5 seconds of tolerance for execution time
        self.assertAlmostEqual(stored_ts, expected_approx, delta=5.0,
                               msg="Stored timestamp should be ~2 min before now")

    # ------------------------------------------------------------------
    # 4. Batch with mixed age_seconds
    # ------------------------------------------------------------------
    def test_batch_with_age_seconds(self):
        """Batch items with different age_seconds should have different timestamps."""
        batch = [
            {"soil_moisture": 20, "temperature": 21.0, "humidity": 70.0, "age_seconds": 300},
            {"soil_moisture": 25, "temperature": 22.0, "humidity": 65.0, "age_seconds": 60},
            {"soil_moisture": 28, "temperature": 23.0, "humidity": 62.0},  # no age_seconds
        ]
        resp = client.post(
            "/user-telemetry",
            json=batch,
            headers=self.headers,
        )
        self.assertEqual(resp.status_code, 200)
        body = resp.json()

        ts_oldest = body["results"][0]["timestamp"]
        ts_middle = body["results"][1]["timestamp"]
        ts_newest = body["results"][2]["timestamp"]

        # Oldest should be before middle, middle before newest
        self.assertLess(ts_oldest, ts_middle,
                        "Item with age_seconds=300 should have an earlier timestamp")
        self.assertLess(ts_middle, ts_newest,
                        "Item with age_seconds=60 should have an earlier timestamp than live")

    # ------------------------------------------------------------------
    # 5. Unauthenticated request is rejected
    # ------------------------------------------------------------------
    def test_unauthenticated_rejected(self):
        """POST without Authorization header returns 401."""
        resp = client.post(
            "/user-telemetry",
            json={"soil_moisture": 50, "temperature": 24.0, "humidity": 50.0},
        )
        self.assertEqual(resp.status_code, 401)

    # ------------------------------------------------------------------
    # 6. Verify DB rows exist
    # ------------------------------------------------------------------
    def test_db_rows_created(self):
        """Confirm telemetry rows exist in the database after a batch POST."""
        resp = client.post(
            "/user-telemetry",
            json=[
                {"soil_moisture": 99, "temperature": 30.0, "humidity": 80.0},
                {"soil_moisture": 98, "temperature": 29.0, "humidity": 79.0},
            ],
            headers=self.headers,
        )
        self.assertEqual(resp.status_code, 200)
        ids = [r["id"] for r in resp.json()["results"]]

        with get_db() as conn:
            for row_id in ids:
                row = conn.execute(
                    "SELECT * FROM telemetry WHERE id = ?", (row_id,)
                ).fetchone()
                self.assertIsNotNone(row, f"Telemetry row {row_id} not found in DB")


if __name__ == "__main__":
    unittest.main()
