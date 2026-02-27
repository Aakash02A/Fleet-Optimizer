/**
 * FleetPulse Fleet Module
 * Fleet overview and vehicle table management
 */

import { CONFIG } from '../config.js';
import { State, getAllVehicles } from '../state.js';
import { DOM } from '../dom.js';

// Vehicle types for sample data enhancement
const vehicleTypes = ['Sedan', 'SUV', 'Truck', 'Van'];
const locations = ['Downtown', 'Warehouse A', 'Route 45', 'Central Hub'];

// Current filter state
let currentFilter = 'all';
let currentSort = { field: 'id', order: 'asc' };

/**
 * Calculate estimated range based on fuel and efficiency
 */
function calculateRange(fuel, efficiency, tankCapacity = 70) {
    const fuelAmount = (fuel / 100) * tankCapacity;
    return Math.round(fuelAmount * efficiency);
}

/**
 * Generate random speed for moving vehicles
 */
function getVehicleSpeed(status) {
    if (status === 'idle') return 0;
    return Math.floor(Math.random() * 60) + 20; // 20-80 km/h
}

/**
 * Get time since last update
 */
function getLastUpdate() {
    const minutes = Math.floor(Math.random() * 30);
    return minutes === 0 ? 'Just now' : `${minutes}m ago`;
}

/**
 * Render fleet table with optional filter
 */
