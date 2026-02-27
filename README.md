# 🚗 Fleet Optimizer - Smart Fleet Management System

A comprehensive, full-stack fleet management application built with **FastAPI** and modern **JavaScript**.

## 📋 Features

✨ **Dashboard Management**
- Real-time fleet overview
- Vehicle status tracking
- Active alerts monitoring
- Low fuel warnings
- Customizable vehicle inventory

🗺️ **Live Map Tracking**
- Real-time GPS tracking of all vehicles
- Interactive Leaflet-based map
- Vehicle location updates every 10 seconds
- Detailed vehicle information on map markers

📊 **Advanced Analytics**
- Fleet status distribution charts
- Fuel consumption analysis
- Performance metrics tracking
- Historical data visualization
- Health score calculation

🚨 **Alert Management**
- Real-time alert notifications
- Severity-based filtering (Critical, Warning, Info)
- Alert resolution tracking
- Historical alert logs

🚙 **Vehicle Management**
- Add/remove vehicles from fleet
- View detailed vehicle information
- Track fuel, speed, location, efficiency
- Historical telemetry data
- Individual vehicle performance charts

## 🏗️ Architecture

### Backend (FastAPI)
```
app.py
├── Database Layer (SQLite3)
│   ├── Vehicles table
│   ├── Telemetry table
│   └── Alerts table
├── API Endpoints
│   ├── Vehicle Management (CRUD)
│   ├── Telemetry Collection
│   ├── Alert Handling
│   └── Dashboard Statistics
└── Static File Serving
```

### Frontend (HTML/CSS/JavaScript)
```
static/
├── index.html          - Dashboard
├── vehicles.html       - Vehicle Management
├── vehicle.html        - Vehicle Details
├── live-map.html       - Real-time Map
├── analytics.html      - Analytics Dashboard
├── alerts.html         - Alert Management
├── js/
│   ├── vehicles.js     - Vehicle list logic
│   ├── vehicle.js      - Vehicle details logic
│   ├── map.js          - Map functionality
│   ├── analytics.js    - Analytics charts
│   └── alerts.js       - Alert management
└── css/                - Custom styles (Tailwind CDN used)
```

## 🚀 Quick Start

### Prerequisites
- Python 3.7+
- pip (Python package manager)

### Installation

1. **Clone/Navigate to the project directory:**
   ```bash
   cd Fleet-Optimizer
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

### Running the Application

#### Windows (PowerShell)
```powershell
.\run.ps1
```

#### Linux/macOS (Bash)
```bash
bash run.sh
```

#### Manual Start
```bash
python -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

### Access the Application
- **Web Dashboard:** http://localhost:8000
- **API Documentation:** http://localhost:8000/docs
- **Alternative Docs:** http://localhost:8000/redoc

## 📡 API Endpoints

### Vehicle Management
- `GET /api/vehicles` - Get all vehicles
- `GET /api/vehicles/{vehicle_id}` - Get specific vehicle
- `POST /api/vehicles` - Create new vehicle
- `PUT /api/vehicles/{vehicle_id}` - Update vehicle
- `DELETE /api/vehicles/{vehicle_id}` - Delete vehicle

### Telemetry Data
- `GET /api/vehicles/{vehicle_id}/telemetry` - Get telemetry history (limit=24)
- `POST /api/vehicles/{vehicle_id}/telemetry` - Add new telemetry entry

### Alerts
- `GET /api/vehicles/{vehicle_id}/alerts` - Get vehicle alerts
- `PUT /api/alerts/{alert_id}/resolve` - Mark alert as resolved

### Dashboard
- `GET /api/stats` - Get fleet statistics

### Pages
- `GET /` - Dashboard
- `GET /vehicles` - Vehicle management
- `GET /vehicle/{vehicle_id}` - Vehicle details
- `GET /live-map` - Live tracking map
- `GET /analytics` - Analytics dashboard
- `GET /alerts` - Alerts page

## 🗄️ Database Schema

