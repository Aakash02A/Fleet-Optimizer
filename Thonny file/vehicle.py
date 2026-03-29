from machine import ADC, Pin, UART, I2C
import network
import urequests
import json
import time
import ssd1306

# ---------------- CONFIG ----------------

VEHICLE_ID = "VEH_001"

SSID = "RAHUL1"
PASSWORD = "34567890"

SERVER_URL = "http://192.168.137.1:5000/data"
HEADERS = {"Content-Type": "application/json"}

THEFT_THRESHOLD = 10
REFUEL_THRESHOLD = 8

previous_fuel = 0

# ---------------- SENSOR ----------------

fuel_sensor = ADC(Pin(34))
fuel_sensor.atten(ADC.ATTN_11DB)

# ---------------- LEDs ----------------

green = Pin(2, Pin.OUT)
blue = Pin(4, Pin.OUT)
red = Pin(15, Pin.OUT)

# ---------------- GPS (SIMULATED) ----------------

lat = 11.27307
lon = 78.16175

def get_gps():
    global lat, lon
    lat += 0.0001
    lon += 0.0001
    return lat, lon

# ---------------- OLED ----------------

i2c = I2C(0, scl=Pin(22), sda=Pin(21))
oled = ssd1306.SSD1306_I2C(128, 64, i2c)

# ---------------- WIFI ----------------

def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    wlan.connect(SSID, PASSWORD)

    print("Connecting to WiFi...")

    while not wlan.isconnected():
        time.sleep(1)

    print("Connected:", wlan.ifconfig())

# ---------------- FUEL ----------------

def read_fuel():
    raw = fuel_sensor.read()

    EMPTY = 1200
    FULL = 3000

    fuel_percent = ((raw - EMPTY) / (FULL - EMPTY)) * 100

    fuel_percent = max(0, min(100, fuel_percent))

    print("Fuel:", fuel_percent)

    return fuel_percent

# ---------------- LED STATUS ----------------

def update_leds(fuel):

    green.off()
    blue.off()
    red.off()

    if fuel > 55:
        green.on()
    elif fuel > 30:
        blue.on()
    else:
        red.on()

# ---------------- EVENT DETECTION ----------------

def detect_events(current_fuel):

    global previous_fuel

    status = "normal"

    if previous_fuel != 0:

        drop = previous_fuel - current_fuel
        rise = current_fuel - previous_fuel

        if drop > THEFT_THRESHOLD and current_fuel < previous_fuel:
            status = "fuel_theft"

        elif rise > REFUEL_THRESHOLD:
            status = "refuel"

    previous_fuel = current_fuel

    return status

# ---------------- OLED DISPLAY ----------------

def update_display(fuel, lat, lon, status):

    oled.fill(0)

    if status == "fuel_theft":
        oled.text("!!! ALERT !!!", 20, 10)
        oled.text("FUEL THEFT", 25, 30)

    elif status == "refuel":
        oled.text("REFUEL EVENT", 15, 20)

    else:
        oled.text("Fleet System", 0, 0)
        oled.text("Fuel:{:.1f}%".format(fuel), 0, 20)
        oled.text("Lat:{:.2f}".format(lat), 0, 35)
        oled.text("Lon:{:.2f}".format(lon), 0, 50)

    oled.show()

# ---------------- SEND DATA ----------------

def send_data(fuel, lat, lon, status):

    data = {
        "vehicle_id": VEHICLE_ID,
        "fuel": round(fuel, 2),
        "efficiency": 15,
        "estimated_range": round(fuel * 15, 2),
        "latitude": lat,
        "longitude": lon,
        "speed": 0,
        "engine_status": "ON",
        "gps_status": "ACTIVE",
        "status": status
    }

    try:
        r = urequests.post(SERVER_URL, json=data)
        r.close()
        print("Data sent:", status)

    except Exception as e:
        print("Server error:", e)

# ---------------- MAIN ----------------

connect_wifi()

while True:

    fuel = read_fuel()

    lat, lon = get_gps()

    status = detect_events(fuel)

    update_leds(fuel)

    update_display(fuel, lat, lon, status)

    send_data(fuel, lat, lon, status)

    print("Fuel:", fuel, "Status:", status)

    # Power-efficient delay
    time.sleep(5)