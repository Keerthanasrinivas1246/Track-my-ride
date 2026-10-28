from datetime import date, time
from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.urls import reverse
from tasks.models import Task, Category


class TaskModelAndViewsTest(TestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(username='user1', password='password123', email='u1@test.com')
        self.user2 = User.objects.create_user(username='user2', password='password123', email='u2@test.com')

        self.category = Category.objects.create(
            name='Shopping',
            icon='fa-shopping-cart',
            color='#10b981'
        )

        self.task1 = Task.objects.create(
            user=self.user1,
            title='Buy Groceries',
            description='Milk, bread',
            category=self.category,
            priority='high',
            status='pending',
            due_date=date(2026, 7, 10),
            due_time=time(18, 0),
            place_name='DMart Mysore',
            address='MG Road, Mysuru',
            latitude=12.2985,
            longitude=76.6500,
            reminder_radius=500,
        )

        self.client = Client()

    def test_user_isolation(self):
        """User 2 should not see User 1's tasks in task list."""
        self.client.login(username='user2', password='password123')
        response = self.client.get(reverse('tasks:task_list'))
        self.assertEqual(response.status_code, 200)
        self.assertNotContains(response, 'Buy Groceries')

        # User 1 should see it
        self.client.logout()
        self.client.login(username='user1', password='password123')
        response = self.client.get(reverse('tasks:task_list'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Buy Groceries')

    def test_task_create(self):
        """Authenticated user can create a location-based task."""
        self.client.login(username='user1', password='password123')
        response = self.client.post(reverse('tasks:task_create'), {
            'title': 'Dentist Appointment',
            'description': 'Cleaning',
            'category': self.category.id,
            'priority': 'urgent',
            'status': 'pending',
            'due_date': '2026-07-20',
            'place_name': 'Clinic',
            'address': 'Main Road',
            'latitude': 12.3100,
            'longitude': 76.6400,
            'reminder_radius': 400,
        })
        self.assertEqual(response.status_code, 302)
        self.assertTrue(Task.objects.filter(title='Dentist Appointment', user=self.user1).exists())

    def test_task_toggle_status_ajax(self):
        """AJAX request can toggle task status."""
        self.client.login(username='user1', password='password123')
        url = reverse('tasks:toggle_status', kwargs={'pk': self.task1.id})
        response = self.client.post(url, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        self.assertEqual(response.status_code, 200)
        self.task1.refresh_from_db()
        self.assertEqual(self.task1.status, 'completed')

    def test_export_csv(self):
        """CSV export returns proper attachment and text/csv mime type."""
        self.client.login(username='user1', password='password123')
        response = self.client.get(reverse('tasks:export_csv'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'text/csv')
        self.assertIn('Buy Groceries', response.content.decode('utf-8'))
