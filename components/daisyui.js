/**
 * Lightview Components - DaisyUI Integration
 * This module ensures DaisyUI CSS is loaded and provides utilities for components
 */

const DAISYUI_CDN = 'https://cdn.jsdelivr.net/npm/daisyui@4.12.10/dist/full.min.css';
const TAILWIND_CDN = 'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4';

let daisyLoaded = false;
let tailwindLoaded = false;

// ============= ADOPTED STYLESHEETS SUPPORT =============
// Cached CSSStyleSheet objects for efficient shadow DOM usage

let daisyStyleSheet = null;
let daisyStyleSheetPromise = null;
const componentStyleSheets = new Map(); // Cache for component CSS
const componentStyleSheetPromises = new Map();

/**
 * Get a CSSStyleSheet for DaisyUI (for use with adoptedStyleSheets)
 * Fetches and parses CSS once, caches for reuse
 * @returns {Promise<CSSStyleSheet>}
 */
export const getDaisyStyleSheet = async () => {
    // Return cached sheet if available
    if (daisyStyleSheet) {
        return daisyStyleSheet;
    }

    // Return existing promise if fetch is in progress
    if (daisyStyleSheetPromise) {
        return daisyStyleSheetPromise;
    }

    // Fetch and create the stylesheet
    daisyStyleSheetPromise = (async () => {
        try {
            const response = await fetch(DAISYUI_CDN);
            if (!response.ok) {
                throw new Error(`Failed to fetch DaisyUI CSS: ${response.status}`);
            }
            const cssText = await response.text();

            const sheet = new CSSStyleSheet();
            sheet.replaceSync(cssText);
            daisyStyleSheet = sheet;
            return sheet;
        } catch (e) {
            console.error('Lightview: Failed to create DaisyUI adoptedStyleSheet:', e);
            daisyStyleSheetPromise = null; // Allow retry
            throw e;
        }
    })();

    return daisyStyleSheetPromise;
};

/**
 * Get a CSSStyleSheet for a component's CSS file
 * @param {string} cssUrl - URL to the component's CSS file
 * @returns {Promise<CSSStyleSheet>}
 */
