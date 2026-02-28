/**
 * FleetPulse State Management Module
 * Central state store for the application
 */

import { VEHICLE_PROFILES } from './config.js';

const State = {
    currentModule: 'dashboard',
    selectedVehicle: 'TN01AB1234',
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
    const baseCoords = { lat: 13.0827, lon: 80.2707 }; // Chennai
    
    Object.keys(VEHICLE_PROFILES).forEach((id) => {
        const profile = VEHICLE_PROFILES[id];
        State.vehicles[id] = {
            id: id,
            name: profile.name,
            type: profile.type,
            fuel: 70 + Math.random() * 25,
            efficiency: profile.baseEfficiency + (Math.random() * 3 - 1.5),
            range: 0,
            lat: baseCoords.lat + (Math.random() * 0.1 - 0.05),
            lon: baseCoords.lon + (Math.random() * 0.1 - 0.05),
            status: 'normal',
            alerts: [],
            speed: 30 + Math.random() * 40,
            heading: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor(Math.random() * 8)],
            engineStatus: 'Running',
            gpsStatus: 'Strong',
            uptime: '99.8%',
            distanceToday: Math.floor(100 + Math.random() * 150),
            fuelHistory: []
        };
        State.vehicles[id].range = calculateRange(State.vehicles[id]);
        
        // Initialize fuel history
        for (let i = 0; i < 24; i++) {
            State.vehicles[id].fuelHistory.push(70 + Math.random() * 20);
        }
    });
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
