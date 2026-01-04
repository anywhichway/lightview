import { signal, effect, getRegistry } from './reactivity/signal.js';
import { state, getOrSet } from './reactivity/state.js';


/**
 * LIGHTVIEW-X
 * Hypermedia and Extended Reactivity for Lightview.
 */

const STANDARD_SRC_TAGS = ['img', 'script', 'iframe', 'video', 'audio', 'source', 'track', 'embed', 'input'];
const isStandardSrcTag = (tagName) => STANDARD_SRC_TAGS.includes(tagName) || tagName.startsWith('lv-');
const STANDARD_HREF_TAGS = ['a', 'area', 'base', 'link'];

const isValidTagName = (name) => typeof name === 'string' && name.length > 0 && name !== 'children';

/**
 * Checks if a URL/string uses a dangerous protocol like javascript: or data: (for navigation).
 */
const isDangerousProtocol = (url) => {
    if (!url || typeof url !== 'string') return false;
    const normalized = url.trim().toLowerCase();
    // Specifically block javascript, vbscript, and data (when used for HTML/navigation)
    return normalized.startsWith('javascript:') ||
        normalized.startsWith('vbscript:') ||
        normalized.startsWith('data:text/html') ||
        normalized.startsWith('data:application/javascript');
};

/**
 * Validates a URL before fetching content.
 * Default implementation allows same domain and its subdomains (ignoring port).
 */
const validateUrl = (url) => {
    if (!url) return false;
    // If it doesn't look like a full URL (no protocol), assume it's relative and valid
    // This avoids issues in sandboxed iframes where location.origin might be 'null'
    if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) return true;

    try {
        const base = (typeof document !== 'undefined') ? document.baseURI : globalThis.location.origin;
        // If base is 'null' (sandboxed iframe), new URL(url, 'null') will throw if url is absolute
        // But if it's absolute, we don't strictly need the base.
        const target = new URL(url, base === 'null' ? undefined : base);
        const current = globalThis.location;

        // Allow same origin (matches protocol, host, and port)
        if (target.origin === current.origin && target.origin !== 'null') return true;

        // Allow same hostname (matches host, ignores port/protocol)
        // This specifically allows different ports on the same host (e.g., localhost:3000 -> localhost:4000)
        if (target.hostname && target.hostname === current.hostname) return true;

        // Allow subdomains
        if (target.hostname && current.hostname && target.hostname.endsWith('.' + current.hostname)) return true;

        // Support local file protocol
        if (current.protocol === 'file:' && target.protocol === 'file:') return true;

        return false;
    } catch (e) {
        return false;
    }
};

/**
 * Detects if an object follows the Object DOM syntax: { tag: { attr: val, children: [...] } }
 */
const isObjectDOM = (obj) => {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj) || obj.tag || obj.domEl) return false;
    const keys = Object.keys(obj);
    return keys.length === 1 && isValidTagName(keys[0]) && typeof obj[keys[0]] === 'object';
};

/**
 * Converts Object DOM syntax into standard Lightview VDOM { tag, attributes, children }
 */
const convertObjectDOM = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(convertObjectDOM);
    if (obj.tag) return { ...obj, children: obj.children ? convertObjectDOM(obj.children) : [] };
    if (obj.domEl || !isObjectDOM(obj)) return obj;

    const tagKey = Object.keys(obj)[0];
    const content = obj[tagKey];
    const LV = typeof window !== 'undefined' ? globalThis.Lightview : (typeof globalThis !== 'undefined' ? globalThis.Lightview : null);
    const tag = (LV?.tags?._customTags?.[tagKey]) || tagKey;
    const { children, ...attributes } = content;

    return { tag, attributes, children: children ? convertObjectDOM(children) : [] };
};

// ============= COMPONENT CONFIGURATION =============
// Global configuration for Lightview components

const DAISYUI_CDN = 'https://cdn.jsdelivr.net/npm/daisyui@3.9.4/dist/full.min.css';

// Component configuration (set by initComponents)
const componentConfig = {
    initialized: false,
    shadowDefault: true,  // Default: components use shadow DOM
    daisyStyleSheet: null,
    themeStyleSheet: null, // Global theme stylesheet
    componentStyleSheets: new Map(),
    customStyleSheets: new Map() // Registry for named custom stylesheets
};

/**
 * Register a named stylesheet for use in components
 * @param {string} nameOrIdOrUrl - The name/ID/URL of the stylesheet
 * @param {string} [cssText] - Optional raw CSS content. If provided, nameOrIdOrUrl is treated as a name.
 * @returns {Promise<void>}
 */
const registerStyleSheet = async (nameOrIdOrUrl, cssText) => {
    if (componentConfig.customStyleSheets.has(nameOrIdOrUrl)) return;

    try {
        let finalCss = cssText;

        if (finalCss === undefined) {
            if (nameOrIdOrUrl.startsWith('#')) {
                // ID selector - search synchronously
                const el = document.querySelector(nameOrIdOrUrl);
                if (el) {
                    finalCss = el.textContent;
                } else {
                    throw new Error(`Style block '${nameOrIdOrUrl}' not found`);
                }
            } else {
                // Assume URL
                const response = await fetch(nameOrIdOrUrl);
                if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
                finalCss = await response.text();
            }
        }

        if (finalCss !== undefined) {
            const sheet = new CSSStyleSheet();
            sheet.replaceSync(finalCss);
            componentConfig.customStyleSheets.set(nameOrIdOrUrl, sheet);
        }
    } catch (e) {
        console.error(`LightviewX: Failed to register stylesheet '${nameOrIdOrUrl}':`, e);
    }
};

