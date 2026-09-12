"""
Test Suite for User Authentication and Per-User Data Storage
Verifies:
- SQLite tables: users, plants, irrigation_history, telemetry
- /auth/signup, /auth/login, /auth/verify
- /plant-profile (POST), /irrigate-decision (POST)
- /irrigation-history (GET), /user-plants (GET)
- 401 Unauthorized on missing/invalid JWT
- Per-user data isolation (User A cannot see User B's data)
"""

import os
import sys
import unittest
import sqlite3
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import app, DB_PATH, get_db

client = TestClient(app)


class TestUserAuthAndStorage(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        # Verify tables exist
        with get_db() as conn:
            tables = [
                row[0]
                for row in conn.execute(
                    "SELECT name FROM sqlite_master WHERE type='table'"
                ).fetchall()
            ]
        for expected_table in ["users", "plants", "irrigation_history", "telemetry"]:
            assert expected_table in tables, f"Missing table: {expected_table}"
        print("Database schema verified: all 4 tables exist.")

    def test_01_schema_columns(self):
        """Verify columns on all 4 new tables."""
        with get_db() as conn:
            user_cols = [c[1] for c in conn.execute("PRAGMA table_info(users)").fetchall()]
            self.assertIn("id", user_cols)
            self.assertIn("username", user_cols)
            self.assertIn("email", user_cols)
            self.assertIn("password_hash", user_cols)
            self.assertIn("created_at", user_cols)

            plant_cols = [c[1] for c in conn.execute("PRAGMA table_info(plants)").fetchall()]
            self.assertIn("id", plant_cols)
            self.assertIn("user_id", plant_cols)
            self.assertIn("species", plant_cols)
            self.assertIn("scientific_name", plant_cols)
            self.assertIn("confidence", plant_cols)
            self.assertIn("ideal_moisture_min", plant_cols)
            self.assertIn("ideal_moisture_max", plant_cols)

            irrig_cols = [c[1] for c in conn.execute("PRAGMA table_info(irrigation_history)").fetchall()]
            self.assertIn("id", irrig_cols)
            self.assertIn("user_id", irrig_cols)
            self.assertIn("plant_id", irrig_cols)
            self.assertIn("soil_moisture", irrig_cols)
            self.assertIn("decision", irrig_cols)
            self.assertIn("duration_sec", irrig_cols)
            self.assertIn("reason", irrig_cols)
            self.assertIn("timestamp", irrig_cols)

            telem_cols = [c[1] for c in conn.execute("PRAGMA table_info(telemetry)").fetchall()]
            self.assertIn("id", telem_cols)
            self.assertIn("user_id", telem_cols)
            self.assertIn("soil_moisture", telem_cols)
            self.assertIn("temperature", telem_cols)
            self.assertIn("humidity", telem_cols)
            self.assertIn("timestamp", telem_cols)

    def test_02_signup_and_duplicate_handling(self):
        """POST /auth/signup creates account, rejects duplicates."""
        rand_suffix = os.urandom(4).hex()
        username = f"user_{rand_suffix}"
        email = f"user_{rand_suffix}@example.com"
        password = "SecurePassword123!"

        res = client.post(
            "/auth/signup",
            json={"username": username, "email": email, "password": password},
        )
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["username"], username)
        self.assertEqual(data["email"], email)
        self.assertIn("user_id", data)

        # Duplicate username should fail
        dup_res = client.post(
            "/auth/signup",
            json={"username": username, "email": f"other_{rand_suffix}@example.com", "password": password},
        )
        self.assertEqual(dup_res.status_code, 400)

    def test_03_login_and_verify(self):
        """POST /auth/login returns JWT; POST /auth/verify validates it."""
        rand_suffix = os.urandom(4).hex()
        username = f"auth_{rand_suffix}"
        email = f"auth_{rand_suffix}@example.com"
        password = "AuthPassword123"

        client.post(
            "/auth/signup",
            json={"username": username, "email": email, "password": password},
        )

        # Wrong password
        bad_login = client.post(
            "/auth/login",
            json={"username": username, "password": "WrongPassword"},
        )
        self.assertEqual(bad_login.status_code, 401)

        # Correct login
        login_res = client.post(
            "/auth/login",
            json={"username": username, "password": password},
        )
        self.assertEqual(login_res.status_code, 200)
        token_data = login_res.json()
        self.assertIn("access_token", token_data)
        token = token_data["access_token"]

        # Verify via Authorization header
        verify_res = client.post(
            "/auth/verify",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(verify_res.status_code, 200)
        self.assertTrue(verify_res.json()["valid"])
        self.assertEqual(verify_res.json()["username"], username)

        # Verify via body
        verify_body = client.post("/auth/verify", json={"token": token})
        self.assertEqual(verify_body.status_code, 200)
        self.assertTrue(verify_body.json()["valid"])

        # Invalid token
        invalid_verify = client.post(
            "/auth/verify",
            headers={"Authorization": "Bearer invalid.token.value"},
        )
        self.assertEqual(invalid_verify.status_code, 401)

    def test_04_unauthorized_endpoints_without_jwt(self):
        """Endpoints return 401 Unauthorized if JWT is missing."""
        # 1. POST /plant-profile
        r1 = client.post("/plant-profile", json={"species": "Bael"})
        self.assertEqual(r1.status_code, 401)

        # 2. POST /irrigate-decision
        r2 = client.post(
            "/irrigate-decision",
            json={"soil_moisture": 25, "decision": "WATER", "duration_sec": 15},
        )
        self.assertEqual(r2.status_code, 401)

        # 3. GET /irrigation-history
        r3 = client.get("/irrigation-history")
        self.assertEqual(r3.status_code, 401)

        # 4. GET /user-plants
        r4 = client.get("/user-plants")
        self.assertEqual(r4.status_code, 401)

    def test_05_per_user_isolation(self):
        """Verify that User A cannot see User B's plants or irrigation history."""
        suffix_a = os.urandom(4).hex()
        user_a = f"alice_{suffix_a}"
        client.post(
            "/auth/signup",
            json={"username": user_a, "email": f"{user_a}@test.com", "password": "PasswordA1!"},
        )
        token_a = client.post(
            "/auth/login",
            json={"username": user_a, "password": "PasswordA1!"},
        ).json()["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        suffix_b = os.urandom(4).hex()
        user_b = f"bob_{suffix_b}"
        client.post(
            "/auth/signup",
            json={"username": user_b, "email": f"{user_b}@test.com", "password": "PasswordB1!"},
        )
        token_b = client.post(
            "/auth/login",
            json={"username": user_b, "password": "PasswordB1!"},
        ).json()["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # User A creates a plant
        plant_res_a = client.post(
            "/plant-profile",
            headers=headers_a,
            json={
                "species": "Bael Tree",
                "scientific_name": "Aegle marmelos",
                "confidence": 0.95,
                "ideal_moisture_min": 40,
                "ideal_moisture_max": 60,
            },
        )
        self.assertEqual(plant_res_a.status_code, 200)
        plant_id_a = plant_res_a.json()["plant_id"]

        # User B creates a plant
        plant_res_b = client.post(
            "/plant-profile",
            headers=headers_b,
            json={
                "species": "Golden Barrel Cactus",
                "scientific_name": "Echinocactus grusonii",
                "confidence": 0.98,
                "ideal_moisture_min": 10,
                "ideal_moisture_max": 30,
            },
        )
        self.assertEqual(plant_res_b.status_code, 200)

        # User A records an irrigation decision
        irrig_a = client.post(
            "/irrigate-decision",
            headers=headers_a,
            json={
                "plant_id": plant_id_a,
                "soil_moisture": 25,
                "decision": "WATER",
                "duration_sec": 15,
                "reason": "Soil moisture below 40% ideal threshold",
            },
        )
        self.assertEqual(irrig_a.status_code, 200)

        # User A fetches plants -> should have 1 plant ("Bael Tree")
        plants_a = client.get("/user-plants", headers=headers_a).json()["plants"]
        self.assertEqual(len(plants_a), 1)
        self.assertEqual(plants_a[0]["species"], "Bael Tree")

        # User B fetches plants -> should have 1 plant ("Golden Barrel Cactus") and NOT Bael
        plants_b = client.get("/user-plants", headers=headers_b).json()["plants"]
        self.assertEqual(len(plants_b), 1)
        self.assertEqual(plants_b[0]["species"], "Golden Barrel Cactus")

        # User A fetches history -> should have 1 decision
        hist_a = client.get("/irrigation-history", headers=headers_a).json()["history"]
        self.assertEqual(len(hist_a), 1)
        self.assertEqual(hist_a[0]["decision"], "WATER")

        # User B fetches history -> should have 0 decisions
        hist_b = client.get("/irrigation-history", headers=headers_b).json()["history"]
        self.assertEqual(len(hist_b), 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
