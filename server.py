from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3

app = Flask(__name__)
CORS(app)

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
        status TEXT
    )
    """)

    conn.commit()
    conn.close()

init_db()

# ---------- RECEIVE DATA FROM ESP32 ----------

@app.route('/data', methods=['POST'])
def receive_data():

    data = request.json

    vehicle_id = data["vehicle_id"]
    fuel = data["fuel"]
    lat = data["latitude"]
    lon = data["longitude"]
    status = data["status"]

    conn = sqlite3.connect("fleet.db")
    cur = conn.cursor()

    cur.execute("""
    INSERT INTO vehicles VALUES (?,?,?,?,?)
    """,(vehicle_id,fuel,lat,lon,status))

    conn.commit()
    conn.close()

    print("Received:", data)

    return jsonify({"message":"Data received"})


# ---------- SEND LATEST VEHICLE DATA TO WEBSITE ----------

@app.route('/data', methods=['GET'])
def send_latest():

    conn = sqlite3.connect("fleet.db")
    cur = conn.cursor()

    cur.execute("""
    SELECT * FROM vehicles
    ORDER BY rowid DESC
    LIMIT 1
    """)

    row = cur.fetchone()
    conn.close()

    if row is None:
        return jsonify({})

    vehicle = {
        "vehicle_id": row[0],
        "fuel": row[1],
        "latitude": row[2],
        "longitude": row[3],
        "status": row[4]
    }

    return jsonify(vehicle)


# ---------- START SERVER ----------

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=True)