### Vehicles Table
```sql
CREATE TABLE vehicles (
    id INTEGER PRIMARY KEY,
    vehicle_id TEXT UNIQUE,
    driver_name TEXT,
    vehicle_type TEXT,
    status TEXT,
    current_fuel REAL,
    current_speed REAL,
    latitude REAL,
    longitude REAL,
    engine_on INTEGER,
    baseline_efficiency REAL,
    tank_capacity INTEGER,
    created_at TEXT,
    updated_at TEXT
)
```

### Telemetry Table
```sql
CREATE TABLE telemetry (
    id INTEGER PRIMARY KEY,
    vehicle_id INTEGER,
    fuel_level REAL,
    speed REAL,
    efficiency REAL,
    latitude REAL,
    longitude REAL,
    timestamp TEXT
)
```

### Alerts Table
```sql
CREATE TABLE alerts (
    id INTEGER PRIMARY KEY,
    vehicle_id INTEGER,
    alert_type TEXT,
    severity TEXT,
    message TEXT,
    resolved INTEGER,
    created_at TEXT
)
```

## 📚 Sample Data

The application automatically seeds the database with 6 sample vehicles:
- **TRK-001, TRK-002** - Trucks (120L capacity)
- **VAN-001, VAN-002** - Vans (80L capacity)
- **SDN-001, SDN-002** - Sedans (50L capacity)

Each vehicle includes:
- 24 hours of telemetry history (hourly data points)
- 2-4 sample alerts with various severity levels
- Real GPS coordinates in New York City area

## 🛠️ Development

### File Structure Overview

```
Fleet-Optimizer/
├── app.py                 # Main FastAPI application
├── requirements.txt       # Python dependencies
├── README.md             # Documentation
├── run.ps1              # Windows startup script
├── run.sh               # Linux/macOS startup script
├── LICENSE              # License file
└── static/              # Frontend files
    ├── index.html       # Dashboard
    ├── vehicles.html    # Vehicles pages
    ├── vehicle.html     # Vehicle details
    ├── live-map.html    # Map view
    ├── analytics.html   # Analytics
    ├── alerts.html      # Alerts
    └── js/              # JavaScript files
```

### Technologies Used

**Backend:**
- FastAPI 0.100.0+ - Modern Python web framework
- Uvicorn - ASGI web server
- Pydantic - Data validation
- SQLite3 - Database

**Frontend:**
- HTML5
- Tailwind CSS - Utility-first CSS framework
- Vanilla JavaScript
- Chart.js - Data visualization
- Leaflet.js - Interactive maps

### Environment

The application runs on:
- **Host:** 0.0.0.0 (All interfaces)
- **Port:** 8000
- **Debug Mode:** Enabled (auto-reload on file changes)

## 📋 Production Considerations

For production deployment:

1. **Disable reload mode:**
   ```bash
   python -m uvicorn app:app --host 0.0.0.0 --port 8000
   ```

2. **Use a production ASGI server:**
   ```bash
   pip install gunicorn
   gunicorn -w 4 -k uvicorn.workers.UvicornWorker app:app
   ```

3. **Update database path** - Move from SQLite to PostgreSQL/MySQL

4. **Add authentication** - Implement JWT or OAuth2

5. **Enable HTTPS** - Use SSL/TLS certificates

6. **Set environment variables:**
   ```bash
   export ENVIRONMENT=production
   export DATABASE_URL=postgresql://user:password@host/db
   ```

## 🔐 Security Notes

- CORS is currently enabled for all origins (`allow_origins=["*"]`)
- Update this before production deployment
- Add authentication and authorization
- Validate all user inputs
- Use environment variables for sensitive data

## 📝 Troubleshooting

### Port Already in Use
```bash
# Change port
python -m uvicorn app:app --port 8001
```

### Module Not Found
```bash
# Reinstall dependencies
pip install --upgrade -r requirements.txt
```

### Database Locked
```bash
# Remove existing database
rm fleet_optimizer.db
# Restart application
```

### CORS Issues
Update the CORS origins in app.py:
```python
allow_origins=["http://localhost:3000", "https://yourdomain.com"]
```

## 📞 Support

For issues and feature requests, please refer to the project documentation or API docs at `/docs`.

## 📄 License

This project is licensed under the terms specified in the LICENSE file.

---

**Made with ❤️ for efficient fleet management**
