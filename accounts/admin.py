from django.contrib import admin
from .models import Profile


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'phone', 'preferred_radius', 'enable_sound_alerts', 'created_at')
    search_fields = ('user__username', 'user__email', 'phone')
    list_filter = ('enable_sound_alerts', 'created_at')
    ordering = ('-created_at',)
