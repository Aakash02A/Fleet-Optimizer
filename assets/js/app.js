/**
 * FleetPulse - IoT Vehicle Fuel Monitoring Dashboard
 * Main Application Entry Point
 */

import { CONFIG, MODULE_TITLES } from './config.js';
import { State, initializeVehicleData } from './state.js';
import { DOM, cacheDOMElements } from './dom.js';
import { showToast } from './utils.js';
import { updateDashboard, initDashboardMap } from './modules/dashboard.js';
import { renderFleetTable, initFleetModule, initFleetMap } from './modules/fleet.js';
import { renderReports } from './modules/reports.js';
import { updateAlertBadge, renderAlertsCenter } from './modules/alerts.js';
import { initializeSettings, saveSettings, resetSettings, setRestartUpdateLoopCallback } from './modules/settings.js';
import { simulateVehicleData } from './simulation.js';
import { loadAllViews } from './viewLoader.js';
import { API, APIConfig } from './apiService.js';
import { initDataSync, syncVehicles, getSyncStatus } from './dataSync.js';

/**
 * Switch between modules
 */
function switchModule(module) {
    if (module === State.currentModule) return;
    
    State.currentModule = module;
    
    // Update navigation
    DOM.navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.module === module);
    });
    
    // Update module views
    DOM.moduleViews.forEach(view => {
        view.classList.toggle('active', view.id === module + 'Module');
    });
    
    // Update header
    const moduleInfo = MODULE_TITLES[module];
    DOM.pageTitle.textContent = moduleInfo.title;
    DOM.pageSubtitle.textContent = moduleInfo.subtitle;
    
    // Show/hide vehicle selector
    DOM.vehicleSelectorContainer.style.display = 
        (module === 'dashboard') ? 'flex' : 'none';
    
    // Module-specific updates
    if (module === 'dashboard') {
        setTimeout(() => initDashboardMap(), 100);
    } else if (module === 'fleet') {
        renderFleetTable();
        setTimeout(() => initFleetMap(), 100);
    } else if (module === 'reports') {
        renderReports();
    } else if (module === 'alerts') {
        renderAlertsCenter('all');
    }
}

/**
 * Start the update loop
 */
function startUpdateLoop() {
    State.updateIntervalId = setInterval(async () => {
        // Use backend sync if available, otherwise local simulation
        if (APIConfig.useBackend && APIConfig.backendAvailable) {
            await syncVehicles();
        } else {
            simulateVehicleData();
        }
        
        if (State.currentModule === 'dashboard') {
            updateDashboard();
        } else if (State.currentModule === 'fleet') {
            renderFleetTable(DOM.fleetSearch?.value || '');
        } else if (State.currentModule === 'reports') {
            renderReports();
        }
        
        updateAlertBadge();
    }, CONFIG.updateInterval);
}

/**
 * Restart the update loop with new interval
 */
function restartUpdateLoop() {
    if (State.updateIntervalId) {
        clearInterval(State.updateIntervalId);
    }
    startUpdateLoop();
}

/**
 * Populate vehicle selector dropdown dynamically
 */
function populateVehicleSelector() {
    const vehicles = Object.values(State.vehicles);
    if (vehicles.length === 0) return;
    
    DOM.vehicleSelect.innerHTML = vehicles.map(v => 
        `<option value="${v.id}">${v.id} - ${v.name}</option>`
    ).join('');
    
    // Ensure selected vehicle is valid
    if (!State.vehicles[State.selectedVehicle] && vehicles.length > 0) {
        State.selectedVehicle = vehicles[0].id;
    }
    DOM.vehicleSelect.value = State.selectedVehicle;
}

/**
 * Update connection status indicator
 */
