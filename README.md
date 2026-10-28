# 📍 Track My Ride - Smart Location-Based To-Do & Geofence Manager

> **A production-ready Full Stack Django application designed for high-performance geospatial task management, automatic GPS proximity notifications, and Google Maps integration.**

[![Django Version](https://img.shields.io/badge/Django-5.2+-green.svg)](https://www.djangoproject.com/)
[![Python Version](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-indigo.svg)](https://getbootstrap.com/)
[![Google Maps](https://img.shields.io/badge/Google%20Maps-Places%20%26%20JS%20API-red.svg)](https://developers.google.com/maps)

---

## 🌟 Overview & Problem Solved

Standard to-do list applications rely solely on **clock time** reminders (e.g. 6:00 PM). However, busy commuters, field professionals, and daily shoppers need reminders tied directly to **physical geography**.

If you drive past **DMart** on your way home at 5:15 PM, an ordinary reminder scheduled for 6:00 PM won't help. **Track My Ride** solves this problem by attaching geodetic coordinates, venue metadata, and custom radius boundaries to every task. 

As soon as your browser or mobile GPS enters the target boundary (e.g. 500 meters), **Track My Ride** alerts you immediately via:
1. 🔔 **Native HTML5 Browser Push Notifications**
2. 📢 **In-App Animated Toast Banners**
3. 🎵 **Pleasant Dual-Tone Synthesized Audio Chimes** (powered by Web Audio API)
4. 🧭 **Dynamic Distance & Navigation Links**

---

## 🏗️ Architecture & Django Apps Structure

The application adheres to clean **MVC / MVT architectural standards**, separating responsibilities into 6 modular apps:

```
to-do-list/
├── trackmyride/               # Core project configuration & settings
│   ├── settings.py           # Environment-configured settings (dotenv)
│   ├── urls.py               # Root URL router & static handler
│   └── wsgi.py               # WSGI production entrypoint
├── accounts/                 # User authentication, profiles & avatars
│   ├── models.py             # Profile model (avatar, phone, preferred radius)
│   ├── forms.py              # Register, login, profile edit, password change
│   ├── signals.py            # Automatic profile generation upon User creation
│   └── views.py              # Auth controller flows
├── tasks/                    # Task CRUD, Categories, Calendar & CSV Export
│   ├── models.py             # Task model (coordinates, radius, priority, status)
│   ├── forms.py              # Dynamic form with place picker integration
│   ├── views.py              # List, detail, create, edit, delete, toggle status
│   └── management/commands/  # `seed_data.py` (instant demo content)
├── maps/                     # Dedicated full-page interactive map
│   ├── views.py              # Google Maps task cluster & JSON endpoints
│   └── urls.py               # Map routing
├── notifications/            # Real-time geofence engine & proximity logs
│   ├── models.py             # Reminder model (records distance at trigger)
│   └── views.py              # Haversine distance algorithm & check API
├── contact/                  # Support inquiries & feedback
│   ├── models.py             # ContactMessage database model
│   └── views.py              # Contact form submission controller
├── core/                     # Landing page, dashboard & global context
│   ├── views.py              # Home, dashboard, about views
│   └── context_processors.py # Global unread counters & API key injection
├── static/                   # Production CSS, JS, and image assets
│   ├── css/style.css         # Modern glassmorphism design system
│   └── js/
│       ├── main.js           # UI animations, CSRF handling & quick actions
│       ├── geofence-tracker.js# Live background GPS tracker & audio chime
│       ├── map-picker.js     # Draggable pin, Autocomplete & radius circle
│       ├── task-map.js       # Full map viewer with priority color pins
│       └── calendar.js       # Monthly schedule matrix & event modals
├── templates/                # Responsive HTML5 Django templates
├── .env.example              # Environment variables template
├── requirements.txt          # Python dependencies
└── manage.py                 # Django command-line utility
```

---

## 🚀 Quickstart & Installation

### 1. Clone & Set Up Virtual Environment

```bash
# Clone the repository
git clone <repo-url> to-do-list
cd to-do-list

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Open `.env` and configure your settings:
```ini
DEBUG=True
SECRET_KEY=your-secure-secret-key-here
ALLOWED_HOSTS=localhost,127.0.0.1

# (Optional) Google Maps JavaScript API Key
# If left blank, Track My Ride automatically activates an interactive
# Leaflet/OpenStreetMap fallback so you can test coordinate picking immediately!
GOOGLE_MAPS_API_KEY=
```

### 4. Run Migrations & Seed Sample Data

Run migrations and seed the database with default categories and demo tasks:

```bash
python manage.py migrate
python manage.py seed_data
```

### 5. Launch the Development Server

```bash
python manage.py runserver
```

Open your browser and navigate to: **`http://127.0.0.1:8000/`**

---

## 🔑 Demo Account Credentials

A pre-configured demo account with location tasks is populated by `seed_data`:

- **Username**: `demo`
- **Password**: `password123`
- **Email**: `demo@trackmyride.com`
- **Role**: Superuser / Administrator

*(You can also register a fresh account anytime via the "Sign Up" page).*

---

## 🗺️ Google Maps API Setup Guide

To enable full Google Places Autocomplete, Geocoding, and Google Map styling:

1. Visit the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g. `TrackMyRide-Dev`).
3. Enable the following APIs in **APIs & Services > Library**:
   - **Maps JavaScript API**
   - **Places API (New)**
   - **Geocoding API**
4. Navigate to **Credentials** and click **Create Credentials > API Key**.
5. Add the key to your `.env` file:
   ```ini
   GOOGLE_MAPS_API_KEY=AIzaSy...YourKeyHere
   ```
6. Restart your Django server.

> **Note on Zero-Configuration Fallback**:
> If no Google Maps API key is provided, Track My Ride gracefully switches to an interactive Leaflet/OpenStreetMap engine. All coordinate picking, marker dragging, radius circles, and geofence proximity alerts function seamlessly out of the box!

---

## 🎯 Key Feature Highlights

### 1. Mathematical Haversine Distance Engine
The backend implements the spherical trigonometric Haversine formula to compute geodesic distances between current GPS locations and tasks:
$$\Delta\sigma = 2 \cdot \arctan2\left(\sqrt{a}, \sqrt{1-a}\right)$$
$$d = R \cdot \Delta\sigma$$

### 2. Multi-Tiered Proximity Notification System
- **Desktop HTML5 Notification**: Pops up even if the browser window is in the background.
- **Audio Chime**: Uses Web Audio API oscillator synthesis (587Hz to 880Hz pleasant double-bell chime) with zero external MP3 dependencies.
- **In-App Toast Banner**: Displays immediate action links ("View Task", "Navigate").
- **Cooldown Safeguard**: Prevents notification spam by suppressing duplicate alerts within a 20-minute window for the same location.

### 3. Dynamic Task Management & Filters
- **CRUD Operations**: Complete Create, Read, Update, Delete workflows.
- **Priority Classification**: Urgent (Red), High (Orange), Medium (Blue), Low (Green).
- **Taxonomy Categories**: Personal, Study, Shopping, Office, Travel, Health, Meeting, Others.
- **Live Search & Sort**: Real-time filtering by status, priority, category, and date.
- **View Toggle**: Switch instantly between **Grid Card View** and **Responsive Table View**.

### 4. Interactive Full Calendar
View all scheduled tasks across an interactive monthly grid with priority-colored event pills. Clicking any event opens a task modal preview with direct navigation links.

### 5. CSV Data Export
Export all tasks, geocodes, radius metrics, and notes into an Excel-ready CSV spreadsheet with one click.

---

## 🧪 Running Automated Unit Tests

The test suite covers model validation, user data isolation, authentication, signals, CSV exports, Haversine math, and the Geofence API:

```bash
python manage.py test
```

Expected output:
```
Ran 9 tests in ~15s
OK
```

---

## 🚢 Production Deployment Checklist

When deploying to platforms such as **Render**, **Railway**, **AWS EC2**, or **DigitalOcean**:

1. **Set `DEBUG=False`** in production `.env`.
2. **Collect static assets**:
   ```bash
   python manage.py collectstatic --noinput
   ```
3. **Use a production WSGI server** (e.g., Gunicorn):
   ```bash
   gunicorn trackmyride.wsgi:application --bind 0.0.0.0:8000 --workers 3
   ```
4. **Use PostgreSQL** by setting `DATABASES` to `dj-database-url`.
5. **Enable HTTPS** for production geolocation access (browsers require HTTPS for HTML5 Geolocation API outside `localhost`).

---

## 📄 License

This project is licensed under the MIT License - open for personal, academic, and commercial portfolio demonstration.