// Theme Signal
// Helper to safely get local storage
const getSavedTheme = () => {
    try {
        if (typeof localStorage !== 'undefined') {
            return localStorage.getItem('lightview-theme');
        }
    } catch (e) {
        return null;
    }
};

// Theme Signal
const themeSignal = signal(
    (typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme')) ||
    getSavedTheme() ||
    'light'
);

/**
 * Set the global theme for Lightview components (updates signal only)
 * @param {string} themeName - The name of the theme (e.g., 'light', 'dark', 'cyberpunk')
 */
const setTheme = (themeName) => {
    if (!themeName) return;

    // Determine base theme (light or dark) for the main document
    // const darkThemes = ['dark', 'aqua', 'black', 'business', 'coffee', 'dim', 'dracula', 'forest', 'halloween', 'luxury', 'night', 'sunset', 'synthwave'];
    // const baseTheme = darkThemes.includes(themeName) ? 'dark' : 'light';
    if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', themeName);
    }

    // Update signal
    if (themeSignal && themeSignal.value !== themeName) {
        themeSignal.value = themeName;
    }

    // Persist preference
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('lightview-theme', themeName);
        }
    } catch (e) {
        // Ignore storage errors
    }
};

/**
 * Register a global theme stylesheet for all components
 * @param {string} url - URL to the CSS file
 * @returns {Promise<void>}
 */
const registerThemeSheet = async (url) => {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch theme CSS: ${response.status}`);
        const cssText = await response.text();
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(cssText);
        componentConfig.themeStyleSheet = sheet;
    } catch (e) {
        console.error(`LightviewX: Failed to register theme stylesheet '${url}':`, e);
    }
};

/**
 * Initialize Lightview components
 * Preloads DaisyUI stylesheet for shadow DOM usage
 * @param {Object} options
 * @param {boolean} options.shadowDefault - Whether components use shadow DOM by default (default: true)
 * @returns {Promise<void>}
 */
const initComponents = async (options = {}) => {
    const { shadowDefault = true } = options;

    componentConfig.shadowDefault = shadowDefault;

    if (shadowDefault) {
        // Preload DaisyUI stylesheet for adopted stylesheets
        try {
            const response = await fetch(DAISYUI_CDN);
            if (!response.ok) {
                throw new Error(`Failed to fetch DaisyUI CSS: ${response.status}`);
            }
            const cssText = await response.text();
            const sheet = new CSSStyleSheet();
            sheet.replaceSync(cssText);
            componentConfig.daisyStyleSheet = sheet;
        } catch (e) {
            console.error('LightviewX: Failed to preload DaisyUI stylesheet:', e);
            // Continue without DaisyUI - components will still work, just without DaisyUI styles in shadow
        }
    }

    componentConfig.initialized = true;
};
(async () => await initComponents())();

/**
 * Get or create a CSSStyleSheet for a component's CSS file
 * @param {string} cssUrl - URL to the component's CSS file
 * @returns {Promise<CSSStyleSheet|null>}
 */
const getComponentStyleSheet = async (cssUrl) => {
    // Return cached sheet if available
    if (componentConfig.componentStyleSheets.has(cssUrl)) {
        return componentConfig.componentStyleSheets.get(cssUrl);
    }

    try {
        const response = await fetch(cssUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch component CSS: ${response.status}`);
        }
        const cssText = await response.text();

        const sheet = new CSSStyleSheet();
        sheet.replaceSync(cssText);
        componentConfig.componentStyleSheets.set(cssUrl, sheet);
        return sheet;
    } catch (e) {
        console.error(`LightviewX: Failed to create stylesheet for ${cssUrl}:`, e);
        return null;
    }
};

/**
 * Synchronously get cached component stylesheet (returns null if not yet loaded)
 * @param {string} cssUrl
 * @returns {CSSStyleSheet|null}
 */
const getComponentStyleSheetSync = (cssUrl) => componentConfig.componentStyleSheets.get(cssUrl) || null;

/**
 * Check if a component should use shadow DOM based on props and global default
 * @param {boolean|undefined} useShadowProp - The useShadow prop passed to the component
 * @returns {boolean}
 */
const shouldUseShadow = (useShadowProp) => {
    // Explicit prop value takes precedence
    if (useShadowProp !== undefined) {
        return useShadowProp;
    }
    // Fall back to global default
    return componentConfig.shadowDefault;
};

/**
 * Get the adopted stylesheets for a component
 * @param {string} componentCssUrl - URL to the component's CSS file
 * @param {string[]} requestedSheets - Array of stylesheet URLs to include
 * @returns {(CSSStyleSheet|string)[]} - Mixed array of StyleSheet objects and URL strings (for link fallbacks)
 */
const getAdoptedStyleSheets = (componentCssUrl, requestedSheets = []) => {
    const result = [];

    // Add global DaisyUI sheet
    if (componentConfig.daisyStyleSheet) {
        result.push(componentConfig.daisyStyleSheet);
    } else {
        result.push(DAISYUI_CDN);
    }

    // Add global Theme sheet (overrides default Daisy variables)
    if (componentConfig.themeStyleSheet) {
        result.push(componentConfig.themeStyleSheet);
    }

    // Add component-specific sheet
    if (componentCssUrl) {
        const componentSheet = componentConfig.componentStyleSheets.get(componentCssUrl);
        if (componentSheet) {
            result.push(componentSheet);
        }
    }

    // Process requested sheets
    if (Array.isArray(requestedSheets)) {
        requestedSheets.forEach(url => {
            const sheet = componentConfig.customStyleSheets.get(url);
            if (sheet) {
                // Registered and loaded -> use object
                result.push(sheet);
            } else {
                // Not found -> trigger load, but return string URL for immediate link tag
                registerStyleSheet(url); // Fire and forget
                result.push(url);
            }
        });
    }

    return result;
};

