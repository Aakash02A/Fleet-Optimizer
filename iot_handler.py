"""
FleetPulse IoT Handler
Handles real-time telemetry from ESP32 devices.
"""

import sqlite3
from datetime import datetime

DATABASE = 'fleetpulse.db'
REAL_VEHICLE_ID = 'TN01AB1234'


def get_db():
    """Get database connection with row factory."""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


class IoTTelemetryHandler:
    """Process IoT telemetry payloads and status checks."""

    @staticmethod
    def validate_vehicle(vehicle_id):
        return vehicle_id == REAL_VEHICLE_ID

    @staticmethod
    def _create_alert(cursor, vehicle_id, severity, title, message):
        cursor.execute(
            '''
            SELECT COUNT(*) AS cnt FROM alerts
            WHERE vehicle_id = ? AND title = ?
              AND datetime(created_at) > datetime('now', '-30 seconds')
            ''',
            (vehicle_id, title),
        )
        if cursor.fetchone()['cnt'] == 0:
            cursor.execute(
                '''
                INSERT INTO alerts (vehicle_id, severity, title, message)
                VALUES (?, ?, ?, ?)
                ''',
                (vehicle_id, severity, title, message),
            )

    @staticmethod
    def receive_telemetry(data):
        """
        Expected payload:
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
            cursor.execute(
                '''
                SELECT fuel FROM vehicle_telemetry
                WHERE vehicle_id = ?
                ORDER BY id DESC LIMIT 1
                ''',
                (vehicle_id,),
            )
            prev = cursor.fetchone()
            prev_fuel = prev['fuel'] if prev else 100

            fuel = float(data.get('fuel', 0))
            efficiency = float(data.get('efficiency', 12))
            range_val = float(data.get('range', 0))
            lat = float(data.get('lat', 13.0827))
            lon = float(data.get('lon', 80.2707))
            alert_type = str(data.get('alert', 'NORMAL')).upper()

            status_map = {
                'NORMAL': 'normal',
                'LOW_FUEL': 'warning',
                'THEFT': 'danger',
            }
            status = status_map.get(alert_type, 'normal')

            cursor.execute(
                '''
                INSERT INTO vehicle_telemetry
                (vehicle_id, fuel, efficiency, estimated_range, latitude, longitude,
                 speed, heading, engine_status, gps_status, status, distance_today, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ''',
                (vehicle_id, fuel, efficiency, range_val, lat, lon,
                 0, 'N', 'Running', 'Strong', status, 0),
            )

            cursor.execute(
                '''
                INSERT INTO fuel_history (vehicle_id, fuel_level, timestamp)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ''',
                (vehicle_id, fuel),
            )

            if alert_type == 'LOW_FUEL' and prev_fuel > 20:
                IoTTelemetryHandler._create_alert(
                    cursor,
                    vehicle_id,
                    'warning',
                    'Low Fuel Alert (IoT)',
                    f'Real vehicle {vehicle_id} fuel is low: {fuel:.1f}%',
                )
            elif alert_type == 'THEFT':
                IoTTelemetryHandler._create_alert(
                    cursor,
                    vehicle_id,
                    'danger',
                    'Fuel Theft Alert (IoT)',
                    f'Real vehicle {vehicle_id} sudden fuel drop detected!',
                )

            conn.commit()
            return {
                'success': True,
                'vehicle_id': vehicle_id,
                'fuel': fuel,
                'status': status,
                'timestamp': datetime.now().isoformat(),
                'source': 'IOT_REAL',
            }, 200
        except Exception as exc:
            conn.rollback()
            return {'error': str(exc)}, 500
        finally:
            conn.close()

    @staticmethod
    def get_iot_status(vehicle_id):
        if vehicle_id != REAL_VEHICLE_ID:
            return {'is_iot': False, 'vehicle_id': vehicle_id}

        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            '''
            SELECT timestamp FROM vehicle_telemetry
            WHERE vehicle_id = ?
            ORDER BY id DESC LIMIT 1
            ''',
            (vehicle_id,),
        )
        row = cursor.fetchone()
        conn.close()

        if not row:
            return {
                'is_iot': True,
                'vehicle_id': vehicle_id,
                'last_update': None,
                'seconds_ago': None,
                'connected': False,
            }

        last_update = datetime.fromisoformat(row['timestamp'])
        seconds_ago = int((datetime.now() - last_update).total_seconds())
        return {
            'is_iot': True,
            'vehicle_id': vehicle_id,
            'last_update': row['timestamp'],
            'seconds_ago': seconds_ago,
            'connected': seconds_ago < 10,
        }


def handle_iot_telemetry(data):
    return IoTTelemetryHandler.receive_telemetry(data)


def is_real_iot_vehicle(vehicle_id):
    return vehicle_id == REAL_VEHICLE_ID
