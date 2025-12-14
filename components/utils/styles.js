/**
 * Lightview Components - Style Utilities
 * Load external CSS files or inject inline styles for components
 */

const loadedStylesheets = new Set();
const injectedStyles = new Set();

/**
 * Load an external CSS stylesheet for a component (deduplicated)
 * Automatically resolves the CSS file path relative to the calling JS module
 * @param {string} jsModuleUrl - The import.meta.url of the calling module
 * @returns {Promise<void>}
 */
export const loadStylesheet = (jsModuleUrl) => {
    // Convert .js URL to .css URL
    const cssUrl = jsModuleUrl.replace(/\.js$/, '.css');
    
    if (loadedStylesheets.has(cssUrl)) return Promise.resolve();
    
    // Mark as loading immediately to prevent duplicate loads
    loadedStylesheets.add(cssUrl);
    
    return new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = cssUrl;
        link.id = `lv-${cssUrl.split('/').pop().replace('.css', '')}-styles`;
        
        link.onload = () => resolve();
        link.onerror = () => {
            loadedStylesheets.delete(cssUrl);
            reject(new Error(`Failed to load stylesheet: ${cssUrl}`));
        };
        
        document.head.appendChild(link);
    });
};

/**
 * Synchronously load stylesheet (fire and forget, no await needed)
 * @param {string} jsModuleUrl - The import.meta.url of the calling module
 */
export const loadStylesheetSync = (jsModuleUrl) => {
    const cssUrl = jsModuleUrl.replace(/\.js$/, '.css');
    
    if (loadedStylesheets.has(cssUrl)) return;
    
    loadedStylesheets.add(cssUrl);
    
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssUrl;
    link.id = `lv-${cssUrl.split('/').pop().replace('.css', '')}-styles`;
    
    document.head.appendChild(link);
};

/**
 * Check if a stylesheet has been loaded
 * @param {string} jsModuleUrl 
 * @returns {boolean}
 */
export const hasStylesheet = (jsModuleUrl) => {
    const cssUrl = jsModuleUrl.replace(/\.js$/, '.css');
    return loadedStylesheets.has(cssUrl);
};

/**
 * Remove a loaded stylesheet
 * @param {string} jsModuleUrl 
 */
export const removeStylesheet = (jsModuleUrl) => {
    const cssUrl = jsModuleUrl.replace(/\.js$/, '.css');
    const filename = cssUrl.split('/').pop().replace('.css', '');
    const link = document.getElementById(`lv-${filename}-styles`);
    if (link) {
        link.remove();
        loadedStylesheets.delete(cssUrl);
    }
};

/**
 * Inject CSS styles for a component (deduplicated by component name)
 * @param {string} componentName - Unique identifier for the component
 * @param {string} css - CSS styles to inject
 * @deprecated Use loadStylesheet() with external .css files instead
 */
export const injectStyles = (componentName, css) => {
    if (injectedStyles.has(componentName)) return;
    
    const style = document.createElement('style');
    style.id = `lv-${componentName}-styles`;
    style.textContent = css;
    document.head.appendChild(style);
    
    injectedStyles.add(componentName);
};

/**
 * Check if styles have been injected for a component
 * @param {string} componentName 
 * @returns {boolean}
 */
export const hasStyles = (componentName) => injectedStyles.has(componentName);

/**
 * Remove injected styles for a component
 * @param {string} componentName 
 */
export const removeStyles = (componentName) => {
    const style = document.getElementById(`lv-${componentName}-styles`);
    if (style) {
        style.remove();
        injectedStyles.delete(componentName);
    }
};

export default { 
    loadStylesheet, 
    loadStylesheetSync, 
    hasStylesheet, 
    removeStylesheet,
    injectStyles, 
    hasStyles, 
    removeStyles 
};
