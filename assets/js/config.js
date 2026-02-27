/**
 * FleetPulse Configuration Module
 * Global configuration and constants
 */

const CONFIG = {
    updateInterval: 3000,
    thresholds: {
        lowFuel: 20,
        criticalFuel: 10,
        suddenDrop: 5
    },
    notifications: {
        enableAlerts: true,
        lowFuelAlerts: true,
        theftAlerts: true,
        gpsLostAlert: true
    },
    gps: {
        enabled: true
    }
};

const VEHICLE_PROFILES = {
    'TN01AB1234': { name: 'Truck A', type: 'Heavy Truck', capacity: 200, baseEfficiency: 12 },
    'TN02CD5678': { name: 'Truck B', type: 'Heavy Truck', capacity: 200, baseEfficiency: 13 },
    'TN03EF9012': { name: 'Van C', type: 'Delivery Van', capacity: 80, baseEfficiency: 16 },
    'TN04GH3456': { name: 'Truck D', type: 'Medium Truck', capacity: 150, baseEfficiency: 14 }
};

const MODULE_TITLES = {
    dashboard: { title: 'Dashboard', subtitle: 'Real-time fleet monitoring' },
    fleet: { title: 'Fleet Overview', subtitle: 'Manage all vehicles' },
    reports: { title: 'Reports', subtitle: 'Analytics and insights' },
    alerts: { title: 'Alert Center', subtitle: 'Manage notifications' },
    settings: { title: 'Settings', subtitle: 'Configure thresholds and preferences' }
};

export { CONFIG, VEHICLE_PROFILES, MODULE_TITLES };
