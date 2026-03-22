/**
 * FleetPulse Reports Module
 * Analytics and reporting functionality
 */

import { VEHICLE_PROFILES } from '../config.js';
import { State, getAllVehicles } from '../state.js';
import { DOM } from '../dom.js';

/**
 * Render reports module with analytics
 */
function renderReports() {
    const vehicles = getAllVehicles();

    if (vehicles.length === 0) {
        DOM.totalFuelConsumed.textContent = '0';
        DOM.totalDistance.textContent = '0';
        DOM.fuelBreakdown.innerHTML = '<div class="breakdown-item"><span class="breakdown-label">No live data yet</span><span class="breakdown-value">--</span></div>';
        DOM.efficiencyTrends.innerHTML = '<div class="trend-item"><span class="trend-vehicle">No live data yet</span></div>';
        DOM.distanceBreakdown.innerHTML = '<div class="breakdown-item"><span class="breakdown-label">No live data yet</span><span class="breakdown-value">--</span></div>';
        DOM.alertSummaryGrid.innerHTML = `
            <div class="alert-summary-item critical">
                <div class="alert-summary-count">0</div>
                <div class="alert-summary-label">Critical</div>
            </div>
            <div class="alert-summary-item warning">
                <div class="alert-summary-count">0</div>
                <div class="alert-summary-label">Warnings</div>
            </div>
            <div class="alert-summary-item info">
                <div class="alert-summary-count">0</div>
                <div class="alert-summary-label">Info</div>
            </div>
        `;
        return;
    }
    
    // Calculate totals
    const totalFuel = vehicles.reduce((sum, v) => {
        const capacity = VEHICLE_PROFILES[v.id]?.capacity || v.capacity || 100;
        const consumed = (100 - v.fuel) / 100 * capacity;
        return sum + consumed;
    }, 0);
    
    const totalDist = vehicles.reduce((sum, v) => sum + v.distanceToday, 0);
    
    DOM.totalFuelConsumed.textContent = Math.round(totalFuel);
    DOM.totalDistance.textContent = Math.round(totalDist).toLocaleString();
    
    // Fuel breakdown by vehicle
    DOM.fuelBreakdown.innerHTML = vehicles.map(v => {
        const capacity = VEHICLE_PROFILES[v.id]?.capacity || v.capacity || 100;
        const consumed = ((100 - v.fuel) / 100 * capacity).toFixed(1);
        return `
            <div class="breakdown-item">
                <span class="breakdown-label">${v.name}</span>
                <span class="breakdown-value">${consumed} L</span>
            </div>
        `;
    }).join('');
    
    // Efficiency trends
    DOM.efficiencyTrends.innerHTML = vehicles.map(v => {
        const effPercent = ((v.efficiency - 8) / 12) * 100;
        return `
            <div class="trend-item">
                <span class="trend-vehicle">${v.name}</span>
                <div class="trend-bar">
                    <div class="trend-bar-fill" style="width: ${Math.min(100, Math.max(0, effPercent))}%;"></div>
                </div>
                <span class="trend-value">${v.efficiency.toFixed(1)} km/L</span>
            </div>
        `;
    }).join('');
    
    // Distance breakdown
    DOM.distanceBreakdown.innerHTML = vehicles.map(v => `
        <div class="breakdown-item">
            <span class="breakdown-label">${v.name}</span>
            <span class="breakdown-value">${Math.round(v.distanceToday)} km</span>
        </div>
    `).join('');
    
    // Alert summary
    const criticalCount = State.alertHistory.filter(a => (a.severity || a.type) === 'danger').length;
    const warningCount = State.alertHistory.filter(a => (a.severity || a.type) === 'warning').length;
    const infoCount = State.alertHistory.filter(a => (a.severity || a.type) === 'info').length;
    
    DOM.alertSummaryGrid.innerHTML = `
        <div class="alert-summary-item critical">
            <div class="alert-summary-count">${criticalCount}</div>
            <div class="alert-summary-label">Critical</div>
        </div>
        <div class="alert-summary-item warning">
            <div class="alert-summary-count">${warningCount}</div>
            <div class="alert-summary-label">Warnings</div>
        </div>
        <div class="alert-summary-item info">
            <div class="alert-summary-count">${infoCount}</div>
            <div class="alert-summary-label">Info</div>
        </div>
    `;
}

export { renderReports };
