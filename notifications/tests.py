import json
from datetime import date
from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.urls import reverse
from tasks.models import Task
from notifications.models import Reminder
from notifications.views import haversine_distance


class GeofenceNotificationTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='geouser', password='password123')
        self.task = Task.objects.create(
            user=self.user,
            title='Buy Groceries',
            due_date=date(2026, 7, 10),
            place_name='DMart Mysore',
            address='MG Road, Mysuru',
            latitude=12.298500,
            longitude=76.650000,
            reminder_radius=500,
            status='pending',
        )
        self.client = Client()

    def test_haversine_distance(self):
        """Haversine distance between same point should be zero."""
        dist = haversine_distance(12.2985, 76.6500, 12.2985, 76.6500)
        self.assertAlmostEqual(dist, 0.0, places=1)

        # Distance between Mysore Palace (12.3051, 76.6551) and DMart (~12.2985, 76.6500) should be around 900-1000m
        dist2 = haversine_distance(12.3051, 76.6551, 12.2985, 76.6500)
        self.assertTrue(500 < dist2 < 1500)

    def test_check_geofence_api_trigger(self):
        """User approaching within 500m of DMart should trigger reminder."""
        self.client.login(username='geouser', password='password123')

        # Coordinates 100m away
        user_lat = 12.298600
        user_lng = 76.650100

        response = self.client.post(
            reverse('notifications:check_geofence'),
            data=json.dumps({'latitude': user_lat, 'longitude': user_lng}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertEqual(len(data['newly_triggered']), 1)
        self.assertEqual(data['newly_triggered'][0]['task_title'], 'Buy Groceries')

        # Verify Reminder saved in database
        self.assertTrue(Reminder.objects.filter(user=self.user, task=self.task).exists())
