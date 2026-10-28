from django.urls import path
from . import views

app_name = 'maps'

urlpatterns = [
    path('', views.full_map_view, name='map_view'),
    path('api/tasks/', views.map_tasks_api, name='api_tasks'),
]