/**
 * Preload a component's CSS for shadow DOM usage
 * Called by components during their initialization
 * @param {string} cssUrl - URL to the component's CSS file
 * @returns {Promise<void>}
 */
const preloadComponentCSS = async (cssUrl) => {
    if (!componentConfig.componentStyleSheets.has(cssUrl)) {
        await getComponentStyleSheet(cssUrl);
    }
};

// Registry shared functions are imported from signal.js

// ============= STATE (Deep Reactivity) =============
// Deep reactivity logic has been moved to src/reactivity/state.js

// Template compilation: unified logic for creating reactive functions
const compileTemplate = (code) => {
    try {
        const isSingle = code.trim().startsWith('${') && code.trim().endsWith('}') && !code.trim().includes('${', 2);
        const body = isSingle ? 'return ' + code.trim().slice(2, -1) : 'return `' + code.replace(/\\/g, '\\\\').replace(/`/g, '\\`') + '`';
        return new Function('state', 'signal', body);
    } catch (e) {
        return () => "";
    }
};

const processTemplateChild = (child, LV) => {
    if (typeof child === 'string' && child.includes('${')) {
        const fn = compileTemplate(child);
        return () => fn(LV.state, LV.signal);
    }
    return child;
};

const transformTextNode = (node, isRaw, LV) => {
    const text = node.textContent;
    if (isRaw) return text;
    if (!text.trim() && !text.includes('${')) return null;
    if (text.includes('${')) {
        const fn = compileTemplate(text);
        return () => fn(LV.state, LV.signal);
    }
    return text;
};

const transformElementNode = (node, element, domToElements) => {
    const tagName = node.tagName.toLowerCase();
    const attributes = {};
    const skip = tagName === 'script' || tagName === 'style';
    const LV = typeof window !== 'undefined' ? globalThis.Lightview : (typeof globalThis !== 'undefined' ? globalThis.Lightview : null);

    for (let attr of node.attributes) {
        const val = attr.value;
        attributes[attr.name] = (!skip && val.includes('${')) ? (() => {
            const fn = compileTemplate(val);
            return () => fn(LV.state, LV.signal);
        })() : val;
    }
    return element(tagName, attributes, domToElements(Array.from(node.childNodes), element, tagName));
};

/**
 * Converts standard DOM nodes into Lightview reactive elements.
 * This is used to transform HTML templates (with template literals) into live VDOM.
 */
const domToElements = (domNodes, element, parentTagName = null) => {
    const isRaw = parentTagName === 'script' || parentTagName === 'style';
    const LV = globalThis.Lightview;

    return domNodes.map(node => {
        if (node.nodeType === Node.TEXT_NODE) return transformTextNode(node, isRaw, LV);
        if (node.nodeType === Node.ELEMENT_NODE) return transformElementNode(node, element, domToElements);
        return null;
    }).filter(n => n !== null);
};

// WeakMap to track inserted content per element+location for deduplication
const insertedContentMap = new WeakMap();

// Simple hash function for content comparison
const hashContent = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
};

// Create a marker comment to identify inserted content boundaries
const createMarker = (id, isEnd = false) => {
    return document.createComment(`lv-src-${isEnd ? 'end' : 'start'}:${id}`);
};


/**
 * Execute scripts in a container element
 * Scripts created via DOMParser or innerHTML don't execute automatically,
 * so we need to replace them with new script elements to trigger execution
 * @param {HTMLElement|DocumentFragment} container - Container to search for scripts
 */
const executeScripts = (container) => {
    if (!container) return;

    // Find all script tags in the container
    const scripts = container.querySelectorAll('script');

    scripts.forEach(oldScript => {
        // Create a new script element
        const newScript = document.createElement('script');

        // Copy all attributes from old to new
        Array.from(oldScript.attributes).forEach(attr => {
            newScript.setAttribute(attr.name, attr.value);
        });

        // Copy the script content
        if (oldScript.src) {
            // External script - src attribute already copied
            newScript.src = oldScript.src;
        } else {
            // Inline script - copy text content
            newScript.textContent = oldScript.textContent;
        }

        // Replace the old script with the new one
        // This causes the browser to execute it
        oldScript.parentNode.replaceChild(newScript, oldScript);
    });
};

// Find and remove previously inserted content between markers
const removeInsertedContent = (parentEl, markerId) => {
    const startMarker = `lv-src-start:${markerId}`;
    const endMarker = `lv-src-end:${markerId}`;

    let inRange = false;
    const nodesToRemove = [];

    const walker = document.createTreeWalker(
        parentEl.parentElement || parentEl,
        NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
        null,
        false
    );

    while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node.nodeType === Node.COMMENT_NODE) {
            if (node.textContent === startMarker) {
                inRange = true;
                nodesToRemove.push(node);
                continue;
            }
            if (node.textContent === endMarker) {
                nodesToRemove.push(node);
                break;
            }
        }
        if (inRange) {
            nodesToRemove.push(node);
        }
    }

    nodesToRemove.forEach(node => node.remove());
    return nodesToRemove.length > 0;
};

const insert = (elements, parent, location, markerId, { element, setupChildren }) => {
    const isSibling = location === 'beforebegin' || location === 'afterend';
    const isOuter = location === 'outerhtml';
    const target = (isSibling || isOuter) ? parent.parentElement : parent;
    if (!target) return console.warn(`LightviewX: No parent for ${location}`);

    const frag = document.createDocumentFragment();
    frag.appendChild(createMarker(markerId, false));
    elements.forEach(c => {
        if (typeof c === 'string') frag.appendChild(document.createTextNode(c));
        else if (c.domEl) frag.appendChild(c.domEl);
        else if (c instanceof Node) frag.appendChild(c);
        else {
            const v = globalThis.Lightview?.hooks.processChild?.(c) || c;
            if (v.tag) {
                const n = element(v.tag, v.attributes || {}, v.children || []);
                if (n?.domEl) frag.appendChild(n.domEl);
            }
        }
    });
    frag.appendChild(createMarker(markerId, true));

    if (isOuter) target.replaceChild(frag, parent);
    else if (location === 'beforebegin') target.insertBefore(frag, parent);
    else if (location === 'afterend') target.insertBefore(frag, parent.nextSibling);
    else if (location === 'afterbegin') parent.insertBefore(frag, parent.firstChild);
    else if (location === 'beforeend') parent.appendChild(frag);

    executeScripts(target);
};

const isPath = (s) => typeof s === 'string' && !isDangerousProtocol(s) && /^(https?:|\.|\/|[\w])|(\.(html|json|[vo]dom|cdomc?))$/i.test(s);

const fetchContent = async (src) => {
    try {
        const LV = globalThis.Lightview;
        if (LV?.hooks?.validateUrl && !LV.hooks.validateUrl(src)) {
            console.warn(`[LightviewX] Fetch blocked by validateUrl hook: ${src}`);
            return null;
        }
        const url = new URL(src, document.baseURI);
        const res = await fetch(url);
        if (!res.ok) return null;
        const ext = url.pathname.split('.').pop().toLowerCase();
        const isJson = (ext === 'vdom' || ext === 'odom' || ext === 'cdom');
        const isHtml = (ext === 'html');
        const isCdom = (ext === 'cdom' || ext === 'cdomc');
        const content = isJson ? await res.json() : await res.text();
        return {
            content,
            isJson,
            isHtml,
            isCdom,
            ext,
            raw: isJson ? JSON.stringify(content) : content
        };
    } catch (e) {
        return null;
    }
};





const parseElements = (content, isJson, isHtml, el, element, isCdom = false, ext = '') => {
    if (isJson) return Array.isArray(content) ? content : [content];
    if (isCdom && ext === 'cdomc') {
        const parser = globalThis.LightviewCDOM?.parseCDOMC;
        if (parser) {
            try {
                const obj = parser(content);
                return Array.isArray(obj) ? obj : [obj];
            } catch (e) {
                console.warn('LightviewX: Failed to parse .cdomc:', e);
                return [];
            }
        } else {
            console.warn('LightviewX: CDOMC parser not found. Ensure lightview-cdom.js is loaded.');
            return [];
        }
    }
    if (isHtml) {
        if (el.domEl.getAttribute('escape') === 'true') return [content];
        const doc = new DOMParser().parseFromString(content.replace(/<head[^>]*>[\s\S]*?<\/head>/i, ''), 'text/html');
        return domToElements([...Array.from(doc.head.childNodes), ...Array.from(doc.body.childNodes)], element);
    }
    return [content];
};

const elementsFromSelector = (selector, element) => {
    try {
        const sel = document.querySelectorAll(selector);
        if (!sel.length) return null;
        return {
            elements: domToElements(Array.from(sel), element),
            raw: Array.from(sel).map(n => n.outerHTML || n.textContent).join('')
        };
    } catch (e) {
        return null;
    }
};

const updateTargetContent = (el, elements, raw, loc, contentHash, { element, setupChildren }, targetHash = null) => {
    const markerId = `${loc}-${contentHash.slice(0, 8)}`;
    let track = getOrSet(insertedContentMap, el.domEl, () => ({}));
    if (track[loc]) removeInsertedContent(el.domEl, `${loc}-${track[loc].slice(0, 8)}`);
    track[loc] = contentHash;

    const performScroll = (root) => {
        if (!targetHash) return;
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const id = targetHash.startsWith('#') ? targetHash.slice(1) : targetHash;
                const target = root.getElementById ? root.getElementById(id) : root.querySelector(`#${id}`);
                if (target) {
                    target.style.scrollMarginTop = 'calc(var(--site-nav-height, 0px) + 2rem)';
                    target.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'start' });
                }
            });
        });
    };

    if (loc === 'shadow') {
        if (!el.domEl.shadowRoot) el.domEl.attachShadow({ mode: 'open' });
        setupChildren(elements, el.domEl.shadowRoot);
        executeScripts(el.domEl.shadowRoot);
        performScroll(el.domEl.shadowRoot);
    } else if (loc === 'innerhtml') {
        el.children = elements;
        executeScripts(el.domEl);
        performScroll(document);
    } else {
        insert(elements, el.domEl, loc, markerId, { element, setupChildren });
        performScroll(document);
    }
};

