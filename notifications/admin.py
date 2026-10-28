from django.contrib import admin
from .models import Reminder


@admin.register(Reminder)
class ReminderAdmin(admin.ModelAdmin):
    list_display = ('user', 'task', 'distance_at_trigger', 'is_read', 'triggered_at')
    list_filter = ('is_read', 'triggered_at')
    search_fields = ('user__username', 'task__title', 'message')
    ordering = ('-triggered_at',)
