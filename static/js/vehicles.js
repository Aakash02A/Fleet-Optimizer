/**
 * Fleet Optimizer - Vehicles Page JavaScript
 */

let vehicles = [];

document.addEventListener('DOMContentLoaded', () => {
  loadData();
  setInterval(loadData, 30000);
});

async function loadData() {
  try {
    await loadVehicles();
  } catch (error) {
    showToast('Failed to load data', 'error');
  }
}

async function loadVehicles() {
  const response = await fetch('/api/vehicles');
  vehicles = await response.json();
  
  // Update stats
  const total = vehicles.length;
  const active = vehicles.filter(v => v.status === 'active').length;
  const idle = vehicles.filter(v => v.status === 'idle').length;
  const maintenance = vehicles.filter(v => v.status === 'maintenance').length;
  
  document.getElementById('totalVehicles').textContent = total;
  document.getElementById('activeCount').textContent = active;
  document.getElementById('idleCount').textContent = idle;
  document.getElementById('maintenanceCount').textContent = maintenance;
  
  renderVehicleTable();
}

function renderVehicleTable() {
  const tbody = document.getElementById('vehicleTable');
  
  if (vehicles.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="px-6 py-12 text-center text-gray-500">No vehicles found</td></tr>';
    return;
  }
  
  tbody.innerHTML = vehicles.map(v => `
    <tr class="hover:bg-gray-50 transition-colors">
      <td class="px-6 py-4">
        <a href="/vehicle/${v.vehicle_id}" class="font-semibold text-brand-600 hover:text-brand-700">${v.vehicle_id}</a>
      </td>
      <td class="px-6 py-4 text-gray-600">${v.driver_name}</td>
      <td class="px-6 py-4">
        <span class="px-2.5 py-1 rounded-lg text-xs font-medium ${getTypeClass(v.vehicle_type)}">
          ${v.vehicle_type}
        </span>
      </td>
      <td class="px-6 py-4">
        <span class="px-2.5 py-1 rounded-lg text-xs font-medium ${getStatusClass(v.status)}">
          ${v.status}
        </span>
      </td>
      <td class="px-6 py-4">
        <div class="flex items-center space-x-2">
          <div class="w-16 bg-gray-100 rounded-full h-1.5">
            <div class="h-1.5 rounded-full ${getFuelColor(v.current_fuel)}" style="width: ${v.current_fuel}%"></div>
          </div>
          <span class="text-xs text-gray-600">${v.current_fuel.toFixed(0)}%</span>
        </div>
      </td>
      <td class="px-6 py-4 text-gray-600">${v.current_speed.toFixed(0)} km/h</td>
      <td class="px-6 py-4 text-gray-600 text-sm">${v.latitude.toFixed(3)}, ${v.longitude.toFixed(3)}</td>
      <td class="px-6 py-4">
        <div class="flex items-center space-x-2">
          <a href="/vehicle/${v.vehicle_id}" class="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-brand-600 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
            </svg>
          </a>
          <button onclick="deleteVehicle('${v.vehicle_id}')" class="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function getStatusClass(status) {
  const classes = {
    'active': 'bg-emerald-50 text-emerald-700',
    'idle': 'bg-gray-100 text-gray-600',
    'maintenance': 'bg-amber-50 text-amber-700',
    'offline': 'bg-red-50 text-red-700'
  };
  return classes[status] || classes['idle'];
}

function getTypeClass(type) {
  const classes = {
    'truck': 'bg-blue-50 text-blue-700',
    'van': 'bg-purple-50 text-purple-700',
    'sedan': 'bg-brand-50 text-brand-700'
  };
  return classes[type] || classes['sedan'];
}

function getFuelColor(fuel) {
  if (fuel >= 60) return 'bg-emerald-500';
  if (fuel >= 30) return 'bg-amber-500';
  return 'bg-red-500';
}

function openAddModal() {
  document.getElementById('addModal').classList.remove('hidden');
}

function closeAddModal() {
  document.getElementById('addModal').classList.add('hidden');
  document.getElementById('addVehicleForm').reset();
}

async function addVehicle(e) {
  e.preventDefault();
  
  const data = {
    vehicle_id: document.getElementById('newVehicleId').value,
    driver_name: document.getElementById('newDriverName').value,
    vehicle_type: document.getElementById('newVehicleType').value,
    tank_capacity: parseInt(document.getElementById('newTankCapacity').value)
  };
  
  try {
    const response = await fetch('/api/vehicles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to add vehicle');
    }
    
    closeAddModal();
    showToast('Vehicle added successfully', 'success');
    loadData();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function deleteVehicle(vehicleId) {
  if (!confirm(`Are you sure you want to delete ${vehicleId}?`)) return;
  
  try {
    const response = await fetch(`/api/vehicles/${vehicleId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) throw new Error('Failed to delete vehicle');
    
    showToast('Vehicle deleted successfully', 'success');
    loadData();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

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
  
  requestAnimationFrame(() => {
    toast.classList.remove('translate-x-full');
  });
  
  setTimeout(() => {
    toast.classList.add('translate-x-full');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
