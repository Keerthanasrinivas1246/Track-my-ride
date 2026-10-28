/**
 * Track My Ride - Real-time Geofencing & Location Proximity Tracker
 * Periodically detects GPS location, calculates nearby tasks,
 * triggers browser notifications, audio chimes, and in-app alert toasts.
 */

class GeofenceTracker {
  constructor() {
    this.watchId = null;
    this.currentPosition = null;
    this.lastCheckTime = 0;
    this.checkIntervalMs = 15000; // Check every 15 seconds
    this.audioContext = null;
    this.soundEnabled = true;

    this.init();
  }

  init() {
    // Only run if user is authenticated (indicated by meta or tracker element)
    const trackerMeta = document.querySelector('meta[name="user-authenticated"]');
    if (!trackerMeta || trackerMeta.content !== 'true') {
      return;
    }

    // Check sound preference from body data attribute
    if (document.body.dataset.soundAlerts === 'false') {
      this.soundEnabled = false;
    }

    // Request Notification permission on first user interaction
    this.setupNotificationPermission();

    // Start geolocation watcher
    this.startTracking();
  }

  setupNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      // Suggest enabling notifications via banner or prompt
      const notifyBtn = document.getElementById('btn-enable-notifications');
      if (notifyBtn) {
        notifyBtn.addEventListener('click', () => {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              notifyBtn.style.display = 'none';
              this.showInAppToast('Notifications Enabled', 'You will receive real-time proximity alerts for tasks near you.', 'success');
            }
          });
        });
      }
    }
  }

  startTracking() {
    if (!('geolocation' in navigator)) {
      console.warn('Geolocation is not supported by this browser.');
      this.updateStatusBadge('GPS Not Supported', 'text-danger');
      return;
    }

    this.updateStatusBadge('Locating GPS...', 'text-warning');

    const options = {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 10000
    };

    // Watch position
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.handlePositionUpdate(pos),
      (err) => this.handlePositionError(err),
      options
    );
  }

  handlePositionUpdate(position) {
    this.currentPosition = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy
    };

    window.userLatestCoords = this.currentPosition;
    this.updateStatusBadge('GPS Active & Tracking', 'text-success');

    // Throttle server geofence checks
    const now = Date.now();
    if (now - this.lastCheckTime > this.checkIntervalMs) {
      this.lastCheckTime = now;
      this.queryGeofenceApi(this.currentPosition.lat, this.currentPosition.lng);
    }
  }

  handlePositionError(error) {
    console.warn(`Geolocation error (${error.code}): ${error.message}`);
    let msg = 'GPS Signal Searching...';
    if (error.code === error.PERMISSION_DENIED) {
      msg = 'Location Access Denied';
    }
    this.updateStatusBadge(msg, 'text-danger');
  }

  updateStatusBadge(text, textClass) {
    const badge = document.getElementById('geofence-status-text');
    if (badge) {
      badge.textContent = text;
      badge.className = `ms-1 ${textClass}`;
    }
  }

  async queryGeofenceApi(latitude, longitude) {
    try {
      const response = await fetch('/notifications/api/check-geofence/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': window.getCsrfToken ? window.getCsrfToken() : '',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ latitude, longitude })
      });

      if (!response.ok) return;

      const data = await response.json();
      if (data.success) {
        // 1. Process newly triggered tasks
        if (data.newly_triggered && data.newly_triggered.length > 0) {
          data.newly_triggered.forEach(item => this.triggerAlert(item));
        }

        // 2. Update live unread count
        const unreadBadge = document.getElementById('notification-badge');
        if (unreadBadge) {
          if (data.unread_count > 0) {
            unreadBadge.textContent = data.unread_count;
            unreadBadge.classList.remove('d-none');
          } else {
            unreadBadge.classList.add('d-none');
          }
        }

        // 3. Update nearby tasks widget if on dashboard or map
        this.renderNearbyTasksList(data.nearby_tasks);
      }
    } catch (err) {
      console.debug('Geofence ping failed:', err);
    }
  }

  triggerAlert(item) {
    // Sound chime
    this.playChimeSound();

    // Browser push notification
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`📍 Track My Ride: You are near ${item.place_name}!`, {
          body: `Task: ${item.task_title}\nDistance: ${item.distance_meters}m away.`,
          icon: '/static/images/logo.png',
          tag: `task-${item.task_id}`
        });
      } catch (e) {
        console.debug('Push notification trigger error:', e);
      }
    }

    // In-app interactive Toast Alert
    this.showProximityToast(item);
  }

  playChimeSound() {
    if (!this.soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioContext) {
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      // Pleasant double bell chime
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, this.audioContext.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, this.audioContext.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start();
      osc.stop(this.audioContext.currentTime + 0.6);
    } catch (e) {
      console.debug('Audio chime synthesis error:', e);
    }
  }

  showProximityToast(item) {
    let container = document.getElementById('geofence-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'geofence-toast-container';
      container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
      container.style.zIndex = '1099';
      document.body.appendChild(container);
    }

    const toastEl = document.createElement('div');
    toastEl.className = 'toast show border-0 shadow-lg';
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');

    toastEl.innerHTML = `
      <div class="toast-header bg-primary text-white">
        <i class="fas fa-map-marker-alt me-2 text-warning"></i>
        <strong class="me-auto">Geofence Proximity Alert!</strong>
        <small class="text-white-50">Just now</small>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
      </div>
      <div class="toast-body">
        <p class="mb-1 fw-bold fs-6">${item.task_title}</p>
        <p class="mb-2 text-muted small"><i class="fas fa-location-dot me-1 text-danger"></i>${item.place_name} &bull; <strong>${item.distance_meters}m away</strong></p>
        <div class="d-flex gap-2">
          <a href="${item.url}" class="btn btn-sm btn-primary"><i class="fas fa-eye me-1"></i> View Task</a>
          <button type="button" class="btn btn-sm btn-outline-secondary" data-bs-dismiss="toast">Dismiss</button>
        </div>
      </div>
    `;

    container.appendChild(toastEl);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (toastEl.parentNode) {
        toastEl.remove();
      }
    }, 10000);
  }

  showInAppToast(title, message, type = 'info') {
    let container = document.getElementById('geofence-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'geofence-toast-container';
      container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
      container.style.zIndex = '1099';
      document.body.appendChild(container);
    }

    const toastEl = document.createElement('div');
    toastEl.className = `toast show text-bg-${type} border-0 shadow`;
    toastEl.setAttribute('role', 'alert');

    toastEl.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">
          <strong>${title}:</strong> ${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    `;
    container.appendChild(toastEl);
    setTimeout(() => { if (toastEl.parentNode) toastEl.remove(); }, 6000);
  }

  renderNearbyTasksList(nearbyTasks) {
    const listEl = document.getElementById('nearby-tasks-container');
    if (!listEl) return;

    if (!nearbyTasks || nearbyTasks.length === 0) {
      listEl.innerHTML = `
        <div class="text-center py-4 text-muted">
          <i class="fas fa-compass fa-2x mb-2 text-primary opacity-50"></i>
          <p class="mb-0">No active tasks nearby right now.</p>
        </div>
      `;
      return;
    }

    let html = '<div class="list-group list-group-flush">';
    nearbyTasks.forEach(task => {
      const insideBadge = task.is_inside_radius
        ? '<span class="badge bg-danger animate__animated animate__pulse animate__infinite">IN RADIUS</span>'
        : `<span class="badge bg-light text-secondary border">${task.distance_display}</span>`;

      html += `
        <div class="list-group-item px-0 py-3 border-bottom">
          <div class="d-flex justify-content-between align-items-start mb-1">
            <h6 class="mb-0 fw-semibold">
              <a href="${task.url}" class="text-decoration-none">${task.title}</a>
            </h6>
            ${insideBadge}
          </div>
          <p class="text-muted small mb-2"><i class="fas fa-map-pin text-primary me-1"></i>${task.place_name}</p>
          <div class="d-flex align-items-center justify-content-between text-muted small">
            <span>
              <i class="fas fa-walking me-1"></i> ~${task.est_walking_mins} min &bull;
              <i class="fas fa-car ms-1 me-1"></i> ~${task.est_driving_mins} min
            </span>
            <a href="${task.directions_url}" target="_blank" rel="noopener" class="btn btn-sm btn-outline-primary py-0 px-2" style="font-size: 0.75rem;">
              <i class="fas fa-directions me-1"></i> Navigate
            </a>
          </div>
        </div>
      `;
    });
    html += '</div>';
    listEl.innerHTML = html;
  }
}

// Global initialization
window.addEventListener('DOMContentLoaded', () => {
  window.tmrTracker = new GeofenceTracker();
});
