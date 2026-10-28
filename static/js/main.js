/**
 * Track My Ride - Main Interactive JavaScript
 * Theme Manager, Animations, Digit Counters & Micro-interactions
 */

// 1. Theme Manager (Dark / Light Mode)
(function initTheme() {
  const savedTheme = localStorage.getItem('tmr-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = savedTheme ? savedTheme : (prefersDark ? 'dark' : 'light');

  document.documentElement.setAttribute('data-bs-theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
  if (document.body) {
    document.body.setAttribute('data-theme', theme);
  }
})();

window.toggleTheme = function() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';

  document.documentElement.setAttribute('data-bs-theme', next);
  document.documentElement.setAttribute('data-theme', next);
  document.body.setAttribute('data-theme', next);
  localStorage.setItem('tmr-theme', next);

  updateThemeIcons(next);
  document.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: next } }));
};

function updateThemeIcons(theme) {
  document.querySelectorAll('.theme-toggle-icon').forEach(icon => {
    if (theme === 'dark') {
      icon.className = 'fas fa-sun theme-toggle-icon text-warning';
    } else {
      icon.className = 'fas fa-moon theme-toggle-icon text-secondary';
    }
  });
}

// 2. Global Google Maps helper orchestrator
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
  // Update icons based on current theme
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  updateThemeIcons(currentTheme);

  // Initialize AOS animation library if present
  if (typeof AOS !== 'undefined') {
    AOS.init({
      duration: 600,
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

  // Animated Number Counters (e.g. data-counter="42")
  const counters = document.querySelectorAll('[data-counter]');
  counters.forEach(counter => {
    const target = parseInt(counter.getAttribute('data-counter'), 10) || 0;
    if (target === 0) {
      counter.textContent = '0';
      return;
    }

    const duration = 900; // ms
    const startTime = performance.now();

    function updateCounter(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const currentVal = Math.floor(ease * target);

      counter.textContent = currentVal.toLocaleString();

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      } else {
        counter.textContent = target.toLocaleString();
      }
    }
    requestAnimationFrame(updateCounter);
  });

  // Auto-dismiss alerts after 5 seconds
  const autoAlerts = document.querySelectorAll('.alert.alert-dismissible:not(.alert-permanent)');
  autoAlerts.forEach(alertEl => {
    setTimeout(() => {
      const bsAlert = bootstrap.Alert.getOrCreateInstance(alertEl);
      if (bsAlert) bsAlert.close();
    }, 5000);
  });

  // CSRF token retrieval for AJAX
  window.getCsrfToken = function() {
    const cookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('csrftoken='));
    return cookie ? cookie.split('=')[1] : '';
  };

  // Prevent double form submissions on all forms
  document.querySelectorAll('form:not(.no-double-submit)').forEach(form => {
    form.addEventListener('submit', () => {
      const submitBtn = form.querySelector('button[type="submit"]:not(.no-spin)');
      if (submitBtn && !form.checkValidity || (form.checkValidity && form.checkValidity())) {
        setTimeout(() => {
          submitBtn.classList.add('btn-loading');
          submitBtn.disabled = true;
        }, 10);
      }
    });
  });

  // Quick Task Status Toggle with Strike-through & Animation
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

          // Toggle task completed visual classes on parent card or table row
          const card = document.querySelector(`#task-card-${taskId}`) || btn.closest('.card-tmr') || btn.closest('tr');
          if (card) {
            if (data.new_status === 'completed') {
              card.classList.add('task-completed');
            } else {
              card.classList.remove('task-completed');
            }
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
