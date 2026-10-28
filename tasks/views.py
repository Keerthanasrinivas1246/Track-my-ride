import csv
import json
from datetime import date
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import HttpResponse, JsonResponse
from django.core.paginator import Paginator
from django.db.models import Q, Case, When, Value, IntegerField
from django.views.decorators.http import require_POST
from .models import Task, Category
from .forms import TaskForm


@login_required
def task_list_view(request):
    """
    Searchable, filterable, and sortable list of user tasks with pagination.
    Supports both Grid and Table presentation views.
    """
    tasks = Task.objects.filter(user=request.user).select_related('category')

    # Search query
    query = request.GET.get('q', '').strip()
    if query:
        tasks = tasks.filter(
            Q(title__icontains=query) |
            Q(description__icontains=query) |
            Q(place_name__icontains=query) |
            Q(address__icontains=query) |
            Q(notes__icontains=query)
        )

    # Filters
    status_filter = request.GET.get('status', '').strip()
    if status_filter:
        tasks = tasks.filter(status=status_filter)

    priority_filter = request.GET.get('priority', '').strip()
    if priority_filter:
        tasks = tasks.filter(priority=priority_filter)

    category_filter = request.GET.get('category', '').strip()
    if category_filter:
        tasks = tasks.filter(category_id=category_filter)

    date_filter = request.GET.get('date_filter', '').strip()
    today = date.today()
    if date_filter == 'today':
        tasks = tasks.filter(due_date=today)
    elif date_filter == 'upcoming':
        tasks = tasks.filter(due_date__gt=today)
    elif date_filter == 'overdue':
        tasks = tasks.filter(due_date__lt=today, status__in=['pending', 'in_progress'])
    elif date_filter == 'favorite':
        tasks = tasks.filter(is_favorite=True)

    # Sorting
    sort_by = request.GET.get('sort', 'due_date')
    if sort_by == 'newest':
        tasks = tasks.order_by('-created_at')
    elif sort_by == 'oldest':
        tasks = tasks.order_by('created_at')
    elif sort_by == 'priority':
        # Custom priority ordering: urgent (1) -> high (2) -> medium (3) -> low (4)
        tasks = tasks.annotate(
            priority_rank=Case(
                When(priority='urgent', then=Value(1)),
                When(priority='high', then=Value(2)),
                When(priority='medium', then=Value(3)),
                When(priority='low', then=Value(4)),
                default=Value(5),
                output_field=IntegerField()
            )
        ).order_by('priority_rank', 'due_date')
    elif sort_by == 'alphabetical':
        tasks = tasks.order_by('title')
    else:  # default 'due_date'
        tasks = tasks.order_by('due_date', 'due_time', '-created_at')

    # Counts for quick filter pills
    base_user_tasks = Task.objects.filter(user=request.user)
    stats = {
        'all': base_user_tasks.count(),
        'pending': base_user_tasks.filter(status='pending').count(),
        'in_progress': base_user_tasks.filter(status='in_progress').count(),
        'completed': base_user_tasks.filter(status='completed').count(),
        'today': base_user_tasks.filter(due_date=today).count(),
        'favorites': base_user_tasks.filter(is_favorite=True).count(),
    }

    # Pagination: 9 per page
    paginator = Paginator(tasks, 9)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    categories = Category.objects.all()
    view_mode = request.GET.get('view', 'grid')  # 'grid' or 'table'

    # Pre-populated Quick Add Form for modal
    initial_data = {}
    if hasattr(request.user, 'profile') and request.user.profile.preferred_radius:
        initial_data['reminder_radius'] = request.user.profile.preferred_radius
    quick_task_form = TaskForm(initial=initial_data)

    context = {
        'page_obj': page_obj,
        'tasks': page_obj.object_list,
        'categories': categories,
        'query': query,
        'current_status': status_filter,
        'current_priority': priority_filter,
        'current_category': category_filter,
        'current_date_filter': date_filter,
        'current_sort': sort_by,
        'view_mode': view_mode,
        'stats': stats,
        'quick_task_form': quick_task_form,
    }
    return render(request, 'tasks/task_list.html', context)


@login_required
def task_detail_view(request, pk):
    """Detailed view for a specific task with map and navigation directions."""
    task = get_object_or_404(Task, pk=pk, user=request.user)
    context = {
        'task': task,
        'task_json': json.dumps(task.to_map_dict()),
    }
    return render(request, 'tasks/task_detail.html', context)


@login_required
def task_create_view(request):
    """Create a new location-based task with interactive map picker."""
    if request.method == 'POST':
        form = TaskForm(request.POST)
        if form.is_valid():
            task = form.save(commit=False)
            task.user = request.user
            task.save()
            messages.success(request, f'Task "{task.title}" created successfully!')
            return redirect('tasks:task_detail', pk=task.pk)
        else:
            messages.error(request, "Please resolve the highlighted errors in the form.")
    else:
        # Prepopulate with profile's preferred reminder radius
        initial_data = {}
        if hasattr(request.user, 'profile') and request.user.profile.preferred_radius:
            initial_data['reminder_radius'] = request.user.profile.preferred_radius
        form = TaskForm(initial=initial_data)

    categories = Category.objects.all()
    return render(request, 'tasks/task_form.html', {
        'form': form,
        'title': 'Create New Location Task',
        'is_edit': False,
        'categories': categories,
    })


