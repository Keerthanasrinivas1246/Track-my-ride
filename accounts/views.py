from django.shortcuts import render, redirect
from django.contrib.auth import login, authenticate, logout, update_session_auth_hash
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.views.generic import View
from .forms import (
    UserRegistrationForm,
    UserLoginForm,
    UserUpdateForm,
    ProfileUpdateForm,
    CustomPasswordChangeForm,
)


def register_view(request):
    """User registration view with automatic profile creation and login."""
    if request.user.is_authenticated:
        return redirect('core:dashboard')

    if request.method == 'POST':
        form = UserRegistrationForm(request.POST)
        if form.is_valid():
            user = form.save(commit=False)
            user.set_password(form.cleaned_data['password'])
            user.save()
            # Log user in
            login(request, user)
            messages.success(
                request,
                f"Welcome to Track My Ride, {user.first_name or user.username}! Your account has been created."
            )
            return redirect('core:dashboard')
        else:
            messages.error(request, "Please correct the errors below to register.")
    else:
        form = UserRegistrationForm()

    return render(request, 'accounts/register.html', {'form': form})


def login_view(request):
    """User login view with validation and redirect support."""
    if request.user.is_authenticated:
        return redirect('core:dashboard')

    if request.method == 'POST':
        form = UserLoginForm(request, data=request.POST)
        if form.is_valid():
            username = form.cleaned_data.get('username')
            password = form.cleaned_data.get('password')
            user = authenticate(username=username, password=password)
            if user is not None:
                login(request, user)
                messages.success(request, f"Welcome back, {user.first_name or user.username}!")
                next_url = request.GET.get('next') or request.POST.get('next')
                if next_url:
                    return redirect(next_url)
                return redirect('core:dashboard')
            else:
                messages.error(request, "Invalid username or password.")
        else:
            messages.error(request, "Invalid credentials. Please verify your username and password.")
    else:
        form = UserLoginForm()

    return render(request, 'accounts/login.html', {'form': form})


@login_required
def logout_view(request):
    """Logs out the active user and redirects to home page."""
    logout(request)
    messages.info(request, "You have been logged out successfully.")
    return redirect('core:home')


@login_required
def profile_view(request):
    """View and update profile details, preferences, and avatar."""
    profile = request.user.profile

    if request.method == 'POST':
        user_form = UserUpdateForm(request.POST, instance=request.user)
        profile_form = ProfileUpdateForm(request.POST, request.FILES, instance=profile)

        if user_form.is_valid() and profile_form.is_valid():
            user_form.save()
            profile_form.save()
            messages.success(request, "Your profile has been updated successfully!")
            return redirect('accounts:profile')
        else:
            messages.error(request, "Please check the form for errors.")
    else:
        user_form = UserUpdateForm(instance=request.user)
        profile_form = ProfileUpdateForm(instance=profile)

    # Compute task stats for profile
    total_tasks = request.user.tasks.count()
    completed_tasks = request.user.tasks.filter(status='completed').count()
    pending_tasks = request.user.tasks.filter(status='pending').count()
    completion_rate = int((completed_tasks / total_tasks * 100)) if total_tasks > 0 else 0

    context = {
        'user_form': user_form,
        'profile_form': profile_form,
        'profile': profile,
        'stats': {
            'total_tasks': total_tasks,
            'completed_tasks': completed_tasks,
            'pending_tasks': pending_tasks,
            'completion_rate': completion_rate,
        }
    }
    return render(request, 'accounts/profile.html', context)


@login_required
def change_password_view(request):
    """Allow user to change password securely."""
    if request.method == 'POST':
        form = CustomPasswordChangeForm(request.user, request.POST)
        if form.is_valid():
            user = form.save()
            update_session_auth_hash(request, user)  # Keep user logged in
            messages.success(request, "Your password was successfully updated!")
            return redirect('accounts:profile')
        else:
            messages.error(request, "Please correct the error below.")
    else:
        form = CustomPasswordChangeForm(request.user)

    return render(request, 'accounts/password_change.html', {'form': form})
