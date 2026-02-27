/**
 * Fleet Optimizer - Vehicle Details Page JavaScript
 */

// Global state
let vehicleId = null;
let vehicle = null;
let telemetry = [];
let alerts = [];
let map = null;
let marker = null;
let fuelChart = null;
let efficiencyChart = null;
let speedChart = null;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  // Extract vehicle ID from URL
  const pathParts = window.location.pathname.split('/');
  vehicleId = pathParts[pathParts.length - 1];
  
  if (!vehicleId) {
    showToast('Invalid vehicle ID', 'error');
    return;
  }
  
  // Initialize map
  initMap();
  
  // Initialize charts
  initCharts();
  
  // Load all data
  loadAllData();
  
  // Auto-refresh every 30 seconds
  setInterval(loadAllData, 30000);
});

/**
 * Initialize Leaflet map
 */
function initMap() {
  map = L.map('map').setView([40.7128, -74.0060], 13);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);
  
  // Custom marker icon
  const vehicleIcon = L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
      border: 3px solid white;
    ">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"></path>
      </svg>
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
  
  marker = L.marker([40.7128, -74.0060], { icon: vehicleIcon }).addTo(map);
}

/**
 * Initialize Chart.js charts
 */
function initCharts() {
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          maxTicksLimit: 8,
          font: { size: 11 }
        }
      },
      y: {
        grid: {
          color: '#f1f5f9'
        },
        ticks: {
          font: { size: 11 }
        }
      }
    },
    elements: {
      line: {
        tension: 0.4
      },
      point: {
        radius: 2,
        hoverRadius: 5
      }
    }
  };
  
  // Fuel History Chart
  const fuelCtx = document.getElementById('fuelHistoryChart').getContext('2d');
  fuelChart = new Chart(fuelCtx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Fuel Level (%)',
        data: [],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        borderWidth: 2
      }]
    },
    options: {
      ...chartOptions,
      scales: {
        ...chartOptions.scales,
        y: {
          ...chartOptions.scales.y,
          min: 0,
          max: 100
        }
      }
    }
  });
  
  // Efficiency Chart
  const effCtx = document.getElementById('efficiencyChart').getContext('2d');
  efficiencyChart = new Chart(effCtx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Efficiency (km/L)',
        data: [],
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        fill: true,
        borderWidth: 2
      }]
    },
    options: chartOptions
  });
  
  // Speed Chart
  const speedCtx = document.getElementById('speedChart').getContext('2d');
  speedChart = new Chart(speedCtx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Speed (km/h)',
        data: [],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        borderWidth: 2
      }]
    },
    options: chartOptions
  });
}

/**
 * Load all data from API
 */
async function loadAllData() {
  try {
    await Promise.all([
      loadVehicle(),
      loadTelemetry(),
      loadAlerts()
    ]);
    
    document.getElementById('lastUpdate').textContent = `Last update: ${new Date().toLocaleTimeString()}`;
  } catch (error) {
    console.error('Error loading data:', error);
    showToast('Failed to load vehicle data', 'error');
  }
}

/**
 * Refresh data manually
 */
function refreshData() {
  loadAllData();
  showToast('Data refreshed', 'success');
}

/**
 * Load vehicle details
 */
async function loadVehicle() {
  const response = await fetch(`/api/vehicles/${vehicleId}`);
  
  if (!response.ok) {
    throw new Error('Vehicle not found');
  }
  
  vehicle = await response.json();
  updateVehicleUI();
}

/**
 * Update vehicle UI elements
 */
