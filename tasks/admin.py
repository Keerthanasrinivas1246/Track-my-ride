from django.contrib import admin
from .models import Task, Category


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'icon', 'color')
    search_fields = ('name', 'description')


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = (
        'title',
        'user',
        'place_name',
        'category',
        'priority',
        'status',
        'due_date',
        'due_time',
        'reminder_radius',
        'is_favorite',
        'created_at'
    )
    list_filter = ('status', 'priority', 'category', 'due_date', 'is_favorite')
    search_fields = ('title', 'place_name', 'address', 'description', 'user__username')
    ordering = ('-due_date', '-due_time')
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'title', 'description', 'category', 'is_favorite')
        }),
        ('Schedule & Status', {
            'fields': ('due_date', 'due_time', 'priority', 'status')
        }),
        ('Location & Geofencing', {
            'fields': ('place_name', 'address', 'latitude', 'longitude', 'reminder_radius')
        }),
        ('Notes', {
            'fields': ('notes',)
        }),
    )
