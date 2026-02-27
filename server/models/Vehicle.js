/**
 * Vehicle Model
 * Stores vehicle information and baseline efficiency metrics
 */

const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  // Unique identifier for the vehicle (e.g., TRUCK_01, VAN_02)
  vehicleId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  
  // Name of the assigned driver
  driverName: {
    type: String,
    required: true,
    trim: true,
    default: 'Unassigned'
  },
  
  // Expected fuel efficiency in km per liter
  // Used as baseline for efficiency calculations
  baselineEfficiency: {
    type: Number,
    required: true,
    default: 10, // Default 10 km/L
    min: 1,
    max: 50
  },
  
  // Current status of the vehicle
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE'],
    default: 'ACTIVE'
  },
  
  // Last known telemetry data (for quick access)
  lastTelemetry: {
    fuelLevel: { type: Number, default: 100 },
    speed: { type: Number, default: 0 },
    engineStatus: { type: Number, default: 0 },
    latitude: { type: Number, default: 0 },
    longitude: { type: Number, default: 0 },
    timestamp: { type: Number, default: Date.now }
  },
  
  // Count of active alerts
  activeAlerts: {
    type: Number,
    default: 0
  },
  
  // Vehicle metadata
  vehicleType: {
    type: String,
    enum: ['TRUCK', 'VAN', 'CAR', 'BUS', 'MOTORCYCLE'],
    default: 'TRUCK'
  },
  
  // Tank capacity in liters
  tankCapacity: {
    type: Number,
    default: 100
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

// Index for faster queries
vehicleSchema.index({ vehicleId: 1 });
vehicleSchema.index({ status: 1 });

// Virtual for checking if vehicle is online (received data in last 5 minutes)
vehicleSchema.virtual('isOnline').get(function() {
  const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
  return this.lastTelemetry.timestamp > fiveMinutesAgo;
});

// Ensure virtuals are included in JSON output
vehicleSchema.set('toJSON', { virtuals: true });
vehicleSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);
