/**
 * Track My Ride - Interactive Map Place & Geofence Picker
 * Provides rich Google Maps tiles, live place search autocomplete,
 * draggable pin with live reverse-geocoding, and dynamic radius circles.
 * Works out-of-the-box with zero API key required, and supports official
 * Google Maps SDK if an API key is provided.
 */

class LocationPicker {
  constructor() {
    this.map = null;
    this.marker = null;
    this.circle = null;
    this.geocoder = null;

    // Inputs
    this.latInput = document.getElementById('latitude-input');
    this.lngInput = document.getElementById('longitude-input');
    this.placeInput = document.getElementById('place-name-input');
    this.addressInput = document.getElementById('address-input');
    this.radiusInput = document.getElementById('radius-input');
    this.mapContainer = document.getElementById('picker-map');

    // Default coordinates: Mysore (12.2958, 76.6394)
    this.defaultLat = 12.2958;
    this.defaultLng = 76.6394;

    this.debounceTimer = null;
    this.suggestionsContainer = null;

    this.init();
  }

  init() {
    if (!this.mapContainer) return;

    // Check if initial coordinates exist
    let initialLat = parseFloat(this.latInput.value);
    let initialLng = parseFloat(this.lngInput.value);

    if (!isNaN(initialLat) && !isNaN(initialLng) && initialLat !== 0) {
      this.currentLat = initialLat;
      this.currentLng = initialLng;
    } else {
      this.currentLat = this.defaultLat;
      this.currentLng = this.defaultLng;
      this.latInput.value = this.currentLat.toFixed(6);
      this.lngInput.value = this.currentLng.toFixed(6);
    }

    this.currentRadius = parseInt(this.radiusInput.value) || 500;

    // Listen to radius change to update circle live
    this.radiusInput.addEventListener('input', () => {
      this.currentRadius = parseInt(this.radiusInput.value) || 500;
      this.updateRadiusCircle();
    });

    // Locate Me button
    const locateBtn = document.getElementById('btn-locate-me');
    if (locateBtn) {
      locateBtn.addEventListener('click', () => this.locateCurrentUser());
    }

    // Set up place search autocomplete container
    this.setupAutocompleteDropdown();

    // Prevent Enter key in place input from submitting form
    if (this.placeInput) {
      this.placeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
        }
      });
      // Attach live autocomplete search
      this.placeInput.addEventListener('input', (e) => {
        this.handlePlaceSearchInput(e.target.value.trim());
      });
    }

    // Close autocomplete on click outside
    document.addEventListener('click', (e) => {
      if (this.suggestionsContainer && !this.suggestionsContainer.contains(e.target) && e.target !== this.placeInput) {
        this.suggestionsContainer.style.display = 'none';
      }
    });

    // Initialize map
    if (window.google && window.google.maps && window.GOOGLE_MAPS_KEY_PRESENT) {
      this.initOfficialGoogleMap();
    } else {
      this.initInteractiveGoogleTilesMap();
    }
  }

  setupAutocompleteDropdown() {
    if (!this.placeInput) return;
    const parent = this.placeInput.closest('.mb-3') || this.placeInput.parentElement;
    parent.style.position = 'relative';

    this.suggestionsContainer = document.createElement('div');
    this.suggestionsContainer.className = 'autocomplete-suggestions-dropdown shadow-lg';
    this.suggestionsContainer.style.cssText = `
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      max-height: 240px;
      overflow-y: auto;
      z-index: 1050;
      display: none;
      margin-top: 4px;
    `;
    parent.appendChild(this.suggestionsContainer);
  }

  handlePlaceSearchInput(query) {
    clearTimeout(this.debounceTimer);
    if (!query || query.length < 2) {
      if (this.suggestionsContainer) this.suggestionsContainer.style.display = 'none';
      return;
    }

    this.debounceTimer = setTimeout(() => {
      this.fetchPlaceSuggestions(query);
    }, 350);
  }

  fetchPlaceSuggestions(query) {
    // Free, open places API (CORS-enabled, zero credentials required)
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (!data || data.length === 0) {
          if (this.suggestionsContainer) this.suggestionsContainer.style.display = 'none';
          return;
        }
        this.renderSuggestions(data);
      })
      .catch(() => {
        if (this.suggestionsContainer) this.suggestionsContainer.style.display = 'none';
      });
  }

  renderSuggestions(items) {
    if (!this.suggestionsContainer) return;
    this.suggestionsContainer.innerHTML = '';

    items.forEach(item => {
      const option = document.createElement('div');
      option.className = 'p-2 border-bottom text-start cursor-pointer hover-bg-light';
      option.style.cursor = 'pointer';

      const displayName = item.display_name;
      const parts = displayName.split(',');
      const mainTitle = parts[0];
      const subtitle = parts.slice(1).join(',').trim();

      option.innerHTML = `
        <div class="d-flex align-items-center gap-2">
          <i class="fas fa-map-marker-alt text-danger"></i>
          <div class="text-truncate">
            <div class="fw-semibold small text-dark">${mainTitle}</div>
            <div class="text-muted" style="font-size: 0.75rem;">${subtitle}</div>
          </div>
        </div>
      `;

      option.addEventListener('mouseenter', () => option.style.backgroundColor = '#f1f5f9');
      option.addEventListener('mouseleave', () => option.style.backgroundColor = '#ffffff');

      option.addEventListener('click', () => {
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);

        if (this.placeInput) this.placeInput.value = mainTitle;
        if (this.addressInput) this.addressInput.value = displayName;

        this.updateCoords(lat, lon);
        this.panToLocation(lat, lon);

        this.suggestionsContainer.style.display = 'none';
      });

      this.suggestionsContainer.appendChild(option);
    });

    this.suggestionsContainer.style.display = 'block';
  }

  panToLocation(lat, lon) {
    if (this.map && this.marker) {
      const pos = new google.maps.LatLng(lat, lon);
      this.map.setCenter(pos);
      this.map.setZoom(16);
      this.marker.setPosition(pos);
    } else if (this.leafletMap && this.leafletMarker) {
      this.leafletMap.setView([lat, lon], 16);
      this.leafletMarker.setLatLng([lat, lon]);
    }
  }

  initInteractiveGoogleTilesMap() {
    if (!this.mapContainer || typeof L === 'undefined') return;
    this.mapContainer.innerHTML = '';

    // Initialize Leaflet with Google Maps road tiles
    this.leafletMap = L.map(this.mapContainer, {
      center: [this.currentLat, this.currentLng],
      zoom: 15,
      zoomControl: true
    });

    // Tile Layers
    const googleRoads = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '&copy; Google Maps'
    });

    const googleSatellite = L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '&copy; Google Maps'
    });

    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    });

    // Add Google Streets as default
    googleRoads.addTo(this.leafletMap);

    // Layer switcher control
    const baseLayers = {
      "Google Streets": googleRoads,
      "Google Satellite": googleSatellite,
      "OpenStreetMap": osm
    };
    L.control.layers(baseLayers, null, { position: 'topright' }).addTo(this.leafletMap);

    // Custom Draggable Marker
    this.leafletMarker = L.marker([this.currentLat, this.currentLng], {
      draggable: true
    }).addTo(this.leafletMap);

    // Geofence Circle
    this.leafletCircle = L.circle([this.currentLat, this.currentLng], {
      radius: this.currentRadius,
      color: '#2563eb',
      fillColor: '#3b82f6',
      fillOpacity: 0.22,
      weight: 2
    }).addTo(this.leafletMap);

    // Marker Drag listener
    this.leafletMarker.on('dragend', () => {
      const pos = this.leafletMarker.getLatLng();
      this.updateCoords(pos.lat, pos.lng);
      this.reverseGeocode(pos.lat, pos.lng);
    });

    // Map Click listener
    this.leafletMap.on('click', (e) => {
      this.leafletMarker.setLatLng(e.latlng);
      this.updateCoords(e.latlng.lat, e.latlng.lng);
      this.reverseGeocode(e.latlng.lat, e.latlng.lng);
    });
  }

  initOfficialGoogleMap() {
    if (!this.mapContainer) return;
    this.mapContainer.innerHTML = '';

    const center = { lat: this.currentLat, lng: this.currentLng };
    this.geocoder = new google.maps.Geocoder();

    this.map = new google.maps.Map(this.mapContainer, {
      center: center,
      zoom: 15,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
    });

    // Marker
    this.marker = new google.maps.Marker({
      position: center,
      map: this.map,
      draggable: true,
      title: 'Task Location (Drag to adjust)',
      animation: google.maps.Animation.DROP
    });

    // Geofence Circle
    this.circle = new google.maps.Circle({
      strokeColor: '#2563eb',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#3b82f6',
      fillOpacity: 0.22,
      map: this.map,
      center: center,
      radius: this.currentRadius
    });

    // Marker Drag listener
    this.marker.addListener('dragend', () => {
      const pos = this.marker.getPosition();
      this.updateCoords(pos.lat(), pos.lng());
      this.reverseGeocode(pos.lat(), pos.lng());
    });

    // Map Click listener
    this.map.addListener('click', (e) => {
      this.marker.setPosition(e.latLng);
      this.updateCoords(e.latLng.lat(), e.latLng.lng());
      this.reverseGeocode(e.latLng.lat(), e.latLng.lng());
    });
  }

  updateCoords(lat, lng) {
    this.currentLat = lat;
    this.currentLng = lng;
    this.latInput.value = lat.toFixed(6);
    this.lngInput.value = lng.toFixed(6);
    this.updateRadiusCircle();
  }

  updateRadiusCircle() {
    const center = { lat: this.currentLat, lng: this.currentLng };
    if (this.circle) {
      this.circle.setCenter(center);
      this.circle.setRadius(this.currentRadius);
    }
    if (this.leafletCircle) {
      this.leafletCircle.setLatLng([this.currentLat, this.currentLng]);
      this.leafletCircle.setRadius(this.currentRadius);
    }
  }

  reverseGeocode(lat, lng) {
    if (this.geocoder) {
      this.geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results[0] && this.addressInput && (!this.addressInput.value || this.addressInput.value.length < 5)) {
          this.addressInput.value = results[0].formatted_address;
        }
      });
      return;
    }

    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.display_name && this.addressInput && (!this.addressInput.value || this.addressInput.value.length < 5)) {
          this.addressInput.value = data.display_name;
        }
      })
      .catch(() => {});
  }

  locateCurrentUser() {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          this.updateCoords(lat, lng);
          this.panToLocation(lat, lng);
          this.reverseGeocode(lat, lng);
        },
        (err) => {
          alert('Could not retrieve current GPS position: ' + err.message);
        },
        { enableHighAccuracy: true }
      );
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.tmrLocationPicker = new LocationPicker();
});
