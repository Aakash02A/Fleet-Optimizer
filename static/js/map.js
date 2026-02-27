/**
 * Fleet Optimizer - Live Map Page JavaScript
 */

let map = null;
let markers = {};
let vehicles = [];

document.addEventListener('DOMContentLoaded', () => {
  initMap();
  loadVehicles();
  setInterval(loadVehicles, 10000);
});

function initMap() {
  map = L.map('map').setView([40.7128, -74.0060], 12);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(map);
}

async function loadVehicles() {
  try {
    const response = await fetch('/api/vehicles');
    vehicles = await response.json();
    
    document.getElementById('vehicleCount').textContent = `Tracking: ${vehicles.length} vehicles`;
    
    updateMarkers();
  } catch (error) {
    console.error('Error loading vehicles:', error);
  }
}

function updateMarkers() {
  vehicles.forEach(vehicle => {
    const lat = vehicle.latitude;
    const lng = vehicle.longitude;
    const vehicleId = vehicle.vehicle_id;
    
    if (markers[vehicleId]) {
      // Update existing marker
      markers[vehicleId].setLatLng([lat, lng]);
    } else {
      // Create new marker
      const icon = L.divIcon({
        className: 'vehicle-marker',
        html: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"></path>
        </svg>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });
      
      const marker = L.marker([lat, lng], { icon: icon }).addTo(map);
      
      // Popup content
      const popupContent = `
        <div class="text-sm">
          <strong>${vehicle.vehicle_id}</strong><br>
          Driver: ${vehicle.driver_name}<br>
          Status: <span class="px-1.5 rounded text-xs font-medium ${getStatusBadgeClass(vehicle.status)}">${vehicle.status}</span><br>
          Speed: ${vehicle.current_speed.toFixed(0)} km/h<br>
          <a href="/vehicle/${vehicle.vehicle_id}" style="color: #6366f1; text-decoration: none; font-weight: 500; margin-top: 4px; display: inline-block;">View Details →</a>
        </div>
      `;
      
      marker.bindPopup(popupContent);
      markers[vehicleId] = marker;
    }
  });
  
  // Remove markers for deleted vehicles
  Object.keys(markers).forEach(vehicleId => {
    if (!vehicles.find(v => v.vehicle_id === vehicleId)) {
      map.removeLayer(markers[vehicleId]);
      delete markers[vehicleId];
    }
  });
}

function getStatusBadgeClass(status) {
  const classes = {
    'active': 'bg-emerald-100 text-emerald-700',
    'idle': 'bg-gray-100 text-gray-700',
    'maintenance': 'bg-amber-100 text-amber-700',
    'offline': 'bg-red-100 text-red-700'
  };
  return classes[status] || classes['idle'];
}
