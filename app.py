"""
Fleet Optimizer Backend - FastAPI + SQLite3
"""
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import sqlite3
import random
import os

app = FastAPI(title="Fleet Optimizer API")

# Database file path
DB_PATH = "fleet_optimizer.db"

# ----- Pydantic Models -----
class Vehicle(BaseModel):
    id: int
    vehicle_id: str
    driver_name: str
    vehicle_type: str
    status: str
    current_fuel: float
    current_speed: float
    latitude: float
    longitude: float
    engine_on: bool
    baseline_efficiency: float
    tank_capacity: int
    created_at: str
    updated_at: str

class Telemetry(BaseModel):
    id: int
    vehicle_id: int
    fuel_level: float
    speed: float
    efficiency: float
    latitude: float
    longitude: float
    timestamp: str

class Alert(BaseModel):
    id: int
    vehicle_id: int
    alert_type: str
    severity: str
    message: str
    resolved: bool
    created_at: str

class VehicleUpdate(BaseModel):
    driver_name: Optional[str] = None
    status: Optional[str] = None
    current_fuel: Optional[float] = None
    current_speed: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    engine_on: Optional[bool] = None

class VehicleCreate(BaseModel):
    vehicle_id: str
    driver_name: str
    vehicle_type: str
    tank_capacity: int = 60
    baseline_efficiency: float = 12.5