/**
 * Handles the 'src' attribute on non-standard tags.
 * Loads content from a URL or selector and injects it into the element.
 */
const handleSrcAttribute = async (el, src, tagName, { element, setupChildren }) => {
    if (STANDARD_SRC_TAGS.includes(tagName)) return;

    let elements = [], raw = '', targetHash = null;
    if (isPath(src)) {
        if (src.includes('#')) {
            [src, targetHash] = src.split('#');
        }
        const result = await fetchContent(src);
        if (result) {
            elements = parseElements(result.content, result.isJson, result.isHtml, el, element, result.isCdom, result.ext);
            raw = result.raw;
        }
    }

    if (!elements.length) {
        const result = elementsFromSelector(src, element);
        if (result) {
            elements = result.elements;
            raw = result.raw;
        }
    }

    if (!elements.length) return;

    const loc = (el.domEl.getAttribute('location') || 'innerhtml').toLowerCase();
    const contentHash = hashContent(raw);
    const track = getOrSet(insertedContentMap, el.domEl, () => ({}));

    if (track[loc] === contentHash) {
        // If already loaded but we have a new hash, we should still scroll
        if (targetHash) {
            const root = loc === 'shadow' ? el.domEl.shadowRoot : document;
            if (root) {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        const id = targetHash.startsWith('#') ? targetHash.slice(1) : targetHash;
                        const target = root.getElementById ? root.getElementById(id) : root.querySelector?.(`#${id}`);
                        if (target) {
                            target.style.scrollMarginTop = 'calc(var(--site-nav-height, 0px) + 2rem)';
                            target.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'start' });
                        }
                    });
                });
            }
        }
        return;
    }
    updateTargetContent(el, elements, raw, loc, contentHash, { element, setupChildren }, targetHash);
};

