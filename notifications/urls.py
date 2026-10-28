from django.urls import path
from . import views

app_name = 'notifications'

urlpatterns = [
    path('', views.notification_list_view, name='notification_list'),
    path('<int:pk>/read/', views.mark_as_read_view, name='mark_as_read'),
    path('mark-all-read/', views.mark_all_read_view, name='mark_all_read'),
    path('api/check-geofence/', views.check_geofence_api, name='check_geofence'),
]
