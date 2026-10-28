/**
 * Track My Ride - Main Interactive JavaScript
 */

// Global Google Maps helper orchestrator
window.runWhenGoogleMapsReady = function(onReady, onFallback) {
  if (window.google && window.google.maps) {
    onReady();
  } else if (window.GOOGLE_MAPS_KEY_PRESENT && !window.googleMapsAuthFailed) {
    let handled = false;

    const readyHandler = () => {
      if (!handled) {
        handled = true;
        onReady();
      }
    };

    const fallbackHandler = () => {
      if (!handled) {
        handled = true;
        if (onFallback) onFallback();
      }
    };

    document.addEventListener('google-maps-ready', readyHandler, { once: true });
    document.addEventListener('google-maps-auth-failure', fallbackHandler, { once: true });

    // Fallback if not loaded in 4 seconds
    setTimeout(() => {
      if (!handled && (!window.google || !window.google.maps)) {
        fallbackHandler();
      }
    }, 4000);
  } else {
    if (onFallback) onFallback();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // Initialize AOS animation library if present
  if (typeof AOS !== 'undefined') {
    AOS.init({
      duration: 700,
      once: true,
      easing: 'ease-out-cubic'
    });
  }

  // Initialize Bootstrap Tooltips
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.forEach(el => new bootstrap.Tooltip(el));

  // Navbar scroll elevation
  const navbar = document.querySelector('.navbar-tmr');
  if (navbar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 20) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    });
  }

  // Auto-dismiss standard alerts after 5 seconds
  const autoAlerts = document.querySelectorAll('.alert.alert-dismissible:not(.alert-permanent)');
  autoAlerts.forEach(alertEl => {
    setTimeout(() => {
      const bsAlert = bootstrap.Alert.getOrCreateInstance(alertEl);
      if (bsAlert) {
        bsAlert.close();
      }
    }, 5000);
  });

  // CSRF token retrieval for AJAX
  window.getCsrfToken = function() {
    const cookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('csrftoken='));
    return cookie ? cookie.split('=')[1] : '';
  };

  // Quick Task Status Toggle
  document.querySelectorAll('.btn-toggle-status').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const taskId = btn.dataset.taskId;
      const url = `/tasks/${taskId}/toggle-status/`;

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'X-CSRFToken': window.getCsrfToken(),
            'X-Requested-With': 'XMLHttpRequest'
          }
        });
        const data = await response.json();
        if (data.success) {
          // Update badge
          const badge = document.querySelector(`#task-status-badge-${taskId}`);
          if (badge) {
            badge.className = `badge ${data.badge_class}`;
            badge.textContent = data.status_display;
          }
          // Update button appearance
          if (data.new_status === 'completed') {
            btn.innerHTML = '<i class="fas fa-undo me-1"></i> Reopen';
            btn.classList.remove('btn-outline-success');
            btn.classList.add('btn-outline-secondary');
          } else {
            btn.innerHTML = '<i class="fas fa-check me-1"></i> Complete';
            btn.classList.remove('btn-outline-secondary');
            btn.classList.add('btn-outline-success');
          }
        }
      } catch (err) {
        console.error('Error toggling status:', err);
      }
    });
  });

  // Quick Task Favorite Toggle
  document.querySelectorAll('.btn-toggle-fav').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const taskId = btn.dataset.taskId;
      const url = `/tasks/${taskId}/toggle-favorite/`;

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'X-CSRFToken': window.getCsrfToken(),
            'X-Requested-With': 'XMLHttpRequest'
          }
        });
        const data = await response.json();
        if (data.success) {
          const icon = btn.querySelector('i');
          if (data.is_favorite) {
            icon.classList.remove('far');
            icon.classList.add('fas', 'text-warning');
          } else {
            icon.classList.remove('fas', 'text-warning');
            icon.classList.add('far');
          }
        }
      } catch (err) {
        console.error('Error toggling favorite:', err);
      }
    });
  });
});
