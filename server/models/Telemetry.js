/**
 * Telemetry Model
 * Stores vehicle telemetry data received from ESP32 devices
 * Includes computed metrics and alert flags
 */

const mongoose = require('mongoose');

const telemetrySchema = new mongoose.Schema({
  // Reference to the vehicle
  vehicleId: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    index: true
  },
  
  // Current fuel level as percentage (0-100)
  fuelLevel: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  
  // Current speed in km/h
  speed: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  
  // Engine status: 0 = OFF, 1 = ON
  engineStatus: {
    type: Number,
    required: true,
    enum: [0, 1],
    default: 0
  },
  
  // GPS coordinates
  latitude: {
    type: Number,
    required: true,
    min: -90,
    max: 90
  },
  longitude: {
    type: Number,
    required: true,
    min: -180,
    max: 180
  },
  
  // Unix timestamp from the device
  timestamp: {
    type: Number,
    required: true,
    index: true
  },
  
  // ============ COMPUTED FIELDS ============
  
  // Fuel consumed since last telemetry (in liters equivalent percentage)
  fuelConsumedSinceLast: {
    type: Number,
    default: 0
  },
  
  // Distance traveled since last telemetry (in km)
  distanceSinceLast: {
    type: Number,
    default: 0
  },
  
  // Calculated efficiency (km per unit fuel)
  calculatedEfficiency: {
    type: Number,
    default: 0
  },
  
  // Alert flags for this telemetry entry
  alertFlags: [{
    type: String,
    enum: ['IDLE_WASTE', 'FUEL_THEFT', 'LOW_EFFICIENCY', 'LOW_FUEL', 'OVER_SPEED']
  }],
  
  // Idle time accumulated (in seconds)
  idleTime: {
    type: Number,
    default: 0
  },
  
  // Estimated fuel wasted (in percentage points)
  fuelWasted: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Compound indexes for efficient querying
telemetrySchema.index({ vehicleId: 1, timestamp: -1 });
telemetrySchema.index({ alertFlags: 1 });
telemetrySchema.index({ createdAt: -1 });

// Static method to get latest telemetry for a vehicle
telemetrySchema.statics.getLatestForVehicle = async function(vehicleId, limit = 1) {
  return this.find({ vehicleId })
    .sort({ timestamp: -1 })
    .limit(limit);
};

// Static method to get telemetry with alerts
telemetrySchema.statics.getAlertsForVehicle = async function(vehicleId, limit = 50) {
  return this.find({ 
    vehicleId, 
    alertFlags: { $exists: true, $ne: [] } 
  })
    .sort({ timestamp: -1 })
    .limit(limit);
};

// Static method to get all recent alerts across fleet
telemetrySchema.statics.getRecentAlerts = async function(limit = 100) {
  return this.find({ 
    alertFlags: { $exists: true, $ne: [] } 
  })
    .sort({ timestamp: -1 })
    .limit(limit);
};

module.exports = mongoose.model('Telemetry', telemetrySchema);
