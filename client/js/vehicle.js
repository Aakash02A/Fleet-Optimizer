/**
 * Fleet Optimizer - Vehicle Detail Page
 * Shows detailed telemetry, charts, and alerts for a specific vehicle
 */

// ============ CONFIGURATION ============

const CONFIG = {
  API_BASE: '/api',
  REFRESH_INTERVAL: 5000
};

// ============ STATE ============

let vehicle = null;
let telemetryHistory = [];
let alertHistory = [];
let map = null;
let marker = null;
let routeLine = null;
let fuelHistoryChart = null;
let efficiencyChart = null;
let speedChart = null;
let refreshInterval = null;

// ============ UTILITY FUNCTIONS ============

/**
 * Get vehicle ID from URL path
 */
function getVehicleIdFromUrl() {
  const path = window.location.pathname;
  const match = path.match(/\/vehicle\/([^\/]+)/);
  return match ? match[1].toUpperCase() : null;
}

/**
 * Format timestamp to readable date
 */
function formatTime(timestamp) {
  return new Date(timestamp * 1000).toLocaleString();
}

/**
 * Format time for chart labels
 */
function formatChartTime(timestamp) {
  return new Date(timestamp * 1000).toLocaleTimeString();
}

// ============ API FUNCTIONS ============

/**
 * Fetch vehicle details and telemetry
 */