// Valid location values for content insertion
const VALID_LOCATIONS = ['beforebegin', 'afterbegin', 'beforeend', 'afterend', 'innerhtml', 'outerhtml', 'shadow'];

// Parse position suffix from target string (e.g., "#box:afterbegin" -> { selector: "#box", location: "afterbegin" })
const parseTargetWithLocation = (targetStr) => {
    for (const loc of VALID_LOCATIONS) {
        const suffix = ':' + loc;
        if (targetStr.toLowerCase().endsWith(suffix)) {
            return {
                selector: targetStr.slice(0, -suffix.length),
                location: loc
            };
        }
    }
    return { selector: targetStr, location: null };
};

/**
 * Intercepts clicks on elements with 'href' attributes that are not standard links.
 * Enables HTMX-like SPA navigation by loading the href content into a target element.
 */
const handleNonStandardHref = (e, { domToElement, wrapDomElement }) => {
    const clickedEl = e.target.closest('[href]');
    if (!clickedEl) return;

    const tagName = clickedEl.tagName.toLowerCase();
    if (STANDARD_HREF_TAGS.includes(tagName)) return;

    e.preventDefault();

    const href = clickedEl.getAttribute('href');
    const LV = globalThis.Lightview;
    if (href && (isDangerousProtocol(href) || (LV?.hooks?.validateUrl && !LV.hooks.validateUrl(href)))) {
        console.warn(`[LightviewX] Navigation or fetch blocked by security policy: ${href}`);
        return;
    }
    const targetAttr = clickedEl.getAttribute('target');

    // Case 1: No target attribute - existing behavior (load into self)
    if (!targetAttr) {
        let el = domToElement.get(clickedEl);
        if (!el) {
            const attrs = {};
            for (let attr of clickedEl.attributes) attrs[attr.name] = attr.value;
            el = wrapDomElement(clickedEl, tagName, attrs);
        }
        const newAttrs = { ...el.attributes, src: href };
        el.attributes = newAttrs;
        return;
    }

    // Case 2: Target starts with _ (browser navigation)
    if (targetAttr.startsWith('_')) {
        switch (targetAttr) {
            case '_self':
                globalThis.location.href = href;
                break;
            case '_parent':
                globalThis.parent.location.href = href;
                break;
            case '_top':
                globalThis.top.location.href = href;
                break;
            case '_blank':
            default:
                // _blank or any custom _name opens a new window/tab
                globalThis.open(href, targetAttr);
                break;
        }
        return;
    }

    // Case 3: Target is a CSS selector (with optional :position suffix)
    const { selector, location } = parseTargetWithLocation(targetAttr);

    try {
        const targetElements = document.querySelectorAll(selector);
        targetElements.forEach(targetEl => {
            let el = domToElement.get(targetEl);
            if (!el) {
                const attrs = {};
                for (let attr of targetEl.attributes) attrs[attr.name] = attr.value;
                el = wrapDomElement(targetEl, targetEl.tagName.toLowerCase(), attrs);
            }

            // Build new attributes
            const newAttrs = { ...el.attributes, src: href };
            if (location) {
                newAttrs.location = location;
            }
            el.attributes = newAttrs;
        });
    } catch (err) {
        console.warn('Invalid target selector:', selector, err);
    }
};



// ============= LV-BEFORE (Event Gating) =============
const gateStates = new WeakMap();
const BYPASS_FLAG = '__lv_passed';
const RESUME_FLAG = '__lv_resume';

const SENSIBLE_EVENTS = [
    'click', 'dblclick', 'mousedown', 'mouseup', 'contextmenu',
    'submit', 'reset', 'change', 'input', 'invalid',
    'keydown', 'keyup', 'keypress',
    'touchstart', 'touchend'
];
const CAPTURE_EVENTS = ['focus', 'blur'];

const getGateState = (el, key) => {
    let elState = gateStates.get(el);
    if (!elState) {
        elState = new Map();
        gateStates.set(el, elState);
    }
    let state = elState.get(key);
    if (!state) {
        state = {};
        elState.set(key, state);
    }
    return state;
};

/**
 * Gate implementation for throttle.
 * Returns true if enough time has passed since the last successful run for this specific element/event/index.
 */
const gateThrottle = function (ms) {
    const event = arguments[arguments.length - 1];
    if (event?.[RESUME_FLAG]) return true;
    const key = `throttle-${event?.type || 'all'}-${ms}`;
    const state = getGateState(this, key);
    const now = Date.now();
    if (now - (state.last || 0) >= ms) {
        state.last = now;
        return true;
    }
    return false;
};

/**
 * Gate implementation for debounce.
 * Returns true only after the specified delay has passed without further calls.
 */
const gateDebounce = function (ms) {
    const event = arguments[arguments.length - 1];
    const key = `debounce-${event?.type || 'all'}-${ms}`;
    const state = getGateState(this, key);

    if (state.timer) clearTimeout(state.timer);

    if (event?.[RESUME_FLAG] && state.passed) {
        state.passed = false;
        return true;
    }

    state.timer = setTimeout(() => {
        state.passed = true;
        const newEvent = new event.constructor(event.type, event);
        newEvent[RESUME_FLAG] = true;
        this.dispatchEvent(newEvent);
    }, ms);

    return false;
};

