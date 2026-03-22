/**
 * FleetPulse State Management Module
 * Central state store for the application
 */

import { VEHICLE_PROFILES } from './config.js';

const State = {
    currentModule: 'dashboard',
    selectedVehicle: '',
    vehicles: {},
    alerts: [],
    alertHistory: [],
    chartData: [],
    isInitialized: false,
    updateIntervalId: null,
    backendConnected: false
};

/**
 * Calculate estimated range based on current fuel and efficiency
 */
function calculateRange(vehicle) {
    // Get capacity from profile or vehicle data or default
    const profile = VEHICLE_PROFILES[vehicle.id];
    const capacity = profile?.capacity || vehicle.capacity || 100;
    const fuelLiters = (vehicle.fuel / 100) * capacity;
    return Math.round(fuelLiters * vehicle.efficiency);
}

/**
 * Initialize vehicle data with default values
 */
function initializeVehicleData() {
    State.vehicles = {};
    State.selectedVehicle = '';
}

/**
 * Get current selected vehicle data
 */
function getSelectedVehicle() {
    return State.vehicles[State.selectedVehicle];
}

/**
 * Get all vehicles as array
 */
function getAllVehicles() {
    return Object.values(State.vehicles);
}

export { State, initializeVehicleData, calculateRange, getSelectedVehicle, getAllVehicles };
