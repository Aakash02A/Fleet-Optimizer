/**
 * Optimization Service
 * Handles fuel efficiency analysis, idle waste detection, and fuel theft detection
 * Core logic for the Fleet Optimizer system
 */

const Vehicle = require('../models/Vehicle');
const Telemetry = require('../models/Telemetry');

// Configuration constants
const CONFIG = {
  // Fuel theft threshold: sudden drop greater than this percentage is suspicious
  FUEL_THEFT_THRESHOLD: 5,
  
  // Time window for theft detection (in seconds)
  THEFT_TIME_WINDOW: 300, // 5 minutes
  
  // Efficiency threshold: percentage below baseline to trigger alert
  EFFICIENCY_THRESHOLD: 0.3, // 30% below baseline
  
  // Low fuel warning threshold
  LOW_FUEL_THRESHOLD: 15,
  
  // Over speed threshold (km/h)
  OVER_SPEED_THRESHOLD: 120,
  
  // Idle fuel consumption rate (% per minute when idling)
  IDLE_FUEL_RATE: 0.1,
  
  // Minimum time difference to consider for calculations (seconds)
  MIN_TIME_DIFF: 1,
  
  // Earth radius for distance calculation (km)
  EARTH_RADIUS: 6371
};

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => deg * (Math.PI / 180);
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return CONFIG.EARTH_RADIUS * c;
}

/**
 * Process incoming telemetry data and detect anomalies
 * @param {Object} telemetryData - Raw telemetry from ESP32
 * @returns {Object} Processed telemetry with computed fields and alerts
 */
async function processTelemetry(telemetryData) {
  const { vehicleId, fuelLevel, speed, engineStatus, latitude, longitude, timestamp } = telemetryData;
  
  // Initialize computed fields
  let fuelConsumedSinceLast = 0;
  let distanceSinceLast = 0;
  let calculatedEfficiency = 0;
  let idleTime = 0;
  let fuelWasted = 0;
  const alertFlags = [];
  
  // Get or create vehicle
  let vehicle = await Vehicle.findOne({ vehicleId });
  if (!vehicle) {
    vehicle = await Vehicle.create({
      vehicleId,
      driverName: 'Auto-Registered',
      baselineEfficiency: 10,
      status: 'ACTIVE'
    });
  }
  
  // Get previous telemetry for comparison
  const previousTelemetry = await Telemetry.findOne({ vehicleId })
    .sort({ timestamp: -1 })
    .limit(1);
  
  if (previousTelemetry) {
    const timeDiff = timestamp - previousTelemetry.timestamp;
    
    // Only process if we have valid time difference
    if (timeDiff >= CONFIG.MIN_TIME_DIFF) {
      // Calculate fuel consumption
      fuelConsumedSinceLast = Math.max(0, previousTelemetry.fuelLevel - fuelLevel);
      
      // Calculate distance traveled
      distanceSinceLast = calculateDistance(
        previousTelemetry.latitude,
        previousTelemetry.longitude,
        latitude,
        longitude
      );
      
      // Calculate efficiency (km per % fuel, normalized to km/L based on tank capacity)
      if (fuelConsumedSinceLast > 0) {
        // Convert percentage to liters (assuming 100L tank)
        const litersConsumed = (fuelConsumedSinceLast / 100) * vehicle.tankCapacity;
        calculatedEfficiency = litersConsumed > 0 ? distanceSinceLast / litersConsumed : 0;
      }
      
      // ============ ALERT DETECTION LOGIC ============
      
      // A. Idle Waste Detection
      // IF: engineStatus == 1 AND speed == 0 AND fuelLevel decreasing
      if (engineStatus === 1 && speed === 0 && fuelConsumedSinceLast > 0) {
        alertFlags.push('IDLE_WASTE');
        idleTime = timeDiff;
        fuelWasted = fuelConsumedSinceLast;
        console.log(`[ALERT] IDLE_WASTE detected for ${vehicleId}: Engine ON, not moving, fuel dropping`);
      }
      
      // B. Fuel Theft Detection
      // IF: speed == 0 AND sudden fuel drop > 5% within short interval
      if (speed === 0 && 
          previousTelemetry.speed === 0 && 
          fuelConsumedSinceLast > CONFIG.FUEL_THEFT_THRESHOLD &&
          timeDiff < CONFIG.THEFT_TIME_WINDOW) {
        alertFlags.push('FUEL_THEFT');
        fuelWasted = fuelConsumedSinceLast;
        console.log(`[ALERT] FUEL_THEFT detected for ${vehicleId}: Sudden ${fuelConsumedSinceLast.toFixed(1)}% drop while stationary`);
      }
      
      // C. Inefficient Driving Detection
      // IF: efficiency < baselineEfficiency - threshold
      if (calculatedEfficiency > 0 && distanceSinceLast > 0.1) { // Only if actually moving
        const efficiencyThreshold = vehicle.baselineEfficiency * (1 - CONFIG.EFFICIENCY_THRESHOLD);
        if (calculatedEfficiency < efficiencyThreshold) {
          alertFlags.push('LOW_EFFICIENCY');
          console.log(`[ALERT] LOW_EFFICIENCY detected for ${vehicleId}: ${calculatedEfficiency.toFixed(2)} km/L vs baseline ${vehicle.baselineEfficiency} km/L`);
        }
      }
    }
  }
  
  // D. Low Fuel Warning
  if (fuelLevel < CONFIG.LOW_FUEL_THRESHOLD) {
    alertFlags.push('LOW_FUEL');
    console.log(`[ALERT] LOW_FUEL detected for ${vehicleId}: ${fuelLevel}%`);
  }
  
  // E. Over Speed Warning
  if (speed > CONFIG.OVER_SPEED_THRESHOLD) {
    alertFlags.push('OVER_SPEED');
    console.log(`[ALERT] OVER_SPEED detected for ${vehicleId}: ${speed} km/h`);
  }
  
  // Create processed telemetry object
  const processedTelemetry = {
    vehicleId,
    fuelLevel,
    speed,
    engineStatus,
    latitude,
    longitude,
    timestamp,
    fuelConsumedSinceLast,
    distanceSinceLast,
    calculatedEfficiency,
    alertFlags,
    idleTime,
    fuelWasted
  };
  
  // Save telemetry to database
  const savedTelemetry = await Telemetry.create(processedTelemetry);
  
  // Update vehicle's last telemetry and alert count
  await Vehicle.findOneAndUpdate(
    { vehicleId },
    {
      lastTelemetry: {
        fuelLevel,
        speed,
        engineStatus,
        latitude,
        longitude,
        timestamp
      },
      activeAlerts: alertFlags.length,
      status: 'ACTIVE'
    }
  );
  
  return savedTelemetry;
}

