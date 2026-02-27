# FleetPulse - IoT Vehicle Fuel Monitoring Dashboard

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.8+-blue.svg" alt="Python">
  <img src="https://img.shields.io/badge/SQLite-3-green.svg" alt="SQLite">
  <img src="https://img.shields.io/badge/JavaScript-ES6+-yellow.svg" alt="JavaScript">
  <img src="https://img.shields.io/badge/License-MIT-purple.svg" alt="License">
</p>

A production-grade web dashboard for real-time IoT vehicle fuel monitoring. Track fuel levels, detect theft, monitor fleet efficiency, and receive instant alerts - all in one comprehensive platform.

## 🚀 Features

### Dashboard
- **Real-time KPIs** - Fuel level, efficiency, estimated range, vehicle status
- **Live GPS Tracking** - Interactive map with vehicle position updates
- **Fuel History Charts** - 24-hour fuel consumption visualization
- **Quick Stats Bar** - Fleet size, daily distance, fuel consumption overview
- **Vehicle Information** - Detailed vehicle and driver information
- **Consumption Analytics** - Average consumption, daily/weekly stats, cost estimates
- **Recent Trips** - Trip history with route, distance, and efficiency data

### Fleet Management
- **Vehicle Overview** - Complete fleet status at a glance
- **Advanced Filtering** - Filter by status (Normal, Warning, Critical)
- **Sortable Columns** - Sort by ID, fuel level, efficiency
- **Search Functionality** - Quick vehicle search
- **Export to CSV** - Download fleet data for reporting
- **Fleet Map** - Overview of all vehicle locations

### Alerts & Notifications
- **Low Fuel Alerts** - Configurable threshold warnings
- **Critical Fuel Alerts** - Urgent notifications for critically low levels
- **Theft Detection** - Sudden fuel drop detection alerts
- **GPS Lost Alerts** - Connectivity issue notifications
- **Alert History** - Complete log of all system alerts

### Reports & Analytics
- **Fuel Consumption Reports** - Daily, weekly, monthly breakdowns
- **Efficiency Trends** - Vehicle-by-vehicle efficiency comparison
- **Distance Tracking** - Total fleet distance covered
- **Alert Summary** - Statistics on alert types and frequencies

### Settings
- **Configurable Thresholds** - Low fuel, critical fuel, sudden drop percentages
- **Notification Preferences** - Toggle alert types on/off
- **GPS Settings** - Enable/disable tracking
- **Update Interval** - Adjust data refresh rate

## 🛠️ Tech Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Custom properties, Grid, Flexbox, animations
- **Vanilla JavaScript (ES6+)** - Modular architecture with ES modules
- **No frameworks** - Pure, lightweight implementation

### Backend
- **Python 3.8+** - REST API server
- **SQLite3** - Embedded database
- **Built-in HTTP Server** - No external dependencies required

## 📁 Project Structure

```
Fleet-Optimizer/
├── app.py                      # Python backend server
├── fleetpulse.db              # SQLite database (auto-generated)
├── index.html                  # Main HTML shell
├── views/                      # HTML module views
│   ├── dashboard.html
│   ├── fleet.html
│   ├── reports.html
│   ├── alerts.html
│   └── settings.html
├── assets/
│   ├── css/
│   │   └── styles.css         # Complete stylesheet
│   └── js/
│       ├── app.js             # Main application entry
│       ├── config.js          # Configuration constants
│       ├── state.js           # State management
│       ├── dom.js             # DOM element caching
│       ├── utils.js           # Utility functions
│       ├── simulation.js      # Data simulation engine
│       ├── viewLoader.js      # Dynamic view loading
│       ├── apiService.js      # Backend API client
│       └── modules/
│           ├── dashboard.js   # Dashboard functionality
│           ├── fleet.js       # Fleet management
│           ├── reports.js     # Reports & analytics
│           ├── alerts.js      # Alert handling
│           └── settings.js    # Settings management
└── README.md
```

## 📡 API Reference

