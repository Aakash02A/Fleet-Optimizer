/**
 * FleetPulse Utility Functions
 * Shared helper functions
 */

/**
 * Format timestamp to time string
 */
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/**
 * Get alert icon SVG based on severity
 */
function getAlertIcon(severity) {
    const icons = {
        danger: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 9V13M12 17H12.01M5.07 19H18.93C20.4 19 21.36 17.44 20.63 16.18L13.7 4.18C12.97 2.93 11.03 2.93 10.3 4.18L3.37 16.18C2.64 17.44 3.6 19 5.07 19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        warning: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 9V13M12 17H12.01M5.07 19H18.93C20.4 19 21.36 17.44 20.63 16.18L13.7 4.18C12.97 2.93 11.03 2.93 10.3 4.18L3.37 16.18C2.64 17.44 3.6 19 5.07 19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 16V12M12 8H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
    };
    return icons[severity] || icons.info;
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
        </button>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => toast.remove(), 5000);
}

export { formatTime, getAlertIcon, showToast };
