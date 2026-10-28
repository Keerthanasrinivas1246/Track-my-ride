from django.db.models.signals import post_save
from django.contrib.auth.models import User
from django.dispatch import receiver
from .models import Profile


@receiver(post_save, sender=User)
def create_or_save_user_profile(sender, instance, created, **kwargs):
    """Automatically create or update user profile whenever a User is saved."""
    if created:
        Profile.objects.create(user=instance)
    else:
        # Check if profile exists; if not, create it
        if hasattr(instance, 'profile'):
            instance.profile.save()
        else:
            Profile.objects.create(user=instance)
