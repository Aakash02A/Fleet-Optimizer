/**
 * Fleet Optimizer Server
 * Main entry point for the Smart Fleet Optimizer system
 * 
 * Features:
 * - Vehicle telemetry ingestion from ESP32 devices
 * - Fuel efficiency analysis
 * - Idle waste detection
 * - Fuel theft detection
 * - Real-time fleet analytics dashboard
 */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Import routes
const telemetryRoutes = require('./routes/telemetryRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');

// Import models for seeding
const Vehicle = require('./models/Vehicle');

// Initialize Express app
const app = express();

// Configuration
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fleet_optimizer';

// ============ MIDDLEWARE ============

// Enable CORS for all origins (adjust in production)
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Serve static files from client directory
app.use(express.static(path.join(__dirname, '../client')));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ============ API ROUTES ============

// Telemetry routes
app.use('/api/telemetry', telemetryRoutes);

// Simulation routes (using telemetry routes)
app.use('/api/simulate', telemetryRoutes);

// Vehicle routes
app.use('/api/vehicles', vehicleRoutes);

// Alerts route (fleet-wide)
app.get('/api/alerts', async (req, res) => {
  try {
    const Telemetry = require('./models/Telemetry');
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
    res.status(500).json({ error: 'Failed to fetch alerts', message: error.message });
  }
});

// ============ HTML ROUTES ============

// Main dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Vehicle detail page
app.get('/vehicle/:id', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/vehicle.html'));
});

// ============ ERROR HANDLING ============

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// ============ DATABASE CONNECTION & SERVER START ============

/**
 * Seed initial demo vehicles if database is empty
 */
async function seedDemoData() {
  try {
    const count = await Vehicle.countDocuments();
    
    if (count === 0) {
      console.log('Seeding demo vehicles...');
      
      const demoVehicles = [
        {
          vehicleId: 'TRUCK_01',
          driverName: 'John Smith',
          baselineEfficiency: 8,
          vehicleType: 'TRUCK',
          tankCapacity: 150,
          lastTelemetry: {
            fuelLevel: 75,
            speed: 0,
            engineStatus: 0,
            latitude: 12.9716,
            longitude: 77.5946,
            timestamp: Math.floor(Date.now() / 1000)
          }
        },
        {
          vehicleId: 'TRUCK_02',
          driverName: 'Jane Doe',
          baselineEfficiency: 9,
          vehicleType: 'TRUCK',
          tankCapacity: 150,
          lastTelemetry: {
            fuelLevel: 60,
            speed: 45,
            engineStatus: 1,
            latitude: 12.9800,
            longitude: 77.6000,
            timestamp: Math.floor(Date.now() / 1000)
          }
        },
        {
          vehicleId: 'VAN_01',
          driverName: 'Mike Johnson',
          baselineEfficiency: 12,
          vehicleType: 'VAN',
          tankCapacity: 80,
          lastTelemetry: {
            fuelLevel: 85,
            speed: 0,
            engineStatus: 0,
            latitude: 12.9650,
            longitude: 77.5800,
            timestamp: Math.floor(Date.now() / 1000)
          }
        },
        {
          vehicleId: 'CAR_01',
          driverName: 'Sarah Wilson',
          baselineEfficiency: 15,
          vehicleType: 'CAR',
          tankCapacity: 50,
          lastTelemetry: {
            fuelLevel: 45,
            speed: 60,
            engineStatus: 1,
            latitude: 12.9900,
            longitude: 77.6100,
            timestamp: Math.floor(Date.now() / 1000)
          }
        },
        {
          vehicleId: 'BUS_01',
          driverName: 'Tom Brown',
          baselineEfficiency: 5,
          vehicleType: 'BUS',
          tankCapacity: 200,
          lastTelemetry: {
            fuelLevel: 30,
            speed: 25,
            engineStatus: 1,
            latitude: 12.9550,
            longitude: 77.5700,
            timestamp: Math.floor(Date.now() / 1000)
          }
        }
      ];
      
      await Vehicle.insertMany(demoVehicles);
      console.log(`Seeded ${demoVehicles.length} demo vehicles`);
    }
  } catch (error) {
    console.error('Error seeding demo data:', error);
  }
}

/**
 * Connect to MongoDB and start the server
 */
async function startServer() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB successfully');
    
    // Seed demo data
    await seedDemoData();
    
    // Start HTTP server
    app.listen(PORT, () => {
      console.log('═══════════════════════════════════════════════');
      console.log('  🚛 Fleet Optimizer Server Started');
      console.log('═══════════════════════════════════════════════');
      console.log(`  📡 Server running on: http://localhost:${PORT}`);
      console.log(`  🗄️  MongoDB: ${MONGODB_URI}`);
      console.log('═══════════════════════════════════════════════');
      console.log('  API Endpoints:');
      console.log('  • POST /api/telemetry      - Receive telemetry');
      console.log('  • GET  /api/vehicles       - List all vehicles');
      console.log('  • GET  /api/vehicles/:id   - Get vehicle details');
      console.log('  • GET  /api/telemetry/:id  - Get telemetry history');
      console.log('  • GET  /api/alerts         - Get all alerts');
      console.log('  • POST /api/simulate/:type - Simulate scenarios');
      console.log('═══════════════════════════════════════════════');
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;