/**
 * Simulate fuel theft scenario
 * @param {string} vehicleId - Vehicle to simulate theft for
 * @returns {Object} Simulated telemetry data
 */
async function simulateFuelTheft(vehicleId) {
  const vehicle = await Vehicle.findOne({ vehicleId });
  if (!vehicle) {
    throw new Error(`Vehicle ${vehicleId} not found`);
  }
  
  const currentFuel = vehicle.lastTelemetry?.fuelLevel || 70;
  const newFuelLevel = Math.max(5, currentFuel - 15); // Drop 15%
  
  const telemetryData = {
    vehicleId,
    fuelLevel: newFuelLevel,
    speed: 0,
    engineStatus: 0,
    latitude: vehicle.lastTelemetry?.latitude || 12.9716,
    longitude: vehicle.lastTelemetry?.longitude || 77.5946,
    timestamp: Math.floor(Date.now() / 1000)
  };
  
  return processTelemetry(telemetryData);
}

/**
 * Simulate idle waste scenario
 * @param {string} vehicleId - Vehicle to simulate idle waste for
 * @returns {Object} Simulated telemetry data
 */
async function simulateIdleWaste(vehicleId) {
  const vehicle = await Vehicle.findOne({ vehicleId });
  if (!vehicle) {
    throw new Error(`Vehicle ${vehicleId} not found`);
  }
  
  const currentFuel = vehicle.lastTelemetry?.fuelLevel || 70;
  const newFuelLevel = Math.max(5, currentFuel - 0.5); // Gradual drop
  
  const telemetryData = {
    vehicleId,
    fuelLevel: newFuelLevel,
    speed: 0,
    engineStatus: 1, // Engine ON but not moving
    latitude: vehicle.lastTelemetry?.latitude || 12.9716,
    longitude: vehicle.lastTelemetry?.longitude || 77.5946,
    timestamp: Math.floor(Date.now() / 1000)
  };
  
  return processTelemetry(telemetryData);
}