function renderFleetTable(searchFilter = '', statusFilter = 'all') {
    const vehicles = getAllVehicles();
    
    // Apply status filter
    let filtered = vehicles;
    if (statusFilter !== 'all') {
        filtered = vehicles.filter(v => v.status === statusFilter);
    }
    
    // Apply search filter
    if (searchFilter) {
        filtered = filtered.filter(v => 
            v.id.toLowerCase().includes(searchFilter.toLowerCase()) ||
            v.name.toLowerCase().includes(searchFilter.toLowerCase())
        );
    }
    
    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
        let valA, valB;
        switch(currentSort.field) {
            case 'id': valA = a.id; valB = b.id; break;
            case 'fuel': valA = a.fuel; valB = b.fuel; break;
            case 'efficiency': valA = a.efficiency; valB = b.efficiency; break;
            default: valA = a.id; valB = b.id;
        }
        if (currentSort.order === 'asc') {
            return valA > valB ? 1 : -1;
        }
        return valA < valB ? 1 : -1;
    });
    
    // Update stats
    const allVehicles = vehicles;
    const normalCount = allVehicles.filter(v => v.status === 'normal').length;
    const warningCount = allVehicles.filter(v => v.status === 'warning').length;
    const dangerCount = allVehicles.filter(v => v.status === 'danger').length;
    const avgEff = allVehicles.reduce((sum, v) => sum + v.efficiency, 0) / allVehicles.length;
    const totalCapacity = allVehicles.length * 70; // Assume 70L tank
    const activeCount = allVehicles.filter(v => v.status !== 'idle').length;
    
    // Update stat elements (with null checks)
    if (DOM.totalVehicles) DOM.totalVehicles.textContent = allVehicles.length;
    if (DOM.normalVehicles) DOM.normalVehicles.textContent = normalCount;
    if (DOM.alertVehicles) DOM.alertVehicles.textContent = warningCount + dangerCount;
    if (DOM.avgEfficiency) DOM.avgEfficiency.textContent = avgEff.toFixed(1);
    
    // Update extended stats
    const activeEl = document.getElementById('activeVehicles');
    const capacityEl = document.getElementById('totalFuelCapacity');
    if (activeEl) activeEl.textContent = activeCount || allVehicles.length;
    if (capacityEl) capacityEl.textContent = totalCapacity;
    
    // Update filter counts
    const filterAllCount = document.getElementById('filterAllCount');
    const filterNormalCount = document.getElementById('filterNormalCount');
    const filterWarningCount = document.getElementById('filterWarningCount');
    const filterDangerCount = document.getElementById('filterDangerCount');
    const showingCount = document.getElementById('showingCount');
    
    if (filterAllCount) filterAllCount.textContent = allVehicles.length;
    if (filterNormalCount) filterNormalCount.textContent = normalCount;
    if (filterWarningCount) filterWarningCount.textContent = warningCount;
    if (filterDangerCount) filterDangerCount.textContent = dangerCount;
    if (showingCount) showingCount.textContent = `Showing ${filtered.length} of ${allVehicles.length} vehicles`;
    
    // Render table with enhanced columns
    if (DOM.fleetTableBody) {
        DOM.fleetTableBody.innerHTML = filtered.map((vehicle, idx) => {
            const fuelClass = vehicle.fuel <= CONFIG.thresholds.criticalFuel ? 'critical' :
                             vehicle.fuel <= CONFIG.thresholds.lowFuel ? 'low' : '';
            const statusClass = vehicle.status === 'normal' ? 'normal' : 
                               vehicle.status === 'warning' ? 'warning' : 'danger';
            const vType = vehicleTypes[idx % vehicleTypes.length];
            const range = calculateRange(vehicle.fuel, vehicle.efficiency);
            const speed = getVehicleSpeed(vehicle.status);
            const lastUpdate = getLastUpdate();
            const location = locations[idx % locations.length];
            
            return `
                <tr data-id="${vehicle.id}">
                    <td class="vehicle-id-cell">${vehicle.id}</td>
                    <td>${vehicle.name}</td>
                    <td><span class="vehicle-type-badge">${vType}</span></td>
                    <td>
                        <div class="fuel-cell">
                            <div class="fuel-bar-mini">
                                <div class="fuel-bar-mini-fill ${fuelClass}" style="width: ${vehicle.fuel}%;"></div>
                            </div>
                            <span>${vehicle.fuel.toFixed(1)}%</span>
                        </div>
                    </td>
                    <td><span class="range-value">${range} km</span></td>
                    <td>${vehicle.efficiency.toFixed(1)} km/L</td>
                    <td><span class="speed-value">${speed} km/h</span></td>
                    <td>
                        <span class="status-badge ${statusClass}">
                            <span class="status-dot"></span>
                            ${vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1)}
                        </span>
                    </td>
                    <td><span class="location-text">${location}</span></td>
                    <td><span class="last-update">${lastUpdate}</span></td>
                    <td>
                        <div class="action-btns">
                            <button class="action-btn-icon" title="View Details" onclick="window.FleetApp.viewVehicle('${vehicle.id}')">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                    <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" stroke="currentColor" stroke-width="2"/>
                                    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </button>
                            <button class="action-btn-icon" title="Track Location" onclick="window.FleetApp.trackVehicle('${vehicle.id}')">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" stroke-width="2"/>
                                    <circle cx="12" cy="9" r="2" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </button>
                            <button class="action-btn-icon" title="Edit Vehicle" onclick="window.FleetApp.editVehicle('${vehicle.id}')">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                    <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    // Update fleet map markers
    renderFleetMarkers(filtered);
}

/**
 * Render fleet markers on the map
 */
function renderFleetMarkers(vehicles) {
    const markersContainer = document.getElementById('fleetMarkers');
    if (!markersContainer) return;
    
    markersContainer.innerHTML = vehicles.map((vehicle, idx) => {
        const statusClass = vehicle.status === 'normal' ? '' : 
                           vehicle.status === 'warning' ? 'warning' : 'danger';
        // Position markers in a grid pattern for visualization
        const row = Math.floor(idx / 2);
        const col = idx % 2;
        const top = 20 + (row * 35);
        const left = 25 + (col * 50);
        
        return `
            <div class="fleet-marker ${statusClass}" 
                 style="top: ${top}%; left: ${left}%;"
                 title="${vehicle.name} - ${vehicle.fuel.toFixed(1)}% fuel">
                ${idx + 1}
            </div>
        `;
    }).join('');
}

/**
 * Initialize fleet module event listeners
 */
function initFleetModule() {
    // Search input
    const searchInput = document.getElementById('fleetSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderFleetTable(e.target.value, currentFilter);
        });
    }
    
    // Filter chips
    const filterChips = document.querySelectorAll('.filter-chip');
    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            // Remove active from all chips
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            
            currentFilter = chip.dataset.filter || 'all';
            const searchValue = searchInput ? searchInput.value : '';
            renderFleetTable(searchValue, currentFilter);
        });
    });
    
    // Sort headers
    const sortHeaders = document.querySelectorAll('.fleet-table th.sortable');
    sortHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const field = header.dataset.sort;
            if (currentSort.field === field) {
                currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.field = field;
                currentSort.order = 'asc';
            }
            
            // Update header classes
            sortHeaders.forEach(h => {
                h.classList.remove('asc', 'desc');
            });
            header.classList.add(currentSort.order);
            
            const searchValue = searchInput ? searchInput.value : '';
            renderFleetTable(searchValue, currentFilter);
        });
    });
    
    // Export button
    const exportBtn = document.getElementById('btnExportFleet');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportFleetData);
    }
    
    // Add vehicle button
    const addBtn = document.getElementById('btnAddVehicle');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            alert('Add Vehicle modal would open here');
        });
    }
}

/**
 * Export fleet data to CSV
 */
function exportFleetData() {
    const vehicles = getAllVehicles();
    const headers = ['ID', 'Name', 'Fuel Level', 'Efficiency', 'Status', 'Location'];
    const rows = vehicles.map(v => [
        v.id,
        v.name,
        `${v.fuel.toFixed(1)}%`,
        `${v.efficiency.toFixed(1)} km/L`,
        v.status,
        `${v.lat.toFixed(4)}, ${v.lon.toFixed(4)}`
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fleet-data-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

export { renderFleetTable, initFleetModule, exportFleetData };