function updateConnectionStatus(connected) {
    const statusEl = document.getElementById('connectionStatus');
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    
    if (!statusEl) return;
    
    if (connected) {
        statusEl.className = 'connection-status connected';
        statusText.textContent = 'Backend';
        statusEl.title = 'Connected to Python backend server';
    } else {
        statusEl.className = 'connection-status disconnected';
        statusText.textContent = 'Local';
        statusEl.title = 'Using local simulation (backend unavailable)';
    }
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Navigation
    DOM.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchModule(item.dataset.module);
        });
    });
    
    // Vehicle selector
    DOM.vehicleSelect.addEventListener('change', (e) => {
        State.selectedVehicle = e.target.value;
        updateDashboard();
    });
    
    // Refresh button
    DOM.refreshBtn.addEventListener('click', async () => {
        DOM.refreshBtn.classList.add('spinning');
        
        // Use backend sync if available, otherwise local simulation
        if (APIConfig.useBackend && APIConfig.backendAvailable) {
            await syncVehicles();
        } else {
            simulateVehicleData();
        }
        
        updateDashboard();
        setTimeout(() => DOM.refreshBtn.classList.remove('spinning'), 1000);
    });
    
    // View All Alerts link
    DOM.viewAllAlertsLink.addEventListener('click', (e) => {
        e.preventDefault();
        switchModule('alerts');
    });
    
    // Chart filter buttons
    DOM.filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            DOM.filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    // Fleet search
    if (DOM.fleetSearch) {
        DOM.fleetSearch.addEventListener('input', (e) => {
            renderFleetTable(e.target.value);
        });
    }
    
    // Report period buttons
    DOM.periodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            DOM.periodBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderReports();
        });
    });
    
    // Alert filter tabs
    DOM.alertTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            DOM.alertTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderAlertsCenter(tab.dataset.filter);
        });
    });
    
    // Clear resolved alerts
    DOM.clearResolvedAlerts.addEventListener('click', () => {
        State.alertHistory = State.alertHistory.filter(a => !a.resolved);
        renderAlertsCenter(document.querySelector('.alert-tab.active')?.dataset.filter || 'all');
        showToast('Resolved alerts cleared', 'success');
    });
    
    // Settings sliders
    DOM.lowFuelThreshold.addEventListener('input', (e) => {
        DOM.lowFuelValue.textContent = e.target.value + '%';
    });
    
    DOM.criticalFuelThreshold.addEventListener('input', (e) => {
        DOM.criticalFuelValue.textContent = e.target.value + '%';
    });
    
    DOM.suddenDropThreshold.addEventListener('input', (e) => {
        DOM.suddenDropValue.textContent = e.target.value + '%';
    });
    
    // Save/Reset settings
    DOM.saveSettings.addEventListener('click', saveSettings);
    DOM.resetSettings.addEventListener('click', resetSettings);
}

/**
 * Public API for external calls
 */
window.FleetApp = {
    viewVehicle: function(id) {
        State.selectedVehicle = id;
        DOM.vehicleSelect.value = id;
        switchModule('dashboard');
        updateDashboard();
        showToast(`Viewing ${id}`, 'info');
    },
    trackVehicle: function(id) {
        State.selectedVehicle = id;
        DOM.vehicleSelect.value = id;
        switchModule('dashboard');
        updateDashboard();
        showToast(`Tracking ${id} location`, 'info');
    },
    editVehicle: function(id) {
        showToast(`Edit vehicle ${id} - Feature coming soon`, 'info');
    }
};

/**
 * Initialize the application
 */
async function init() {
    console.log('FleetPulse: Initializing...');
    
    // Load HTML views from /views/ folder
    await loadAllViews();
    
    // Cache DOM elements after views are loaded
    cacheDOMElements();
    
    // Initialize local vehicle data first (as fallback)
    initializeVehicleData();
    
    // Try to connect to backend and sync data
    const backendConnected = await initDataSync();
    
    if (backendConnected) {
        showToast('Connected to backend server', 'success');
        console.log('FleetPulse: Backend connected');
    } else {
        showToast('Using local simulation mode', 'info');
        console.log('FleetPulse: Local simulation mode');
    }
    
    // Update connection status indicator
    updateConnectionStatus(backendConnected);
    
    // Populate vehicle selector with current vehicles
    populateVehicleSelector();
    
    initializeSettings();
    setRestartUpdateLoopCallback(restartUpdateLoop);
    setupEventListeners();
    
    // Initialize module-specific features
    initFleetModule();
    
    // Initialize Leaflet maps (with a slight delay to ensure containers are ready)
    setTimeout(() => {
        initDashboardMap();
        initFleetMap();
    }, 200);
    
    // Initial render
    updateDashboard();
    
    // Start update loop (uses backend or local simulation based on availability)
    startUpdateLoop();
    
    // Log sync status
    const status = getSyncStatus();
    console.log('FleetPulse: Sync status', status);
    
    State.isInitialized = true;
    console.log('FleetPulse: Initialization complete');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
