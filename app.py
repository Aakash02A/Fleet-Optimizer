"""
FleetPulse - IoT Vehicle Fuel Monitoring Backend
Python + SQLite3 REST API Server
"""

import sqlite3
import json
import os
import random
import threading
import time
from datetime import datetime, timedelta
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import re

# ============================================
# DATABASE CONFIGURATION
# ============================================
DATABASE = 'fleetpulse.db'

def get_db():
    """Get database connection with row factory"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def dict_from_row(row):
    """Convert sqlite3.Row to dictionary"""
    return dict(zip(row.keys(), row)) if row else None

# ============================================
# DATABASE INITIALIZATION
# ============================================
def init_db():
    """Initialize database with all required tables"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Vehicles table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS vehicles (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            capacity REAL DEFAULT 100,
            base_efficiency REAL DEFAULT 12,
            driver_name TEXT,
            last_service_date TEXT,
            mileage REAL DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Vehicle telemetry (real-time data)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS vehicle_telemetry (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vehicle_id TEXT NOT NULL,
            fuel REAL DEFAULT 100,
            efficiency REAL,
            estimated_range REAL,
            latitude REAL,
            longitude REAL,
            speed REAL DEFAULT 0,
            heading TEXT,
            engine_status TEXT DEFAULT 'Off',
            gps_status TEXT DEFAULT 'Unknown',
            status TEXT DEFAULT 'normal',
            distance_today REAL DEFAULT 0,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
        )
    ''')
    
    # Fuel history for charts
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS fuel_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vehicle_id TEXT NOT NULL,
            fuel_level REAL NOT NULL,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
        )
    ''')
    
    # Alerts table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vehicle_id TEXT NOT NULL,
            severity TEXT NOT NULL CHECK(severity IN ('info', 'warning', 'danger')),
            title TEXT NOT NULL,
            message TEXT,
            resolved INTEGER DEFAULT 0,
            resolved_at TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
        )
    ''')
    
    # Trips/journey history
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS trips (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vehicle_id TEXT NOT NULL,
            start_location TEXT,
            end_location TEXT,
            start_lat REAL,
            start_lon REAL,
            end_lat REAL,
            end_lon REAL,
            distance REAL,
            duration_minutes INTEGER,
            fuel_used REAL,
            efficiency REAL,
            start_time TEXT,
            end_time TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
        )
    ''')
    
    # Refuel logs
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS refuel_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vehicle_id TEXT NOT NULL,
            amount_liters REAL NOT NULL,
            cost REAL,
            odometer_reading REAL,
            location TEXT,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
        )
    ''')
    
    # Settings/configuration
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Drivers table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS drivers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            license_number TEXT,
            phone TEXT,
            email TEXT,
            assigned_vehicle_id TEXT,
            status TEXT DEFAULT 'active',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (assigned_vehicle_id) REFERENCES vehicles(id)
        )
    ''')
    
    # Create indexes for better performance
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_telemetry_vehicle ON vehicle_telemetry(vehicle_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp ON vehicle_telemetry(timestamp)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_alerts_vehicle ON alerts(vehicle_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(resolved)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_fuel_history_vehicle ON fuel_history(vehicle_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_trips_vehicle ON trips(vehicle_id)')
    
    conn.commit()
    conn.close()
    print("✓ Database initialized successfully")

def seed_sample_data():
    """Seed database with sample vehicle data"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if vehicles already exist
    cursor.execute('SELECT COUNT(*) FROM vehicles')
    if cursor.fetchone()[0] > 0:
        conn.close()
        return
    
    # Sample vehicles
    vehicles = [
        ('TN01AB1234', 'Truck A', 'Heavy Truck', 200, 12, 'John Smith'),
        ('TN02CD5678', 'Truck B', 'Heavy Truck', 200, 13, 'Mike Johnson'),
        ('TN03EF9012', 'Van C', 'Delivery Van', 80, 16, 'David Lee'),
        ('TN04GH3456', 'Truck D', 'Medium Truck', 150, 14, 'Chris Brown'),
    ]
    
    base_lat, base_lon = 13.0827, 80.2707  # Chennai
    headings = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
    
    for v in vehicles:
        # Insert vehicle
        cursor.execute('''
            INSERT INTO vehicles (id, name, type, capacity, base_efficiency, driver_name, mileage)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (v[0], v[1], v[2], v[3], v[4], v[5], random.randint(30000, 80000)))
        
        # Insert initial telemetry
        fuel = 70 + random.random() * 25
        efficiency = v[4] + (random.random() * 3 - 1.5)
        lat = base_lat + (random.random() * 0.1 - 0.05)
        lon = base_lon + (random.random() * 0.1 - 0.05)
        speed = 30 + random.random() * 40
        
        cursor.execute('''
            INSERT INTO vehicle_telemetry 
            (vehicle_id, fuel, efficiency, estimated_range, latitude, longitude, 
             speed, heading, engine_status, gps_status, status, distance_today)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (v[0], fuel, efficiency, fuel * efficiency / 100 * v[3], lat, lon,
              speed, random.choice(headings), 'Running', 'Strong', 'normal',
              random.randint(50, 200)))
        
        # Insert fuel history (24 hours)
        for i in range(24):
            ts = (datetime.now() - timedelta(hours=23-i)).isoformat()
            cursor.execute('''
                INSERT INTO fuel_history (vehicle_id, fuel_level, timestamp)
                VALUES (?, ?, ?)
            ''', (v[0], 70 + random.random() * 20, ts))
        
        # Insert sample trips
        locations = ['Warehouse A', 'Downtown Hub', 'Central Depot', 'Port Terminal', 'Client Site B']
        for i in range(5):
            start_loc = random.choice(locations)
            end_loc = random.choice([l for l in locations if l != start_loc])
            dist = random.randint(15, 50)
            dur = int(dist * 2 + random.randint(-10, 20))
            fuel_used = dist / efficiency
            
            cursor.execute('''
                INSERT INTO trips 
                (vehicle_id, start_location, end_location, distance, duration_minutes, 
                 fuel_used, efficiency, start_time, end_time)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (v[0], start_loc, end_loc, dist, dur, fuel_used, efficiency,
                  (datetime.now() - timedelta(hours=random.randint(1, 48))).isoformat(),
                  (datetime.now() - timedelta(hours=random.randint(0, 47))).isoformat()))
    
    # Insert sample drivers
    drivers = [
        ('John Smith', 'DL-1234567890', '+91-9876543210', 'john@fleet.com', 'TN01AB1234'),
        ('Mike Johnson', 'DL-2345678901', '+91-9876543211', 'mike@fleet.com', 'TN02CD5678'),
        ('David Lee', 'DL-3456789012', '+91-9876543212', 'david@fleet.com', 'TN03EF9012'),
        ('Chris Brown', 'DL-4567890123', '+91-9876543213', 'chris@fleet.com', 'TN04GH3456'),
    ]
    
    for d in drivers:
        cursor.execute('''
            INSERT INTO drivers (name, license_number, phone, email, assigned_vehicle_id)
            VALUES (?, ?, ?, ?, ?)
        ''', d)
    
    # Insert default settings
    default_settings = {
        'lowFuelThreshold': '20',
        'criticalFuelThreshold': '10',
        'suddenDropThreshold': '5',
        'updateInterval': '3000',
        'enableAlerts': 'true',
        'lowFuelAlerts': 'true',
        'theftAlerts': 'true',
        'gpsLostAlerts': 'true',
        'enableGPS': 'true',
        'fuelPricePerLiter': '102',
        'currency': 'INR'
    }
    
    for key, value in default_settings.items():
        cursor.execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', (key, value))
    
    conn.commit()
    conn.close()
    print("✓ Sample data seeded successfully")


# ============================================
# API HANDLERS
# ============================================

class VehicleAPI:
    """Vehicle-related API operations"""
    
    @staticmethod
    def get_all():
        """Get all vehicles with latest telemetry"""
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT v.*, t.fuel, t.efficiency, t.estimated_range, t.latitude, t.longitude,
                   t.speed, t.heading, t.engine_status, t.gps_status, t.status, 
                   t.distance_today, t.timestamp as last_update
            FROM vehicles v
            LEFT JOIN vehicle_telemetry t ON v.id = t.vehicle_id
            WHERE t.id = (SELECT MAX(id) FROM vehicle_telemetry WHERE vehicle_id = v.id)
            ORDER BY v.name
        ''')
        rows = cursor.fetchall()
        conn.close()
        return [dict_from_row(row) for row in rows]
    
    @staticmethod
    def get_by_id(vehicle_id):
        """Get specific vehicle with full details"""
        conn = get_db()
        cursor = conn.cursor()
        
        # Get vehicle with latest telemetry
        cursor.execute('''
            SELECT v.*, t.fuel, t.efficiency, t.estimated_range, t.latitude, t.longitude,
                   t.speed, t.heading, t.engine_status, t.gps_status, t.status, 
                   t.distance_today, t.timestamp as last_update
            FROM vehicles v
            LEFT JOIN vehicle_telemetry t ON v.id = t.vehicle_id
            WHERE v.id = ? AND t.id = (SELECT MAX(id) FROM vehicle_telemetry WHERE vehicle_id = v.id)
        ''', (vehicle_id,))
        vehicle = dict_from_row(cursor.fetchone())
        
        if vehicle:
            # Get fuel history
            cursor.execute('''
                SELECT fuel_level, timestamp FROM fuel_history 
                WHERE vehicle_id = ? ORDER BY timestamp DESC LIMIT 24
            ''', (vehicle_id,))
            vehicle['fuel_history'] = [dict_from_row(r) for r in cursor.fetchall()]
            
            # Get recent alerts
            cursor.execute('''
                SELECT * FROM alerts WHERE vehicle_id = ? 
                ORDER BY created_at DESC LIMIT 10
            ''', (vehicle_id,))
            vehicle['alerts'] = [dict_from_row(r) for r in cursor.fetchall()]
            
            # Get recent trips
            cursor.execute('''
                SELECT * FROM trips WHERE vehicle_id = ? 
                ORDER BY created_at DESC LIMIT 5
            ''', (vehicle_id,))
            vehicle['recent_trips'] = [dict_from_row(r) for r in cursor.fetchall()]
        
        conn.close()
        return vehicle
    
    @staticmethod
    def create(data):
        """Create a new vehicle"""
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO vehicles (id, name, type, capacity, base_efficiency, driver_name, mileage)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (data['id'], data['name'], data['type'], 
              data.get('capacity', 100), data.get('base_efficiency', 12),
              data.get('driver_name'), data.get('mileage', 0)))
        
        # Initialize telemetry
        cursor.execute('''
            INSERT INTO vehicle_telemetry 
            (vehicle_id, fuel, efficiency, latitude, longitude, status)
            VALUES (?, 100, ?, 13.0827, 80.2707, 'normal')
        ''', (data['id'], data.get('base_efficiency', 12)))
        
        conn.commit()
        conn.close()
        return {'success': True, 'id': data['id']}
    
    @staticmethod
    def update(vehicle_id, data):
        """Update vehicle information"""
        conn = get_db()
        cursor = conn.cursor()
        
        updates = []
        values = []
        for key in ['name', 'type', 'capacity', 'base_efficiency', 'driver_name', 'mileage']:
            if key in data:
                updates.append(f'{key} = ?')
                values.append(data[key])
        
        if updates:
            values.append(vehicle_id)
            cursor.execute(f'''
                UPDATE vehicles SET {', '.join(updates)}, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', values)
        
        conn.commit()
        conn.close()
        return {'success': True}
    
    @staticmethod
    def delete(vehicle_id):
        """Delete a vehicle and related data"""
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM vehicle_telemetry WHERE vehicle_id = ?', (vehicle_id,))
        cursor.execute('DELETE FROM fuel_history WHERE vehicle_id = ?', (vehicle_id,))
        cursor.execute('DELETE FROM alerts WHERE vehicle_id = ?', (vehicle_id,))
        cursor.execute('DELETE FROM trips WHERE vehicle_id = ?', (vehicle_id,))
        cursor.execute('DELETE FROM refuel_logs WHERE vehicle_id = ?', (vehicle_id,))
        cursor.execute('DELETE FROM vehicles WHERE id = ?', (vehicle_id,))
        
        conn.commit()
        conn.close()
        return {'success': True}
    
    @staticmethod
    def update_telemetry(vehicle_id, data):
        """Update vehicle telemetry data"""
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO vehicle_telemetry 
            (vehicle_id, fuel, efficiency, estimated_range, latitude, longitude,
             speed, heading, engine_status, gps_status, status, distance_today)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (vehicle_id, data.get('fuel'), data.get('efficiency'),
              data.get('estimated_range'), data.get('latitude'), data.get('longitude'),
              data.get('speed'), data.get('heading'), data.get('engine_status'),
              data.get('gps_status'), data.get('status'), data.get('distance_today')))
        
        # Also log fuel history
        if 'fuel' in data:
            cursor.execute('''
                INSERT INTO fuel_history (vehicle_id, fuel_level) VALUES (?, ?)
            ''', (vehicle_id, data['fuel']))
        
        conn.commit()
        conn.close()
        return {'success': True}


class AlertAPI:
    """Alert-related API operations"""
    
    @staticmethod
    def get_all(resolved=None, severity=None):
        """Get all alerts with optional filters"""
        conn = get_db()
        cursor = conn.cursor()
        
        query = 'SELECT a.*, v.name as vehicle_name FROM alerts a JOIN vehicles v ON a.vehicle_id = v.id'
        conditions = []
        params = []
        
        if resolved is not None:
            conditions.append('a.resolved = ?')
            params.append(1 if resolved else 0)
        
        if severity:
            conditions.append('a.severity = ?')
            params.append(severity)
        
        if conditions:
            query += ' WHERE ' + ' AND '.join(conditions)
        
        query += ' ORDER BY a.created_at DESC LIMIT 200'
        
        cursor.execute(query, params)
        alerts = [dict_from_row(row) for row in cursor.fetchall()]
        conn.close()
        return alerts
    
    @staticmethod
    def create(data):
        """Create a new alert"""
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO alerts (vehicle_id, severity, title, message)
            VALUES (?, ?, ?, ?)
        ''', (data['vehicle_id'], data['severity'], data['title'], data.get('message', '')))
        
        alert_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return {'success': True, 'id': alert_id}
    
    @staticmethod
    def resolve(alert_id):
        """Resolve an alert"""
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE alerts SET resolved = 1, resolved_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (alert_id,))
        
        conn.commit()
        conn.close()
        return {'success': True}
    
    @staticmethod
    def clear_resolved():
        """Clear all resolved alerts"""
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM alerts WHERE resolved = 1')
        deleted = cursor.rowcount
        
        conn.commit()
        conn.close()
        return {'success': True, 'deleted': deleted}
    
    @staticmethod
    def get_counts():
        """Get alert counts by severity"""
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN resolved = 0 THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN severity = 'danger' THEN 1 ELSE 0 END) as critical,
                SUM(CASE WHEN severity = 'warning' THEN 1 ELSE 0 END) as warnings,
                SUM(CASE WHEN severity = 'info' THEN 1 ELSE 0 END) as info
            FROM alerts
        ''')
        
        result = dict_from_row(cursor.fetchone())
        conn.close()
        return result


class ReportsAPI:
    """Reports and analytics API"""
    
    @staticmethod
    def get_summary():
        """Get fleet summary statistics"""
        conn = get_db()
        cursor = conn.cursor()
        
        # Fleet stats
        cursor.execute('SELECT COUNT(*) as total_vehicles FROM vehicles')
        total_vehicles = cursor.fetchone()[0]
        
        cursor.execute('''
            SELECT 
                SUM(distance_today) as total_distance,
                AVG(fuel) as avg_fuel,
                AVG(efficiency) as avg_efficiency,
                SUM(CASE WHEN status = 'normal' THEN 1 ELSE 0 END) as normal_count,
                SUM(CASE WHEN status = 'warning' THEN 1 ELSE 0 END) as warning_count,
                SUM(CASE WHEN status = 'danger' THEN 1 ELSE 0 END) as danger_count
            FROM vehicle_telemetry t
            WHERE t.id IN (SELECT MAX(id) FROM vehicle_telemetry GROUP BY vehicle_id)
        ''')
        stats = dict_from_row(cursor.fetchone())
        
        # Calculate total fuel consumed (from capacity - current fuel)
        cursor.execute('''
            SELECT SUM((100 - t.fuel) / 100 * v.capacity) as total_consumed
            FROM vehicles v
            JOIN vehicle_telemetry t ON v.id = t.vehicle_id
            WHERE t.id IN (SELECT MAX(id) FROM vehicle_telemetry GROUP BY vehicle_id)
        ''')
        total_consumed = cursor.fetchone()[0] or 0
        
        # Recent alerts count
        cursor.execute('SELECT COUNT(*) FROM alerts WHERE resolved = 0')
        active_alerts = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            'total_vehicles': total_vehicles,
            'total_distance': round(stats['total_distance'] or 0, 1),
            'total_fuel_consumed': round(total_consumed, 1),
            'avg_fuel_level': round(stats['avg_fuel'] or 0, 1),
            'avg_efficiency': round(stats['avg_efficiency'] or 0, 1),
            'vehicles_by_status': {
                'normal': stats['normal_count'] or 0,
                'warning': stats['warning_count'] or 0,
                'danger': stats['danger_count'] or 0
            },
            'active_alerts': active_alerts
        }
    
    @staticmethod
    def get_fuel_report(period='day'):
        """Get fuel consumption report"""
        conn = get_db()
        cursor = conn.cursor()
        
        # Determine time filter
        if period == 'week':
            time_filter = "datetime('now', '-7 days')"
        elif period == 'month':
            time_filter = "datetime('now', '-30 days')"
        else:
            time_filter = "datetime('now', '-1 day')"
        
        # Fuel consumption by vehicle
        cursor.execute(f'''
            SELECT v.id, v.name, v.capacity,
                   (SELECT fuel_level FROM fuel_history 
                    WHERE vehicle_id = v.id 
                    AND timestamp >= {time_filter}
                    ORDER BY timestamp ASC LIMIT 1) as start_fuel,
                   (SELECT fuel_level FROM fuel_history 
                    WHERE vehicle_id = v.id 
                    ORDER BY timestamp DESC LIMIT 1) as end_fuel
            FROM vehicles v
        ''')
        
        breakdown = []
        for row in cursor.fetchall():
            r = dict_from_row(row)
            start = r['start_fuel'] or 100
            end = r['end_fuel'] or 100
            consumed = max(0, (start - end) / 100 * r['capacity'])
            breakdown.append({
                'vehicle_id': r['id'],
                'vehicle_name': r['name'],
                'consumed': round(consumed, 1)
            })
        
        conn.close()
        return {
            'period': period,
            'breakdown': breakdown,
            'total': round(sum(b['consumed'] for b in breakdown), 1)
        }
    
    @staticmethod
    def get_efficiency_report():
        """Get efficiency trends report"""
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT v.id, v.name, v.base_efficiency,
                   t.efficiency as current_efficiency
            FROM vehicles v
            JOIN vehicle_telemetry t ON v.id = t.vehicle_id
            WHERE t.id IN (SELECT MAX(id) FROM vehicle_telemetry GROUP BY vehicle_id)
            ORDER BY t.efficiency DESC
        ''')
        
        trends = []
        for row in cursor.fetchall():
            r = dict_from_row(row)
            diff = r['current_efficiency'] - r['base_efficiency']
            trends.append({
                'vehicle_id': r['id'],
                'vehicle_name': r['name'],
                'base': r['base_efficiency'],
                'current': round(r['current_efficiency'], 1),
                'difference': round(diff, 1),
                'status': 'good' if diff >= 0 else 'poor'
            })
        
        conn.close()
        return {'trends': trends}


class SettingsAPI:
    """Settings API operations"""
    
    @staticmethod
    def get_all():
        """Get all settings"""
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT key, value FROM settings')
        
        settings = {}
        for row in cursor.fetchall():
            key = row['key']
            value = row['value']
            # Convert string booleans and numbers
            if value.lower() in ('true', 'false'):
                settings[key] = value.lower() == 'true'
            elif value.isdigit():
                settings[key] = int(value)
            else:
                try:
                    settings[key] = float(value)
                except ValueError:
                    settings[key] = value
        
        conn.close()
        return settings
    
    @staticmethod
    def update(data):
        """Update settings"""
        conn = get_db()
        cursor = conn.cursor()
        
        for key, value in data.items():
            cursor.execute('''
                INSERT OR REPLACE INTO settings (key, value, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
            ''', (key, str(value)))
        
        conn.commit()
        conn.close()
        return {'success': True}


class TripsAPI:
    """Trips API operations"""
    
    @staticmethod
    def get_all(vehicle_id=None, limit=50):
        """Get trips with optional vehicle filter"""
        conn = get_db()
        cursor = conn.cursor()
        
        if vehicle_id:
            cursor.execute('''
                SELECT t.*, v.name as vehicle_name 
                FROM trips t JOIN vehicles v ON t.vehicle_id = v.id
                WHERE t.vehicle_id = ?
                ORDER BY t.created_at DESC LIMIT ?
            ''', (vehicle_id, limit))
        else:
            cursor.execute('''
                SELECT t.*, v.name as vehicle_name 
                FROM trips t JOIN vehicles v ON t.vehicle_id = v.id
                ORDER BY t.created_at DESC LIMIT ?
            ''', (limit,))
        
        trips = [dict_from_row(row) for row in cursor.fetchall()]
        conn.close()
        return trips
    
    @staticmethod
    def create(data):
        """Log a new trip"""
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO trips 
            (vehicle_id, start_location, end_location, start_lat, start_lon,
             end_lat, end_lon, distance, duration_minutes, fuel_used, efficiency,
             start_time, end_time)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (data['vehicle_id'], data.get('start_location'), data.get('end_location'),
              data.get('start_lat'), data.get('start_lon'),
              data.get('end_lat'), data.get('end_lon'),
              data.get('distance'), data.get('duration_minutes'),
              data.get('fuel_used'), data.get('efficiency'),
              data.get('start_time'), data.get('end_time')))
        
        trip_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return {'success': True, 'id': trip_id}


class RefuelAPI:
    """Refuel logs API operations"""
    
    @staticmethod
    def get_all(vehicle_id=None, limit=50):
        """Get refuel logs"""
        conn = get_db()
        cursor = conn.cursor()
        
        if vehicle_id:
            cursor.execute('''
                SELECT r.*, v.name as vehicle_name 
                FROM refuel_logs r JOIN vehicles v ON r.vehicle_id = v.id
                WHERE r.vehicle_id = ?
                ORDER BY r.timestamp DESC LIMIT ?
            ''', (vehicle_id, limit))
        else:
            cursor.execute('''
                SELECT r.*, v.name as vehicle_name 
                FROM refuel_logs r JOIN vehicles v ON r.vehicle_id = v.id
                ORDER BY r.timestamp DESC LIMIT ?
            ''', (limit,))
        
        logs = [dict_from_row(row) for row in cursor.fetchall()]
        conn.close()
        return logs
    
    @staticmethod
    def create(data):
        """Log a refuel event"""
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO refuel_logs 
            (vehicle_id, amount_liters, cost, odometer_reading, location)
            VALUES (?, ?, ?, ?, ?)
        ''', (data['vehicle_id'], data['amount_liters'], 
              data.get('cost'), data.get('odometer_reading'), data.get('location')))
        
        log_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return {'success': True, 'id': log_id}


class DriversAPI:
    """Drivers API operations"""
    
    @staticmethod
    def get_all():
        """Get all drivers"""
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT d.*, v.name as vehicle_name 
            FROM drivers d 
            LEFT JOIN vehicles v ON d.assigned_vehicle_id = v.id
            ORDER BY d.name
        ''')
        drivers = [dict_from_row(row) for row in cursor.fetchall()]
        conn.close()
        return drivers
    
    @staticmethod
    def create(data):
        """Create a new driver"""
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO drivers (name, license_number, phone, email, assigned_vehicle_id)
            VALUES (?, ?, ?, ?, ?)
        ''', (data['name'], data.get('license_number'), data.get('phone'),
              data.get('email'), data.get('assigned_vehicle_id')))
        
        driver_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return {'success': True, 'id': driver_id}
    
    @staticmethod
    def update(driver_id, data):
        """Update driver information"""
        conn = get_db()
        cursor = conn.cursor()
        
        updates = []
        values = []
        for key in ['name', 'license_number', 'phone', 'email', 'assigned_vehicle_id', 'status']:
            if key in data:
                updates.append(f'{key} = ?')
                values.append(data[key])
        
        if updates:
            values.append(driver_id)
            cursor.execute(f'UPDATE drivers SET {", ".join(updates)} WHERE id = ?', values)
        
        conn.commit()
        conn.close()
        return {'success': True}
    
    @staticmethod
    def delete(driver_id):
        """Delete a driver"""
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM drivers WHERE id = ?', (driver_id,))
        conn.commit()
        conn.close()
        return {'success': True}


# ============================================
# SIMULATION ENGINE (for demo/testing)
# ============================================

class SimulationEngine:
    """Simulates real-time vehicle data updates"""
    
    def __init__(self):
        self.running = False
        self.thread = None
    
    def start(self, interval=3):
        """Start simulation"""
        if self.running:
            return
        
        self.running = True
        self.thread = threading.Thread(target=self._run, args=(interval,), daemon=True)
        self.thread.start()
        print(f"✓ Simulation started (interval: {interval}s)")
    
    def stop(self):
        """Stop simulation"""
        self.running = False
        print("✓ Simulation stopped")
    
    def _run(self, interval):
        """Simulation loop"""
        while self.running:
            try:
                self._update_vehicles()
            except Exception as e:
                print(f"Simulation error: {e}")
            time.sleep(interval)
    
    def _update_vehicles(self):
        """Update all vehicle telemetry"""
        conn = get_db()
        cursor = conn.cursor()
        
        # Get settings
        cursor.execute('SELECT key, value FROM settings')
        settings = {row['key']: row['value'] for row in cursor.fetchall()}
        
        low_fuel = float(settings.get('lowFuelThreshold', 20))
        critical_fuel = float(settings.get('criticalFuelThreshold', 10))
        sudden_drop = float(settings.get('suddenDropThreshold', 5))
        
        # Get all vehicles with current telemetry
        cursor.execute('''
            SELECT v.id, v.name, v.base_efficiency, v.capacity, 
                   t.fuel, t.latitude, t.longitude, t.distance_today
            FROM vehicles v
            JOIN vehicle_telemetry t ON v.id = t.vehicle_id
            WHERE t.id IN (SELECT MAX(id) FROM vehicle_telemetry GROUP BY vehicle_id)
        ''')
        
        headings = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
        
        for row in cursor.fetchall():
            vehicle = dict_from_row(row)
            prev_fuel = vehicle['fuel']
            
            # Natural consumption (0.1 - 0.5% per update)
            consumption = 0.1 + random.random() * 0.4
            new_fuel = max(0, prev_fuel - consumption)
            
            # Random refuel (1% chance if below 50%)
            if random.random() < 0.01 and new_fuel < 50:
                refuel_amount = 30 + random.random() * 40
                new_fuel = min(100, new_fuel + refuel_amount)
                self._create_alert(cursor, vehicle['id'], 'info', 'Refuel Detected',
                                   f"{vehicle['name']} refueled +{refuel_amount:.1f}%")
            
            # Sudden drop (0.5% chance)
            if random.random() < 0.005 and new_fuel > 20:
                drop_amount = sudden_drop + random.random() * 5
                new_fuel = max(0, new_fuel - drop_amount)
                self._create_alert(cursor, vehicle['id'], 'danger', 'Sudden Fuel Drop',
                                   f"{vehicle['name']}: {drop_amount:.1f}% sudden drop - possible theft!")
            
            # Calculate new values
            efficiency = vehicle['base_efficiency'] + (random.random() * 3 - 1.5)
            estimated_range = (new_fuel / 100) * vehicle['capacity'] * efficiency
            new_lat = vehicle['latitude'] + (random.random() - 0.5) * 0.001
            new_lon = vehicle['longitude'] + (random.random() - 0.5) * 0.001
            speed = 20 + random.random() * 60
            heading = random.choice(headings)
            distance = vehicle['distance_today'] + speed * (3 / 3600)  # 3 second update
            
            # Determine status
            if new_fuel <= critical_fuel:
                status = 'danger'
                if prev_fuel > critical_fuel:
                    self._create_alert(cursor, vehicle['id'], 'danger', 'Critical Fuel Level',
                                       f"{vehicle['name']} is critically low at {new_fuel:.1f}%")
            elif new_fuel <= low_fuel:
                status = 'warning'
                if prev_fuel > low_fuel:
                    self._create_alert(cursor, vehicle['id'], 'warning', 'Low Fuel Warning',
                                       f"{vehicle['name']} dropped below {low_fuel}%")
            else:
                status = 'normal'
            
            # Insert new telemetry
            cursor.execute('''
                INSERT INTO vehicle_telemetry 
                (vehicle_id, fuel, efficiency, estimated_range, latitude, longitude,
                 speed, heading, engine_status, gps_status, status, distance_today)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Running', 'Strong', ?, ?)
            ''', (vehicle['id'], new_fuel, efficiency, estimated_range,
                  new_lat, new_lon, speed, heading, status, distance))
            
            # Log fuel history
            cursor.execute('INSERT INTO fuel_history (vehicle_id, fuel_level) VALUES (?, ?)',
                          (vehicle['id'], new_fuel))
        
        conn.commit()
        conn.close()
    
    def _create_alert(self, cursor, vehicle_id, severity, title, message):
        """Create an alert if not duplicate"""
        cursor.execute('''
            SELECT COUNT(*) FROM alerts 
            WHERE vehicle_id = ? AND title = ? 
            AND datetime(created_at) > datetime('now', '-30 seconds')
        ''', (vehicle_id, title))
        
        if cursor.fetchone()[0] == 0:
            cursor.execute('''
                INSERT INTO alerts (vehicle_id, severity, title, message)
                VALUES (?, ?, ?, ?)
            ''', (vehicle_id, severity, title, message))


# Global simulation instance
simulation = SimulationEngine()


# ============================================
# HTTP REQUEST HANDLER
# ============================================

class FleetPulseHandler(SimpleHTTPRequestHandler):
    """HTTP request handler for FleetPulse API"""
    
    def __init__(self, *args, **kwargs):
        # Set the directory to serve static files from
        super().__init__(*args, directory='.', **kwargs)
    
    def do_GET(self):
        """Handle GET requests"""
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)
        
        # API Routes
        if path.startswith('/api/'):
            self.handle_api_get(path, query)
        else:
            # Serve static files
            super().do_GET()
    
    def do_POST(self):
        """Handle POST requests"""
        parsed = urlparse(self.path)
        path = parsed.path
        
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else '{}'
        
        try:
            data = json.loads(body) if body else {}
        except json.JSONDecodeError:
            self.send_error_response(400, 'Invalid JSON')
            return
        
        self.handle_api_post(path, data)
    
    def do_PUT(self):
        """Handle PUT requests"""
        parsed = urlparse(self.path)
        path = parsed.path
        
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else '{}'
        
        try:
            data = json.loads(body) if body else {}
        except json.JSONDecodeError:
            self.send_error_response(400, 'Invalid JSON')
            return
        
        self.handle_api_put(path, data)
    
    def do_DELETE(self):
        """Handle DELETE requests"""
        parsed = urlparse(self.path)
        path = parsed.path
        self.handle_api_delete(path)
    
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()
    
    def handle_api_get(self, path, query):
        """Route GET API requests"""
        try:
            # Vehicles
            if path == '/api/vehicles':
                result = VehicleAPI.get_all()
            elif re.match(r'/api/vehicles/[^/]+$', path):
                vehicle_id = path.split('/')[-1]
                result = VehicleAPI.get_by_id(vehicle_id)
                if not result:
                    self.send_error_response(404, 'Vehicle not found')
                    return
            
            # Alerts
            elif path == '/api/alerts':
                resolved = query.get('resolved', [None])[0]
                severity = query.get('severity', [None])[0]
                if resolved:
                    resolved = resolved.lower() == 'true'
                result = AlertAPI.get_all(resolved, severity)
            elif path == '/api/alerts/counts':
                result = AlertAPI.get_counts()
            
            # Reports
            elif path == '/api/reports/summary':
                result = ReportsAPI.get_summary()
            elif path == '/api/reports/fuel':
                period = query.get('period', ['day'])[0]
                result = ReportsAPI.get_fuel_report(period)
            elif path == '/api/reports/efficiency':
                result = ReportsAPI.get_efficiency_report()
            
            # Settings
            elif path == '/api/settings':
                result = SettingsAPI.get_all()
            
            # Trips
            elif path == '/api/trips':
                vehicle_id = query.get('vehicle_id', [None])[0]
                limit = int(query.get('limit', [50])[0])
                result = TripsAPI.get_all(vehicle_id, limit)
            
            # Refuel logs
            elif path == '/api/refuels':
                vehicle_id = query.get('vehicle_id', [None])[0]
                limit = int(query.get('limit', [50])[0])
                result = RefuelAPI.get_all(vehicle_id, limit)
            
            # Drivers
            elif path == '/api/drivers':
                result = DriversAPI.get_all()
            
            # Simulation control
            elif path == '/api/simulation/start':
                interval = int(query.get('interval', [3])[0])
                simulation.start(interval)
                result = {'success': True, 'message': 'Simulation started'}
            elif path == '/api/simulation/stop':
                simulation.stop()
                result = {'success': True, 'message': 'Simulation stopped'}
            elif path == '/api/simulation/status':
                result = {'running': simulation.running}
            
            else:
                self.send_error_response(404, 'Endpoint not found')
                return
            
            self.send_json_response(result)
            
        except Exception as e:
            self.send_error_response(500, str(e))
    
    def handle_api_post(self, path, data):
        """Route POST API requests"""
        try:
            # Vehicles
            if path == '/api/vehicles':
                result = VehicleAPI.create(data)
            elif re.match(r'/api/vehicles/[^/]+/telemetry$', path):
                vehicle_id = path.split('/')[-2]
                result = VehicleAPI.update_telemetry(vehicle_id, data)
            
            # Alerts
            elif path == '/api/alerts':
                result = AlertAPI.create(data)
            
            # Trips
            elif path == '/api/trips':
                result = TripsAPI.create(data)
            
            # Refuels
            elif path == '/api/refuels':
                result = RefuelAPI.create(data)
            
            # Drivers
            elif path == '/api/drivers':
                result = DriversAPI.create(data)
            
            else:
                self.send_error_response(404, 'Endpoint not found')
                return
            
            self.send_json_response(result, 201)
            
        except Exception as e:
            self.send_error_response(500, str(e))
    
    def handle_api_put(self, path, data):
        """Route PUT API requests"""
        try:
            # Vehicles
            if re.match(r'/api/vehicles/[^/]+$', path):
                vehicle_id = path.split('/')[-1]
                result = VehicleAPI.update(vehicle_id, data)
            
            # Alerts
            elif re.match(r'/api/alerts/\d+/resolve$', path):
                alert_id = int(path.split('/')[-2])
                result = AlertAPI.resolve(alert_id)
            
            # Settings
            elif path == '/api/settings':
                result = SettingsAPI.update(data)
            
            # Drivers
            elif re.match(r'/api/drivers/\d+$', path):
                driver_id = int(path.split('/')[-1])
                result = DriversAPI.update(driver_id, data)
            
            else:
                self.send_error_response(404, 'Endpoint not found')
                return
            
            self.send_json_response(result)
            
        except Exception as e:
            self.send_error_response(500, str(e))
    
    def handle_api_delete(self, path):
        """Route DELETE API requests"""
        try:
            # Vehicles
            if re.match(r'/api/vehicles/[^/]+$', path):
                vehicle_id = path.split('/')[-1]
                result = VehicleAPI.delete(vehicle_id)
            
            # Alerts
            elif path == '/api/alerts/resolved':
                result = AlertAPI.clear_resolved()
            
            # Drivers
            elif re.match(r'/api/drivers/\d+$', path):
                driver_id = int(path.split('/')[-1])
                result = DriversAPI.delete(driver_id)
            
            else:
                self.send_error_response(404, 'Endpoint not found')
                return
            
            self.send_json_response(result)
            
        except Exception as e:
            self.send_error_response(500, str(e))
    
    def send_json_response(self, data, status=200):
        """Send JSON response with CORS headers"""
        self.send_response(status)
        self.send_cors_headers()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data, default=str).encode('utf-8'))
    
    def send_error_response(self, status, message):
        """Send error response"""
        self.send_response(status)
        self.send_cors_headers()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': message}).encode('utf-8'))
    
    def send_cors_headers(self):
        """Send CORS headers"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
    
    def log_message(self, format, *args):
        """Custom log format"""
        if args[1] != '200':  # Only log non-200 responses
            print(f"[{datetime.now().strftime('%H:%M:%S')}] {args[0]} - {args[1]}")


# ============================================
# MAIN ENTRY POINT
# ============================================

def run_server(port=8000):
    """Start the FleetPulse server"""
    print("\n" + "="*50)
    print("    FleetPulse - IoT Vehicle Fuel Monitoring")
    print("="*50)
    
    # Initialize database
    init_db()
    seed_sample_data()
    
    # Start simulation
    simulation.start(interval=3)
    
    # Start HTTP server
    server = HTTPServer(('0.0.0.0', port), FleetPulseHandler)
    
    print(f"\n✓ Server running at http://localhost:{port}")
    print(f"✓ API available at http://localhost:{port}/api/")
    print("\nAPI Endpoints:")
    print("  GET  /api/vehicles          - List all vehicles")
    print("  GET  /api/vehicles/<id>     - Get vehicle details")
    print("  POST /api/vehicles          - Create vehicle")
    print("  PUT  /api/vehicles/<id>     - Update vehicle")
    print("  DELETE /api/vehicles/<id>   - Delete vehicle")
    print("")
    print("  GET  /api/alerts            - List alerts")
    print("  POST /api/alerts            - Create alert")
    print("  PUT  /api/alerts/<id>/resolve - Resolve alert")
    print("  DELETE /api/alerts/resolved - Clear resolved")
    print("")
    print("  GET  /api/reports/summary   - Fleet summary")
    print("  GET  /api/reports/fuel      - Fuel report")
    print("  GET  /api/reports/efficiency - Efficiency report")
    print("")
    print("  GET  /api/settings          - Get settings")
    print("  PUT  /api/settings          - Update settings")
    print("")
    print("  GET  /api/trips             - List trips")
    print("  GET  /api/refuels           - List refuels")
    print("  GET  /api/drivers           - List drivers")
    print("")
    print("  GET  /api/simulation/start  - Start simulation")
    print("  GET  /api/simulation/stop   - Stop simulation")
    print("  GET  /api/simulation/status - Simulation status")
    print("\nPress Ctrl+C to stop the server\n")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n\n✓ Server stopped")
        simulation.stop()
        server.shutdown()


if __name__ == '__main__':
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    run_server(port)