@login_required
def task_update_view(request, pk):
    """Edit an existing location task."""
    task = get_object_or_404(Task, pk=pk, user=request.user)

    if request.method == 'POST':
        form = TaskForm(request.POST, instance=task)
        if form.is_valid():
            form.save()
            messages.success(request, f'Task "{task.title}" updated successfully!')
            return redirect('tasks:task_detail', pk=task.pk)
        else:
            messages.error(request, "Please fix the errors below.")
    else:
        form = TaskForm(instance=task)

    categories = Category.objects.all()
    return render(request, 'tasks/task_form.html', {
        'form': form,
        'task': task,
        'title': f'Edit: {task.title}',
        'is_edit': True,
        'categories': categories,
    })


@login_required
def task_delete_view(request, pk):
    """Delete a task with confirmation."""
    task = get_object_or_404(Task, pk=pk, user=request.user)

    if request.method == 'POST':
        title = task.title
        task.delete()
        messages.success(request, f'Task "{title}" was successfully deleted.')
        return redirect('tasks:task_list')

    return render(request, 'tasks/task_confirm_delete.html', {'task': task})


@login_required
@require_POST
def toggle_task_status_view(request, pk):
    """AJAX / POST toggle status between completed and pending."""
    task = get_object_or_404(Task, pk=pk, user=request.user)

    if task.status == 'completed':
        task.status = 'pending'
    else:
        task.status = 'completed'
    task.save()

    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        return JsonResponse({
            'success': True,
            'new_status': task.status,
            'badge_class': task.status_badge_class,
            'status_display': task.get_status_display()
        })

    messages.success(request, f'Task marked as {task.get_status_display()}.')
    return redirect(request.META.get('HTTP_REFERER', 'tasks:task_list'))


@login_required
@require_POST
def toggle_task_favorite_view(request, pk):
    """AJAX / POST toggle favorite status."""
    task = get_object_or_404(Task, pk=pk, user=request.user)
    task.is_favorite = not task.is_favorite
    task.save()

    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        return JsonResponse({
            'success': True,
            'is_favorite': task.is_favorite
        })

    return redirect(request.META.get('HTTP_REFERER', 'tasks:task_list'))


@login_required
def calendar_view(request):
    """Interactive calendar showing all user tasks scheduled by date."""
    user_tasks = Task.objects.filter(user=request.user)

    # Format events for FullCalendar / JS Calendar
    events = []
    for task in user_tasks:
        start_datetime = task.due_date.isoformat()
        if task.due_time:
            start_datetime = f"{task.due_date.isoformat()}T{task.due_time.isoformat()}"

        color_map = {
            'urgent': '#ef4444',
            'high': '#f97316',
            'medium': '#3b82f6',
            'low': '#10b981',
        }
        color = '#94a3b8' if task.status == 'completed' else color_map.get(task.priority, '#3b82f6')

        events.append({
            'id': task.id,
            'title': task.title,
            'start': start_datetime,
            'color': color,
            'url': task.get_absolute_url(),
            'extendedProps': {
                'place_name': task.place_name,
                'priority': task.get_priority_display(),
                'status': task.get_status_display(),
                'is_completed': task.status == 'completed',
            }
        })

    context = {
        'calendar_events_json': json.dumps(events),
        'total_tasks': user_tasks.count(),
    }
    return render(request, 'tasks/calendar.html', context)


@login_required
def export_tasks_csv_view(request):
    """Export all user tasks to a CSV spreadsheet."""
    tasks = Task.objects.filter(user=request.user).select_related('category')

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="track_my_ride_tasks.csv"'

    writer = csv.writer(response)
    writer.writerow([
        'ID', 'Title', 'Category', 'Priority', 'Status', 'Due Date',
        'Due Time', 'Place Name', 'Address', 'Latitude', 'Longitude',
        'Reminder Radius (m)', 'Favorite', 'Description', 'Notes', 'Created At'
    ])

    for t in tasks:
        writer.writerow([
            t.id,
            t.title,
            t.category.name if t.category else '',
            t.get_priority_display(),
            t.get_status_display(),
            t.due_date.strftime('%Y-%m-%d'),
            t.due_time.strftime('%H:%M:%S') if t.due_time else '',
            t.place_name,
            t.address,
            t.latitude,
            t.longitude,
            t.reminder_radius,
            'Yes' if t.is_favorite else 'No',
            t.description or '',
            t.notes or '',
            t.created_at.strftime('%Y-%m-%d %H:%M:%S')
        ])

    return response
