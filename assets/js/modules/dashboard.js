/**
 * FleetPulse Dashboard Module
 * Main dashboard view and KPI updates
 */

import { CONFIG } from '../config.js';
import { State, getAllVehicles } from '../state.js';
import { DOM } from '../dom.js';
import { updateDashboardAlerts } from './alerts.js';

// Leaflet map instance and marker
let dashboardMap = null;
let vehicleMarker = null;

/**
 * Initialize the Leaflet map for dashboard
 */
function initDashboardMap() {
    const mapElement = document.getElementById('dashboardMap');
    if (!mapElement || dashboardMap) return;
    
    // Initialize map centered on Chennai, India (default location)
    dashboardMap = L.map('dashboardMap', {
        zoomControl: true,
        attributionControl: true
    }).setView([13.0827, 80.2707], 13);
    
    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(dashboardMap);
    
    // Create custom vehicle icon
    const vehicleIcon = L.divIcon({
        className: 'vehicle-map-marker',
        html: `
            <div class="marker-wrapper">
                <div class="marker-pulse"></div>
                <div class="marker-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" fill="#10B981" stroke="#fff" stroke-width="2"/>
                        <path d="M8 12L11 15L16 9" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
            </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });
    
    // Add initial marker
    const vehicle = State.vehicles[State.selectedVehicle];
    if (vehicle) {
        vehicleMarker = L.marker([vehicle.lat, vehicle.lon], { icon: vehicleIcon })
            .addTo(dashboardMap)
            .bindPopup(`<strong>${vehicle.id}</strong><br>Fuel: ${vehicle.fuel.toFixed(1)}%<br>Speed: ${vehicle.speed.toFixed(0)} km/h`);
    }
    
    // Invalidate size after a short delay to ensure proper rendering
    setTimeout(() => {
        dashboardMap.invalidateSize();
    }, 100);
}

/**
 * Update the vehicle marker position on the map
 */
function updateMapMarker(vehicle) {
    if (!dashboardMap) {
        initDashboardMap();
        return;
    }
    
    const newLatLng = [vehicle.lat, vehicle.lon];
    
    // Update marker icon based on status
    const statusColor = vehicle.status === 'normal' ? '#10B981' : 
                       vehicle.status === 'warning' ? '#F59E0B' : '#EF4444';
    
    const vehicleIcon = L.divIcon({
        className: 'vehicle-map-marker',
        html: `
            <div class="marker-wrapper">
                <div class="marker-pulse" style="background: ${statusColor}40;"></div>
                <div class="marker-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" fill="${statusColor}" stroke="#fff" stroke-width="2"/>
                        <path d="M7 13L10 10L14 14L17 11" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
            </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });
    
    if (vehicleMarker) {
        vehicleMarker.setLatLng(newLatLng);
        vehicleMarker.setIcon(vehicleIcon);
        vehicleMarker.setPopupContent(`
            <strong>${vehicle.id}</strong><br>
            <span class="popup-label">Status:</span> ${vehicle.status}<br>
            <span class="popup-label">Fuel:</span> ${vehicle.fuel.toFixed(1)}%<br>
            <span class="popup-label">Speed:</span> ${vehicle.speed.toFixed(0)} km/h<br>
            <span class="popup-label">Heading:</span> ${vehicle.heading}
        `);
    } else {
        vehicleMarker = L.marker(newLatLng, { icon: vehicleIcon })
            .addTo(dashboardMap)
            .bindPopup(`<strong>${vehicle.id}</strong><br>Fuel: ${vehicle.fuel.toFixed(1)}%`);
    }
    
    // Smoothly pan to new location
    dashboardMap.panTo(newLatLng, { animate: true, duration: 0.5 });
}

/**
 * Update fuel chart with current data
 */
function updateChart() {
    const vehicle = State.vehicles[State.selectedVehicle];
    const data = vehicle.fuelHistory;
    
    DOM.chartArea.innerHTML = data.map((value) => `
        <div class="chart-bar" style="height: ${value}%;" data-value="${value.toFixed(1)}%"></div>
    `).join('');
    
    // Generate X-axis labels (hours)
    const now = new Date();
    DOM.chartXAxis.innerHTML = '';
    for (let i = 0; i < 24; i += 4) {
        const hour = new Date(now - (23 - i) * 3600000);
        const span = document.createElement('span');
        span.textContent = hour.getHours().toString().padStart(2, '0') + ':00';
        span.style.flex = '4';
        DOM.chartXAxis.appendChild(span);
    }
}

/**
 * Update quick stats bar
 */
