/**
 * Fleet Optimizer - Alerts Page JavaScript
 */

let allAlerts = [];
let filteredAlerts = [];

document.addEventListener('DOMContentLoaded', () => {
  loadAlerts();
  setInterval(loadAlerts, 30000);
});

async function loadAlerts() {
  try {
    const response = await fetch('/api/vehicles');
    const vehicles = await response.json();
    
    allAlerts = [];
    
    // Fetch alerts for each vehicle
    for (const vehicle of vehicles) {
      const alertResponse = await fetch(`/api/vehicles/${vehicle.vehicle_id}/alerts`);
      const vehicleAlerts = await alertResponse.json();
      
      vehicleAlerts.forEach(alert => {
        alert.vehicle_id = vehicle.vehicle_id;
        alert.driver_name = vehicle.driver_name;
      });
      
      allAlerts.push(...vehicleAlerts);
    }
    
    // Sort by date descending
    allAlerts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    updateStats();
    filterAlerts();
  } catch (error) {
    console.error('Error loading alerts:', error);
  }
}

function updateStats() {
  const total = allAlerts.length;
  const unresolved = allAlerts.filter(a => !a.resolved).length;
  const critical = allAlerts.filter(a => a.severity === 'critical').length;
  const resolved = allAlerts.filter(a => a.resolved).length;
  
  document.getElementById('totalAlerts').textContent = total;
  document.getElementById('unresolvedAlerts').textContent = unresolved;
  document.getElementById('criticalAlerts').textContent = critical;
  document.getElementById('resolvedAlerts').textContent = resolved;
}

function filterAlerts() {
  const filter = document.getElementById('filterSelect').value;
  
  switch (filter) {
    case 'unresolved':
      filteredAlerts = allAlerts.filter(a => !a.resolved);
      break;
    case 'critical':
      filteredAlerts = allAlerts.filter(a => a.severity === 'critical');
      break;
    case 'warning':
      filteredAlerts = allAlerts.filter(a => a.severity === 'warning');
      break;
    default:
      filteredAlerts = allAlerts;
  }
  
  renderAlerts();
}

function renderAlerts() {
  const container = document.getElementById('alertsList');
  
  if (filteredAlerts.length === 0) {
    container.innerHTML = `
      <div class="px-6 py-12 text-center">
        <div class="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
          <svg class="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <p class="text-gray-500 text-sm">No alerts found</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = filteredAlerts.map((alert, index) => `
    <div class="px-6 py-5 hover:bg-gray-50 transition-colors ${index === 0 ? 'border-t border-gray-100' : ''}">
      <div class="flex items-start justify-between gap-4">
        <div class="flex items-start gap-4 flex-1 min-w-0">
          <!-- Severity Icon -->
          <div class="flex-shrink-0 mt-0.5">
            <div class="w-10 h-10 rounded-xl ${getSeverityIconClass(alert.severity)} flex items-center justify-center">
              ${getSeverityIcon(alert.severity)}
            </div>
          </div>
          
          <!-- Alert Details -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h4 class="text-sm font-semibold text-gray-900">${formatAlertType(alert.alert_type)}</h4>
              <span class="px-2.5 py-1 rounded text-xs font-medium ${getSeverityBadgeClass(alert.severity)}">
                ${alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)}
              </span>
              ${alert.resolved ? `<span class="px-2.5 py-1 rounded text-xs font-medium bg-emerald-100 text-emerald-700">Resolved</span>` : ''}
            </div>
            
            <p class="text-sm text-gray-600 mt-1">${alert.message}</p>
            
            <div class="mt-2 flex items-center gap-4 text-xs text-gray-500">
              <a href="/vehicle/${alert.vehicle_id}" class="text-brand-600 hover:text-brand-700 font-medium">
                ${alert.vehicle_id}
              </a>
              <span>Driver: ${alert.driver_name}</span>
              <span>${formatDate(alert.created_at)}</span>
            </div>
          </div>
        </div>
        
        <!-- Action Button -->
        ${!alert.resolved ? `
          <button onclick="resolveAlert(${alert.id})" class="flex-shrink-0 px-4 py-2 text-xs font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors whitespace-nowrap">
            Resolve
          </button>
        ` : ''}
      </div>
    </div>
  `).join('');
}

async function resolveAlert(alertId) {
  try {
    const response = await fetch(`/api/alerts/${alertId}/resolve`, {
      method: 'PUT'
    });
    
    if (!response.ok) throw new Error('Failed to resolve alert');
    
    loadAlerts();
  } catch (error) {
    console.error('Error resolving alert:', error);
  }
}

function getSeverityIconClass(severity) {
  const classes = {
    'critical': 'bg-red-100',
    'warning': 'bg-amber-100',
    'info': 'bg-blue-100'
  };
  return classes[severity] || classes['info'];
}

function getSeverityIcon(severity) {
  const icons = {
    'critical': `<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4v2m0 4v2M9 6a3 3 0 11 6 0M9 18a3 3 0 116 0z"></path>
    </svg>`,
    'warning': `<svg class="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>`,
    'info': `<svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>`
  };
  return icons[severity] || icons['info'];
}

function getSeverityBadgeClass(severity) {
  const classes = {
    'critical': 'bg-red-100 text-red-700',
    'warning': 'bg-amber-100 text-amber-700',
    'info': 'bg-blue-100 text-blue-700'
  };
  return classes[severity] || classes['info'];
}

function formatAlertType(type) {
  return type.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}
