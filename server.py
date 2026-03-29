from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
from pathlib import Path
import os
import threading
import webbrowser

app = Flask(__name__)
CORS(app)

UI_ROOT = Path(__file__).resolve().parent / "Fleet-Optimizer-main" / "Fleet-Optimizer-main"

# ---------- DATABASE ----------

def init_db():
    conn = sqlite3.connect("fleet.db")
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS vehicles (
        vehicle_id TEXT,
        fuel REAL,
        latitude REAL,
        longitude REAL,
        status TEXT,
        efficiency REAL,
        estimated_range REAL,       
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)

    conn.commit()
    conn.close()

init_db()

def fetch_latest_vehicle():
    conn = sqlite3.connect("fleet.db")
    cur = conn.cursor()

    cur.execute("""
    SELECT vehicle_id, fuel, latitude, longitude, status, efficiency, estimated_range, timestamp
    FROM vehicles
    ORDER BY rowid DESC
    LIMIT 1
    """)

    row = cur.fetchone()
    conn.close()

    if not row:
        return {}

    return {
        "vehicle_id": row[0],
        "fuel": row[1],
        "latitude": row[2],
        "longitude": row[3],
        "status": row[4],
        "efficiency": row[5],
        "estimated_range": row[6],
        "timestamp": row[7]
    }


# ---------- UI ROUTES ----------

@app.route('/')
def serve_ui_index():
    return send_from_directory(UI_ROOT, 'index.html')


@app.route('/assets/<path:filename>')
def serve_assets(filename):
    return send_from_directory(UI_ROOT / 'assets', filename)


@app.route('/views/<path:filename>')
def serve_views(filename):
    return send_from_directory(UI_ROOT / 'views', filename)


# ---------- RECEIVE / READ DATA ----------

@app.route('/data', methods=['POST', 'GET'])
def handle_data():
    if request.method == 'GET':
        return jsonify(fetch_latest_vehicle())

    data = request.json or {}

    vehicle_id = data.get("vehicle_id")
    fuel = data.get("fuel")
    lat = data.get("latitude")
    lon = data.get("longitude")
    status = data.get("status")
    efficiency = data.get("efficiency")
    range_val = data.get("estimated_range")

    conn = sqlite3.connect("fleet.db")
    cur = conn.cursor()

    cur.execute("""
    INSERT INTO vehicles (vehicle_id, fuel, latitude, longitude, status, efficiency, estimated_range)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (vehicle_id, fuel, lat, lon, status, efficiency, range_val))

    conn.commit()
    conn.close()

    print("Received:", data)

    return jsonify({"message": "Data stored"})


# ---------- GET LATEST DATA ----------

@app.route('/latest', methods=['GET'])
def get_latest():
    return jsonify(fetch_latest_vehicle())


# ---------- GET HISTORY (FOR GRAPH) ----------

@app.route('/history', methods=['GET'])
def get_history():

    conn = sqlite3.connect("fleet.db")
    cur = conn.cursor()

    cur.execute("""
    SELECT fuel, timestamp FROM vehicles
    ORDER BY rowid DESC
    LIMIT 20
    """)

    rows = cur.fetchall()
    conn.close()

    data = [{"fuel": r[0], "time": r[1]} for r in rows[::-1]]

    return jsonify(data)


# ---------- START SERVER ----------

if __name__ == "__main__":
    def open_dashboard():
        webbrowser.open_new("http://127.0.0.1:5000/")

    # In debug mode, open only from the reloader child process.
    if os.environ.get("WERKZEUG_RUN_MAIN") == "true":
        threading.Timer(1.0, open_dashboard).start()

    app.run(host="0.0.0.0", port=5000, debug=True)