/**
 * Parses the lv-before attribute value into event filters and gate functions.
 */
const parseBeforeAttribute = (attrValue) => {
    // Smart tokenizer that respects parentheses and quotes
    const tokens = [];
    let current = '', depth = 0, inQuote = null;
    for (let i = 0; i < attrValue.length; i++) {
        const char = attrValue[i];
        if (inQuote) {
            current += char;
            if (char === inQuote && attrValue[i - 1] !== '\\') inQuote = null;
        } else if (char === "'" || char === '"') {
            inQuote = char;
            current += char;
        } else if (char === '(') {
            depth++;
            current += char;
        } else if (char === ')') {
            depth--;
            current += char;
        } else if (/\s/.test(char) && depth === 0) {
            if (current) tokens.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    if (current) tokens.push(current);

    const events = [];
    const exclusions = [];
    const calls = [];

    let i = 0;
    while (i < tokens.length) {
        const token = tokens[i];
        if (!token || token.includes('(')) break; // Start of function calls or empty
        if (token.startsWith('!')) exclusions.push(token.slice(1));
        else events.push(token);
        i++;
    }

    while (i < tokens.length) {
        if (tokens[i]) calls.push(tokens[i]);
        i++;
    }

    return { events, exclusions, calls };
};

/**
 * Global interceptor for lv-before gating.
 */
const globalBeforeInterceptor = async (e) => {
    if (e[BYPASS_FLAG]) return;

    const target = e.target.closest?.('[lv-before]');
    if (!target) return;

    const { events, exclusions, calls } = parseBeforeAttribute(target.getAttribute('lv-before'));

    // Check if event matches the selection
    const isExcluded = exclusions.includes(e.type);
    const isIncluded = events.includes('*') || events.includes(e.type);
    if (isExcluded || !isIncluded) return;

    // Pass 1: Stop the event
    e.stopImmediatePropagation();
    e.preventDefault();

    // Run the pipeline
    for (const callStr of calls) {
        try {
            // Parse call (e.g., "throttle(1000)")
            const match = callStr.match(/^([\w\.]+)\((.*)\)$/);
            if (!match) continue;

            const funcName = match[1];
            const argsStr = match[2];

            // Search for function in: global scope, LightviewX
            const LV = globalThis.Lightview;
            const LVX = globalThis.LightviewX;

            // Enhanced function lookup supporting dotted paths
            let fn = funcName.split('.').reduce((obj, key) => obj?.[key], globalThis);

            if (!fn && funcName === 'throttle') fn = gateThrottle;
            if (!fn && funcName === 'debounce') fn = gateDebounce;
            if (!fn && LVX && LVX[funcName]) fn = LVX[funcName];

            if (typeof fn !== 'function') {
                console.warn(`LightviewX: lv-before function '${funcName}' not found`);
                continue;
            }

            // Eval arguments in context
            const evalArgs = new Function('event', 'state', 'signal', `return [${argsStr}]`);
            const args = evalArgs.call(target, e, LV?.state || {}, LV?.signal || {});

            // Inject event as last argument for built-ins and detection
            args.push(e);

            let result = fn.apply(target, args);
            if (result instanceof Promise) result = await result;
            if (result === false || result === null || result === undefined) return; // Abort
        } catch (err) {
            console.error(`LightviewX: Error executing lv-before gate '${callStr}':`, err);
            return; // Abort on error
        }
    }

    // Pass 2: Success! Re-dispatch with bypass flag
    const finalEvent = new e.constructor(e.type, e);
    finalEvent[BYPASS_FLAG] = true;
    target.dispatchEvent(finalEvent);
};



// ============= DOM OBSERVER FOR SRC ATTRIBUTES =============

/**
 * Process src attribute on a DOM element that doesn't normally have src
 * @param {HTMLElement} node - DOM element to process
 * @param {Object} LV - Lightview instance
 */
const processSrcOnNode = (node, LV) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const tagName = node.tagName.toLowerCase();
    if (isStandardSrcTag(tagName)) return;

    const src = node.getAttribute('src');
    if (!src) return;

    // Get or create reactive wrapper
    let el = LV.internals.domToElement.get(node);
    if (!el) {
        const attrs = {};
        for (let attr of node.attributes) attrs[attr.name] = attr.value;
        el = LV.internals.wrapDomElement(node, tagName, attrs, []);
    }

    handleSrcAttribute(el, src, tagName, {
        element: LV.element,
        setupChildren: LV.internals.setupChildren
    });
};

// Track nodes to avoid double-processing
const processedNodes = new WeakSet();

/**
 * Activate reactive syntax (${...}) in existing DOM nodes
 * Uses XPath for performance optimization
 * @param {Node} root - Root node to start scanning from
 * @param {Object} LV - Lightview instance
 */
const activateReactiveSyntax = (root, LV) => {
    if (!root || !LV) return;

    const bindEffect = (node, codeStr, isAttr = false, attrName = null) => {
        if (processedNodes.has(node) && !isAttr) return;
        if (!isAttr) processedNodes.add(node);

        const fn = compileTemplate(codeStr);
        LV.effect(() => {
            try {
                const val = fn(LV.state, LV.signal);
                if (isAttr) {
                    (val === null || val === undefined || val === false) ? node.removeAttribute(attrName) : node.setAttribute(attrName, val);
                } else node.textContent = val !== undefined ? val : '';
            } catch (e) { /* Effect execution failed */ }
        });
    };

    // 1. Find Text Nodes containing '${'
    const textXPath = ".//text()[contains(., '${')]";
    const textResult = document.evaluate(
        textXPath,
        root,
        null,
        XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
        null
    );

    for (let i = 0; i < textResult.snapshotLength; i++) {
        const node = textResult.snapshotItem(i);
        // Verify it's not inside a skip tag (XPath might pick them up if defined loosely)
        if (node.parentElement && node.parentElement.closest('SCRIPT, STYLE, CODE, PRE, TEMPLATE, NOSCRIPT')) continue;
        bindEffect(node, node.textContent);
    }

    // 2. Find Elements with Attributes containing '${'
    // XPath: select any element (*) that has an attribute (@*) containing '${'
    const attrXPath = ".//*[@*[contains(., '${')]]";
    const attrResult = document.evaluate(
        attrXPath,
        root,
        null,
        XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
        null
    );

    for (let i = 0; i < attrResult.snapshotLength; i++) {
        const element = attrResult.snapshotItem(i);
        if (['SCRIPT', 'STYLE', 'CODE', 'PRE', 'TEMPLATE', 'NOSCRIPT'].includes(element.tagName)) continue;

        // Iterate attributes to find matches (XPath found the element, but not *which* attribute)
        Array.from(element.attributes).forEach(attr => {
            if (attr.value.includes('${')) {
                bindEffect(element, attr.value, true, attr.name);
            }
        });
    }

    // Also check the root itself (XPath .// does not always include the context node for attributes depending on implementation details, safer to check manually if root is element)
    if (root.nodeType === Node.ELEMENT_NODE && !['SCRIPT', 'STYLE', 'CODE', 'PRE', 'TEMPLATE', 'NOSCRIPT'].includes(root.tagName)) {
        Array.from(root.attributes).forEach(attr => {
            if (attr.value.includes('${')) {
                bindEffect(root, attr.value, true, attr.name);
            }
        });
    }
};

const processAddedNode = (node, nodesToProcess, nodesToActivate) => {
    if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
        nodesToActivate.push(node);
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    // Check the added node itself for src
    nodesToProcess.push(node);

    // Check descendants with src attribute
    const selector = '[src]:not(' + STANDARD_SRC_TAGS.join('):not(') + ')';
    const descendants = node.querySelectorAll(selector);
    for (const desc of descendants) {
        if (!desc.tagName.toLowerCase().startsWith('lv-')) {
            nodesToProcess.push(desc);
        }
    }
};

const collectNodesFromMutations = (mutations) => {
    const nodesToProcess = [];
    const nodesToActivate = [];

    for (const mutation of mutations) {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => processAddedNode(node, nodesToProcess, nodesToActivate));
        } else if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
            nodesToProcess.push(mutation.target);
        }
    }
    return { nodesToProcess, nodesToActivate };
};

