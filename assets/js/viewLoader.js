/**
 * FleetPulse View Loader Module
 * Dynamically loads HTML views from /views/ folder
 */

const viewsCache = {};

/**
 * Load a view HTML file
 */
async function loadView(viewName) {
    if (viewsCache[viewName]) {
        return viewsCache[viewName];
    }
    
    try {
        const response = await fetch(`views/${viewName}.html`);
        if (!response.ok) {
            throw new Error(`Failed to load view: ${viewName}`);
        }
        const html = await response.text();
        viewsCache[viewName] = html;
        return html;
    } catch (error) {
        console.error(`Error loading view ${viewName}:`, error);
        return `<div class="module-content"><p>Error loading ${viewName} view</p></div>`;
    }
}

/**
 * Load all module views into their containers
 */
async function loadAllViews() {
    const modules = ['dashboard', 'fleet', 'reports', 'alerts', 'settings'];
    
    const loadPromises = modules.map(async (module) => {
        const container = document.getElementById(`${module}Module`);
        if (container) {
            const html = await loadView(module);
            container.innerHTML = html;
        }
    });
    
    await Promise.all(loadPromises);
    console.log('FleetPulse: All views loaded');
}

export { loadView, loadAllViews };
