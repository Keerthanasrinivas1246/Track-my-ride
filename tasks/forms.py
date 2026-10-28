from django import forms
from .models import Task, Category


class TaskForm(forms.ModelForm):
    class Meta:
        model = Task
        fields = [
            'title',
            'description',
            'category',
            'priority',
            'status',
            'due_date',
            'due_time',
            'place_name',
            'address',
            'latitude',
            'longitude',
            'reminder_radius',
            'is_favorite',
            'notes',
        ]
        widgets = {
            'title': forms.TextInput(attrs={
                'class': 'form-control form-control-lg',
                'placeholder': 'e.g. Buy groceries at DMart',
                'required': True
            }),
            'description': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 3,
                'placeholder': 'Add details, items to purchase, meeting agenda...'
            }),
            'category': forms.Select(attrs={
                'class': 'form-select select2'
            }),
            'priority': forms.Select(attrs={
                'class': 'form-select'
            }),
            'status': forms.Select(attrs={
                'class': 'form-select'
            }),
            'due_date': forms.DateInput(attrs={
                'class': 'form-control',
                'type': 'date',
                'required': True
            }),
            'due_time': forms.TimeInput(attrs={
                'class': 'form-control',
                'type': 'time'
            }),
            'place_name': forms.TextInput(attrs={
                'class': 'form-control',
                'id': 'place-name-input',
                'placeholder': 'Venue / Landmark (e.g. DMart Mysore)',
                'required': True
            }),
            'address': forms.Textarea(attrs={
                'class': 'form-control',
                'id': 'address-input',
                'rows': 2,
                'placeholder': 'Full address will auto-fill or enter manually',
                'required': True
            }),
            'latitude': forms.NumberInput(attrs={
                'class': 'form-control',
                'id': 'latitude-input',
                'step': 'any',
                'required': True
            }),
            'longitude': forms.NumberInput(attrs={
                'class': 'form-control',
                'id': 'longitude-input',
                'step': 'any',
                'required': True
            }),
            'reminder_radius': forms.NumberInput(attrs={
                'class': 'form-control',
                'id': 'radius-input',
                'min': 50,
                'max': 10000,
                'step': 50,
                'value': 500
            }),
            'is_favorite': forms.CheckboxInput(attrs={
                'class': 'form-check-input'
            }),
            'notes': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 2,
                'placeholder': 'Additional private notes or checklists'
            }),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['category'].empty_label = "Select Category (Optional)"


class TaskQuickStatusForm(forms.ModelForm):
    class Meta:
        model = Task
        fields = ['status']
