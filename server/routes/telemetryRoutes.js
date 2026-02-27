/**
 * Telemetry Routes
 * Handles all telemetry-related API endpoints
 */

const express = require('express');
const router = express.Router();
const Telemetry = require('../models/Telemetry');
const optimizationService = require('../services/optimizationService');

/**
 * POST /api/telemetry
 * Receive telemetry data from ESP32 devices
 * Body: { vehicleId, fuelLevel, speed, engineStatus, latitude, longitude, timestamp }
 */
router.post('/', async (req, res) => {
  try {
    const { vehicleId, fuelLevel, speed, engineStatus, latitude, longitude, timestamp } = req.body;
    
    // Validate required fields
    if (!vehicleId) {
      return res.status(400).json({ error: 'vehicleId is required' });
    }
    
    if (fuelLevel === undefined || fuelLevel === null) {
      return res.status(400).json({ error: 'fuelLevel is required' });
    }
    
    // Process telemetry through optimization service
    const processedTelemetry = await optimizationService.processTelemetry({
      vehicleId: vehicleId.toUpperCase(),
      fuelLevel: Number(fuelLevel),
      speed: Number(speed) || 0,
      engineStatus: Number(engineStatus) || 0,
      latitude: Number(latitude) || 0,
      longitude: Number(longitude) || 0,
      timestamp: Number(timestamp) || Math.floor(Date.now() / 1000)
    });
    
    res.status(201).json({
      success: true,
      data: processedTelemetry,
      alerts: processedTelemetry.alertFlags
    });
    
  } catch (error) {
    console.error('Error processing telemetry:', error);
    res.status(500).json({ error: 'Failed to process telemetry', message: error.message });
  }
});

/**
 * GET /api/telemetry/:vehicleId
 * Get telemetry history for a specific vehicle
 * Query params: limit (default 100), from, to (timestamps)
 */
router.get('/:vehicleId', async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { limit = 100, from, to } = req.query;
    
    // Build query
    const query = { vehicleId: vehicleId.toUpperCase() };
    
    if (from || to) {
      query.timestamp = {};
      if (from) query.timestamp.$gte = Number(from);
      if (to) query.timestamp.$lte = Number(to);
    }
    
    const telemetry = await Telemetry.find(query)
      .sort({ timestamp: -1 })
      .limit(Number(limit));
    
    res.json({
      success: true,
      count: telemetry.length,
      data: telemetry
    });
    
  } catch (error) {
    console.error('Error fetching telemetry:', error);
    res.status(500).json({ error: 'Failed to fetch telemetry', message: error.message });
  }
});

/**
 * POST /api/simulate/:type
 * Simulate various scenarios for demonstration
 * Types: theft, idle, inefficient, normal
 */
router.post('/simulate/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { vehicleId } = req.body;
    
    if (!vehicleId) {
      return res.status(400).json({ error: 'vehicleId is required in request body' });
    }
    
    let result;
    
    switch (type.toLowerCase()) {
      case 'theft':
        result = await optimizationService.simulateFuelTheft(vehicleId.toUpperCase());
        break;
        
      case 'idle':
        result = await optimizationService.simulateIdleWaste(vehicleId.toUpperCase());
        break;
        
      case 'inefficient':
        result = await optimizationService.simulateInefficiency(vehicleId.toUpperCase());
        break;
        
      case 'normal':
        result = await optimizationService.generateNormalTelemetry(vehicleId.toUpperCase());
        break;
        
      default:
        return res.status(400).json({ 
          error: 'Invalid simulation type',
          validTypes: ['theft', 'idle', 'inefficient', 'normal']
        });
    }
    
    res.json({
      success: true,
      simulationType: type,
      data: result,
      alerts: result.alertFlags
    });
    
  } catch (error) {
    console.error('Error simulating scenario:', error);
    res.status(500).json({ error: 'Failed to simulate scenario', message: error.message });
  }
});

module.exports = router;