### Vehicles

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/vehicles` | List all vehicles with telemetry |
| GET | `/api/vehicles/{id}` | Get vehicle details |
| POST | `/api/vehicles` | Create new vehicle |
| PUT | `/api/vehicles/{id}` | Update vehicle |
| DELETE | `/api/vehicles/{id}` | Delete vehicle |
| POST | `/api/vehicles/{id}/telemetry` | Update telemetry data |

### Alerts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/alerts` | List all alerts |
| GET | `/api/alerts/counts` | Get alert counts by severity |
| POST | `/api/alerts` | Create new alert |
| PUT | `/api/alerts/{id}/resolve` | Resolve an alert |
| DELETE | `/api/alerts/resolved` | Clear resolved alerts |

### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/summary` | Fleet summary statistics |
| GET | `/api/reports/fuel?period=day` | Fuel consumption report |
| GET | `/api/reports/efficiency` | Efficiency trends |

### Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings` | Get all settings |
| PUT | `/api/settings` | Update settings |

### Additional Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/trips` | List trip history |
| POST | `/api/trips` | Log new trip |
| GET | `/api/refuels` | List refuel logs |
| POST | `/api/refuels` | Log refuel event |
| GET | `/api/drivers` | List all drivers |
| POST | `/api/drivers` | Create driver |
| PUT | `/api/drivers/{id}` | Update driver |
| DELETE | `/api/drivers/{id}` | Delete driver |

### Simulation Control

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/simulation/start?interval=3` | Start simulation |
| GET | `/api/simulation/stop` | Stop simulation |
| GET | `/api/simulation/status` | Get simulation status |

## 🗄️ Database Schema

### Tables

- **vehicles** - Vehicle profiles and specifications
- **vehicle_telemetry** - Real-time sensor data
- **fuel_history** - Historical fuel levels
- **alerts** - System alerts and notifications
- **trips** - Journey records
- **refuel_logs** - Refueling events
- **drivers** - Driver information
- **settings** - Configuration storage

## ⚙️ Configuration

### Default Thresholds

| Setting | Default Value |
|---------|---------------|
| Low Fuel Warning | 20% |
| Critical Fuel Alert | 10% |
| Sudden Drop Detection | 5% |
| Update Interval | 3 seconds |

### Alert Types

- **Info** - Refuel detected, routine notifications
- **Warning** - Low fuel warnings
- **Danger** - Critical fuel, theft detection

## 🎨 UI Components

- Modern card-based layout
- Responsive design (mobile-friendly)
- Dark/Light theme ready (CSS variables)
- Smooth animations and transitions
- Interactive charts and gauges
- Status indicators with color coding
- Toast notifications

## 🔧 Customization

### Adding New Vehicles

```python
# Via API
POST /api/vehicles
{
    "id": "TN05XY7890",
    "name": "Truck E",
    "type": "Heavy Truck",
    "capacity": 200,
    "base_efficiency": 12,
    "driver_name": "New Driver"
}
```

### Modifying Thresholds

```python
# Via API
PUT /api/settings
{
    "lowFuelThreshold": 25,
    "criticalFuelThreshold": 15,
    "suddenDropThreshold": 8
}
```

## 📊 Sample Data

The system auto-seeds with:
- 4 sample vehicles (2 Heavy Trucks, 1 Medium Truck, 1 Van)
- 4 assigned drivers
- 24-hour fuel history per vehicle
- 5 sample trips per vehicle
- Default configuration settings

## 🔒 Security Notes

- CORS enabled for development
- No authentication (add for production)
- SQLite for demo (use PostgreSQL/MySQL for production)
- Input validation on all endpoints

## 🚧 Future Enhancements

- [ ] User authentication & authorization
- [ ] Multi-tenant support
- [ ] Real IoT device integration (MQTT/CoAP)
- [ ] Mobile app (React Native/Flutter)
- [ ] Advanced analytics & ML predictions
- [ ] Geofencing alerts
- [ ] Maintenance scheduling
- [ ] Fuel cost optimization recommendations