async function fetchVehicleData() {
  const vehicleId = getVehicleIdFromUrl();
  
  if (!vehicleId) {
    showToast('Invalid vehicle ID', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${CONFIG.API_BASE}/vehicles/${vehicleId}`);
    const data = await response.json();
    
    if (data.success) {
      vehicle = data.data.vehicle;
      telemetryHistory = data.data.telemetryHistory;
      alertHistory = data.data.alertHistory;
      
      updateVehicleInfo(vehicle);
      updateCharts(telemetryHistory);
      updateMap(vehicle, telemetryHistory);
      updateAlertHistory(alertHistory);
    } else {
      showToast('Failed to load vehicle data', 'error');
    }
  } catch (error) {
    console.error('Error fetching vehicle:', error);
    showToast('Error loading vehicle data', 'error');
  }
}

// ============ UI UPDATE FUNCTIONS ============

/**
 * Update vehicle information display
 */
function updateVehicleInfo(vehicle) {
  const telemetry = vehicle.lastTelemetry || {};
  
  // Navigation and header
  document.getElementById('vehicleIdNav').textContent = vehicle.vehicleId;
  document.getElementById('vehicleId').textContent = vehicle.vehicleId;
  document.getElementById('driverName').textContent = `Driver: ${vehicle.driverName}`;
  document.title = `Fleet Optimizer - ${vehicle.vehicleId}`;
  
  // Status badge
  const statusBadge = document.getElementById('statusBadge');
  let statusText, statusClass;
  
  if (vehicle.activeAlerts > 0) {
    statusText = 'Alert';
    statusClass = 'bg-red-500/20 text-red-400';
  } else if (telemetry.speed > 0 && telemetry.engineStatus === 1) {
    statusText = 'Moving';
    statusClass = 'bg-green-500/20 text-green-400';
  } else if (telemetry.engineStatus === 1) {
    statusText = 'Idle';
    statusClass = 'bg-yellow-500/20 text-yellow-400';
  } else {
    statusText = 'Stopped';
    statusClass = 'bg-gray-500/20 text-gray-400';
  }
  
  statusBadge.textContent = statusText;
  statusBadge.className = `px-4 py-2 rounded-lg ${statusClass}`;
  
  // Vehicle type
  document.getElementById('vehicleType').textContent = vehicle.vehicleType || 'TRUCK';
  
  // Stats cards
  const fuel = telemetry.fuelLevel || 0;
  document.getElementById('currentFuel').textContent = fuel;
  document.getElementById('currentFuel').className = `text-3xl font-bold ${fuel < 15 ? 'text-red-400' : fuel < 30 ? 'text-yellow-400' : 'text-green-400'}`;
  
  const fuelBar = document.getElementById('fuelBar');
  fuelBar.style.width = `${fuel}%`;
  fuelBar.className = `h-2 rounded-full transition-all ${fuel < 15 ? 'bg-red-500' : fuel < 30 ? 'bg-yellow-500' : 'bg-green-500'}`;
  
  document.getElementById('currentSpeed').textContent = telemetry.speed || 0;
  document.getElementById('engineStatus').textContent = `Engine: ${telemetry.engineStatus === 1 ? 'On' : 'Off'}`;
  document.getElementById('engineStatus').className = `text-sm mt-3 ${telemetry.engineStatus === 1 ? 'text-green-400' : 'text-gray-500'}`;
  
  document.getElementById('baselineEfficiency').textContent = vehicle.baselineEfficiency || 0;
  document.getElementById('tankCapacity').textContent = `Tank: ${vehicle.tankCapacity || 100}L`;
  
  document.getElementById('alertCount').textContent = vehicle.activeAlerts || 0;
  document.getElementById('lastUpdate').textContent = `Last update: ${formatTime(telemetry.timestamp)}`;
  
  // Coordinates
  document.getElementById('latitude').textContent = telemetry.latitude?.toFixed(6) || '--';
  document.getElementById('longitude').textContent = telemetry.longitude?.toFixed(6) || '--';
}

/**
 * Initialize or update the map
 */
function updateMap(vehicle, history) {
  const telemetry = vehicle.lastTelemetry || {};
  const lat = telemetry.latitude || 12.9716;
  const lng = telemetry.longitude || 77.5946;
  
  if (!map) {
    // Initialize map
    map = L.map('map').setView([lat, lng], 14);
    
    // Dark theme tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);
    
    // Custom marker icon
    const vehicleIcon = L.divIcon({
      className: 'custom-marker',
      html: `
        <div class="w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-lg border-2 border-white">
          <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
          </svg>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
    
    marker = L.marker([lat, lng], { icon: vehicleIcon }).addTo(map);
    marker.bindPopup(`<b>${vehicle.vehicleId}</b><br>Fuel: ${telemetry.fuelLevel}%`);
  } else {
    // Update marker position
    marker.setLatLng([lat, lng]);
    marker.setPopupContent(`<b>${vehicle.vehicleId}</b><br>Fuel: ${telemetry.fuelLevel}%`);
    map.setView([lat, lng]);
  }
  
  // Draw route trail if we have history
  if (history.length > 1) {
    const routePoints = history
      .filter(t => t.latitude && t.longitude)
      .map(t => [t.latitude, t.longitude]);
    
    if (routeLine) {
      map.removeLayer(routeLine);
    }
    
    if (routePoints.length > 1) {
      routeLine = L.polyline(routePoints, {
        color: '#3B82F6',
        weight: 3,
        opacity: 0.7,
        smoothFactor: 1
      }).addTo(map);
    }
  }
}

/**
 * Update all charts with telemetry history
 */
function updateCharts(history) {
  if (!history || history.length === 0) return;
  
  const labels = history.map(t => formatChartTime(t.timestamp));
  
  // Chart options for dark theme
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1E293B',
        titleColor: '#fff',
        bodyColor: '#94A3B8',
        borderColor: '#475569',
        borderWidth: 1,
        padding: 10
      }
    },
    scales: {
      y: {
        grid: { color: '#374151', drawBorder: false },
        ticks: { color: '#9CA3AF', padding: 10 }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#9CA3AF', padding: 10, maxTicksLimit: 8 }
      }
    },
    elements: {
      line: { tension: 0.4 },
      point: { radius: 2, hoverRadius: 5 }
    }
  };
  
  // Fuel History Chart
  const fuelData = history.map(t => t.fuelLevel);
  const fuelCtx = document.getElementById('fuelHistoryChart').getContext('2d');
  
  if (fuelHistoryChart) {
    fuelHistoryChart.data.labels = labels;
    fuelHistoryChart.data.datasets[0].data = fuelData;
    fuelHistoryChart.update('none');
  } else {
    fuelHistoryChart = new Chart(fuelCtx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Fuel Level (%)',
          data: fuelData,
          borderColor: '#10B981',
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
            max: 100,
            ticks: {
              ...chartOptions.scales.y.ticks,
              callback: value => value + '%'
            }
          }
        }
      }
    });
  }
  
  // Efficiency Chart
  const efficiencyData = history.map(t => t.calculatedEfficiency || 0);
  const effCtx = document.getElementById('efficiencyChart').getContext('2d');
  
  if (efficiencyChart) {
    efficiencyChart.data.labels = labels;
    efficiencyChart.data.datasets[0].data = efficiencyData;
    efficiencyChart.update('none');
  } else {
    efficiencyChart = new Chart(effCtx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Efficiency (km/L)',
          data: efficiencyData,
          borderColor: '#F59E0B',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
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
            ticks: {
              ...chartOptions.scales.y.ticks,
              callback: value => value.toFixed(1) + ' km/L'
            }
          }
        }
      }
    });
  }
  
  // Speed Chart
  const speedData = history.map(t => t.speed);
  const speedCtx = document.getElementById('speedChart').getContext('2d');
  
  if (speedChart) {
    speedChart.data.labels = labels;
    speedChart.data.datasets[0].data = speedData;
    speedChart.update('none');
  } else {
    speedChart = new Chart(speedCtx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Speed (km/h)',
          data: speedData,
          borderColor: '#A855F7',
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
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
            ticks: {
              ...chartOptions.scales.y.ticks,
              callback: value => value + ' km/h'
            }
          }
        }
      }
    });
  }
}