/**
 * Simulate inefficient driving scenario
 * @param {string} vehicleId - Vehicle to simulate inefficiency for
 * @returns {Object} Simulated telemetry data
 */
async function simulateInefficiency(vehicleId) {
  const vehicle = await Vehicle.findOne({ vehicleId });
  if (!vehicle) {
    throw new Error(`Vehicle ${vehicleId} not found`);
  }
  
  const currentFuel = vehicle.lastTelemetry?.fuelLevel || 70;
  const currentLat = vehicle.lastTelemetry?.latitude || 12.9716;
  const currentLon = vehicle.lastTelemetry?.longitude || 77.5946;
  
  // High fuel consumption with little distance (inefficient)
  const telemetryData = {
    vehicleId,
    fuelLevel: Math.max(5, currentFuel - 5), // High consumption
    speed: 40,
    engineStatus: 1,
    latitude: currentLat + 0.001, // Small distance
    longitude: currentLon + 0.001,
    timestamp: Math.floor(Date.now() / 1000)
  };
  
  return processTelemetry(telemetryData);
}

/**
 * Generate normal telemetry for testing
 * @param {string} vehicleId - Vehicle to generate telemetry for
 * @returns {Object} Normal telemetry data
 */
async function generateNormalTelemetry(vehicleId) {
  const vehicle = await Vehicle.findOne({ vehicleId });
  if (!vehicle) {
    throw new Error(`Vehicle ${vehicleId} not found`);
  }
  
  const currentFuel = vehicle.lastTelemetry?.fuelLevel || 70;
  const currentLat = vehicle.lastTelemetry?.latitude || 12.9716;
  const currentLon = vehicle.lastTelemetry?.longitude || 77.5946;
  
  // Normal driving with reasonable efficiency
  const telemetryData = {
    vehicleId,
    fuelLevel: Math.max(5, currentFuel - 0.3),
    speed: Math.floor(Math.random() * 60) + 20,
    engineStatus: 1,
    latitude: currentLat + (Math.random() * 0.01 - 0.005),
    longitude: currentLon + (Math.random() * 0.01 - 0.005),
    timestamp: Math.floor(Date.now() / 1000)
  };
  
  return processTelemetry(telemetryData);
}

/**
 * Get fleet statistics
 * @returns {Object} Fleet-wide statistics
 */
async function getFleetStats() {
  const vehicles = await Vehicle.find({ status: 'ACTIVE' });
  const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
  
  let totalEfficiency = 0;
  let efficiencyCount = 0;
  let totalFuelWaste = 0;
  let vehiclesOnline = 0;
  let totalAlerts = 0;
  
  for (const vehicle of vehicles) {
    // Check if vehicle is online
    if (vehicle.lastTelemetry.timestamp * 1000 > fiveMinutesAgo) {
      vehiclesOnline++;
    }
    
    // Sum up active alerts
    totalAlerts += vehicle.activeAlerts || 0;
    
    // Get recent telemetry for efficiency calculation
    const recentTelemetry = await Telemetry.find({ vehicleId: vehicle.vehicleId })
      .sort({ timestamp: -1 })
      .limit(10);
    
    for (const t of recentTelemetry) {
      if (t.calculatedEfficiency > 0) {
        totalEfficiency += t.calculatedEfficiency;
        efficiencyCount++;
      }
      totalFuelWaste += t.fuelWasted || 0;
    }
  }
  
  return {
    totalVehicles: vehicles.length,
    vehiclesOnline,
    activeAlerts: totalAlerts,
    averageEfficiency: efficiencyCount > 0 ? (totalEfficiency / efficiencyCount).toFixed(2) : 0,
    totalFuelWaste: totalFuelWaste.toFixed(2)
  };
}

module.exports = {
  processTelemetry,
  simulateFuelTheft,
  simulateIdleWaste,
  simulateInefficiency,
  generateNormalTelemetry,
  getFleetStats,
  CONFIG
};