function updateQuickStats() {
    const vehicles = getAllVehicles();
    const allVehicles = vehicles.length;
    
    // Calculate total distance and fuel used today (simulated)
    const todayDistance = Math.floor(Math.random() * 100) + 150; // 150-250 km
    const fuelUsed = Math.floor(todayDistance / 12); // Avg 12 km/L
    
    const fleetSizeEl = document.getElementById('dashFleetSize');
    const distanceEl = document.getElementById('dashTodayDistance');
    const fuelUsedEl = document.getElementById('dashFuelUsed');
    
    if (fleetSizeEl) fleetSizeEl.textContent = allVehicles + ' vehicles';
    if (distanceEl) distanceEl.textContent = todayDistance + ' km';
    if (fuelUsedEl) fuelUsedEl.textContent = fuelUsed + ' L';
}

/**
 * Update vehicle info card
 */
function updateVehicleInfo() {
    const vehicle = State.vehicles[State.selectedVehicle];
    if (!vehicle) return;
    
    // Vehicle info elements
    const infoVehicleId = document.getElementById('infoVehicleId');
    const infoVehicleType = document.getElementById('infoVehicleType');
    const infoFuelCapacity = document.getElementById('infoFuelCapacity');
    const infoDriver = document.getElementById('infoDriver');
    const infoLastService = document.getElementById('infoLastService');
    const infoMileage = document.getElementById('infoMileage');
    
    // Simulated data
    const types = ['Toyota Hilux', 'Ford Transit', 'Isuzu D-Max', 'Mitsubishi L300'];
    const drivers = ['John Smith', 'Mike Johnson', 'David Lee', 'Chris Brown'];
    const vehicleIndex = Object.keys(State.vehicles).indexOf(State.selectedVehicle);
    
    if (infoVehicleId) infoVehicleId.textContent = vehicle.id;
    if (infoVehicleType) infoVehicleType.textContent = types[vehicleIndex % types.length];
    if (infoFuelCapacity) infoFuelCapacity.textContent = '70 Liters';
    if (infoDriver) infoDriver.textContent = drivers[vehicleIndex % drivers.length];
    if (infoLastService) infoLastService.textContent = '15 days ago';
    if (infoMileage) infoMileage.textContent = (45000 + vehicleIndex * 12500).toLocaleString() + ' km';
}

/**
 * Update consumption analytics
 */
function updateConsumptionAnalytics() {
    const vehicle = State.vehicles[State.selectedVehicle];
    if (!vehicle) return;
    
    const avgConsumption = document.getElementById('avgConsumption');
    const todayConsumption = document.getElementById('todayConsumption');
    const weekConsumption = document.getElementById('weekConsumption');
    const fuelCost = document.getElementById('fuelCost');
    const efficiencyComparisonBar = document.getElementById('efficiencyComparisonBar');
    const efficiencyComparison = document.getElementById('efficiencyComparison');
    
    // Calculate consumption values
    const avgPerKm = (100 / vehicle.efficiency).toFixed(1); // L/100km
    const todayLiters = (Math.random() * 10 + 5).toFixed(1);
    const weekLiters = (Math.random() * 50 + 30).toFixed(1);
    const costPerLiter = 102; // Example fuel price in INR
    const totalCost = Math.round(parseFloat(weekLiters) * costPerLiter * 4); // Monthly estimate
    
    if (avgConsumption) avgConsumption.textContent = avgPerKm;
    if (todayConsumption) todayConsumption.textContent = todayLiters;
    if (weekConsumption) weekConsumption.textContent = weekLiters;
    if (fuelCost) fuelCost.textContent = '₹' + totalCost.toLocaleString();
    
    // Update efficiency comparison
    // Normalize efficiency to percentage (8-20 km/L range)
    const efficiencyPercent = Math.min(100, Math.max(0, ((vehicle.efficiency - 8) / 12) * 100));
    if (efficiencyComparisonBar) efficiencyComparisonBar.style.width = efficiencyPercent + '%';
    if (efficiencyComparison) {
        const diff = ((vehicle.efficiency - 13.5) / 13.5 * 100).toFixed(1);
        efficiencyComparison.textContent = (diff >= 0 ? '+' : '') + diff + '%';
        efficiencyComparison.className = 'comparison-badge ' + (diff >= 0 ? 'positive' : 'negative');
    }
}

/**
 * Update recent trips table
 */
