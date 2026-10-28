import json
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from tasks.models import Task, Category


@login_required
def full_map_view(request):
    """
    Dedicated interactive full-screen map page.
    Renders Google Maps with custom markers for all user tasks,
    geofence radius overlays, category filters, and live GPS tracker.
    """
    categories = Category.objects.all()
    user_tasks = Task.objects.filter(user=request.user).select_related('category')

    tasks_data = [task.to_map_dict() for task in user_tasks]

    context = {
        'tasks_json': json.dumps(tasks_data),
        'categories': categories,
        'total_tasks': user_tasks.count(),
        'pending_tasks': user_tasks.filter(status='pending').count(),
        'completed_tasks': user_tasks.filter(status='completed').count(),
    }
    return render(request, 'maps/map.html', context)


@login_required
def map_tasks_api(request):
    """API endpoint providing JSON tasks data for dynamic AJAX updates."""
    tasks = Task.objects.filter(user=request.user).select_related('category')

    # Optional filter params
    status = request.GET.get('status')
    if status:
        tasks = tasks.filter(status=status)

    priority = request.GET.get('priority')
    if priority:
        tasks = tasks.filter(priority=priority)

    category_id = request.GET.get('category')
    if category_id:
        tasks = tasks.filter(category_id=category_id)

    tasks_data = [task.to_map_dict() for task in tasks]
    return JsonResponse({'tasks': tasks_data})
