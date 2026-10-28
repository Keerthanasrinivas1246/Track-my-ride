from django.urls import path
from . import views

app_name = 'tasks'

urlpatterns = [
    path('', views.task_list_view, name='task_list'),
    path('create/', views.task_create_view, name='task_create'),
    path('calendar/', views.calendar_view, name='calendar'),
    path('export/csv/', views.export_tasks_csv_view, name='export_csv'),
    path('<int:pk>/', views.task_detail_view, name='task_detail'),
    path('<int:pk>/edit/', views.task_update_view, name='task_edit'),
    path('<int:pk>/delete/', views.task_delete_view, name='task_delete'),
    path('<int:pk>/toggle-status/', views.toggle_task_status_view, name='toggle_status'),
    path('<int:pk>/toggle-favorite/', views.toggle_task_favorite_view, name='toggle_favorite'),
]
