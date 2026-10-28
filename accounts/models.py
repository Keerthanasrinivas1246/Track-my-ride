from django.db import models
from django.contrib.auth.models import User


class Profile(models.Model):
    """User profile extension storing additional personal details and preferences."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    preferred_radius = models.PositiveIntegerField(
        default=500,
        help_text="Default geofence reminder radius in meters"
    )
    enable_sound_alerts = models.BooleanField(
        default=True,
        help_text="Play audio chime when a location reminder triggers"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s Profile"

    @property
    def display_name(self):
        if self.user.first_name:
            return f"{self.user.first_name} {self.user.last_name}".strip()
        return self.user.username

    @property
    def avatar_url(self):
        if self.avatar and hasattr(self.avatar, 'url'):
            return self.avatar.url
        # Fallback to UI Avatars generated avatar
        return f"https://ui-avatars.com/api/?name={self.user.username}&background=2563eb&color=fff&size=150&bold=true"