/**
 * Setup MutationObserver to watch for added nodes with src attributes OR reactive syntax
 * @param {Object} LV - Lightview instance
 */
const setupSrcObserver = (LV) => {
    const observer = new MutationObserver((mutations) => {
        const { nodesToProcess, nodesToActivate } = collectNodesFromMutations(mutations);

        if (nodesToProcess.length > 0 || nodesToActivate.length > 0) {
            requestAnimationFrame(() => {
                nodesToActivate.forEach(node => activateReactiveSyntax(node, LV));
                nodesToProcess.forEach(node => processSrcOnNode(node, LV));
            });
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src']
    });

    return observer;
};

// Auto-register with Lightview if available
if (typeof window !== 'undefined' && globalThis.Lightview) {
    const LV = globalThis.Lightview;

    // Extend Lightview with simple named signal getter/setter if needed (already in Core now)
    // But for template literals we use processTemplateChild which needs access to registries
    // We can just rely on LV.signal.get if it exists, or fall back

    // Setup DOM observer for src attributes on added nodes

    // Setup DOM observer for src attributes on added nodes
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setupSrcObserver(LV));
    } else {
        setupSrcObserver(LV);
    }

    // Also process any existing elements
    const initialScan = () => {
        requestAnimationFrame(() => {
            activateReactiveSyntax(document.body, LV);

            const selector = '[src]:not(' + STANDARD_SRC_TAGS.join('):not(') + ')';
            const nodes = document.querySelectorAll(selector);
            nodes.forEach(node => {
                if (node.tagName.toLowerCase().startsWith('lv-')) return;
                processSrcOnNode(node, LV);
            });
        });
    };

    if (document.body) {
        initialScan();
    } else {
        document.addEventListener('DOMContentLoaded', initialScan);
    }

    // Register href click handler
    LV.hooks.onNonStandardHref = (e) => {
        handleNonStandardHref(e, {
            domToElement: LV.internals.domToElement,
            wrapDomElement: LV.internals.wrapDomElement
        });
    };

    // Register lv-before listeners
    SENSIBLE_EVENTS.forEach(ev => window.addEventListener(ev, globalBeforeInterceptor, true));
    CAPTURE_EVENTS.forEach(ev => window.addEventListener(ev, globalBeforeInterceptor, true));

    // Unified processChild hook for LightviewX
    // Handles: Object DOM, HDOM Expressions, Template Literals
    LV.hooks.processChild = (child) => {
        if (!child) return child;

        // 1. Convert Object DOM syntax if applicable
        if (typeof child === 'object' && !Array.isArray(child) && !child.tag && !child.domEl) {
            child = convertObjectDOM(child);
        }

        // 2. Handle CDOM expressions ($/..., $helper(...), $path)
        // Checks if string starts with '$' and follows with non-digit to avoid matching currency like '$100'
        if (typeof child === 'string' && child.startsWith('$') && isNaN(parseInt(child[1]))) {
            const CDOM = globalThis.LightviewCDOM;
            if (CDOM) return CDOM.parseExpression(child);
        }

        // 3. Handle object strings that look like ODOM/VDOM but are results of CDOM or static JSON
        // Prioritize this for curly-brace string content
        if (typeof child === 'string' && (child.trim().startsWith('{') || child.trim().startsWith('['))) {
            try {
                // simple heuristic to check if it's safe JSON-like or needs evaluation
                const parsed = new Function('return (' + child + ')')();

                // If parsed is a plain object or array, we might want to convert it recursively
                if (typeof parsed === 'object' && parsed !== null) {
                    if (Array.isArray(parsed)) {
                        return parsed; // Will be processed as array by core
                    }
                    if (parsed.tag || parsed.domEl) {
                        return parsed; // VDOM object
                    }
                    // ODOM object?
                    return convertObjectDOM(parsed);
                }
            } catch (e) { /* Not an object string */ }
        }

        // 4. Process template literals (${...})
        return processTemplateChild(child, {
            state: state,
            signal: LV.signal
        });
    };
}



