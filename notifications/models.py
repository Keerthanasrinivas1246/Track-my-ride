from django.db import models
from django.contrib.auth.models import User
from tasks.models import Task


class Reminder(models.Model):
    """Log of geofence proximity alerts triggered for the user."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reminders')
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='reminders')
    message = models.TextField()
    distance_at_trigger = models.FloatField(
        default=0.0,
        help_text="Calculated distance in meters when reminder was triggered"
    )
    is_read = models.BooleanField(default=False)
    triggered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-triggered_at']

    def __str__(self):
        return f"Reminder for {self.user.username}: {self.task.title} ({self.distance_at_trigger:.0f}m away)"
