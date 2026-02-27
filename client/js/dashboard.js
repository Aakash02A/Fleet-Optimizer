/**
 * FleetCommand Dashboard
 * Premium SaaS Fleet Monitoring Dashboard
 * Pure Vanilla JavaScript with Chart.js & Leaflet.js
 */

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  API_BASE: '/api',
  REFRESH_INTERVAL: 5000,
  TOAST_DURATION: 4000,
  MAP_CENTER: [14.5995, 120.9842], // Default center (Manila, Philippines)
  MAP_ZOOM: 12
};

// ============================================
// STATE
// ============================================

let vehicles = [];
let alerts = [];
let fuelTrendChart = null;
let vehicleMap = null;
let mapMarkers = [];
let refreshInterval = null;

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Fetch all vehicles with stats
 */
async function fetchVehicles() {
  try {
    const response = await fetch(`${CONFIG.API_BASE}/vehicles`);
    const data = await response.json();
    
    if (data.success) {
      vehicles = data.data;
      updateKPICards(data.stats, vehicles);
      updateVehicleTable(vehicles);
      updateMapMarkers(vehicles);
      updateFuelTrendChart(vehicles);
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    showToast('Failed to fetch vehicle data', 'error');
  }
}

/**
 * Fetch recent alerts
 */
async function fetchAlerts() {
  try {
    const response = await fetch(`${CONFIG.API_BASE}/alerts?limit=20`);
    const data = await response.json();
    
    if (data.success) {
      alerts = data.data;
      updateAlertsList(alerts);
      updateAlertBadges(alerts);
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching alerts:', error);
  }
}

// ============================================
// KPI CARDS UPDATE
// ============================================

/**
 * Update KPI cards with stats
 */
function updateKPICards(stats, vehicles) {
  // Total Fleet
  const totalFleet = document.getElementById('totalFleet');
  if (totalFleet) {
    animateNumber(totalFleet, stats?.totalVehicles || vehicles.length);
  }
  
  // Average Fuel
  const avgFuel = document.getElementById('avgFuel');
  if (avgFuel && vehicles.length > 0) {
    const totalFuel = vehicles.reduce((sum, v) => sum + (v.lastTelemetry?.fuelLevel || 0), 0);
    const average = Math.round(totalFuel / vehicles.length);
    avgFuel.innerHTML = `${average}<span>%</span>`;
  }
  
  // Active Alerts
  const activeAlertsEl = document.getElementById('activeAlerts');
  if (activeAlertsEl) {
    animateNumber(activeAlertsEl, stats?.activeAlerts || 0);
  }
}

/**
 * Animate number change
 */
function animateNumber(element, newValue) {
  const currentValue = parseInt(element.textContent) || 0;
  const diff = newValue - currentValue;
  const steps = 20;
  const stepValue = diff / steps;
  let current = currentValue;
  let step = 0;
  
  const animate = () => {
    if (step < steps) {
      current += stepValue;
      element.textContent = Math.round(current);
      step++;
      requestAnimationFrame(animate);
    } else {
      element.textContent = newValue;
    }
  };
  
  animate();
}

// ============================================
// VEHICLE TABLE
// ============================================

/**
 * Update vehicle status table
 */
function updateVehicleTable(vehicles) {
  const tableBody = document.getElementById('vehicleTableBody');
  if (!tableBody) return;
  
  if (!vehicles || vehicles.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="empty-state">
            <div class="empty-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
            </div>
            <p class="empty-title">No vehicles found</p>
            <p class="empty-description">Add vehicles to start monitoring</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  tableBody.innerHTML = vehicles.map(vehicle => {
    const fuel = vehicle.lastTelemetry?.fuelLevel || 0;
    const hasAlerts = vehicle.activeAlerts > 0;
    const lastUpdate = vehicle.lastTelemetry?.timestamp 
      ? new Date(vehicle.lastTelemetry.timestamp * 1000).toLocaleTimeString()
      : 'N/A';
    
    // Determine status
    let status, statusClass;
    if (hasAlerts) {
      status = 'Alert';
      statusClass = 'danger';
    } else if (fuel < 15) {
      status = 'Low Fuel';
      statusClass = 'danger';
    } else if (fuel < 30) {
      status = 'Warning';
      statusClass = 'warning';
    } else {
      status = 'Normal';
      statusClass = 'normal';
    }
    
    // Fuel bar class
    let fuelClass = 'high';
    if (fuel < 15) fuelClass = 'low';
    else if (fuel < 30) fuelClass = 'medium';
    
    return `
      <tr onclick="viewVehicle('${vehicle.vehicleId}')" style="cursor: pointer;">
        <td>
          <div class="table-vehicle">
            <div class="vehicle-icon-wrapper">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
            </div>
            <span class="vehicle-id">${vehicle.vehicleId}</span>
          </div>
        </td>
        <td>
          <div class="fuel-bar">
            <div class="fuel-progress">
              <div class="fuel-fill ${fuelClass}" style="width: ${fuel}%;"></div>
            </div>
            <span class="fuel-percent ${fuel < 15 ? 'low' : ''}">${fuel}%</span>
          </div>
        </td>
        <td>
          <span class="status-badge ${statusClass}">${status}</span>
        </td>
        <td>${lastUpdate}</td>
        <td>
          <button class="action-btn" onclick="event.stopPropagation(); viewVehicle('${vehicle.vehicleId}')">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
            </svg>
            View
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// ============================================
// LEAFLET MAP
// ============================================

/**
 * Initialize Leaflet map
 */
function initializeMap() {
  if (vehicleMap) return;
  
  const mapElement = document.getElementById('vehicleMap');
  if (!mapElement) return;
  
  vehicleMap = L.map('vehicleMap').setView(CONFIG.MAP_CENTER, CONFIG.MAP_ZOOM);
  
  // Light theme map tiles (CartoDB Positron)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(vehicleMap);
}

/**
 * Update map markers for vehicles
 */
function updateMapMarkers(vehicles) {
  if (!vehicleMap) {
    initializeMap();
  }
  
  if (!vehicleMap) return;
  
  // Clear existing markers
  mapMarkers.forEach(marker => vehicleMap.removeLayer(marker));
  mapMarkers = [];
  
  // Add markers for each vehicle with location data
  vehicles.forEach(vehicle => {
    const lat = vehicle.lastTelemetry?.latitude || (CONFIG.MAP_CENTER[0] + (Math.random() - 0.5) * 0.1);
    const lng = vehicle.lastTelemetry?.longitude || (CONFIG.MAP_CENTER[1] + (Math.random() - 0.5) * 0.1);
    const fuel = vehicle.lastTelemetry?.fuelLevel || 0;
    const hasAlerts = vehicle.activeAlerts > 0;
    
    // Determine status
    let status = 'Normal';
    let markerColor = '#16a34a';
    if (hasAlerts) {
      status = 'Alert';
      markerColor = '#dc2626';
    } else if (fuel < 15) {
      status = 'Low Fuel';
      markerColor = '#dc2626';
    } else if (fuel < 30) {
      status = 'Warning';
      markerColor = '#f59e0b';
    }
    
    // Custom marker icon
    const markerIcon = L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background-color: ${markerColor};
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        ">
          <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
            <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"></path>
          </svg>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
    
    const marker = L.marker([lat, lng], { icon: markerIcon }).addTo(vehicleMap);
    
    // Popup content
    const popupContent = `
      <div class="map-popup">
        <p class="map-popup-title">${vehicle.vehicleId}</p>
        <div class="map-popup-item">
          <span>Fuel</span>
          <span>${fuel}%</span>
        </div>
        <div class="map-popup-item">
          <span>Status</span>
          <span style="color: ${markerColor}; font-weight: 600;">${status}</span>
        </div>
        <div class="map-popup-item">
          <span>Driver</span>
          <span>${vehicle.driverName || 'N/A'}</span>
        </div>
      </div>
    `;
    
    marker.bindPopup(popupContent);
    mapMarkers.push(marker);
  });
  
  // Fit bounds if we have markers
  if (mapMarkers.length > 0) {
    const group = L.featureGroup(mapMarkers);
    vehicleMap.fitBounds(group.getBounds().pad(0.1));
  }
}

// ============================================
// FUEL TREND CHART
// ============================================

/**
 * Initialize or update fuel trend chart
 */
function updateFuelTrendChart(vehicles) {
  const ctx = document.getElementById('fuelTrendChart');
  if (!ctx) return;
  
  // Generate mock historical data for the trend
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const currentAvg = vehicles.length > 0 
    ? vehicles.reduce((sum, v) => sum + (v.lastTelemetry?.fuelLevel || 0), 0) / vehicles.length
    : 50;
  
  // Generate realistic trend data
  const data = labels.map((_, i) => {
    const variance = (Math.random() - 0.5) * 20;
    return Math.max(0, Math.min(100, currentAvg + variance - (6 - i) * 3));
  });
  
  if (fuelTrendChart) {
    fuelTrendChart.data.datasets[0].data = data;
    fuelTrendChart.update('none');
  } else {
    fuelTrendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Average Fuel %',
          data: data,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#2563eb',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: '#1a1a2e',
            titleColor: '#ffffff',
            bodyColor: '#94a3b8',
            borderColor: '#e2e8f0',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              label: function(context) {
                return `Fuel: ${Math.round(context.raw)}%`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            grid: {
              color: '#f1f5f9',
              drawBorder: false
            },
            ticks: {
              color: '#94a3b8',
              padding: 10,
              callback: function(value) {
                return value + '%';
              }
            }
          },
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: '#94a3b8',
              padding: 10
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    });
  }
}

// ============================================
// ALERTS
// ============================================

/**
 * Update alerts list
 */
function updateAlertsList(alerts) {
  const alertsList = document.getElementById('alertsList');
  if (!alertsList) return;
  
  if (!alerts || alerts.length === 0) {
    alertsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <p class="empty-title">No Active Alerts</p>
        <p class="empty-description">All systems operating normally</p>
      </div>
    `;
    return;
  }
  
  const alertsHTML = alerts.flatMap(alert => {
    const time = new Date(alert.timestamp * 1000).toLocaleString();
    
    return alert.alertFlags.map(flag => {
      let alertClass, icon, description;
      
      switch (flag) {
        case 'FUEL_THEFT':
          alertClass = 'critical';
          icon = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>`;
          description = 'Possible fuel theft detected';
          break;
        case 'IDLE_WASTE':
          alertClass = 'warning';
          icon = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>`;
          description = 'Engine idling - fuel waste';
          break;
        case 'LOW_EFFICIENCY':
          alertClass = 'warning';
          icon = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"></path>`;
          description = 'Below baseline efficiency';
          break;
        case 'LOW_FUEL':
          alertClass = 'critical';
          icon = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"></path>`;
          description = 'Low fuel warning';
          break;
        default:
          alertClass = 'info';
          icon = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>`;
          description = flag;
      }
      
      return `
        <div class="alert-item ${alertClass}" onclick="viewVehicle('${alert.vehicleId}')">
          <div class="alert-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              ${icon}
            </svg>
          </div>
          <div class="alert-content">
            <div class="alert-header">
              <span class="alert-title">${flag.replace(/_/g, ' ')}</span>
              <span class="alert-vehicle">${alert.vehicleId}</span>
            </div>
            <p class="alert-description">${description}</p>
            <p class="alert-time">${time}</p>
          </div>
        </div>
      `;
    });
  }).join('');
  
  alertsList.innerHTML = alertsHTML;
}

/**
 * Update alert badges in sidebar and navbar
 */
function updateAlertBadges(alerts) {
  const totalAlerts = alerts.reduce((sum, a) => sum + a.alertFlags.length, 0);
  
  const sidebarBadge = document.getElementById('sidebarAlertCount');
  const notificationBadge = document.getElementById('notificationBadge');
  
  if (sidebarBadge) {
    sidebarBadge.textContent = totalAlerts;
    sidebarBadge.style.display = totalAlerts > 0 ? 'inline-flex' : 'none';
  }
  
  if (notificationBadge) {
    notificationBadge.textContent = totalAlerts;
    notificationBadge.style.display = totalAlerts > 0 ? 'flex' : 'none';
  }
}

// ============================================
// NAVIGATION
// ============================================

/**
 * Navigate to vehicle detail page
 */
function viewVehicle(vehicleId) {
  window.location.href = `/vehicle/${vehicleId}`;
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  
  const icons = {
    success: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>',
    error: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>',
    warning: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>',
    info: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>'
  };
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      ${icons[type] || icons.info}
    </svg>
    <span class="toast-message">${message}</span>
  `;
  
  container.appendChild(toast);
  
  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });
  
  // Remove toast after duration
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, CONFIG.TOAST_DURATION);
}

// ============================================
// DATA REFRESH
// ============================================

/**
 * Refresh all dashboard data
 */
async function refreshData() {
  await Promise.all([
    fetchVehicles(),
    fetchAlerts()
  ]);
}

/**
 * Start auto-refresh interval
 */
function startAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  
  refreshInterval = setInterval(refreshData, CONFIG.REFRESH_INTERVAL);
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize dashboard
 */
async function init() {
  console.log('🚀 FleetCommand Dashboard Initializing...');
  
  // Initialize map
  initializeMap();
  
  // Initial data fetch
  await refreshData();
  
  // Start auto-refresh
  startAutoRefresh();
  
  console.log('✅ Dashboard ready');
  showToast('Dashboard initialized successfully', 'success');
}

// Start dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Expose functions globally for HTML onclick handlers
window.viewVehicle = viewVehicle;
window.showToast = showToast;
