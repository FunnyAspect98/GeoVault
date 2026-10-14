"""
Automated endpoint verification tests for GeoVault FastAPI backend.

Tests both the health endpoints and parcel endpoints against the running server
using Python standard library (urllib.request and unittest).
"""

import json
import unittest
import urllib.error
import urllib.request

BASE_URL = "http://127.0.0.1:8000"


class TestGeoVaultAPI(unittest.TestCase):
    def test_01_health_root(self):
        req = urllib.request.Request(f"{BASE_URL}/health")
        with urllib.request.urlopen(req) as resp:
            self.assertEqual(resp.status, 200)
            data = json.loads(resp.read().decode("utf-8"))
            self.assertEqual(data.get("status"), "healthy")
            self.assertEqual(data.get("service"), "geovault-backend")

    def test_02_health_api_v1(self):
        req = urllib.request.Request(f"{BASE_URL}/api/v1/health")
        with urllib.request.urlopen(req) as resp:
            self.assertEqual(resp.status, 200)
            data = json.loads(resp.read().decode("utf-8"))
            self.assertEqual(data.get("status"), "healthy")
            self.assertEqual(data.get("service"), "geovault-backend")

    def test_03_get_all_parcels(self):
        req = urllib.request.Request(f"{BASE_URL}/api/v1/parcels")
        with urllib.request.urlopen(req) as resp:
            self.assertEqual(resp.status, 200)
            data = json.loads(resp.read().decode("utf-8"))
            self.assertIsInstance(data, list)
            self.assertEqual(len(data), 12)

            first = data[0]
            self.assertIn("id", first)
            self.assertIn("points", first)
            self.assertIn("area", first)
            self.assertIn("perimeter", first)
            self.assertIn("landClass", first)
            self.assertIn("confidence", first)
            self.assertGreater(len(first["points"]), 2)

    def test_04_get_single_parcel_exact_case(self):
        req = urllib.request.Request(f"{BASE_URL}/api/v1/parcels/GV-054")
        with urllib.request.urlopen(req) as resp:
            self.assertEqual(resp.status, 200)
            data = json.loads(resp.read().decode("utf-8"))
            self.assertEqual(data.get("id"), "GV-054")
            self.assertEqual(data.get("landClass"), "Agricultural")
            self.assertEqual(data.get("status"), "Surveyed")

    def test_05_get_single_parcel_case_insensitive(self):
        req = urllib.request.Request(f"{BASE_URL}/api/v1/parcels/gv-054")
        with urllib.request.urlopen(req) as resp:
            self.assertEqual(resp.status, 200)
            data = json.loads(resp.read().decode("utf-8"))
            self.assertEqual(data.get("id"), "GV-054")

    def test_06_get_nonexistent_parcel_returns_404(self):
        req = urllib.request.Request(f"{BASE_URL}/api/v1/parcels/GV-NONEXISTENT")
        try:
            with urllib.request.urlopen(req):
                self.fail("Expected HTTPError 404 but request succeeded.")
        except urllib.error.HTTPError as err:
            self.assertEqual(err.code, 404)
            data = json.loads(err.read().decode("utf-8"))
            self.assertIn("detail", data)
            self.assertIn("not found", data["detail"].lower())


if __name__ == "__main__":
    unittest.main()
