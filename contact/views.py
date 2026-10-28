from django.shortcuts import render, redirect
from django.contrib import messages
from .forms import ContactForm


def contact_view(request):
    """Handles submission of user contact messages and inquiries."""
    if request.method == 'POST':
        form = ContactForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(
                request,
                "Thank you! Your message has been received. Our team will get back to you shortly."
            )
            return redirect('contact:contact')
        else:
            messages.error(request, "Please check the form fields and try again.")
    else:
        # Prepopulate name and email if user is logged in
        initial_data = {}
        if request.user.is_authenticated:
            initial_data = {
                'name': f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username,
                'email': request.user.email,
            }
        form = ContactForm(initial=initial_data)

    return render(request, 'contact/contact.html', {'form': form})
