"""
FleetPulse IoT Handler
Handles real-time telemetry from ESP32 devices
"""

import sqlite3
from datetime import datetime

DATABASE = 'fleetpulse.db'
REAL_VEHICLE_ID = "TN01AB1234"

def get_db():
    """Get database connection with row factory"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def dict_from_row(row):
    """Convert sqlite3.Row to dictionary"""
    return dict(zip(row.keys(), row)) if row else None


class IoTTelemetryHandler:
    """Handle real-time IoT telemetry from ESP32"""
    
    @staticmethod
    def validate_vehicle(vehicle_id):
        """Validate if vehicle ID is authorized for IoT updates"""
        return vehicle_id == REAL_VEHICLE_ID
    
    @staticmethod
    def receive_telemetry(data):
        """
        Receive and store IoT telemetry data from ESP32
        
        Expected JSON format:
        {
            "id": "TN01AB1234",
            "fuel": 67,
            "efficiency": 14.2,
            "range": 410,
            "lat": 13.0827,
            "lon": 80.2707,
            "alert": "LOW_FUEL" | "THEFT" | "NORMAL"
        }
        """
        vehicle_id = data.get('id')
        
        if not IoTTelemetryHandler.validate_vehicle(vehicle_id):
            return {'error': f'Unauthorized vehicle ID: {vehicle_id}'}, 403
        
        conn = get_db()
        cursor = conn.cursor()
        
        try:
            # Get previous telemetry for alert detection
            cursor.execute('''
                SELECT fuel, status FROM vehicle_telemetry 
                WHERE vehicle_id = ?
                ORDER BY id DESC LIMIT 1
            ''', (vehicle_id,))
            prev_row = cursor.fetchone()
            prev_fuel = prev_row['fuel'] if prev_row else 100
            
            # Parse telemetry data
            fuel = float(data.get('fuel', 0))
            efficiency = float(data.get('efficiency', 12))
            range_val = int(data.get('range', 0))
            lat = float(data.get('lat', 13.0827))
            lon = float(data.get('lon', 80.2707))
            alert_type = data.get('alert', 'NORMAL')
            
            # Map alert type to status
            status_map = {
                'NORMAL': 'normal',
                'LOW_FUEL': 'warning',
                'THEFT': 'danger'
            }
            status = status_map.get(alert_type, 'normal')
            
            # Insert telemetry record
            cursor.execute('''
                INSERT INTO vehicle_telemetry 
                (vehicle_id, fuel, efficiency, estimated_range, latitude, longitude,
                 speed, heading, engine_status, gps_status, status, distance_today, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ''', (vehicle_id, fuel, efficiency, range_val, lat, lon,
                  0, 'N', 'Running', 'Strong', status, 0))
            
            # Store fuel history
            cursor.execute('''
                INSERT INTO fuel_history (vehicle_id, fuel_level, timestamp)
                VALUES (?, ?, CURRENT_TIMESTAMP)
            ''', (vehicle_id, fuel))
            
            # Create alerts based on ESP32 alert type
            if alert_type == 'LOW_FUEL' and prev_fuel > 20:
                IoTTelemetryHandler._create_alert(
                    cursor, vehicle_id, 'warning', 
                    'Low Fuel Alert (IoT)',
                    f'Real vehicle {vehicle_id} fuel is low: {fuel:.1f}%'
                )
            elif alert_type == 'THEFT':
                IoTTelemetryHandler._create_alert(
                    cursor, vehicle_id, 'danger',
                    'Fuel Theft Alert (IoT)',
                    f'Real vehicle {vehicle_id} sudden fuel drop detected!'
                )
            
            conn.commit()
            
            return {
                'success': True,
                'vehicle_id': vehicle_id,
                'fuel': fuel,
                'status': status,
                'timestamp': datetime.now().isoformat(),
                'source': 'IOT_REAL'
            }, 200
            
        except Exception as e:
            conn.rollback()
            return {'error': str(e)}, 500
        finally:
            conn.close()
    
    @staticmethod
    def _create_alert(cursor, vehicle_id, severity, title, message):
        """Create an alert if not duplicate within 30 seconds"""
        cursor.execute('''
            SELECT COUNT(*) as cnt FROM alerts 
            WHERE vehicle_id = ? AND title = ? 
            AND datetime(created_at) > datetime('now', '-30 seconds')
        ''', (vehicle_id, title))
        
        if cursor.fetchone()['cnt'] == 0:
            cursor.execute('''
                INSERT INTO alerts (vehicle_id, severity, title, message)
                VALUES (?, ?, ?, ?)
            ''', (vehicle_id, severity, title, message))
    
    @staticmethod
    def get_iot_status(vehicle_id):
        """Get IoT connection status for a vehicle"""
        if vehicle_id != REAL_VEHICLE_ID:
            return {'is_iot': False, 'vehicle_id': vehicle_id}
        
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT timestamp FROM vehicle_telemetry 
            WHERE vehicle_id = ?
            ORDER BY id DESC LIMIT 1
        ''', (vehicle_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            last_update = datetime.fromisoformat(row['timestamp'])
            seconds_ago = (datetime.now() - last_update).total_seconds()
            
            return {
                'is_iot': True,
                'vehicle_id': vehicle_id,
                'last_update': row['timestamp'],
                'seconds_ago': int(seconds_ago),
                'connected': seconds_ago < 10
            }
        
        return {
            'is_iot': True,
            'vehicle_id': vehicle_id,
            'last_update': None,
            'seconds_ago': None,
            'connected': False
        }


def handle_iot_telemetry(data):
    """Entry point for IoT telemetry handling"""
    return IoTTelemetryHandler.receive_telemetry(data)


def is_real_iot_vehicle(vehicle_id):
    """Check if vehicle is the real IoT hardware"""
    return vehicle_id == REAL_VEHICLE_ID