function updateVehicleUI() {
  // Header
  document.getElementById('vehicleId').textContent = vehicle.vehicle_id;
  document.getElementById('vehicleIdNav').textContent = vehicle.vehicle_id;
  document.getElementById('driverName').textContent = `Driver: ${vehicle.driver_name}`;
  document.title = `Fleet Optimizer - ${vehicle.vehicle_id}`;
  
  // Status badges
  const statusClass = getStatusClass(vehicle.status);
  document.getElementById('statusBadge').innerHTML = `
    <span class="flex items-center">
      <span class="w-2 h-2 rounded-full ${getStatusDotClass(vehicle.status)} mr-2"></span>
      ${vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1)}
    </span>
  `;
  document.getElementById('statusBadge').className = `px-4 py-2 rounded-xl text-sm font-medium ${statusClass}`;
  
  document.getElementById('statusBadgeNav').textContent = vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1);
  document.getElementById('statusBadgeNav').className = `px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}`;
  
  // Vehicle type
  document.getElementById('vehicleType').textContent = `Type: ${vehicle.vehicle_type.charAt(0).toUpperCase() + vehicle.vehicle_type.slice(1)}`;
  
  // Stats
  const fuelValue = vehicle.current_fuel.toFixed(1);
  document.getElementById('currentFuel').textContent = fuelValue;
  document.getElementById('fuelBar').style.width = `${vehicle.current_fuel}%`;
  document.getElementById('fuelBar').className = `h-1.5 rounded-full transition-all ${getFuelBarColor(vehicle.current_fuel)}`;
  
  document.getElementById('currentSpeed').textContent = vehicle.current_speed.toFixed(0);
  
  // Engine status
  const engineOn = vehicle.engine_on === 1 || vehicle.engine_on === true;
  document.getElementById('engineStatus').innerHTML = `
    <span class="w-1.5 h-1.5 ${engineOn ? 'bg-emerald-500' : 'bg-gray-400'} rounded-full mr-1.5"></span>
    Engine: ${engineOn ? 'Running' : 'Off'}
  `;
  
  document.getElementById('baselineEfficiency').textContent = vehicle.baseline_efficiency.toFixed(1);
  document.getElementById('tankCapacity').textContent = `Tank: ${vehicle.tank_capacity}L capacity`;
  
  // Location
  document.getElementById('latitude').textContent = vehicle.latitude.toFixed(4);
  document.getElementById('longitude').textContent = vehicle.longitude.toFixed(4);
  
  // Update map
  if (map && marker) {
    const lat = vehicle.latitude;
    const lng = vehicle.longitude;
    marker.setLatLng([lat, lng]);
    map.setView([lat, lng], 14);
  }
}

/**
 * Load telemetry data
 */
async function loadTelemetry() {
  const response = await fetch(`/api/vehicles/${vehicleId}/telemetry?limit=24`);
  
  if (!response.ok) {
    throw new Error('Failed to load telemetry');
  }
  
  telemetry = await response.json();
  telemetry.reverse(); // Oldest first for charts
  
  updateCharts();
}

/**
 * Update charts with telemetry data
 */