export const getComponentStyleSheet = async (cssUrl) => {
    // Return cached sheet if available
    if (componentStyleSheets.has(cssUrl)) {
        return componentStyleSheets.get(cssUrl);
    }

    // Return existing promise if fetch is in progress
    if (componentStyleSheetPromises.has(cssUrl)) {
        return componentStyleSheetPromises.get(cssUrl);
    }

    // Fetch and create the stylesheet
    const promise = (async () => {
        try {
            const response = await fetch(cssUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch component CSS: ${response.status}`);
            }
            const cssText = await response.text();

            const sheet = new CSSStyleSheet();
            sheet.replaceSync(cssText);
            componentStyleSheets.set(cssUrl, sheet);
            return sheet;
        } catch (e) {
            console.error(`Lightview: Failed to create adoptedStyleSheet for ${cssUrl}:`, e);
            componentStyleSheetPromises.delete(cssUrl); // Allow retry
            throw e;
        }
    })();

    componentStyleSheetPromises.set(cssUrl, promise);
    return promise;
};

/**
 * Synchronously get cached DaisyUI stylesheet (returns null if not yet loaded)
 * Use getDaisyStyleSheet() first to ensure it's loaded
 * @returns {CSSStyleSheet|null}
 */
export const getDaisyStyleSheetSync = () => daisyStyleSheet;

/**
 * Synchronously get cached component stylesheet (returns null if not yet loaded)
 * @param {string} cssUrl
 * @returns {CSSStyleSheet|null}
 */
export const getComponentStyleSheetSync = (cssUrl) => componentStyleSheets.get(cssUrl) || null;

/**
 * Pre-load all stylesheets needed for shadow DOM components
 * Call this early in your app initialization for best performance
 * @param {string[]} componentCssUrls - Optional array of component CSS URLs to preload
 * @returns {Promise<void>}
 */
export const preloadShadowStyles = async (componentCssUrls = []) => {
    const promises = [getDaisyStyleSheet()];
    for (const url of componentCssUrls) {
        promises.push(getComponentStyleSheet(url));
    }
    await Promise.all(promises);
};

/**
 * Ensure DaisyUI CSS is loaded from CDN
 */
export const ensureDaisyUI = () => {
    if (daisyLoaded) return Promise.resolve();

    return new Promise((resolve) => {
        // Check if already loaded
        if (document.querySelector('link[href*="daisyui"]')) {
            daisyLoaded = true;
            resolve();
            return;
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = DAISYUI_CDN;
        link.id = 'daisyui-styles';
        link.onload = () => {
            daisyLoaded = true;
            resolve();
        };
        link.onerror = () => {
            console.warn('Failed to load DaisyUI from CDN');
            resolve();
        };
        document.head.appendChild(link);
    });
};

/**
 * Ensure Tailwind CSS Browser is loaded (for utility classes)
 */
export const ensureTailwind = () => {
    if (tailwindLoaded) return Promise.resolve();

    return new Promise((resolve) => {
        // Check if already loaded
        if (document.querySelector('script[src*="tailwindcss/browser"]')) {
            tailwindLoaded = true;
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = TAILWIND_CDN;
        script.id = 'tailwind-browser';
        script.onload = () => {
            tailwindLoaded = true;
            resolve();
        };
        script.onerror = () => {
            console.warn('Failed to load Tailwind Browser from CDN');
            resolve();
        };
        document.head.appendChild(script);
    });
};

/**
 * Ensure all themes are loaded
 */
export const ensureThemes = () => {
    return new Promise((resolve) => {
        if (document.querySelector('link[href*="daisyui"][href*="themes"]')) {
            resolve();
            return;
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `${DAISYUI_CDN}/themes.css`;
        link.id = 'daisyui-themes';
        link.onload = () => resolve();
        link.onerror = () => resolve();
        document.head.appendChild(link);
    });
};

/**
 * Initialize DaisyUI with optional Tailwind utilities
 * @param {Object} options
 * @param {boolean} options.tailwind - Whether to load Tailwind Browser (default: true)
 * @param {boolean} options.themes - Whether to load all themes (default: false)
 */
export const init = async (options = {}) => {
    const { tailwind = true, themes = false } = options;

    const promises = [ensureDaisyUI()];
    if (tailwind) promises.push(ensureTailwind());
    if (themes) promises.push(ensureThemes());

    await Promise.all(promises);
};

/**
 * Set the current theme
 * @param {string} theme - Theme name (e.g., 'light', 'dark', 'cupcake', 'cyberpunk')
 */
export const setTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
};

/**
 * Get the current theme
 * @returns {string}
 */
export const getTheme = () => {
    return document.documentElement.getAttribute('data-theme') || 'light';
};

/**
 * Toggle between light and dark themes
 */
export const toggleTheme = () => {
    const current = getTheme();
    setTheme(current === 'dark' ? 'light' : 'dark');
};

/**
 * Available DaisyUI themes
 */
export const themes = [
    'light', 'dark', 'cupcake', 'bumblebee', 'emerald', 'corporate',
    'synthwave', 'retro', 'cyberpunk', 'valentine', 'halloween', 'garden',
    'forest', 'aqua', 'lofi', 'pastel', 'fantasy', 'wireframe', 'black',
    'luxury', 'dracula', 'cmyk', 'autumn', 'business', 'acid', 'lemonade',
    'night', 'coffee', 'winter', 'dim', 'nord', 'sunset'
];

/**
 * Color variants available for components
 */
export const colors = ['primary', 'secondary', 'accent', 'neutral', 'info', 'success', 'warning', 'error'];

/**
 * Size variants available for components
 */
export const sizes = ['xs', 'sm', 'md', 'lg'];

// Note: Auto-initialization removed. Use one of:
// - LightviewX.initComponents() for shadow DOM components (recommended)
// - daisyui.init() for light DOM usage with global DaisyUI styles

export default {
    init,
    ensureDaisyUI,
    ensureTailwind,
    ensureThemes,
    setTheme,
    getTheme,
    toggleTheme,
    themes,
    colors,
    sizes,
    // Shadow DOM / Adopted Stylesheets
    getDaisyStyleSheet,
    getComponentStyleSheet,
    getDaisyStyleSheetSync,
    getComponentStyleSheetSync,
    preloadShadowStyles
};
