/**
 * FleetPulse Data Sync Module
 * Bridges frontend state with backend API
 */

import { API, APIConfig } from './apiService.js';
import { State, calculateRange } from './state.js';
import { CONFIG, VEHICLE_PROFILES } from './config.js';
import { addAlert } from './modules/alerts.js';

/**
 * Transform backend vehicle data to frontend format
 */
function transformVehicleData(backendVehicle) {
    return {
        id: backendVehicle.id,
        name: backendVehicle.name,
        type: backendVehicle.type,
        fuel: backendVehicle.fuel || 0,
        efficiency: backendVehicle.efficiency || backendVehicle.base_efficiency || 12,
        range: backendVehicle.estimated_range || 0,
        lat: backendVehicle.latitude || 13.0827,
        lon: backendVehicle.longitude || 80.2707,
        status: backendVehicle.status || 'normal',
        alerts: [],
        speed: backendVehicle.speed || 0,
        heading: backendVehicle.heading || 'N',
        engineStatus: backendVehicle.engine_status || 'Idle',
        gpsStatus: backendVehicle.gps_status || 'Unknown',
        uptime: '99.8%',
        distanceToday: backendVehicle.distance_today || 0,
        driverName: backendVehicle.driver_name || 'Unassigned',
        capacity: backendVehicle.capacity || 100,
        mileage: backendVehicle.mileage || 0,
        fuelHistory: []
    };
}

/**
 * Fetch vehicles from backend and update state
 */
async function syncVehicles() {
    if (!APIConfig.useBackend) return false;
    
    try {
        const response = await API.vehicles.getAll();
        if (!response || !response.vehicles) return false;
        
        const vehicles = response.vehicles;
        
        // Update state with backend data
        vehicles.forEach(backendVehicle => {
            const vehicleId = backendVehicle.id;
            const existingVehicle = State.vehicles[vehicleId];
            const transformed = transformVehicleData(backendVehicle);
            
            // Preserve fuel history if exists, otherwise initialize
            if (existingVehicle && existingVehicle.fuelHistory.length > 0) {
                transformed.fuelHistory = existingVehicle.fuelHistory;
                // Add new fuel reading
                transformed.fuelHistory.push(transformed.fuel);
                if (transformed.fuelHistory.length > 24) {
                    transformed.fuelHistory.shift();
                }
            } else {
                // Initialize with simulated history
                for (let i = 0; i < 24; i++) {
                    transformed.fuelHistory.push(transformed.fuel + (Math.random() * 10 - 5));
                }
            }
            
            // Check for status changes and generate alerts
            if (existingVehicle) {
                checkForAlerts(existingVehicle, transformed);
            }
            
            State.vehicles[vehicleId] = transformed;
            
            // Update vehicle profiles if not exists
            if (!VEHICLE_PROFILES[vehicleId]) {
                VEHICLE_PROFILES[vehicleId] = {
                    name: transformed.name,
                    type: transformed.type,
                    capacity: transformed.capacity,
                    baseEfficiency: transformed.efficiency
                };
            }
        });
        
        // Set selected vehicle if not set
        if (!State.selectedVehicle && vehicles.length > 0) {
            State.selectedVehicle = vehicles[0].id;
        }
        
        return true;
    } catch (error) {
        console.error('Failed to sync vehicles:', error);
        return false;
    }
}

/**
 * Check for alerts based on state changes
 */
function checkForAlerts(oldVehicle, newVehicle) {
    // Low fuel alert
    if (newVehicle.fuel <= CONFIG.thresholds.criticalFuel && 
        oldVehicle.fuel > CONFIG.thresholds.criticalFuel) {
        if (CONFIG.notifications.lowFuelAlerts) {
            addAlert(newVehicle.id, 'danger', 'Critical Fuel Level',
                `${newVehicle.name} is critically low at ${newVehicle.fuel.toFixed(1)}%`);
        }
    } else if (newVehicle.fuel <= CONFIG.thresholds.lowFuel && 
               oldVehicle.fuel > CONFIG.thresholds.lowFuel) {
        if (CONFIG.notifications.lowFuelAlerts) {
            addAlert(newVehicle.id, 'warning', 'Low Fuel Warning',
                `${newVehicle.name} dropped below ${CONFIG.thresholds.lowFuel}%`);
        }
    }
    
    // Sudden fuel drop detection
    const fuelDrop = oldVehicle.fuel - newVehicle.fuel;
    if (fuelDrop >= CONFIG.thresholds.suddenDrop && CONFIG.notifications.theftAlerts) {
        addAlert(newVehicle.id, 'danger', 'Sudden Fuel Drop',
            `${newVehicle.name}: ${fuelDrop.toFixed(1)}% sudden drop detected!`);
    }
    
    // Refuel detection
    if (newVehicle.fuel > oldVehicle.fuel + 5) {
        const refuelAmount = newVehicle.fuel - oldVehicle.fuel;
        addAlert(newVehicle.id, 'info', 'Refuel Detected',
            `${newVehicle.name} refueled +${refuelAmount.toFixed(1)}%`);
    }
}

