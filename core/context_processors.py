from datetime import date
from django.conf import settings


def global_context(request):
    """Provides global template context across all views."""
    context = {
        'APP_NAME': 'Track My Ride',
        'APP_TAGLINE': 'Smart Location-Based To-Do & Geofence Task Manager',
        'GOOGLE_MAPS_API_KEY': getattr(settings, 'GOOGLE_MAPS_API_KEY', ''),
        'CURRENT_YEAR': date.today().year,
        'unread_reminders_count': 0,
    }

    if request.user.is_authenticated:
        try:
            from notifications.models import Reminder
            context['unread_reminders_count'] = Reminder.objects.filter(
                user=request.user,
                is_read=False
            ).count()
        except Exception:
            context['unread_reminders_count'] = 0

    return context
