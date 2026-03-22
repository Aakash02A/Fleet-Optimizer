/**
 * FleetPulse Settings Module
 * Configuration and preferences management
 */

import { CONFIG } from '../config.js';
import { DOM } from '../dom.js';
import { showToast } from '../utils.js';
import { saveSettingsToBackend } from '../dataSync.js';

let restartUpdateLoopCallback = null;

/**
 * Set callback for restarting update loop
 */
function setRestartUpdateLoopCallback(callback) {
    restartUpdateLoopCallback = callback;
}

/**
 * Initialize settings with current values
 */
function initializeSettings() {
    // Set initial values
    DOM.lowFuelThreshold.value = CONFIG.thresholds.lowFuel;
    DOM.lowFuelValue.textContent = CONFIG.thresholds.lowFuel + '%';
    
    DOM.criticalFuelThreshold.value = CONFIG.thresholds.criticalFuel;
    DOM.criticalFuelValue.textContent = CONFIG.thresholds.criticalFuel + '%';
    
    DOM.suddenDropThreshold.value = CONFIG.thresholds.suddenDrop;
    DOM.suddenDropValue.textContent = CONFIG.thresholds.suddenDrop + '%';
    
    DOM.enableAlerts.checked = CONFIG.notifications.enableAlerts;
    DOM.lowFuelAlerts.checked = CONFIG.notifications.lowFuelAlerts;
    DOM.theftAlerts.checked = CONFIG.notifications.theftAlerts;
    DOM.enableGPS.checked = CONFIG.gps.enabled;
    DOM.gpsLostAlert.checked = CONFIG.notifications.gpsLostAlert;
    DOM.updateInterval.value = CONFIG.updateInterval;
}

/**
 * Save current settings
 */
async function saveSettings() {
    CONFIG.thresholds.lowFuel = parseInt(DOM.lowFuelThreshold.value);
    CONFIG.thresholds.criticalFuel = parseInt(DOM.criticalFuelThreshold.value);
    CONFIG.thresholds.suddenDrop = parseInt(DOM.suddenDropThreshold.value);
    CONFIG.notifications.enableAlerts = DOM.enableAlerts.checked;
    CONFIG.notifications.lowFuelAlerts = DOM.lowFuelAlerts.checked;
    CONFIG.notifications.theftAlerts = DOM.theftAlerts.checked;
    CONFIG.gps.enabled = DOM.enableGPS.checked;
    CONFIG.notifications.gpsLostAlert = DOM.gpsLostAlert.checked;
    
    const newInterval = parseInt(DOM.updateInterval.value);
    if (newInterval !== CONFIG.updateInterval) {
        CONFIG.updateInterval = newInterval;
        if (restartUpdateLoopCallback) {
            restartUpdateLoopCallback();
        }
    }

    await saveSettingsToBackend({
        lowFuel: CONFIG.thresholds.lowFuel,
        criticalFuel: CONFIG.thresholds.criticalFuel,
        suddenDrop: CONFIG.thresholds.suddenDrop,
        updateInterval: CONFIG.updateInterval,
        gpsEnabled: CONFIG.gps.enabled,
        lowFuelAlerts: CONFIG.notifications.lowFuelAlerts,
        theftAlerts: CONFIG.notifications.theftAlerts
    });
    
    showToast('Settings saved successfully', 'success');
}

/**
 * Reset settings to defaults
 */
function resetSettings() {
    DOM.lowFuelThreshold.value = 20;
    DOM.lowFuelValue.textContent = '20%';
    DOM.criticalFuelThreshold.value = 10;
    DOM.criticalFuelValue.textContent = '10%';
    DOM.suddenDropThreshold.value = 5;
    DOM.suddenDropValue.textContent = '5%';
    DOM.enableAlerts.checked = true;
    DOM.lowFuelAlerts.checked = true;
    DOM.theftAlerts.checked = true;
    DOM.enableGPS.checked = true;
    DOM.gpsLostAlert.checked = true;
    DOM.updateInterval.value = 3000;
    
    showToast('Settings reset to defaults', 'success');
}

export { initializeSettings, saveSettings, resetSettings, setRestartUpdateLoopCallback };
