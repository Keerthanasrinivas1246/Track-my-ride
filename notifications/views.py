import math
import json
from datetime import timedelta
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.utils import timezone
from tasks.models import Task
from .models import Reminder


def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculates great-circle distance between two GPS coordinates in meters."""
    r = 6371000.0  # Earth's radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


@login_required
def notification_list_view(request):
    """Display user's geofence reminders and notification history."""
    reminders = Reminder.objects.filter(user=request.user).select_related('task')
    return render(request, 'notifications/notification_list.html', {'reminders': reminders})


@login_required
@require_POST
def mark_as_read_view(request, pk):
    """Mark a specific reminder as read."""
    reminder = get_object_or_404(Reminder, pk=pk, user=request.user)
    reminder.is_read = True
    reminder.save()
    return JsonResponse({'success': True})


@login_required
@require_POST
def mark_all_read_view(request):
    """Mark all user reminders as read."""
    Reminder.objects.filter(user=request.user, is_read=False).update(is_read=True)
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        return JsonResponse({'success': True})
    return redirect('notifications:notification_list')


@login_required
@require_POST
def check_geofence_api(request):
    """
    Live geofence proximity API called periodically by the browser.
    Receives user's current GPS {lat, lng}.
    Computes distances to all non-completed tasks.
    Triggers new reminders if user entered the reminder radius.
    Returns:
      - newly_triggered: list of tasks that just triggered an alert
      - nearby_tasks: sorted list of nearest tasks with distances and estimated travel times
    """
    try:
        data = json.loads(request.body.decode('utf-8'))
        user_lat = float(data.get('latitude'))
        user_lng = float(data.get('longitude'))
    except (ValueError, TypeError, json.JSONDecodeError):
        return JsonResponse({'error': 'Invalid latitude or longitude coordinates'}, status=400)

    # Active tasks for this user
    active_tasks = Task.objects.filter(
        user=request.user,
        status__in=['pending', 'in_progress']
    ).select_related('category')

    newly_triggered = []
    nearby_tasks = []
    cooldown_threshold = timezone.now() - timedelta(minutes=20)

    for task in active_tasks:
        task_lat = float(task.latitude)
        task_lng = float(task.longitude)
        dist_meters = haversine_distance(user_lat, user_lng, task_lat, task_lng)

        # Estimate travel times
        # Average walking: 1.4 m/s (5 km/h); driving: 8.3 m/s (30 km/h in city)
        walking_mins = max(1, round(dist_meters / 84))
        driving_mins = max(1, round(dist_meters / 500))

        nearby_item = {
            'id': task.id,
            'title': task.title,
            'place_name': task.place_name,
            'address': task.address,
            'distance_meters': round(dist_meters),
            'distance_display': f"{dist_meters / 1000:.1f} km" if dist_meters >= 1000 else f"{int(dist_meters)} m",
            'radius': task.reminder_radius,
            'priority': task.priority,
            'priority_badge': task.priority_badge_class,
            'is_inside_radius': dist_meters <= task.reminder_radius,
            'est_walking_mins': walking_mins,
            'est_driving_mins': driving_mins,
            'url': task.get_absolute_url(),
            'directions_url': task.directions_url,
        }
        nearby_tasks.append(nearby_item)

        # Geofence Trigger Condition
        if dist_meters <= task.reminder_radius:
            # Check if recently reminded to avoid spamming
            recent_exists = Reminder.objects.filter(
                user=request.user,
                task=task,
                triggered_at__gte=cooldown_threshold
            ).exists()

            if not recent_exists:
                msg = f"You are near '{task.place_name}' ({int(dist_meters)}m away)! Task: '{task.title}'."
                reminder = Reminder.objects.create(
                    user=request.user,
                    task=task,
                    message=msg,
                    distance_at_trigger=dist_meters,
                    is_read=False
                )
                newly_triggered.append({
                    'reminder_id': reminder.id,
                    'task_id': task.id,
                    'task_title': task.title,
                    'place_name': task.place_name,
                    'distance_meters': round(dist_meters),
                    'radius': task.reminder_radius,
                    'priority': task.priority,
                    'message': msg,
                    'url': task.get_absolute_url(),
                })

    # Sort nearby tasks by distance (nearest first)
    nearby_tasks.sort(key=lambda x: x['distance_meters'])

    # Total unread count
    unread_count = Reminder.objects.filter(user=request.user, is_read=False).count()

    return JsonResponse({
        'success': True,
        'user_location': {'lat': user_lat, 'lng': user_lng},
        'newly_triggered': newly_triggered,
        'nearby_tasks': nearby_tasks[:10],
        'unread_count': unread_count,
    })
