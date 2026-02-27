/**
 * FleetPulse Simulation Module
 * Vehicle data simulation engine
 */

import { CONFIG, VEHICLE_PROFILES } from './config.js';
import { State, calculateRange } from './state.js';
import { addAlert } from './modules/alerts.js';

/**
 * Simulate vehicle data updates
 */
function simulateVehicleData() {
    Object.keys(State.vehicles).forEach(id => {
        const vehicle = State.vehicles[id];
        const profile = VEHICLE_PROFILES[id];
        const prevFuel = vehicle.fuel;
        
        // Natural fuel consumption (0.1 - 0.5% per update)
        const consumption = 0.1 + Math.random() * 0.4;
        vehicle.fuel = Math.max(0, vehicle.fuel - consumption);
        
        // Random refuel event (1% chance)
        if (Math.random() < 0.01 && vehicle.fuel < 50) {
            const refuelAmount = 30 + Math.random() * 40;
            vehicle.fuel = Math.min(100, vehicle.fuel + refuelAmount);
            addAlert(id, 'info', 'Refuel Detected', 
                `${vehicle.name} refueled +${refuelAmount.toFixed(1)}%`);
        }
        
        // Sudden drop simulation (0.5% chance)
        if (Math.random() < 0.005 && vehicle.fuel > 20) {
            const dropAmount = CONFIG.thresholds.suddenDrop + Math.random() * 5;
            vehicle.fuel = Math.max(0, vehicle.fuel - dropAmount);
            if (CONFIG.notifications.theftAlerts) {
                addAlert(id, 'danger', 'Sudden Fuel Drop', 
                    `${vehicle.name}: ${dropAmount.toFixed(1)}% sudden drop detected - possible theft!`);
            }
        }
        
        // Update efficiency with small variation
        vehicle.efficiency = profile.baseEfficiency + (Math.random() * 3 - 1.5);
        vehicle.range = calculateRange(vehicle);
        
        // Update GPS position
        if (CONFIG.gps.enabled) {
            vehicle.lat += (Math.random() - 0.5) * 0.001;
            vehicle.lon += (Math.random() - 0.5) * 0.001;
            vehicle.speed = 20 + Math.random() * 60;
            vehicle.heading = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor(Math.random() * 8)];
        }
        
        // Update distance
        vehicle.distanceToday += vehicle.speed * (CONFIG.updateInterval / 3600000);
        
        // Update fuel history
        vehicle.fuelHistory.push(vehicle.fuel);
        if (vehicle.fuelHistory.length > 24) {
            vehicle.fuelHistory.shift();
        }
        
        // Update status based on fuel level
        if (vehicle.fuel <= CONFIG.thresholds.criticalFuel) {
            vehicle.status = 'danger';
            if (CONFIG.notifications.lowFuelAlerts) {
                addAlert(id, 'danger', 'Critical Fuel Level', 
                    `${vehicle.name} is critically low at ${vehicle.fuel.toFixed(1)}%`);
            }
        } else if (vehicle.fuel <= CONFIG.thresholds.lowFuel) {
            vehicle.status = 'warning';
            if (CONFIG.notifications.lowFuelAlerts && prevFuel > CONFIG.thresholds.lowFuel) {
                addAlert(id, 'warning', 'Low Fuel Warning', 
                    `${vehicle.name} dropped below ${CONFIG.thresholds.lowFuel}%`);
            }
        } else {
            vehicle.status = 'normal';
        }
        
        // Clear old alerts for this vehicle
        vehicle.alerts = vehicle.alerts.filter(a => Date.now() - a.timestamp < 60000);
    });
}

export { simulateVehicleData };
