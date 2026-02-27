# 🚛 Fleet Optimizer

A Smart Fleet Optimizer system that receives vehicle telemetry from ESP32 devices and performs fuel efficiency analysis, idle waste detection, and fuel theft detection with real-time web dashboard visualization.

![Fleet Optimizer Dashboard](https://img.shields.io/badge/Status-Production_Ready-green)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![MongoDB](https://img.shields.io/badge/MongoDB-6+-green)
![License](https://img.shields.io/badge/License-MIT-blue)

## ✨ Features

### Core Functionality
- **Real-time Telemetry Ingestion** - REST API for ESP32 devices
- **Fuel Efficiency Analysis** - Calculate and track km/L efficiency
- **Idle Waste Detection** - Detect engine-on, stationary fuel consumption
- **Fuel Theft Detection** - Alert on sudden fuel level drops
- **Live GPS Tracking** - Map visualization with route trails
- **Alert Management** - Comprehensive alert history and notifications

### Dashboard Features
- 📊 Real-time fleet statistics
- 📈 Interactive Chart.js visualizations
- 🗺️ Leaflet.js map integration
- 🔔 Live alert notifications
- 🎯 Auto-refresh every 5 seconds
- 🌙 Modern dark theme UI

## 🛠️ Tech Stack

### Frontend
- HTML5
- Tailwind CSS (CDN)
- Vanilla JavaScript
- Chart.js for data visualization
- Leaflet.js for maps

### Backend
- Node.js
- Express.js

### Database
- MongoDB with Mongoose ODM

## 📁 Project Structure

```
Fleet Optimizer/
├── server/
│   ├── server.js              # Main Express server
│   ├── models/
│   │   ├── Vehicle.js         # Vehicle schema
│   │   └── Telemetry.js       # Telemetry schema
│   ├── routes/
│   │   ├── telemetryRoutes.js # Telemetry API endpoints
│   │   └── vehicleRoutes.js   # Vehicle API endpoints
│   └── services/
│       └── optimizationService.js # Alert detection logic
├── client/
│   ├── index.html             # Main dashboard
│   ├── vehicle.html           # Vehicle detail page
│   └── js/
│       ├── dashboard.js       # Dashboard logic
│       └── vehicle.js         # Vehicle page logic
├── package.json
├── .env.example
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **MongoDB** (v6 or higher) - Local or MongoDB Atlas
- **npm** or **yarn**

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "Fleet Optimizer"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   # Copy example env file
   cp .env.example .env
   
   # Edit .env with your MongoDB connection string
   ```

4. **Start MongoDB** (if using local)
   ```bash
   # Windows
   mongod
   
   # Or use MongoDB Compass / Atlas
   ```

5. **Start the server**
   ```bash
   # Production
   npm start
   
   # Development (with auto-reload)
   npm run dev
   ```

6. **Open in browser**
   ```
   http://localhost:3000
   ```

## 📡 API Endpoints

### Telemetry

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/telemetry` | Submit vehicle telemetry |
| GET | `/api/telemetry/:vehicleId` | Get telemetry history |

### Vehicles

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/vehicles` | List all vehicles |
| GET | `/api/vehicles/:id` | Get vehicle details |
| POST | `/api/vehicles` | Register new vehicle |
| PUT | `/api/vehicles/:id` | Update vehicle |
| DELETE | `/api/vehicles/:id` | Delete vehicle |

### Alerts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/alerts` | Get all recent alerts |

### Simulation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/simulate/theft` | Simulate fuel theft |
| POST | `/api/simulate/idle` | Simulate idle waste |
| POST | `/api/simulate/inefficient` | Simulate inefficiency |
| POST | `/api/simulate/normal` | Send normal telemetry |

## 📤 ESP32 Integration

### Telemetry Payload Format

```json
{
  "vehicleId": "TRUCK_01",
  "fuelLevel": 72,
  "speed": 45,
  "engineStatus": 1,
  "latitude": 12.9716,
  "longitude": 77.5946,
  "timestamp": 1710000000
}
```

### ESP32 Example Code

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* serverUrl = "http://YOUR_SERVER_IP:3000/api/telemetry";

void sendTelemetry(float fuel, float speed, int engine, float lat, float lon) {
  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  
  StaticJsonDocument<256> doc;
  doc["vehicleId"] = "TRUCK_01";
  doc["fuelLevel"] = fuel;
  doc["speed"] = speed;
  doc["engineStatus"] = engine;
  doc["latitude"] = lat;
  doc["longitude"] = lon;
  doc["timestamp"] = millis() / 1000;
  
  String json;
  serializeJson(doc, json);
  
  int httpCode = http.POST(json);
  http.end();
}
```

## 🚨 Alert Detection Logic

### 1. Idle Waste Detection
```
IF engineStatus == 1 AND speed == 0 AND fuelLevel decreasing
THEN alert: "IDLE_WASTE"
```

### 2. Fuel Theft Detection
```
IF speed == 0 AND sudden fuel drop > 5% within 5 minutes
THEN alert: "FUEL_THEFT"
```

### 3. Inefficient Driving Detection
```
IF calculated_efficiency < baseline_efficiency * 0.7
THEN alert: "LOW_EFFICIENCY"
```

### 4. Low Fuel Warning
```
IF fuelLevel < 15%
THEN alert: "LOW_FUEL"
```

## 🎮 Simulation Controls

Use the dashboard simulation buttons to test alert detection:

- **Simulate Fuel Theft** - Drops fuel by 15% instantly
- **Simulate Idle Waste** - Engine on, speed 0, fuel dropping
- **Simulate Inefficiency** - High fuel consumption, low distance
- **Send Normal Data** - Normal driving telemetry

## 📊 Dashboard Metrics

| Metric | Description |
|--------|-------------|
| Total Vehicles | Number of registered vehicles |
| Online Now | Vehicles with data in last 5 min |
| Active Alerts | Current unacknowledged alerts |
| Avg Efficiency | Fleet average km/L |
| Fuel Waste | Total estimated fuel waste % |

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `MONGODB_URI` | localhost:27017/fleet_optimizer | MongoDB connection |
| `NODE_ENV` | development | Environment mode |

### Alert Thresholds

Modify in `server/services/optimizationService.js`:

```javascript
const CONFIG = {
  FUEL_THEFT_THRESHOLD: 5,      // % drop for theft alert
  THEFT_TIME_WINDOW: 300,       // seconds
  EFFICIENCY_THRESHOLD: 0.3,    // 30% below baseline
  LOW_FUEL_THRESHOLD: 15,       // %
  OVER_SPEED_THRESHOLD: 120     // km/h
};
```

## 📱 Screenshots

### Main Dashboard
- Real-time fleet overview
- Vehicle status table
- Live alert feed
- Fuel level charts
- Alert distribution

### Vehicle Detail Page
- GPS location map with route trail
- Fuel level history chart
- Efficiency over time
- Speed tracking
- Complete alert history

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Tailwind CSS](https://tailwindcss.com/) for the styling framework
- [Chart.js](https://www.chartjs.org/) for beautiful charts
- [Leaflet.js](https://leafletjs.com/) for interactive maps
- [CARTO](https://carto.com/) for dark map tiles

---

Made with ❤️ for Fleet Management