/**
 * Sync alerts from backend
 */
async function syncAlerts() {
    if (!APIConfig.useBackend) return false;
    
    try {
        const response = await API.alerts.getAll();
        if (!response || !response.alerts) return false;
        
        // Transform and merge with existing alerts
        const backendAlerts = response.alerts.map(alert => ({
            id: alert.id,
            vehicleId: alert.vehicle_id,
            type: alert.severity,
            title: alert.title,
            message: alert.message,
            timestamp: new Date(alert.timestamp).getTime(),
            resolved: alert.resolved
        }));
        
        // Merge with local alerts (avoiding duplicates)
        const localAlertIds = new Set(State.alertHistory.map(a => a.id));
        backendAlerts.forEach(alert => {
            if (!localAlertIds.has(alert.id)) {
                State.alertHistory.unshift(alert);
            }
        });
        
        // Keep only recent alerts
        State.alertHistory = State.alertHistory.slice(0, 100);
        
        return true;
    } catch (error) {
        console.error('Failed to sync alerts:', error);
        return false;
    }
}

/**
 * Sync settings from backend
 */
async function syncSettings() {
    if (!APIConfig.useBackend) return false;
    
    try {
        const response = await API.settings.getAll();
        if (!response || !response.settings) return false;
        
        const settings = response.settings;
        
        // Update CONFIG with backend settings
        if (settings.lowFuelThreshold !== undefined) {
            CONFIG.thresholds.lowFuel = settings.lowFuelThreshold;
        }
        if (settings.criticalFuelThreshold !== undefined) {
            CONFIG.thresholds.criticalFuel = settings.criticalFuelThreshold;
        }
        if (settings.suddenDropThreshold !== undefined) {
            CONFIG.thresholds.suddenDrop = settings.suddenDropThreshold;
        }
        if (settings.updateInterval !== undefined) {
            CONFIG.updateInterval = settings.updateInterval * 1000;
        }
        if (settings.gpsEnabled !== undefined) {
            CONFIG.gps.enabled = settings.gpsEnabled;
        }
        if (settings.enableLowFuelAlerts !== undefined) {
            CONFIG.notifications.lowFuelAlerts = settings.enableLowFuelAlerts;
        }
        if (settings.enableTheftAlerts !== undefined) {
            CONFIG.notifications.theftAlerts = settings.enableTheftAlerts;
        }
        
        return true;
    } catch (error) {
        console.error('Failed to sync settings:', error);
        return false;
    }
}

/**
 * Save settings to backend
 */
async function saveSettingsToBackend(settings) {
    if (!APIConfig.useBackend) return false;
    
    try {
        await API.settings.update({
            lowFuelThreshold: settings.lowFuel,
            criticalFuelThreshold: settings.criticalFuel,
            suddenDropThreshold: settings.suddenDrop,
            updateInterval: settings.updateInterval / 1000,
            gpsEnabled: settings.gpsEnabled,
            enableLowFuelAlerts: settings.lowFuelAlerts,
            enableTheftAlerts: settings.theftAlerts
        });
        return true;
    } catch (error) {
        console.error('Failed to save settings:', error);
        return false;
    }
}

/**
 * Full data sync from backend
 */
async function syncAll() {
    if (!APIConfig.useBackend) return false;
    
    const results = await Promise.all([
        syncVehicles(),
        syncAlerts(),
        syncSettings()
    ]);
    
    return results.every(r => r);
}

/**
 * Initialize data sync - check backend and perform initial sync
 */
async function initDataSync() {
    const backendAvailable = await API.init();
    
    if (backendAvailable) {
        console.log('FleetPulse: Connected to backend');
        await syncAll();
        return true;
    } else {
        console.log('FleetPulse: Using local simulation');
        return false;
    }
}

/**
 * Get data sync status
 */
function getSyncStatus() {
    return {
        backendConnected: APIConfig.backendAvailable,
        useBackend: APIConfig.useBackend,
        vehicleCount: Object.keys(State.vehicles).length,
        alertCount: State.alertHistory.length
    };
}

export {
    initDataSync,
    syncVehicles,
    syncAlerts,
    syncSettings,
    syncAll,
    saveSettingsToBackend,
    getSyncStatus,
    transformVehicleData
};
