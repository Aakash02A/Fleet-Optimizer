/**
 * FleetPulse API Service
 * Connects frontend to Python backend
 */

const API_BASE = 'http://localhost:8000/api';

// Configuration
const APIConfig = {
    useBackend: true,  // Enable backend by default
    timeout: 10000,
    autoDetect: true,  // Auto-detect backend availability
    backendAvailable: false
};

/**
 * Generic fetch wrapper with error handling
 */
async function apiRequest(endpoint, options = {}) {
    if (!APIConfig.useBackend) {
        return null; // Use local simulation
    }
    
    const url = `${API_BASE}${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
        },
        ...options
    };
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), APIConfig.timeout);
        
        const response = await fetch(url, {
            ...config,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('API request timeout:', endpoint);
        } else {
            console.error('API request failed:', endpoint, error);
        }
        throw error;
    }
}

// ============================================
// VEHICLE API
// ============================================

const VehicleService = {
    /**
     * Get all vehicles with telemetry
     */
    async getAll() {
        return apiRequest('/vehicles');
    },
    
    /**
     * Get single vehicle with full details
     */
    async getById(vehicleId) {
        return apiRequest(`/vehicles/${vehicleId}`);
    },
    
    /**
     * Create a new vehicle
     */
    async create(vehicleData) {
        return apiRequest('/vehicles', {
            method: 'POST',
            body: JSON.stringify(vehicleData)
        });
    },
    
    /**
     * Update vehicle information
     */
    async update(vehicleId, vehicleData) {
        return apiRequest(`/vehicles/${vehicleId}`, {
            method: 'PUT',
            body: JSON.stringify(vehicleData)
        });
    },
    
    /**
     * Delete a vehicle
     */
    async delete(vehicleId) {
        return apiRequest(`/vehicles/${vehicleId}`, {
            method: 'DELETE'
        });
    },
    
    /**
     * Update vehicle telemetry
     */
    async updateTelemetry(vehicleId, telemetryData) {
        return apiRequest(`/vehicles/${vehicleId}/telemetry`, {
            method: 'POST',
            body: JSON.stringify(telemetryData)
        });
    }
};

// ============================================
// ALERTS API
// ============================================

const AlertService = {
    /**
     * Get all alerts with optional filters
     */
    async getAll(filters = {}) {
        const params = new URLSearchParams();
        if (filters.resolved !== undefined) params.append('resolved', filters.resolved);
        if (filters.severity) params.append('severity', filters.severity);
        
        const query = params.toString() ? `?${params.toString()}` : '';
        return apiRequest(`/alerts${query}`);
    },
    
    /**
     * Get alert counts by severity
     */
    async getCounts() {
        return apiRequest('/alerts/counts');
    },
    
    /**
     * Create a new alert
     */
    async create(alertData) {
        return apiRequest('/alerts', {
            method: 'POST',
            body: JSON.stringify(alertData)
        });
    },
    
    /**
     * Resolve an alert
     */
    async resolve(alertId) {
        return apiRequest(`/alerts/${alertId}/resolve`, {
            method: 'PUT'
        });
    },
    
    /**
     * Clear all resolved alerts
     */
    async clearResolved() {
        return apiRequest('/alerts/resolved', {
            method: 'DELETE'
        });
    }
};

// ============================================
// REPORTS API
// ============================================

const ReportsService = {
    /**
     * Get fleet summary statistics
     */
    async getSummary() {
        return apiRequest('/reports/summary');
    },
    
    /**
     * Get fuel consumption report
     */
    async getFuelReport(period = 'day') {
        return apiRequest(`/reports/fuel?period=${period}`);
    },
    
    /**
     * Get efficiency trends report
     */
    async getEfficiencyReport() {
        return apiRequest('/reports/efficiency');
    }
};

// ============================================
// SETTINGS API
// ============================================

const SettingsService = {
    /**
     * Get all settings
     */
    async getAll() {
        return apiRequest('/settings');
    },
    
    /**
     * Update settings
     */
    async update(settingsData) {
        return apiRequest('/settings', {
            method: 'PUT',
            body: JSON.stringify(settingsData)
        });
    }
};

// ============================================
// TRIPS API
// ============================================

const TripsService = {
    /**
     * Get trips with optional vehicle filter
     */
    async getAll(vehicleId = null, limit = 50) {
        const params = new URLSearchParams();
        if (vehicleId) params.append('vehicle_id', vehicleId);
        if (limit) params.append('limit', limit);
        
        const query = params.toString() ? `?${params.toString()}` : '';
        return apiRequest(`/trips${query}`);
    },
    
    /**
     * Create a trip record
     */
    async create(tripData) {
        return apiRequest('/trips', {
            method: 'POST',
            body: JSON.stringify(tripData)
        });
    }
};

// ============================================
// REFUEL API
// ============================================

const RefuelService = {
    /**
     * Get refuel logs
     */
    async getAll(vehicleId = null, limit = 50) {
        const params = new URLSearchParams();
        if (vehicleId) params.append('vehicle_id', vehicleId);
        if (limit) params.append('limit', limit);
        
        const query = params.toString() ? `?${params.toString()}` : '';
        return apiRequest(`/refuels${query}`);
    },
    
    /**
     * Log a refuel event
     */
    async create(refuelData) {
        return apiRequest('/refuels', {
            method: 'POST',
            body: JSON.stringify(refuelData)
        });
    }
};

// ============================================
// DRIVERS API
// ============================================

const DriversService = {
    /**
     * Get all drivers
     */
    async getAll() {
        return apiRequest('/drivers');
    },
    
    /**
     * Create a driver
     */
    async create(driverData) {
        return apiRequest('/drivers', {
            method: 'POST',
            body: JSON.stringify(driverData)
        });
    },
    
    /**
     * Update driver
     */
    async update(driverId, driverData) {
        return apiRequest(`/drivers/${driverId}`, {
            method: 'PUT',
            body: JSON.stringify(driverData)
        });
    },
    
    /**
     * Delete driver
     */
    async delete(driverId) {
        return apiRequest(`/drivers/${driverId}`, {
            method: 'DELETE'
        });
    }
};

// ============================================
// SIMULATION CONTROL API
// ============================================

const SimulationService = {
    /**
     * Start server-side simulation
     */
    async start(interval = 3) {
        return apiRequest(`/simulation/start?interval=${interval}`);
    },
    
    /**
     * Stop server-side simulation
     */
    async stop() {
        return apiRequest('/simulation/stop');
    },
    
    /**
     * Get simulation status
     */
    async getStatus() {
        return apiRequest('/simulation/status');
    }
};

// ============================================
// UNIFIED API OBJECT
// ============================================

const API = {
    config: APIConfig,
    vehicles: VehicleService,
    alerts: AlertService,
    reports: ReportsService,
    settings: SettingsService,
    trips: TripsService,
    refuels: RefuelService,
    drivers: DriversService,
    simulation: SimulationService,
    
    /**
     * Enable/disable backend mode
     */
    setBackendMode(enabled) {
        APIConfig.useBackend = enabled;
        console.log(`API mode: ${enabled ? 'Backend' : 'Local Simulation'}`);
    },
    
    /**
     * Check if backend is available and auto-configure
     */
    async checkBackend() {
        try {
            const response = await fetch(`${API_BASE}/simulation/status`, {
                method: 'GET',
                signal: AbortSignal.timeout(3000)
            });
            APIConfig.backendAvailable = response.ok;
            if (APIConfig.autoDetect) {
                APIConfig.useBackend = response.ok;
            }
            console.log(`Backend ${response.ok ? 'connected' : 'unavailable'}`);
            return response.ok;
        } catch {
            APIConfig.backendAvailable = false;
            if (APIConfig.autoDetect) {
                APIConfig.useBackend = false;
            }
            console.log('Backend unavailable, using local simulation');
            return false;
        }
    },
    
    /**
     * Initialize API - check backend and start
     */
    async init() {
        await this.checkBackend();
        return APIConfig.backendAvailable;
    }
};

export { 
    API, 
    APIConfig,
    VehicleService, 
    AlertService, 
    ReportsService, 
    SettingsService,
    TripsService,
    RefuelService,
    DriversService,
    SimulationService
};
