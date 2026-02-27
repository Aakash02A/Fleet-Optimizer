/**
 * FleetPulse DOM Cache Module
 * Centralized DOM element references
 */

const DOM = {};

/**
 * Cache all DOM elements for performance
 */
function cacheDOMElements() {
    // Navigation
    DOM.navItems = document.querySelectorAll('.nav-item');
    DOM.navAlertBadge = document.getElementById('navAlertBadge');
    
    // Header
    DOM.pageTitle = document.getElementById('pageTitle');
    DOM.pageSubtitle = document.getElementById('pageSubtitle');
    DOM.vehicleSelect = document.getElementById('vehicleSelect');
    DOM.vehicleSelectorContainer = document.getElementById('vehicleSelectorContainer');
    DOM.lastUpdated = document.getElementById('lastUpdated');
    DOM.refreshBtn = document.getElementById('refreshBtn');
    
    // Modules
    DOM.moduleViews = document.querySelectorAll('.module-view');
    
    // Dashboard KPIs
    DOM.fuelValue = document.getElementById('fuelValue');
    DOM.fuelProgress = document.getElementById('fuelProgress');
    DOM.fuelTrend = document.getElementById('fuelTrend');
    DOM.efficiencyValue = document.getElementById('efficiencyValue');
    DOM.efficiencyMarker = document.getElementById('efficiencyMarker');
    DOM.efficiencyTrend = document.getElementById('efficiencyTrend');
    DOM.rangeValue = document.getElementById('rangeValue');
    DOM.rangeFill = document.getElementById('rangeFill');
    DOM.statusDisplay = document.getElementById('statusDisplay');
    DOM.statusText = document.getElementById('statusText');
    DOM.engineStatus = document.getElementById('engineStatus');
    DOM.gpsStatus = document.getElementById('gpsStatus');
    DOM.statusUptime = document.getElementById('statusUptime');
    
    // Map
    DOM.mapContainer = document.getElementById('mapContainer');
    DOM.mapMarker = document.getElementById('mapMarker');
    DOM.latValue = document.getElementById('latValue');
    DOM.lonValue = document.getElementById('lonValue');
    DOM.speedValue = document.getElementById('speedValue');
    DOM.headingValue = document.getElementById('headingValue');
    
    // Alerts
    DOM.alertsList = document.getElementById('alertsList');
    DOM.alertEmpty = document.getElementById('alertEmpty');
    DOM.alertCount = document.getElementById('alertCount');
    DOM.viewAllAlertsLink = document.getElementById('viewAllAlertsLink');
    
    // Chart
    DOM.chartArea = document.getElementById('chartArea');
    DOM.chartXAxis = document.getElementById('chartXAxis');
    DOM.filterBtns = document.querySelectorAll('.filter-btn');
    
    // Fleet Module
    DOM.fleetTableBody = document.getElementById('fleetTableBody');
    DOM.fleetSearch = document.getElementById('fleetSearch');
    DOM.totalVehicles = document.getElementById('totalVehicles');
    DOM.normalVehicles = document.getElementById('normalVehicles');
    DOM.alertVehicles = document.getElementById('alertVehicles');
    DOM.avgEfficiency = document.getElementById('avgEfficiency');
    
    // Reports Module
    DOM.totalFuelConsumed = document.getElementById('totalFuelConsumed');
    DOM.fuelCompare = document.getElementById('fuelCompare');
    DOM.fuelBreakdown = document.getElementById('fuelBreakdown');
    DOM.efficiencyTrends = document.getElementById('efficiencyTrends');
    DOM.totalDistance = document.getElementById('totalDistance');
    DOM.distanceCompare = document.getElementById('distanceCompare');
    DOM.distanceBreakdown = document.getElementById('distanceBreakdown');
    DOM.alertSummaryGrid = document.getElementById('alertSummaryGrid');
    DOM.periodBtns = document.querySelectorAll('.period-btn');
    
    // Alerts Module
    DOM.alertsCenterList = document.getElementById('alertsCenterList');
    DOM.alertTabs = document.querySelectorAll('.alert-tab');
    DOM.clearResolvedAlerts = document.getElementById('clearResolvedAlerts');
    
    // Settings Module
    DOM.lowFuelThreshold = document.getElementById('lowFuelThreshold');
    DOM.lowFuelValue = document.getElementById('lowFuelValue');
    DOM.criticalFuelThreshold = document.getElementById('criticalFuelThreshold');
    DOM.criticalFuelValue = document.getElementById('criticalFuelValue');
    DOM.suddenDropThreshold = document.getElementById('suddenDropThreshold');
    DOM.suddenDropValue = document.getElementById('suddenDropValue');
    DOM.enableAlerts = document.getElementById('enableAlerts');
    DOM.lowFuelAlerts = document.getElementById('lowFuelAlerts');
    DOM.theftAlerts = document.getElementById('theftAlerts');
    DOM.enableGPS = document.getElementById('enableGPS');
    DOM.gpsLostAlert = document.getElementById('gpsLostAlert');
    DOM.updateInterval = document.getElementById('updateInterval');
    DOM.resetSettings = document.getElementById('resetSettings');
    DOM.saveSettings = document.getElementById('saveSettings');
}

export { DOM, cacheDOMElements };
