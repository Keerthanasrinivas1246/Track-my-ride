/**
 * Track My Ride - Dedicated Full Task Map Viewer
 * Renders all user tasks with custom priority markers, Google Maps tiles,
 * radius circles, rich info-windows, live GPS tracking, and real-time filtering.
 */

class TaskMapManager {
  constructor(tasksData) {
    this.tasks = tasksData || [];
    this.map = null;
    this.leafletMap = null;
    this.markers = [];
    this.circles = [];
    this.leafletLayerGroup = null;
    this.infoWindow = null;
    this.userLocationMarker = null;
    this.showRadius = true;

    this.mapContainer = document.getElementById('tasks-map-canvas');
    this.init();
  }

  init() {
    if (!this.mapContainer) return;

    if (window.google && window.google.maps && window.GOOGLE_MAPS_KEY_PRESENT) {
      this.initOfficialGoogleMap();
    } else {
      this.initGoogleTilesMap();
    }

    this.bindFilterEvents();
  }

  getPriorityColor(priority, isCompleted) {
    if (isCompleted) return '#94a3b8'; // Completed: muted slate
    switch (priority) {
      case 'urgent': return '#ef4444'; // Red
      case 'high': return '#f97316';   // Orange
      case 'medium': return '#2563eb'; // Blue
      case 'low': return '#10b981';    // Green
      default: return '#64748b';
    }
  }

  initGoogleTilesMap() {
    if (!this.mapContainer || typeof L === 'undefined') return;
    this.mapContainer.innerHTML = '';

    let center = [12.2958, 76.6394];
    if (this.tasks.length > 0) {
      center = [this.tasks[0].lat, this.tasks[0].lng];
    }

    this.leafletMap = L.map(this.mapContainer, {
      center: center,
      zoom: 13,
      zoomControl: true
    });

    // Tile Layers: Google Streets & Google Satellite
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

    const baseLayers = {
      "Google Streets": googleRoads,
      "Google Satellite": googleSatellite,
      "OpenStreetMap": osm
    };
    L.control.layers(baseLayers, null, { position: 'topright' }).addTo(this.leafletMap);

    this.leafletLayerGroup = L.layerGroup().addTo(this.leafletMap);
    this.renderLeafletMarkers(this.tasks);

    // Track user location button
    const locateBtn = document.getElementById('btn-map-locate');
    if (locateBtn) {
      locateBtn.addEventListener('click', () => this.trackUserGPS());
    }
  }

