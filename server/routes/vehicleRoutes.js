/**
 * Vehicle Routes
 * Handles all vehicle-related API endpoints
 */

const express = require('express');
const router = express.Router();
const Vehicle = require('../models/Vehicle');
const Telemetry = require('../models/Telemetry');
const optimizationService = require('../services/optimizationService');

/**
 * GET /api/vehicles
 * Get all vehicles with their current status
 */
router.get('/', async (req, res) => {
  try {
    const vehicles = await Vehicle.find().sort({ createdAt: -1 });
    const stats = await optimizationService.getFleetStats();
    
    res.json({
      success: true,
      stats,
      count: vehicles.length,
      data: vehicles
    });
    
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ error: 'Failed to fetch vehicles', message: error.message });
  }
});

/**
 * GET /api/vehicles/:id
 * Get detailed information for a specific vehicle
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const vehicle = await Vehicle.findOne({ vehicleId: id.toUpperCase() });
    
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    
    // Get recent telemetry for charts
    const telemetryHistory = await Telemetry.find({ vehicleId: id.toUpperCase() })
      .sort({ timestamp: -1 })
      .limit(50);
    
    // Get alerts history
    const alertHistory = await Telemetry.find({ 
      vehicleId: id.toUpperCase(),
      alertFlags: { $exists: true, $ne: [] }
    })
      .sort({ timestamp: -1 })
      .limit(20);
    
    res.json({
      success: true,
      data: {
        vehicle,
        telemetryHistory: telemetryHistory.reverse(), // Oldest first for charts
        alertHistory
      }
    });
    
  } catch (error) {
    console.error('Error fetching vehicle:', error);
    res.status(500).json({ error: 'Failed to fetch vehicle', message: error.message });
  }
});

/**
 * POST /api/vehicles
 * Register a new vehicle
 */
router.post('/', async (req, res) => {
  try {
    const { vehicleId, driverName, baselineEfficiency, vehicleType, tankCapacity } = req.body;
    
    if (!vehicleId) {
      return res.status(400).json({ error: 'vehicleId is required' });
    }
    
    // Check if vehicle already exists
    const existingVehicle = await Vehicle.findOne({ vehicleId: vehicleId.toUpperCase() });
    if (existingVehicle) {
      return res.status(409).json({ error: 'Vehicle already exists' });
    }
    
    const vehicle = await Vehicle.create({
      vehicleId: vehicleId.toUpperCase(),
      driverName: driverName || 'Unassigned',
      baselineEfficiency: baselineEfficiency || 10,
      vehicleType: vehicleType || 'TRUCK',
      tankCapacity: tankCapacity || 100
    });
    
    res.status(201).json({
      success: true,
      data: vehicle
    });
    
  } catch (error) {
    console.error('Error creating vehicle:', error);
    res.status(500).json({ error: 'Failed to create vehicle', message: error.message });
  }
});

/**
 * PUT /api/vehicles/:id
 * Update vehicle information
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { driverName, baselineEfficiency, status, vehicleType, tankCapacity } = req.body;
    
    const vehicle = await Vehicle.findOneAndUpdate(
      { vehicleId: id.toUpperCase() },
      {
        ...(driverName && { driverName }),
        ...(baselineEfficiency && { baselineEfficiency }),
        ...(status && { status }),
        ...(vehicleType && { vehicleType }),
        ...(tankCapacity && { tankCapacity })
      },
      { new: true }
    );
    
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    
    res.json({
      success: true,
      data: vehicle
    });
    
  } catch (error) {
    console.error('Error updating vehicle:', error);
    res.status(500).json({ error: 'Failed to update vehicle', message: error.message });
  }
});

/**
 * DELETE /api/vehicles/:id
 * Delete a vehicle and its telemetry
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const vehicle = await Vehicle.findOneAndDelete({ vehicleId: id.toUpperCase() });
    
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    
    // Delete associated telemetry
    await Telemetry.deleteMany({ vehicleId: id.toUpperCase() });
    
    res.json({
      success: true,
      message: `Vehicle ${id} and its telemetry deleted`
    });
    
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    res.status(500).json({ error: 'Failed to delete vehicle', message: error.message });
  }
});

/**
 * GET /api/alerts
 * Get all recent alerts across the fleet
 */
router.get('/fleet/alerts', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    const alerts = await Telemetry.find({
      alertFlags: { $exists: true, $ne: [] }
    })
      .sort({ timestamp: -1 })
      .limit(Number(limit));
    
    res.json({
      success: true,
      count: alerts.length,
      data: alerts
    });
    
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts', message: error.message });
  }
});

/**
 * GET /api/vehicles/stats/summary
 * Get fleet-wide statistics
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await optimizationService.getFleetStats();
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats', message: error.message });
  }
});

module.exports = router;