/**
 * Create a Custom Element class wrapper for a Lightview component
 * @param {Function} Component - The Lightview component function
 * @param {Object} options
 * @param {string} options.cssUrl - Optional URL for component CSS
 * @param {string[]} options.styles - Optional extra style URLs
 * @returns {Class} - The Custom Element class
 */
const createCustomElement = (Component, options = {}) => {
    return class extends HTMLElement {
        constructor() {
            super();
            this.attachShadow({ mode: 'open' });
        }

        async connectedCallback() {
            const { cssUrl, styles } = options;

            // Create theme wrapper
            this.themeWrapper = document.createElement('div');
            this.themeWrapper.style.display = 'contents';
            // Sync theme from document
            const syncTheme = () => {
                const theme = document.documentElement.getAttribute('data-theme') || 'light';
                this.themeWrapper.setAttribute('data-theme', theme);
            };
            syncTheme();

            // Observe theme changes
            this.themeObserver = new MutationObserver(syncTheme);
            this.themeObserver.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ['data-theme']
            });

            // Attach wrapper
            this.shadowRoot.appendChild(this.themeWrapper);

            // Get stylesheets
            const adoptedStyleSheets = getAdoptedStyleSheets(cssUrl, styles);

            // Handle adoptedStyleSheets
            try {
                const sheets = adoptedStyleSheets.filter(s => s instanceof CSSStyleSheet);
                this.shadowRoot.adoptedStyleSheets = sheets;
            } catch (e) {
                // Fallback handled by individual links below if needed
            }

            // Handle link tags for strings (fallback or external non-CORS sheets)
            // Also fallback for DaisyUI if not loaded as adoptedStyleSheet
            if (!componentConfig.daisyStyleSheet) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = DAISYUI_CDN;
                this.shadowRoot.appendChild(link);
            }

            adoptedStyleSheets.forEach(s => {
                if (typeof s === 'string') {
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = s;
                    this.shadowRoot.appendChild(link);
                }
            });

            // Define render function
            this.render = () => {
                // Collect props from attributes
                const props = {};
                for (const attr of this.attributes) {
                    // Convert kebab-case to camelCase
                    const name = attr.name.replace(/-([a-z])/g, (g) => g[1].toUpperCase());

                    // Convert boolean attributes
                    if (attr.value === '') {
                        props[name] = true;
                    } else {
                        props[name] = attr.value;
                    }
                }

                // Force useShadow: false to avoid double shadow
                props.useShadow = false;

                // Render component with a slot for children
                const slot = globalThis.Lightview.tags.slot();
                const result = Component(props, slot);

                // Use Lightview's internal setupChildren to render the result
                // This handles vDOM, DOM nodes, strings, and reactive content
                globalThis.Lightview.internals.setupChildren([result], this.themeWrapper);
            };

            if (typeof MutationObserver !== 'undefined' && typeof HTMLElement !== 'undefined') {
                // Observe attribute changes on self to trigger re-render
                this.attrObserver = new MutationObserver((mutations) => {
                    // Only re-render if actual attributes changed
                    this.render();
                });
                this.attrObserver.observe(this, {
                    attributes: true
                });
            }

            // Initial render
            this.render();
        }

        disconnectedCallback() {
            if (this.themeObserver) {
                this.themeObserver.disconnect();
            }
            if (this.attrObserver) {
                this.attrObserver.disconnect();
            }
        }
    };
};

// Export for module usage
const LightviewX = {
    state,
    themeSignal,
    setTheme,
    registerStyleSheet,
    registerThemeSheet,
    // Gate modifiers
    throttle: gateThrottle,
    debounce: gateDebounce,
    // Component initialization
    initComponents,
    componentConfig,
    shouldUseShadow,
    getAdoptedStyleSheets,
    preloadComponentCSS,
    createCustomElement,
    internals: {
        handleSrcAttribute,
        parseElements
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LightviewX;
}
if (typeof window !== 'undefined') {
    globalThis.LightviewX = LightviewX;
}

// Initialize component hook to use Object DOM
if (typeof window !== 'undefined') {
    // Auto-load theme
    try {
        const savedTheme = getSavedTheme();
        if (savedTheme) {
            setTheme(savedTheme);
        }
    } catch (e) { /* ignore */ }

    if (typeof window !== 'undefined' && globalThis.Lightview) {
        if (!globalThis.Lightview.hooks.validateUrl) {
            globalThis.Lightview.hooks.validateUrl = validateUrl;
        }
    }
}

// Server-side initialization if globally available
if (typeof globalThis !== 'undefined' && globalThis.Lightview) {
    if (!globalThis.Lightview.hooks.validateUrl) {
        globalThis.Lightview.hooks.validateUrl = validateUrl;
    }
}