  renderLeafletMarkers(taskList) {
    if (!this.leafletLayerGroup) return;
    this.leafletLayerGroup.clearLayers();
    this.circles = [];

    if (!taskList || taskList.length === 0) return;

    const bounds = [];

    taskList.forEach(task => {
      const color = this.getPriorityColor(task.priority, task.is_completed);
      const latlng = [task.lat, task.lng];
      bounds.push(latlng);

      // Custom colored icon
      const customIcon = L.divIcon({
        className: 'custom-div-pin',
        html: `
          <div style="
            background-color: ${color};
            width: 32px;
            height: 32px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid #ffffff;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          ">
            <i class="fas ${task.category_icon || 'fa-map-pin'}" style="transform: rotate(45deg); color: #ffffff; font-size: 13px;"></i>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
      });

      const marker = L.marker(latlng, { icon: customIcon });

      // Geofence Circle
      const circle = L.circle(latlng, {
        radius: task.radius,
        color: color,
        fillColor: color,
        fillOpacity: this.showRadius ? 0.16 : 0,
        opacity: this.showRadius ? 0.6 : 0,
        weight: 1.5
      });
      this.circles.push(circle);

      const popupHtml = `
        <div class="info-window-card" style="min-width: 210px;">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span class="badge ${task.is_completed ? 'bg-success' : 'bg-primary'}">${task.status_display}</span>
            <span class="badge" style="background-color: ${color}; color: #fff;">${task.priority_display}</span>
          </div>
          <h6 class="fw-bold mb-1 mt-1 text-dark">${task.title}</h6>
          <p class="text-muted small mb-1"><i class="fas fa-map-pin me-1 text-danger"></i>${task.place_name}</p>
          <div class="text-muted small mb-2"><i class="far fa-calendar-alt me-1"></i>${task.due_date} ${task.due_time}</div>
          <div class="text-muted small mb-2"><i class="fas fa-bullseye me-1 text-primary"></i>Radius: ${task.radius}m</div>
          <div class="d-flex gap-2 pt-1 border-top">
            <a href="${task.url}" class="btn btn-sm btn-primary py-0 px-2" style="font-size: 0.78rem;">Details</a>
            <a href="${task.directions_url}" target="_blank" rel="noopener" class="btn btn-sm btn-outline-secondary py-0 px-2" style="font-size: 0.78rem;">Directions</a>
          </div>
        </div>
      `;
      marker.bindPopup(popupHtml);

      this.leafletLayerGroup.addLayer(circle);
      this.leafletLayerGroup.addLayer(marker);
    });

    if (bounds.length > 1 && this.leafletMap) {
      this.leafletMap.fitBounds(bounds, { padding: [40, 40] });
    } else if (bounds.length === 1 && this.leafletMap) {
      this.leafletMap.setView(bounds[0], 15);
    }
  }

  initOfficialGoogleMap() {
    if (!this.mapContainer) return;
    this.mapContainer.innerHTML = '';

    let center = { lat: 12.2958, lng: 76.6394 };
    let zoom = 12;

    if (this.tasks.length > 0) {
      center = { lat: this.tasks[0].lat, lng: this.tasks[0].lng };
    }

    this.map = new google.maps.Map(this.mapContainer, {
      center: center,
      zoom: zoom,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
    });

    this.infoWindow = new google.maps.InfoWindow();
    this.renderGoogleMarkers(this.tasks);

    const locateBtn = document.getElementById('btn-map-locate');
    if (locateBtn) {
      locateBtn.addEventListener('click', () => this.trackUserGPS());
    }
  }

  renderGoogleMarkers(taskList) {
    this.clearMarkers();
    if (!taskList || taskList.length === 0) return;

    const bounds = new google.maps.LatLngBounds();

    taskList.forEach(task => {
      const pos = { lat: task.lat, lng: task.lng };
      bounds.extend(pos);

      const color = this.getPriorityColor(task.priority, task.is_completed);

      const markerIcon = {
        path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
        fillColor: color,
        fillOpacity: 1,
        strokeWeight: 1.5,
        strokeColor: "#ffffff",
        scale: 1.8,
        anchor: new google.maps.Point(12, 22),
      };

      const marker = new google.maps.Marker({
        position: pos,
        map: this.map,
        title: task.title,
        icon: markerIcon,
        animation: google.maps.Animation.DROP
      });

      const circle = new google.maps.Circle({
        strokeColor: color,
        strokeOpacity: 0.6,
        strokeWeight: 1.5,
        fillColor: color,
        fillOpacity: 0.15,
        map: this.showRadius ? this.map : null,
        center: pos,
        radius: task.radius
      });

      marker.addListener('click', () => {
        const content = `
          <div class="info-window-card">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <span class="badge ${task.is_completed ? 'bg-success' : 'bg-primary'}">${task.status_display}</span>
              <span class="badge" style="background-color: ${color}; color: #fff;">${task.priority_display}</span>
            </div>
            <h6 class="info-window-title mb-1">${task.title}</h6>
            <div class="info-window-place"><i class="fas fa-map-pin me-1 text-danger"></i>${task.place_name}</div>
            <div class="text-muted small mb-2"><i class="far fa-calendar-alt me-1"></i>${task.due_date} ${task.due_time}</div>
            <div class="text-muted small mb-3"><i class="fas fa-bullseye me-1 text-primary"></i>Radius: ${task.radius}m</div>
            <div class="d-flex gap-2">
              <a href="${task.url}" class="btn btn-sm btn-primary py-1 px-2" style="font-size: 0.8rem;">Details</a>
              <a href="${task.directions_url}" target="_blank" rel="noopener" class="btn btn-sm btn-outline-secondary py-1 px-2" style="font-size: 0.8rem;">Directions</a>
            </div>
          </div>
        `;
        this.infoWindow.setContent(content);
        this.infoWindow.open(this.map, marker);
      });

      this.markers.push(marker);
      this.circles.push(circle);
    });

    if (taskList.length > 1) {
      this.map.fitBounds(bounds, { padding: 40 });
    } else if (taskList.length === 1) {
      this.map.setCenter({ lat: taskList[0].lat, lng: taskList[0].lng });
      this.map.setZoom(15);
    }
  }

  clearMarkers() {
    this.markers.forEach(m => m.setMap(null));
    this.circles.forEach(c => c.setMap(null));
    this.markers = [];
    this.circles = [];
  }

  trackUserGPS() {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          if (this.map) {
            this.map.setCenter(userPos);
            this.map.setZoom(15);
            if (!this.userLocationMarker) {
              this.userLocationMarker = new google.maps.Marker({
                position: userPos,
                map: this.map,
                title: "You are here",
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 8,
                  fillColor: "#0284c7",
                  fillOpacity: 1,
                  strokeColor: "#ffffff",
                  strokeWeight: 2,
                }
              });
            } else {
              this.userLocationMarker.setPosition(userPos);
            }
          } else if (this.leafletMap) {
            this.leafletMap.setView([userPos.lat, userPos.lng], 15);
            L.circleMarker([userPos.lat, userPos.lng], {
              radius: 9,
              fillColor: '#0284c7',
              color: '#ffffff',
              weight: 2.5,
              fillOpacity: 1
            }).addTo(this.leafletMap).bindPopup('<strong>You are here</strong>').openPopup();
          }
        },
        (err) => alert('Could not get your location: ' + err.message),
        { enableHighAccuracy: true }
      );
    }
  }

  bindFilterEvents() {
    const categorySelect = document.getElementById('map-filter-category');
    const prioritySelect = document.getElementById('map-filter-priority');
    const statusSelect = document.getElementById('map-filter-status');
    const radiusCheckbox = document.getElementById('map-toggle-radius');

    const applyFilters = () => {
      const catVal = categorySelect ? categorySelect.value : '';
      const prioVal = prioritySelect ? prioritySelect.value : '';
      const statVal = statusSelect ? statusSelect.value : '';

      const filtered = this.tasks.filter(task => {
        let match = true;
        if (catVal && task.category !== catVal) match = false;
        if (prioVal && task.priority !== prioVal) match = false;
        if (statVal && task.status !== statVal) match = false;
        return match;
      });

      if (this.map) {
        this.renderGoogleMarkers(filtered);
      } else if (this.leafletMap) {
        this.renderLeafletMarkers(filtered);
      }

      const counter = document.getElementById('map-tasks-count');
      if (counter) counter.textContent = filtered.length;
    };

    if (categorySelect) categorySelect.addEventListener('change', applyFilters);
    if (prioritySelect) prioritySelect.addEventListener('change', applyFilters);
    if (statusSelect) statusSelect.addEventListener('change', applyFilters);

    if (radiusCheckbox) {
      radiusCheckbox.addEventListener('change', (e) => {
        this.showRadius = e.target.checked;
        if (this.map) {
          this.circles.forEach(c => c.setMap(this.showRadius ? this.map : null));
        } else if (this.circles) {
          this.circles.forEach(c => {
            if (this.showRadius) {
              c.setStyle({ fillOpacity: 0.16, opacity: 0.6 });
            } else {
              c.setStyle({ fillOpacity: 0, opacity: 0 });
            }
          });
        }
      });
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  if (window.tasksMapData) {
    window.tmrMapManager = new TaskMapManager(window.tasksMapData);
  }
});