/**
 * Update alert history display
 */
function updateAlertHistory(alerts) {
  const container = document.getElementById('alertHistory');
  
  if (!alerts || alerts.length === 0) {
    container.innerHTML = `
      <div class="text-center text-gray-500 py-8">
        <svg class="w-12 h-12 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span>No alerts recorded for this vehicle</span>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="text-left text-xs text-gray-400 uppercase">
            <th class="pb-3 pr-4">Alert Type</th>
            <th class="pb-3 pr-4">Fuel Level</th>
            <th class="pb-3 pr-4">Speed</th>
            <th class="pb-3 pr-4">Fuel Waste</th>
            <th class="pb-3">Timestamp</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-700">
          ${alerts.map(alert => alert.alertFlags.map(flag => {
            let flagColor, flagBg;
            switch (flag) {
              case 'FUEL_THEFT':
                flagColor = 'text-red-400';
                flagBg = 'bg-red-500/20';
                break;
              case 'IDLE_WASTE':
                flagColor = 'text-yellow-400';
                flagBg = 'bg-yellow-500/20';
                break;
              case 'LOW_EFFICIENCY':
                flagColor = 'text-orange-400';
                flagBg = 'bg-orange-500/20';
                break;
              case 'LOW_FUEL':
                flagColor = 'text-purple-400';
                flagBg = 'bg-purple-500/20';
                break;
              default:
                flagColor = 'text-gray-400';
                flagBg = 'bg-gray-500/20';
            }
            
            return `
              <tr class="hover:bg-dark-200">
                <td class="py-3 pr-4">
                  <span class="px-2 py-1 rounded text-xs font-medium ${flagColor} ${flagBg}">
                    ${flag.replace(/_/g, ' ')}
                  </span>
                </td>
                <td class="py-3 pr-4 text-white">${alert.fuelLevel}%</td>
                <td class="py-3 pr-4 text-white">${alert.speed} km/h</td>
                <td class="py-3 pr-4 text-red-400">${(alert.fuelWasted || 0).toFixed(2)}%</td>
                <td class="py-3 text-gray-400 text-sm">${formatTime(alert.timestamp)}</td>
              </tr>
            `;
          }).join('')).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ============ TOAST NOTIFICATIONS ============

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  
  const colors = {
    success: 'bg-green-600 border-green-500',
    error: 'bg-red-600 border-red-500',
    warning: 'bg-yellow-600 border-yellow-500',
    info: 'bg-blue-600 border-blue-500'
  };
  
  const icons = {
    success: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>',
    error: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>',
    warning: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>',
    info: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>'
  };
  
  const toast = document.createElement('div');
  toast.className = `${colors[type]} border-l-4 text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3 transform translate-x-full transition-transform duration-300`;
  toast.innerHTML = `
    <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      ${icons[type]}
    </svg>
    <span class="text-sm font-medium">${message}</span>
  `;
  
  container.appendChild(toast);
  
  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.remove('translate-x-full');
  });
  
  // Remove toast after duration
  setTimeout(() => {
    toast.classList.add('translate-x-full');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ============ DATA REFRESH ============

/**
 * Start auto-refresh interval
 */
function startAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  
  refreshInterval = setInterval(fetchVehicleData, CONFIG.REFRESH_INTERVAL);
}

// ============ INITIALIZATION ============

/**
 * Initialize vehicle detail page
 */
async function init() {
  const vehicleId = getVehicleIdFromUrl();
  
  if (!vehicleId) {
    showToast('No vehicle ID specified', 'error');
    setTimeout(() => window.location.href = '/', 2000);
    return;
  }
  
  console.log(`🚛 Loading vehicle: ${vehicleId}`);
  
  // Initial data fetch
  await fetchVehicleData();
  
  // Start auto-refresh
  startAutoRefresh();
  
  console.log('✅ Vehicle detail page ready');
}

// Start when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