function updateRecentTrips() {
    const tripsTableBody = document.getElementById('tripsTableBody');
    if (!tripsTableBody) return;
    
    const vehicle = State.vehicles[State.selectedVehicle];
    if (!vehicle) return;
    
    // Generate sample trips based on selected vehicle
    const sampleTrips = [
        { date: 'Today, 10:30 AM', origin: 'Warehouse A', dest: 'Downtown Hub', distance: 25, duration: '45 min', fuel: 2.1, efficiency: 11.9 },
        { date: 'Today, 8:15 AM', origin: 'Central Depot', dest: 'Warehouse A', distance: 18, duration: '32 min', fuel: 1.3, efficiency: 13.8 },
        { date: 'Yesterday, 4:45 PM', origin: 'Port Terminal', dest: 'Central Depot', distance: 35, duration: '55 min', fuel: 2.5, efficiency: 14.0 },
        { date: 'Yesterday, 1:20 PM', origin: 'Client Site B', dest: 'Port Terminal', distance: 42, duration: '1h 10min', fuel: 3.2, efficiency: 13.1 },
        { date: 'Yesterday, 9:00 AM', origin: 'Home Base', dest: 'Client Site B', distance: 28, duration: '48 min', fuel: 2.0, efficiency: 14.0 },
    ];
    
    tripsTableBody.innerHTML = sampleTrips.map(trip => {
        const effClass = trip.efficiency >= 13.5 ? 'good' : trip.efficiency >= 12 ? 'average' : 'poor';
        return `
            <tr>
                <td>${trip.date}</td>
                <td>
                    <div class="trip-route">
                        <span class="trip-origin">From: ${trip.origin}</span>
                        <span class="trip-destination">To: ${trip.dest}</span>
                    </div>
                </td>
                <td>${trip.distance} km</td>
                <td>${trip.duration}</td>
                <td>${trip.fuel} L</td>
                <td>
                    <span class="efficiency-badge ${effClass}">${trip.efficiency} km/L</span>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Update all dashboard elements
 */
function updateDashboard() {
    const vehicle = State.vehicles[State.selectedVehicle];
    if (!vehicle) return;
    
    // Remove skeleton loading
    document.querySelectorAll('.skeleton').forEach(el => el.classList.remove('skeleton'));
    
    // Update Fuel Level
    DOM.fuelValue.textContent = vehicle.fuel.toFixed(1);
    DOM.fuelProgress.style.width = vehicle.fuel + '%';
    
    // Color fuel progress based on level
    if (vehicle.fuel <= CONFIG.thresholds.criticalFuel) {
        DOM.fuelProgress.style.background = 'var(--danger-500)';
    } else if (vehicle.fuel <= CONFIG.thresholds.lowFuel) {
        DOM.fuelProgress.style.background = 'var(--warning-500)';
    } else {
        DOM.fuelProgress.style.background = 'linear-gradient(90deg, var(--warning-500), var(--success-500))';
    }
    
    // Update Efficiency
    DOM.efficiencyValue.textContent = vehicle.efficiency.toFixed(1);
    const efficiencyPosition = ((vehicle.efficiency - 8) / 12) * 100;
    DOM.efficiencyMarker.style.left = Math.min(100, Math.max(0, efficiencyPosition)) + '%';
    
    // Update Range
    DOM.rangeValue.textContent = vehicle.range;
    DOM.rangeFill.style.width = Math.min(100, (vehicle.range / 600) * 100) + '%';
    
    // Update Status
    const statusIndicator = DOM.statusDisplay.querySelector('.status-indicator');
    statusIndicator.className = 'status-indicator status-' + vehicle.status;
    DOM.statusText.textContent = vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1);
    DOM.engineStatus.textContent = vehicle.engineStatus;
    DOM.gpsStatus.textContent = vehicle.gpsStatus;
    DOM.statusUptime.textContent = 'System uptime: ' + vehicle.uptime;
    
    // Update Leaflet Map Marker
    updateMapMarker(vehicle);
    
    // Update Coordinates
    DOM.latValue.textContent = vehicle.lat.toFixed(6);
    DOM.lonValue.textContent = vehicle.lon.toFixed(6);
    DOM.speedValue.textContent = vehicle.speed.toFixed(0) + ' km/h';
    DOM.headingValue.textContent = vehicle.heading;
    
    // Update Last Updated
    DOM.lastUpdated.textContent = new Date().toLocaleTimeString();
    
    // Update Dashboard Alerts
    updateDashboardAlerts();
    
    // Update Chart
    updateChart();
    
    // Update extended dashboard sections
    updateQuickStats();
    updateVehicleInfo();
    updateConsumptionAnalytics();
    updateRecentTrips();
}

export { updateDashboard, updateChart, initDashboardMap };
