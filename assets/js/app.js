/**
 * FleetPulse - IoT Vehicle Fuel Monitoring Dashboard
 * Main Application Entry Point
 */

import { CONFIG, MODULE_TITLES } from './config.js';
import { State, initializeVehicleData } from './state.js';
import { DOM, cacheDOMElements } from './dom.js';
import { showToast } from './utils.js';
import { updateDashboard } from './modules/dashboard.js';
import { renderFleetTable, initFleetModule } from './modules/fleet.js';
import { renderReports } from './modules/reports.js';
import { updateAlertBadge, renderAlertsCenter } from './modules/alerts.js';
import { initializeSettings, saveSettings, resetSettings, setRestartUpdateLoopCallback } from './modules/settings.js';
import { simulateVehicleData } from './simulation.js';
import { loadAllViews } from './viewLoader.js';

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
    if (module === 'fleet') {
        renderFleetTable();
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
    State.updateIntervalId = setInterval(() => {
        simulateVehicleData();
        
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
    DOM.refreshBtn.addEventListener('click', () => {
        DOM.refreshBtn.classList.add('spinning');
        simulateVehicleData();
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
    initializeVehicleData();
    initializeSettings();
    setRestartUpdateLoopCallback(restartUpdateLoop);
    setupEventListeners();
    
    // Initialize module-specific features
    initFleetModule();
    
    // Initial render
    updateDashboard();
    
    // Start simulation loop
    startUpdateLoop();
    
    State.isInitialized = true;
    console.log('FleetPulse: Initialization complete');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
