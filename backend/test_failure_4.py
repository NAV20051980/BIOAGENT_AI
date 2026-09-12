"""
Test Suite for Failure Mode #4: Deterministic Confidence Gate & Profile Activation Safety
Tests A-F + Regression Checks
"""

import os
import sys
import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import app
from agent import get_plant_profile, set_plant_profile, DEFAULT_PLANT_PROFILE
import plant_id

client = TestClient(app)


class TestFailureMode4(unittest.TestCase):

    def setUp(self):
        # Reset to known default profile before each test
        set_plant_profile(DEFAULT_PLANT_PROFILE)

    def test_A_high_confidence_supported(self):
        """TEST A — High-confidence supported:
        Aegle marmelos = 0.35
        Expected: profile_activated = True, identification_status = 'accepted', profile changes to Bael.
        """
        mock_results = {
            "results": [
                {
                    "score": 0.35,
                    "species": {
                        "scientificNameWithoutAuthor": "Aegle marmelos",
                        "scientificName": "Aegle marmelos (L.) Corrêa",
                        "commonNames": ["Bael"],
                    },
                }
            ]
        }
        with patch.object(plant_id, "_identify_with_plantnet", return_value=mock_results):
            dummy_bytes = b"fake_image_bytes_A"
            res = client.post(
                "/identify-plant",
                files={"file": ("test.jpg", dummy_bytes, "image/jpeg")},
            )
            self.assertEqual(res.status_code, 200)
            data = res.json()

            self.assertEqual(data["species"], "Bael")
            self.assertEqual(data["confidence"], 0.35)
            self.assertEqual(data["profile_activated"], True)
            self.assertEqual(data["identification_status"], "accepted")

            # Verify active profile in backend changed to Bael
            active_prof = get_plant_profile()
            self.assertEqual(active_prof["species"], "Bael")
            self.assertEqual(active_prof["ideal_moisture_range_pct"], [40, 60])
            print("TEST A: PASSED")

    def test_B_low_confidence_supported(self):
        """TEST B — Low-confidence:
        Aegle marmelos = 0.08
        Expected: profile_activated = False, identification_status = 'low_confidence', previous active profile remains unchanged.
        """
        # Start with Bael as active profile
        set_plant_profile({
            "species": "Bael",
            "ideal_moisture_range_pct": [40, 60],
            "growth_stage": "active",
        })
        prev_profile = dict(get_plant_profile())

        mock_results = {
            "results": [
                {
                    "score": 0.08,
                    "species": {
                        "scientificNameWithoutAuthor": "Aegle marmelos",
                        "scientificName": "Aegle marmelos (L.) Corrêa",
                    },
                }
            ]
        }
        with patch.object(plant_id, "_identify_with_plantnet", return_value=mock_results):
            dummy_bytes = b"fake_image_bytes_B"
            res = client.post(
                "/identify-plant",
                files={"file": ("test.jpg", dummy_bytes, "image/jpeg")},
            )
            self.assertEqual(res.status_code, 200)
            data = res.json()

            self.assertEqual(data["species"], "Bael")
            self.assertEqual(data["confidence"], 0.08)
            self.assertEqual(data["profile_activated"], False)
            self.assertEqual(data["identification_status"], "low_confidence")

            # Verify active profile did NOT change
            current_prof = get_plant_profile()
            self.assertEqual(current_prof, prev_profile)
            print("TEST B: PASSED")

    def test_C_ambiguous_supported_candidates(self):
        """TEST C — Ambiguous:
        Bael = 0.30, Cactus = 0.28
        Margin = 0.02 < 0.05
        Expected: profile_activated = False, identification_status = 'ambiguous', previous active profile remains unchanged.
        """
        # Start with Monstera
        set_plant_profile(DEFAULT_PLANT_PROFILE)
        prev_profile = dict(get_plant_profile())

        mock_results = {
            "results": [
                {
                    "score": 0.30,
                    "species": {
                        "scientificNameWithoutAuthor": "Aegle marmelos",
                        "scientificName": "Aegle marmelos (L.) Corrêa",
                    },
                },
                {
                    "score": 0.28,
                    "species": {
                        "scientificNameWithoutAuthor": "Cereus repandus",
                        "scientificName": "Cereus repandus (L.) Mill.",
                    },
                },
            ]
        }
        with patch.object(plant_id, "_identify_with_plantnet", return_value=mock_results):
            dummy_bytes = b"fake_image_bytes_C"
            res = client.post(
                "/identify-plant",
                files={"file": ("test.jpg", dummy_bytes, "image/jpeg")},
            )
            self.assertEqual(res.status_code, 200)
            data = res.json()

            self.assertEqual(data["profile_activated"], False)
            self.assertEqual(data["identification_status"], "ambiguous")

            # Verify active profile did NOT change
            current_prof = get_plant_profile()
            self.assertEqual(current_prof, prev_profile)
            print("TEST C: PASSED")

    def test_D_no_supported_plant(self):
        """TEST D — No supported plant:
        Unknown/unsupported PlantNet result or PlantNet failure.
        Expected: profile_activated = False, active profile remains unchanged.
        """
        # Start with Cactus as active profile
        cactus_profile = {
            "species": "Golden Barrel Cactus",
            "ideal_moisture_range_pct": [10, 30],
        }
        set_plant_profile(cactus_profile)
        prev_profile = dict(get_plant_profile())

        # Subcase 1: Unsupported plant in PlantNet
        mock_results_unsupported = {
            "results": [
                {
                    "score": 0.45,
                    "species": {
                        "scientificNameWithoutAuthor": "Quercus robur",
                        "commonName": "English oak",
                    },
                }
            ]
        }
        with patch.object(plant_id, "_identify_with_plantnet", return_value=mock_results_unsupported):
            with patch.object(plant_id, "_generate_profile_with_groq", return_value=plant_id.GENERIC_PROFILE):
                dummy_bytes = b"fake_image_bytes_D1"
                res = client.post(
                    "/identify-plant",
                    files={"file": ("test.jpg", dummy_bytes, "image/jpeg")},
                )
                self.assertEqual(res.status_code, 200)
                data = res.json()

                self.assertEqual(data["profile_activated"], False)
                self.assertEqual(data["identification_status"], "no_supported_plant")
                # Active profile must still be Cactus
                self.assertEqual(get_plant_profile(), prev_profile)

        # Subcase 2: PlantNet failure / empty results
        with patch.object(plant_id, "_identify_with_plantnet", return_value={}):
            dummy_bytes = b"fake_image_bytes_D2"
            res = client.post(
                "/identify-plant",
                files={"file": ("test.jpg", dummy_bytes, "image/jpeg")},
            )
            self.assertEqual(res.status_code, 200)
            data = res.json()

            self.assertEqual(data["profile_activated"], False)
            self.assertEqual(data["identification_status"], "no_supported_plant")
            # Active profile must still be Cactus
            self.assertEqual(get_plant_profile(), prev_profile)
            print("TEST D: PASSED")

    def test_E_real_bael_image(self):
        """TEST E — REAL Bael IMAGE:
        Use plant1.jpeg where top result is unsupported Tabebuia roseoalba (0.3277)
        and supported Aegle marmelos is 0.2984.
        Expected: Aegle marmelos / Bael, confidence ~0.298, profile_activated = True,
        identification_status = 'accepted', active profile becomes Bael.
        """
        bael_image_path = "/Users/navaneet.s/Downloads/plant1.jpeg"
        if not os.path.exists(bael_image_path):
            self.skipTest(f"{bael_image_path} not found")

        # Set active profile to something else first
        set_plant_profile({
            "species": "Monstera",
            "ideal_moisture_range_pct": [40, 65],
        })

        with open(bael_image_path, "rb") as f:
            image_bytes = f.read()

        res = client.post(
            "/identify-plant",
            files={"file": ("plant1.jpeg", image_bytes, "image/jpeg")},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertEqual(data["species"], "Bael")
        self.assertEqual(data["scientific_name"], "Aegle marmelos")
        self.assertAlmostEqual(data["confidence"], 0.298, places=2)
        self.assertEqual(data["profile_activated"], True)
        self.assertEqual(data["identification_status"], "accepted")

        # Active profile should now be Bael
        active_prof = get_plant_profile()
        self.assertEqual(active_prof["species"], "Bael")
        self.assertEqual(active_prof["ideal_moisture_range_pct"], [40, 60])
        print(f"TEST E: PASSED (Bael confidence: {data['confidence']}, profile_activated: {data['profile_activated']})")

    def test_F_real_cactus_image(self):
        """TEST F — REAL GOLDEN BARREL CACTUS:
        Use plant 3.jpg (Echinocactus grusonii, score ~0.335).
        Expected: Echinocactus grusonii / Golden Barrel Cactus, profile_activated = True,
        identification_status = 'accepted', active profile becomes cactus.
        """
        cactus_image_path = "/Users/navaneet.s/Downloads/plant 3.jpg"
        if not os.path.exists(cactus_image_path):
            self.skipTest(f"{cactus_image_path} not found")

        # Set active profile to Bael first
        set_plant_profile({
            "species": "Bael",
            "ideal_moisture_range_pct": [40, 60],
        })

        with open(cactus_image_path, "rb") as f:
            image_bytes = f.read()

        res = client.post(
            "/identify-plant",
            files={"file": ("plant 3.jpg", image_bytes, "image/jpeg")},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertIn("cactus", data["species"].lower())
        self.assertIn("echinocactus", data["scientific_name"].lower())
        self.assertGreaterEqual(data["confidence"], 0.20)
        self.assertEqual(data["profile_activated"], True)
        self.assertEqual(data["identification_status"], "accepted")

        # Active profile should now be Cactus
        active_prof = get_plant_profile()
        self.assertIn("cactus", active_prof["species"].lower())
        self.assertEqual(active_prof["ideal_moisture_range_pct"], [10, 30])
        print(f"TEST F: PASSED (Cactus confidence: {data['confidence']}, profile_activated: {data['profile_activated']})")


if __name__ == "__main__":
    unittest.main(verbosity=2)
