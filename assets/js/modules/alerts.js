/**
 * FleetPulse Alerts Module
 * Alert management and notification handling
 */

import { CONFIG } from '../config.js';
import { State } from '../state.js';
import { DOM } from '../dom.js';
import { formatTime, getAlertIcon } from '../utils.js';

/**
 * Add a new alert to the system
 */
function addAlert(vehicleId, severity, title, message) {
    if (!CONFIG.notifications.enableAlerts) return;
    
    const alert = {
        id: Date.now() + Math.random(),
        vehicleId,
        severity,
        title,
        message,
        timestamp: Date.now(),
        resolved: false
    };
    
    // Check for duplicate alerts (same vehicle, same title within 30 seconds)
    const isDuplicate = State.alerts.some(a => 
        a.vehicleId === vehicleId && 
        a.title === title && 
        Date.now() - a.timestamp < 30000
    );
    
    if (!isDuplicate) {
        State.alerts.unshift(alert);
        State.alertHistory.unshift(alert);
        State.vehicles[vehicleId].alerts.push(alert);
        
        // Keep alerts manageable
        if (State.alerts.length > 50) State.alerts.pop();
        if (State.alertHistory.length > 200) State.alertHistory.pop();
        
        updateAlertBadge();
    }
}

/**
 * Update the alert badge count in navigation
 */
function updateAlertBadge() {
    const activeCount = State.alerts.filter(a => !a.resolved).length;
    DOM.navAlertBadge.textContent = activeCount;
    DOM.navAlertBadge.style.display = activeCount > 0 ? 'inline' : 'none';
}

/**
 * Update dashboard alerts panel
 */
function updateDashboardAlerts() {
    const vehicle = State.vehicles[State.selectedVehicle];
    const vehicleAlerts = State.alerts.filter(a => a.vehicleId === vehicle.id).slice(0, 5);
    
    DOM.alertCount.textContent = vehicleAlerts.length + ' Active';
    
    if (vehicleAlerts.length === 0) {
        DOM.alertEmpty.style.display = 'flex';
        DOM.alertsList.innerHTML = '';
        DOM.alertsList.appendChild(DOM.alertEmpty);
    } else {
        DOM.alertEmpty.style.display = 'none';
        DOM.alertsList.innerHTML = vehicleAlerts.map(alert => `
            <div class="alert-item ${alert.severity}">
                <div class="alert-icon">
                    ${getAlertIcon(alert.severity)}
                </div>
                <div class="alert-content">
                    <div class="alert-title">${alert.title}</div>
                    <div class="alert-message">${alert.message}</div>
                    <div class="alert-time">${formatTime(alert.timestamp)}</div>
                </div>
            </div>
        `).join('');
    }
}

/**
 * Render alerts center module
 */
function renderAlertsCenter(filter = 'all') {
    let alerts = [...State.alertHistory];
    
    if (filter !== 'all') {
        alerts = alerts.filter(a => a.severity === filter);
    }
    
    if (alerts.length === 0) {
        DOM.alertsCenterList.innerHTML = `
            <div class="alert-center-empty">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                    <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.709 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.07 2.85999" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>No alerts in this category</span>
            </div>
        `;
        return;
    }
    
    DOM.alertsCenterList.innerHTML = alerts.slice(0, 50).map(alert => {
        const vehicle = State.vehicles[alert.vehicleId];
        return `
            <div class="alert-center-item ${alert.severity}">
                <div class="alert-center-icon">
                    ${getAlertIcon(alert.severity)}
                </div>
                <div class="alert-center-content">
                    <div class="alert-center-header">
                        <span class="alert-center-title">${alert.title}</span>
                        <span class="alert-center-time">${formatTime(alert.timestamp)}</span>
                    </div>
                    <div class="alert-center-message">${alert.message}</div>
                    <div class="alert-center-vehicle">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <path d="M16 3H1V16H16V3Z" stroke="currentColor" stroke-width="2"/>
                            <path d="M16 8H20L23 11V16H16V8Z" stroke="currentColor" stroke-width="2"/>
                            <circle cx="5.5" cy="18.5" r="2.5" stroke="currentColor" stroke-width="2"/>
                            <circle cx="18.5" cy="18.5" r="2.5" stroke="currentColor" stroke-width="2"/>
                        </svg>
                        ${vehicle ? vehicle.name : alert.vehicleId}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

export { addAlert, updateAlertBadge, updateDashboardAlerts, renderAlertsCenter };
