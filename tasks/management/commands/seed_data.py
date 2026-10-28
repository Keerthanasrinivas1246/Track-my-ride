from datetime import date, time
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from tasks.models import Category, Task
from notifications.models import Reminder


class Command(BaseCommand):
    help = 'Seeds initial categories, demo user, and location-based tasks for Track My Ride'

    def handle(self, *args, **options):
        # 1. Categories
        categories_data = [
            {'name': 'Personal', 'icon': 'fa-user', 'color': '#8b5cf6', 'description': 'Personal errands, habits, and self-care'},
            {'name': 'Study', 'icon': 'fa-graduation-cap', 'color': '#3b82f6', 'description': 'Classes, library visits, books, and courses'},
            {'name': 'Shopping', 'icon': 'fa-shopping-cart', 'color': '#10b981', 'description': 'Supermarkets, malls, groceries, and retail'},
            {'name': 'Office', 'icon': 'fa-briefcase', 'color': '#0284c7', 'description': 'Workplace tasks, client visits, and office work'},
            {'name': 'Travel', 'icon': 'fa-plane', 'color': '#f59e0b', 'description': 'Transit, airports, train stations, and trips'},
            {'name': 'Health', 'icon': 'fa-heartbeat', 'color': '#ef4444', 'description': 'Gym, pharmacy, hospitals, and medical checkups'},
            {'name': 'Meeting', 'icon': 'fa-handshake', 'color': '#6366f1', 'description': 'Appointments, dinners, and meetups'},
            {'name': 'Others', 'icon': 'fa-tags', 'color': '#64748b', 'description': 'General and miscellaneous to-dos'},
        ]

        cats_map = {}
        for item in categories_data:
            obj, _ = Category.objects.get_or_create(
                name=item['name'],
                defaults={
                    'icon': item['icon'],
                    'color': item['color'],
                    'description': item['description'],
                }
            )
            cats_map[item['name']] = obj

        self.stdout.write(self.style.SUCCESS(f'Categories verified: {Category.objects.count()}'))

        # 2. Demo User
        demo_user, created_user = User.objects.get_or_create(
            username='demo',
            defaults={
                'email': 'demo@trackmyride.com',
                'first_name': 'Alex',
                'last_name': 'Morgan',
                'is_staff': True,
                'is_superuser': True,
            }
        )
        if created_user:
            demo_user.set_password('password123')
            demo_user.save()
            self.stdout.write(self.style.SUCCESS('Created demo user: "demo" with password: "password123"'))
        else:
            self.stdout.write(self.style.SUCCESS('Demo user "demo" already exists.'))

        # Update profile
        if hasattr(demo_user, 'profile'):
            demo_user.profile.phone = '+91 98765 43210'
            demo_user.profile.bio = 'Daily commuter & engineer exploring location-based productivity.'
            demo_user.profile.preferred_radius = 500
            demo_user.profile.enable_sound_alerts = True
            demo_user.profile.save()

        # 3. Demo Tasks
        demo_tasks = [
            {
                'title': 'Buy groceries & weekly supplies',
                'description': 'Buy fresh vegetables, milk, almond butter, whole wheat bread, and detergent.',
                'category': cats_map.get('Shopping'),
                'priority': 'high',
                'status': 'pending',
                'due_date': date(2026, 7, 10),
                'due_time': time(18, 0),
                'place_name': 'DMart Mysore',
                'address': 'MG Road, Vidyaranyapura, Mysuru, Karnataka 570008, India',
                'latitude': 12.2985000,
                'longitude': 76.6500000,
                'reminder_radius': 500,
                'is_favorite': True,
                'notes': 'Check for weekend discount coupons in loyalty app before checkout.'
            },
            {
                'title': 'Return borrowed engineering reference books',
                'description': 'Return Distributed Systems and Spatial Algorithms books before the due date.',
                'category': cats_map.get('Study'),
                'priority': 'medium',
                'status': 'in_progress',
                'due_date': date(2026, 7, 12),
                'due_time': time(11, 30),
                'place_name': 'Mysore University Library',
                'address': 'Manasagangotri, Mysuru, Karnataka 570006, India',
                'latitude': 12.3080000,
                'longitude': 76.6260000,
                'reminder_radius': 400,
                'is_favorite': False,
                'notes': 'Ask librarian about IEEE digital library login access.'
            },
            {
                'title': 'Quarterly dental checkup & cleaning',
                'description': 'Routine dental consultation and teeth cleaning appointment with Dr. Sharma.',
                'category': cats_map.get('Health'),
                'priority': 'urgent',
                'status': 'pending',
                'due_date': date(2026, 7, 15),
                'due_time': time(15, 0),
                'place_name': 'Apollo Clinic Mysore',
                'address': 'Kalidasa Road, Vani Vilas Mohalla, Mysuru, Karnataka 570002',
                'latitude': 12.3210000,
                'longitude': 76.6340000,
                'reminder_radius': 600,
                'is_favorite': True,
                'notes': 'Bring insurance card and medical record folder.'
            },
            {
                'title': 'Sprint planning & architecture client review',
                'description': 'Meet cross-functional engineering team to finalize Q3 product roadmap and geofence architecture.',
                'category': cats_map.get('Office'),
                'priority': 'high',
                'status': 'pending',
                'due_date': date(2026, 7, 16),
                'due_time': time(9, 30),
                'place_name': 'Infosys Mysore Development Center',
                'address': 'Hebbal Electronic City, Hootagalli, Mysuru, Karnataka 570018',
                'latitude': 12.3560000,
                'longitude': 76.5860000,
                'reminder_radius': 1000,
                'is_favorite': True,
                'notes': 'Prepare slide deck for microservices migration and geofence load testing.'
            },
            {
                'title': 'Collect reservation tickets & transit pass',
                'description': 'Pick up confirmed express train reservation tickets from the booking counter.',
                'category': cats_map.get('Travel'),
                'priority': 'medium',
                'status': 'completed',
                'due_date': date(2026, 7, 8),
                'due_time': time(17, 0),
                'place_name': 'Mysuru Railway Junction',
                'address': 'Medar Block, Yadavagiri, Mysuru, Karnataka 570001',
                'latitude': 12.3160000,
                'longitude': 76.6450000,
                'reminder_radius': 500,
                'is_favorite': False,
                'notes': 'Done on Wednesday evening.'
            },
        ]

        created_tasks = 0
        for tdata in demo_tasks:
            t, created = Task.objects.get_or_create(
                user=demo_user,
                title=tdata['title'],
                defaults=tdata
            )
            if created:
                created_tasks += 1

        self.stdout.write(self.style.SUCCESS(f'Created {created_tasks} demo location tasks for "{demo_user.username}".'))

        # Sample initial Reminder alert log
        first_task = Task.objects.filter(user=demo_user).first()
        if first_task and not Reminder.objects.filter(user=demo_user).exists():
            Reminder.objects.create(
                user=demo_user,
                task=first_task,
                message=f"You arrived near '{first_task.place_name}' (340m away)! Task: '{first_task.title}'.",
                distance_at_trigger=340.0,
                is_read=False
            )
            self.stdout.write(self.style.SUCCESS('Created initial sample geofence proximity reminder.'))
