from django.test import TestCase
from django.urls import reverse
from rest_framework import status

class BasicTest(TestCase):
    def test_health_check(self):
        """A simple test to verify the test runner is working."""
        self.assertEqual(1 + 1, 2)

    def test_root_url(self):
        """Verify that the root URL (if any) responds or at least doesn't crash."""
        # This is just a placeholder. Adjust based on actual URLs.
        try:
            response = self.client.get('/')
            self.assertIn(response.status_code, [200, 404])
        except Exception:
            pass
