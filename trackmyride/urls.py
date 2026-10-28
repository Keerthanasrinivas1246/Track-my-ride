"""
URL Configuration for trackmyride project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

# Customize Django Admin Branding
admin.site.site_header = "Track My Ride Administration"
admin.site.site_title = "Track My Ride Portal"
admin.site.index_title = "Location-Based Task Management Admin"

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('core.urls')),
    path('accounts/', include('accounts.urls')),
    path('tasks/', include('tasks.urls')),
    path('maps/', include('maps.urls')),
    path('contact/', include('contact.urls')),
    path('notifications/', include('notifications.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATICFILES_DIRS[0])
