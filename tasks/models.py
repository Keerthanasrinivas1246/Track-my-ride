from django.db import models
from django.contrib.auth.models import User
from django.urls import reverse
import urllib.parse


class Category(models.Model):
    """Category classification for tasks."""
    name = models.CharField(max_length=100, unique=True)
    icon = models.CharField(max_length=50, default='fa-folder', help_text="FontAwesome icon class name, e.g. fa-shopping-cart")
    color = models.CharField(max_length=20, default='#3b82f6', help_text="Hex color code, e.g. #3b82f6")
    description = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name_plural = 'Categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class Task(models.Model):
    """Location-based to-do task model."""
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tasks')
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tasks'
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    due_date = models.DateField()
    due_time = models.TimeField(blank=True, null=True)

    # Location Details
    place_name = models.CharField(max_length=255, help_text="Venue or Landmark name (e.g., DMart Mysore)")
    address = models.TextField(help_text="Detailed address of the location")
    latitude = models.DecimalField(max_digits=10, decimal_places=7)
    longitude = models.DecimalField(max_digits=10, decimal_places=7)
    reminder_radius = models.PositiveIntegerField(
        default=500,
        help_text="Geofence alert radius in meters"
    )

    # Extra features
    is_favorite = models.BooleanField(default=False)
    notes = models.TextField(blank=True, null=True, help_text="Additional checklists or notes")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['due_date', 'due_time', '-created_at']

    def __str__(self):
        return f"{self.title} @ {self.place_name}"

    def get_absolute_url(self):
        return reverse('tasks:task_detail', kwargs={'pk': self.pk})

    @property
    def priority_badge_class(self):
        mapping = {
            'low': 'bg-success',
            'medium': 'bg-primary',
            'high': 'bg-warning text-dark',
            'urgent': 'bg-danger',
        }
        return mapping.get(self.priority, 'bg-secondary')

    @property
    def status_badge_class(self):
        mapping = {
            'pending': 'bg-secondary',
            'in_progress': 'bg-info text-dark',
            'completed': 'bg-success',
        }
        return mapping.get(self.status, 'bg-secondary')

    @property
    def directions_url(self):
        """Generates Google Maps navigation URL."""
        dest = f"{self.latitude},{self.longitude}"
        return f"https://www.google.com/maps/dir/?api=1&destination={dest}"

    def to_map_dict(self):
        """Serialize task object for Google Maps marker initialization."""
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description or '',
            'priority': self.priority,
            'priority_display': self.get_priority_display(),
            'status': self.status,
            'status_display': self.get_status_display(),
            'category': self.category.name if self.category else 'General',
            'category_color': self.category.color if self.category else '#64748b',
            'category_icon': self.category.icon if self.category else 'fa-map-pin',
            'due_date': self.due_date.strftime('%b %d, %Y'),
            'due_time': self.due_time.strftime('%I:%M %p') if self.due_time else '',
            'place_name': self.place_name,
            'address': self.address,
            'lat': float(self.latitude),
            'lng': float(self.longitude),
            'radius': self.reminder_radius,
            'url': self.get_absolute_url(),
            'directions_url': self.directions_url,
            'is_completed': self.status == 'completed',
        }