function updateCharts() {
  if (telemetry.length === 0) return;
  
  // Format timestamps for labels
  const labels = telemetry.map(t => {
    const date = new Date(t.timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  });
  
  // Fuel chart
  fuelChart.data.labels = labels;
  fuelChart.data.datasets[0].data = telemetry.map(t => t.fuel_level);
  fuelChart.update();
  
  // Efficiency chart
  efficiencyChart.data.labels = labels;
  efficiencyChart.data.datasets[0].data = telemetry.map(t => t.efficiency);
  efficiencyChart.update();
  
  // Speed chart
  speedChart.data.labels = labels;
  speedChart.data.datasets[0].data = telemetry.map(t => t.speed);
  speedChart.update();
}

/**
 * Load alerts
 */
async function loadAlerts() {
  const response = await fetch(`/api/vehicles/${vehicleId}/alerts`);
  
  if (!response.ok) {
    throw new Error('Failed to load alerts');
  }
  
  alerts = await response.json();
  updateAlertsUI();
}

/**
 * Update alerts UI
 */
function updateAlertsUI() {
  // Update alert count
  const unresolvedCount = alerts.filter(a => !a.resolved).length;
  document.getElementById('alertCount').textContent = unresolvedCount;
  
  const container = document.getElementById('alertHistory');
  
  if (alerts.length === 0) {
    container.innerHTML = `
      <div class="flex flex-col items-center py-8">
        <div class="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
          <svg class="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <span class="text-gray-500 text-sm">No alerts found for this vehicle</span>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="space-y-3">
      ${alerts.map(alert => `
        <div class="flex items-start space-x-4 p-4 rounded-xl ${alert.resolved ? 'bg-gray-50' : getSeverityBgClass(alert.severity)}">
          <div class="flex-shrink-0">
            <div class="w-10 h-10 rounded-xl ${getSeverityIconBgClass(alert.severity)} flex items-center justify-center">
              ${getSeverityIcon(alert.severity)}
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center space-x-2">
              <span class="text-sm font-semibold text-gray-900">${formatAlertType(alert.alert_type)}</span>
              <span class="px-2 py-0.5 rounded text-xs font-medium ${getSeverityBadgeClass(alert.severity)}">
                ${alert.severity}
              </span>
              ${alert.resolved ? '<span class="px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">Resolved</span>' : ''}
            </div>
            <p class="text-sm text-gray-600 mt-1">${alert.message}</p>
            <p class="text-xs text-gray-400 mt-2">${formatDate(alert.created_at)}</p>
          </div>
          ${!alert.resolved ? `
            <button onclick="resolveAlert(${alert.id})" class="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
              Resolve
            </button>
          ` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Resolve an alert
 */
async function resolveAlert(alertId) {
  try {
    const response = await fetch(`/api/alerts/${alertId}/resolve`, {
      method: 'PUT'
    });
    
    if (!response.ok) {
      throw new Error('Failed to resolve alert');
    }
    
    showToast('Alert resolved', 'success');
    loadAlerts();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ----- Helper Functions -----

function getStatusClass(status) {
  const classes = {
    'active': 'bg-emerald-50 border border-emerald-200 text-emerald-700',
    'idle': 'bg-gray-50 border border-gray-200 text-gray-600',
    'maintenance': 'bg-amber-50 border border-amber-200 text-amber-700',
    'offline': 'bg-red-50 border border-red-200 text-red-700'
  };
  return classes[status] || classes['idle'];
}

function getStatusDotClass(status) {
  const classes = {
    'active': 'bg-emerald-500',
    'idle': 'bg-gray-400',
    'maintenance': 'bg-amber-500',
    'offline': 'bg-red-500'
  };
  return classes[status] || classes['idle'];
}

function getFuelBarColor(fuel) {
  if (fuel >= 60) return 'bg-emerald-500';
  if (fuel >= 30) return 'bg-amber-500';
  return 'bg-red-500';
}

function getSeverityBgClass(severity) {
  const classes = {
    'critical': 'bg-red-50',
    'warning': 'bg-amber-50',
    'info': 'bg-blue-50'
  };
  return classes[severity] || classes['info'];
}

function getSeverityIconBgClass(severity) {
  const classes = {
    'critical': 'bg-red-100',
    'warning': 'bg-amber-100',
    'info': 'bg-blue-100'
  };
  return classes[severity] || classes['info'];
}

function getSeverityBadgeClass(severity) {
  const classes = {
    'critical': 'bg-red-100 text-red-700',
    'warning': 'bg-amber-100 text-amber-700',
    'info': 'bg-blue-100 text-blue-700'
  };
  return classes[severity] || classes['info'];
}

function getSeverityIcon(severity) {
  const icons = {
    'critical': `<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
    </svg>`,
    'warning': `<svg class="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
    </svg>`,
    'info': `<svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>`
  };
  return icons[severity] || icons['info'];
}

function formatAlertType(type) {
  return type.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  
  const colors = {
    success: 'bg-emerald-500',
    error: 'bg-red-500',
    info: 'bg-brand-500'
  };
  
  toast.className = `${colors[type]} text-white px-6 py-3 rounded-xl shadow-lg transform transition-all duration-300 translate-x-full`;
  toast.textContent = message;
  
  container.appendChild(toast);
  
  // Animate in
  requestAnimationFrame(() => {
    toast.classList.remove('translate-x-full');
  });
  
  // Remove after 3 seconds
  setTimeout(() => {
    toast.classList.add('translate-x-full');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