# ----- Database Functions -----
def get_db():
    """Get database connection"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize database tables"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Create vehicles table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS vehicles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vehicle_id TEXT UNIQUE NOT NULL,
            driver_name TEXT NOT NULL,
            vehicle_type TEXT NOT NULL,
            status TEXT DEFAULT 'idle',
            current_fuel REAL DEFAULT 100.0,
            current_speed REAL DEFAULT 0.0,
            latitude REAL DEFAULT 40.7128,
            longitude REAL DEFAULT -74.0060,
            engine_on INTEGER DEFAULT 0,
            baseline_efficiency REAL DEFAULT 12.5,
            tank_capacity INTEGER DEFAULT 60,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create telemetry table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS telemetry (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vehicle_id INTEGER NOT NULL,
            fuel_level REAL NOT NULL,
            speed REAL NOT NULL,
            efficiency REAL NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
        )
    ''')
    
    # Create alerts table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vehicle_id INTEGER NOT NULL,
            alert_type TEXT NOT NULL,
            severity TEXT NOT NULL,
            message TEXT NOT NULL,
            resolved INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
        )
    ''')
    
    conn.commit()
    conn.close()

def seed_data():
    """Seed sample data if database is empty"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if vehicles exist
    cursor.execute("SELECT COUNT(*) FROM vehicles")
    if cursor.fetchone()[0] > 0:
        conn.close()
        return
    
    # Sample vehicles
    vehicles = [
        ("TRK-001", "John Smith", "truck", "active", 75.5, 65.0, 40.7128, -74.0060, 1, 10.5, 120),
        ("TRK-002", "Emily Johnson", "truck", "idle", 45.2, 0.0, 40.7580, -73.9855, 0, 11.2, 120),
        ("VAN-001", "Mike Davis", "van", "active", 88.0, 45.0, 40.7484, -73.9857, 1, 14.0, 80),
        ("VAN-002", "Sarah Wilson", "van", "maintenance", 30.0, 0.0, 40.7614, -73.9776, 0, 13.5, 80),
        ("SDN-001", "Robert Brown", "sedan", "active", 92.3, 72.0, 40.7282, -73.7949, 1, 18.0, 50),
        ("SDN-002", "Lisa Garcia", "sedan", "idle", 60.0, 0.0, 40.6892, -74.0445, 0, 17.5, 50),
    ]
    
    for v in vehicles:
        cursor.execute('''
            INSERT INTO vehicles (vehicle_id, driver_name, vehicle_type, status, current_fuel, 
                                current_speed, latitude, longitude, engine_on, baseline_efficiency, tank_capacity)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', v)
    
    conn.commit()
    
    # Generate telemetry history for each vehicle
    cursor.execute("SELECT id, current_fuel, latitude, longitude, baseline_efficiency FROM vehicles")
    vehicles_data = cursor.fetchall()
    
    for vehicle in vehicles_data:
        vid = vehicle[0]
        base_fuel = vehicle[1]
        lat = vehicle[2]
        lon = vehicle[3]
        efficiency = vehicle[4]
        
        # Generate 24 hours of telemetry (one entry per hour)
        for i in range(24, 0, -1):
            timestamp = (datetime.now() - timedelta(hours=i)).isoformat()
            fuel = max(20, base_fuel + random.uniform(-15, 10) - (24-i)*0.5)
            speed = random.uniform(0, 90)
            eff = efficiency + random.uniform(-2, 2)
            lat_var = lat + random.uniform(-0.01, 0.01)
            lon_var = lon + random.uniform(-0.01, 0.01)
            
            cursor.execute('''
                INSERT INTO telemetry (vehicle_id, fuel_level, speed, efficiency, latitude, longitude, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (vid, fuel, speed, eff, lat_var, lon_var, timestamp))
    
    # Generate some alerts
    alert_types = [
        ("low_fuel", "warning", "Fuel level below 30%"),
        ("speeding", "critical", "Vehicle exceeded speed limit (80 km/h)"),
        ("idle_time", "info", "Vehicle idle for more than 30 minutes"),
        ("maintenance_due", "warning", "Scheduled maintenance required"),
        ("harsh_braking", "warning", "Harsh braking detected"),
        ("geofence_exit", "critical", "Vehicle exited designated area"),
    ]
    
    for vehicle in vehicles_data:
        # Add 2-4 random alerts per vehicle
        num_alerts = random.randint(2, 4)
        used_types = random.sample(alert_types, num_alerts)
        
        for alert in used_types:
            hours_ago = random.randint(1, 48)
            timestamp = (datetime.now() - timedelta(hours=hours_ago)).isoformat()
            resolved = random.choice([0, 0, 1])  # 33% chance resolved
            
            cursor.execute('''
                INSERT INTO alerts (vehicle_id, alert_type, severity, message, resolved, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (vehicle[0], alert[0], alert[1], alert[2], resolved, timestamp))
    
    conn.commit()
    conn.close()
    print("Database seeded with sample data!")

# ----- API Endpoints -----

@app.on_event("startup")
async def startup():
    """Initialize database on startup"""
    init_db()
    seed_data()

# Root - serve index.html
@app.get("/")
async def root():
    return FileResponse("static/index.html")

# Vehicle details page
@app.get("/vehicle/{vehicle_id}")
async def vehicle_page(vehicle_id: str):
    return FileResponse("static/vehicle.html")

# ----- Vehicle API -----

@app.get("/api/vehicles", response_model=List[dict])
async def get_vehicles():
    """Get all vehicles"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM vehicles ORDER BY vehicle_id")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.get("/api/vehicles/{vehicle_id}")
async def get_vehicle(vehicle_id: str):
    """Get a specific vehicle by vehicle_id"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM vehicles WHERE vehicle_id = ?", (vehicle_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    return dict(row)

@app.post("/api/vehicles")
async def create_vehicle(vehicle: VehicleCreate):
    """Create a new vehicle"""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO vehicles (vehicle_id, driver_name, vehicle_type, tank_capacity, baseline_efficiency)
            VALUES (?, ?, ?, ?, ?)
        ''', (vehicle.vehicle_id, vehicle.driver_name, vehicle.vehicle_type, 
              vehicle.tank_capacity, vehicle.baseline_efficiency))
        conn.commit()
        vehicle_id = cursor.lastrowid
        
        cursor.execute("SELECT * FROM vehicles WHERE id = ?", (vehicle_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row)
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=400, detail="Vehicle ID already exists")

@app.put("/api/vehicles/{vehicle_id}")
async def update_vehicle(vehicle_id: str, update: VehicleUpdate):
    """Update a vehicle"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if vehicle exists
    cursor.execute("SELECT id FROM vehicles WHERE vehicle_id = ?", (vehicle_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    # Build update query dynamically
    updates = []
    values = []
    
    if update.driver_name is not None:
        updates.append("driver_name = ?")
        values.append(update.driver_name)
    if update.status is not None:
        updates.append("status = ?")
        values.append(update.status)
    if update.current_fuel is not None:
        updates.append("current_fuel = ?")
        values.append(update.current_fuel)
    if update.current_speed is not None:
        updates.append("current_speed = ?")
        values.append(update.current_speed)
    if update.latitude is not None:
        updates.append("latitude = ?")
        values.append(update.latitude)
    if update.longitude is not None:
        updates.append("longitude = ?")
        values.append(update.longitude)
    if update.engine_on is not None:
        updates.append("engine_on = ?")
        values.append(1 if update.engine_on else 0)
    
    if updates:
        updates.append("updated_at = ?")
        values.append(datetime.now().isoformat())
        values.append(vehicle_id)
        
        query = f"UPDATE vehicles SET {', '.join(updates)} WHERE vehicle_id = ?"
        cursor.execute(query, values)
        conn.commit()
    
    cursor.execute("SELECT * FROM vehicles WHERE vehicle_id = ?", (vehicle_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row)

@app.delete("/api/vehicles/{vehicle_id}")
async def delete_vehicle(vehicle_id: str):
    """Delete a vehicle"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM vehicles WHERE vehicle_id = ?", (vehicle_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    vid = row[0]
    
    # Delete related data
    cursor.execute("DELETE FROM telemetry WHERE vehicle_id = ?", (vid,))
    cursor.execute("DELETE FROM alerts WHERE vehicle_id = ?", (vid,))
    cursor.execute("DELETE FROM vehicles WHERE id = ?", (vid,))
    conn.commit()
    conn.close()
    
    return {"message": "Vehicle deleted successfully"}

# ----- Telemetry API -----

@app.get("/api/vehicles/{vehicle_id}/telemetry")
async def get_vehicle_telemetry(vehicle_id: str, limit: int = 24):
    """Get telemetry history for a vehicle"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Get vehicle ID
    cursor.execute("SELECT id FROM vehicles WHERE vehicle_id = ?", (vehicle_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    vid = row[0]
    
    cursor.execute('''
        SELECT * FROM telemetry 
        WHERE vehicle_id = ? 
        ORDER BY timestamp DESC 
        LIMIT ?
    ''', (vid, limit))
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]

@app.post("/api/vehicles/{vehicle_id}/telemetry")
async def add_telemetry(vehicle_id: str):
    """Add a new telemetry entry (simulates real-time data)"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM vehicles WHERE vehicle_id = ?", (vehicle_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    vehicle = dict(row)
    
    # Generate telemetry based on current state
    fuel = max(0, vehicle['current_fuel'] + random.uniform(-2, 0.5))
    speed = vehicle['current_speed'] + random.uniform(-10, 10) if vehicle['engine_on'] else 0
    speed = max(0, min(120, speed))
    efficiency = vehicle['baseline_efficiency'] + random.uniform(-1, 1)
    lat = vehicle['latitude'] + random.uniform(-0.001, 0.001) if vehicle['engine_on'] else vehicle['latitude']
    lon = vehicle['longitude'] + random.uniform(-0.001, 0.001) if vehicle['engine_on'] else vehicle['longitude']
    
    cursor.execute('''
        INSERT INTO telemetry (vehicle_id, fuel_level, speed, efficiency, latitude, longitude)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (vehicle['id'], fuel, speed, efficiency, lat, lon))
    
    # Update vehicle current state
    cursor.execute('''
        UPDATE vehicles SET current_fuel = ?, current_speed = ?, latitude = ?, longitude = ?, updated_at = ?
        WHERE id = ?
    ''', (fuel, speed, lat, lon, datetime.now().isoformat(), vehicle['id']))
    
    conn.commit()
    
    # Return the new telemetry entry
    telemetry_id = cursor.lastrowid
    cursor.execute("SELECT * FROM telemetry WHERE id = ?", (telemetry_id,))
    new_row = cursor.fetchone()
    conn.close()
    
    return dict(new_row)

# ----- Alerts API -----

@app.get("/api/vehicles/{vehicle_id}/alerts")
async def get_vehicle_alerts(vehicle_id: str, resolved: Optional[bool] = None):
    """Get alerts for a vehicle"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Get vehicle ID
    cursor.execute("SELECT id FROM vehicles WHERE vehicle_id = ?", (vehicle_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    vid = row[0]
    
    if resolved is None:
        cursor.execute('''
            SELECT * FROM alerts 
            WHERE vehicle_id = ? 
            ORDER BY created_at DESC
        ''', (vid,))
    else:
        cursor.execute('''
            SELECT * FROM alerts 
            WHERE vehicle_id = ? AND resolved = ?
            ORDER BY created_at DESC
        ''', (vid, 1 if resolved else 0))
    
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]

@app.put("/api/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: int):
    """Mark an alert as resolved"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM alerts WHERE id = ?", (alert_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Alert not found")
    
    cursor.execute("UPDATE alerts SET resolved = 1 WHERE id = ?", (alert_id,))
    conn.commit()
    
    cursor.execute("SELECT * FROM alerts WHERE id = ?", (alert_id,))
    row = cursor.fetchone()
    conn.close()
    
    return dict(row)

# ----- Dashboard Stats -----

@app.get("/api/stats")
async def get_stats():
    """Get dashboard statistics"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Total vehicles
    cursor.execute("SELECT COUNT(*) FROM vehicles")
    total_vehicles = cursor.fetchone()[0]
    
    # Active vehicles
    cursor.execute("SELECT COUNT(*) FROM vehicles WHERE status = 'active'")
    active_vehicles = cursor.fetchone()[0]
    
    # Vehicles needing fuel (below 30%)
    cursor.execute("SELECT COUNT(*) FROM vehicles WHERE current_fuel < 30")
    low_fuel_count = cursor.fetchone()[0]
    
    # Unresolved alerts
    cursor.execute("SELECT COUNT(*) FROM alerts WHERE resolved = 0")
    unresolved_alerts = cursor.fetchone()[0]
    
    # Average fuel level
    cursor.execute("SELECT AVG(current_fuel) FROM vehicles")
    avg_fuel = cursor.fetchone()[0] or 0
    
    # Vehicles by status
    cursor.execute("SELECT status, COUNT(*) FROM vehicles GROUP BY status")
    status_counts = {row[0]: row[1] for row in cursor.fetchall()}
    
    conn.close()
    
    return {
        "total_vehicles": total_vehicles,
        "active_vehicles": active_vehicles,
        "low_fuel_count": low_fuel_count,
        "unresolved_alerts": unresolved_alerts,
        "avg_fuel": round(avg_fuel, 1),
        "status_breakdown": status_counts
    }

# Mount static files (must be after API routes)
os.makedirs("static/js", exist_ok=True)
os.makedirs("static/css", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/js", StaticFiles(directory="static/js"), name="js")
app.mount("/css", StaticFiles(directory="static/css"), name="css")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
