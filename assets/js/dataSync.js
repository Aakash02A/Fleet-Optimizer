/**
 * FleetPulse Data Sync Module
 * Bridges frontend state with backend API
 */

import { API, APIConfig } from './apiService.js';
import { State } from './state.js';
import { CONFIG, VEHICLE_PROFILES } from './config.js';
import { addAlert } from './modules/alerts.js';

function normalizeStatus(status) {
    const value = String(status || '').toLowerCase();
    if (value.includes('critical') || value.includes('danger')) return 'danger';
    if (value.includes('warn') || value.includes('low')) return 'warning';
    return 'normal';
}

function calculateRangeFromFuel(fuelPercent, efficiency, capacity) {
    const fuelLiters = (fuelPercent / 100) * capacity;
    return Math.round(fuelLiters * efficiency);
}

/**
 * Transform backend vehicle data to frontend format
 */
function transformVehicleData(backendVehicle) {
    const id = backendVehicle.vehicle_id || backendVehicle.id || 'UNKNOWN';
    const fuel = Number(backendVehicle.fuel ?? 0);
    const efficiency = Number(backendVehicle.efficiency || backendVehicle.base_efficiency || 12);
    const capacity = Number(backendVehicle.capacity || 100);

    return {
        id,
        name: backendVehicle.name || id,
        type: backendVehicle.type || 'IoT Vehicle',
        fuel,
        efficiency,
        range: backendVehicle.estimated_range || calculateRangeFromFuel(fuel, efficiency, capacity),
        lat: backendVehicle.latitude || 13.0827,
        lon: backendVehicle.longitude || 80.2707,
        status: normalizeStatus(backendVehicle.status),
        alerts: [],
        speed: Number(backendVehicle.speed || 0),
        heading: backendVehicle.heading || '--',
        engineStatus: backendVehicle.engine_status || 'Running',
        gpsStatus: backendVehicle.gps_status || 'Strong',
        uptime: 'Live',
        distanceToday: backendVehicle.distance_today || 0,
        driverName: backendVehicle.driver_name || 'Unassigned',
        capacity,
        mileage: backendVehicle.mileage || 0,
        fuelHistory: []
    };
}

/**
 * Fetch vehicles from backend and update state
 */
async function syncVehicles() {
    try {
        const response = await API.vehicles.getAll();
        if (!response || Object.keys(response).length === 0) return true;

        const backendVehicles = Array.isArray(response.vehicles) ? response.vehicles : [response];

        for (const backendVehicle of backendVehicles) {
            const vehicleId = backendVehicle.vehicle_id || backendVehicle.id;
            if (!vehicleId) {
                continue;
            }

            const existingVehicle = State.vehicles[vehicleId];
            const transformed = transformVehicleData(backendVehicle);

            if (existingVehicle && existingVehicle.fuelHistory.length > 0) {
                transformed.fuelHistory = [...existingVehicle.fuelHistory, transformed.fuel].slice(-24);
            } else {
                transformed.fuelHistory = Array(24).fill(transformed.fuel);
            }

            if (existingVehicle) {
                checkForAlerts(existingVehicle, transformed);
            }

            State.vehicles[vehicleId] = transformed;

            if (!VEHICLE_PROFILES[vehicleId]) {
                VEHICLE_PROFILES[vehicleId] = {
                    name: transformed.name,
                    type: transformed.type,
                    capacity: transformed.capacity,
                    baseEfficiency: transformed.efficiency
                };
            }
        }

        const ids = Object.keys(State.vehicles);
        if (!State.selectedVehicle || !State.vehicles[State.selectedVehicle]) {
            State.selectedVehicle = ids[0] || '';
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
    if (APIConfig.backendFlavor !== 'full-api') return true;

    try {
        const response = await API.alerts.getAll();
        if (!response || !Array.isArray(response.alerts)) return true;

        const backendAlerts = response.alerts.map(alert => ({
            id: alert.id,
            vehicleId: alert.vehicle_id,
            severity: alert.severity,
            title: alert.title,
            message: alert.message,
            timestamp: new Date(alert.created_at || alert.timestamp).getTime(),
            resolved: Boolean(alert.resolved)
        }));

        const existing = new Set(State.alertHistory.map(a => a.id));
        backendAlerts.forEach(alert => {
            if (!existing.has(alert.id)) {
                State.alertHistory.unshift(alert);
            }
        });

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
    if (APIConfig.backendFlavor !== 'full-api') return true;

    try {
        const response = await API.settings.getAll();
        const settings = response?.settings;
        if (!settings) return true;

        if (settings.lowFuelThreshold !== undefined) {
            CONFIG.thresholds.lowFuel = Number(settings.lowFuelThreshold);
        }
        if (settings.criticalFuelThreshold !== undefined) {
            CONFIG.thresholds.criticalFuel = Number(settings.criticalFuelThreshold);
        }
        if (settings.suddenDropThreshold !== undefined) {
            CONFIG.thresholds.suddenDrop = Number(settings.suddenDropThreshold);
        }
        if (settings.updateInterval !== undefined) {
            CONFIG.updateInterval = Number(settings.updateInterval) * 1000;
        }
        if (settings.gpsEnabled !== undefined) {
            CONFIG.gps.enabled = Boolean(settings.gpsEnabled);
        }
        if (settings.enableLowFuelAlerts !== undefined) {
            CONFIG.notifications.lowFuelAlerts = Boolean(settings.enableLowFuelAlerts);
        }
        if (settings.enableTheftAlerts !== undefined) {
            CONFIG.notifications.theftAlerts = Boolean(settings.enableTheftAlerts);
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
    if (APIConfig.backendFlavor !== 'full-api') return true;

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
    const results = await Promise.all([
        syncVehicles(),
        syncAlerts(),
        syncSettings()
    ]);

    return results.every(Boolean);
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
    }

    return false;
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
