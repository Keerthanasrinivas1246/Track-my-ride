from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.urls import reverse
from accounts.models import Profile


class AccountsTest(TestCase):
    def setUp(self):
        self.client = Client()

    def test_profile_signal_creation(self):
        """User creation should automatically create a corresponding Profile via signal."""
        user = User.objects.create_user(username='testuser', password='password123', email='test@test.com')
        self.assertTrue(hasattr(user, 'profile'))
        self.assertEqual(user.profile.preferred_radius, 500)
        self.assertTrue(user.profile.enable_sound_alerts)

    def test_user_registration_view(self):
        """Registration view should create user and log in."""
        response = self.client.post(reverse('accounts:register'), {
            'username': 'newuser',
            'email': 'new@test.com',
            'first_name': 'New',
            'last_name': 'Person',
            'password': 'password123',
            'confirm_password': 'password123',
        })
        self.assertEqual(response.status_code, 302)
        self.assertTrue(User.objects.filter(username='newuser').exists())

    def test_user_login_and_logout(self):
        """Login and logout flow."""
        User.objects.create_user(username='logintest', password='password123')
        login_res = self.client.post(reverse('accounts:login'), {
            'username': 'logintest',
            'password': 'password123'
        })
        self.assertEqual(login_res.status_code, 302)

        logout_res = self.client.get(reverse('accounts:logout'))
        self.assertEqual(logout_res.status_code, 302)
