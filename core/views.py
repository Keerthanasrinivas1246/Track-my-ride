import json
from datetime import date
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.db.models import Count
from tasks.models import Task, Category
from notifications.models import Reminder


def home_view(request):
    """
    Public landing page with Hero section, live map preview simulation,
    features grid, stats counter, testimonials, and CTA.
    """
    if request.user.is_authenticated:
        return redirect('core:dashboard')

    context = {
        'page_title': 'Track My Ride - Smart Location-Based Task Manager',
    }
    return render(request, 'core/home.html', context)


@login_required
def dashboard_view(request):
    """
    User central command dashboard with real-time statistics,
    today's tasks, upcoming tasks, category breakdown for charts,
    and recent activity log.
    """
    user_tasks = Task.objects.filter(user=request.user)
    today = date.today()

    total_tasks = user_tasks.count()
    completed_tasks = user_tasks.filter(status='completed').count()
    pending_tasks = user_tasks.filter(status='pending').count()
    in_progress_tasks = user_tasks.filter(status='in_progress').count()
    today_tasks_qs = user_tasks.filter(due_date=today)
    upcoming_tasks_qs = user_tasks.filter(due_date__gt=today).order_by('due_date')[:6]
    urgent_tasks = user_tasks.filter(priority__in=['high', 'urgent'], status__in=['pending', 'in_progress'])[:5]

    # Category breakdown for Chart.js
    category_counts = (
        user_tasks.values('category__name', 'category__color')
        .annotate(total=Count('id'))
        .order_by('-total')
    )
    chart_labels = []
    chart_data = []
    chart_colors = []
    for item in category_counts:
        chart_labels.append(item['category__name'] or 'Uncategorized')
        chart_data.append(item['total'])
        chart_colors.append(item['category__color'] or '#94a3b8')

    # Recent reminders / activity
    recent_reminders = Reminder.objects.filter(user=request.user).select_related('task')[:6]

    # Map markers for dashboard preview (all active tasks)
    active_tasks = user_tasks.filter(status__in=['pending', 'in_progress'])
    dashboard_tasks_json = json.dumps([t.to_map_dict() for t in active_tasks])

    context = {
        'total_tasks': total_tasks,
        'completed_tasks': completed_tasks,
        'pending_tasks': pending_tasks,
        'in_progress_tasks': in_progress_tasks,
        'today_tasks_count': today_tasks_qs.count(),
        'today_tasks': today_tasks_qs,
        'upcoming_tasks': upcoming_tasks_qs,
        'urgent_tasks': urgent_tasks,
        'recent_reminders': recent_reminders,
        'dashboard_tasks_json': dashboard_tasks_json,
        'chart_labels': json.dumps(chart_labels),
        'chart_data': json.dumps(chart_data),
        'chart_colors': json.dumps(chart_colors),
    }
    return render(request, 'core/dashboard.html', context)


def about_view(request):
    """About page detailing project purpose, tech stack, and developer profile."""
    return render(request, 'core/about.html')
