(() => {
    /**
     * LIGHTVIEW-X
     * Hypermedia and Extended Reactivity for Lightview.
     * 
     * Adds:
     * - src attribute fetching (HTMX-style loading)
     * - href navigation (Single Page App behavior for non-standard links)
     * - DOM-to-element conversion (Template literals support)
     * - Object DOM syntax
     * - Deeply reactive state
     * - CSS Shadow DOM integration
     */
    // ============= LIGHTVIEW-X =============
    // Hypermedia extension for Lightview
    // Adds: src attribute fetching, href navigation, DOM-to-element conversion, template literals, named registries, Object DOM syntax

    const STANDARD_SRC_TAGS = ['img', 'script', 'iframe', 'video', 'audio', 'source', 'track', 'embed', 'input'];
    const isStandardSrcTag = (tagName) => STANDARD_SRC_TAGS.includes(tagName) || tagName.startsWith('lv-');
    const STANDARD_HREF_TAGS = ['a', 'area', 'base', 'link'];

    const isValidTagName = (name) => typeof name === 'string' && name.length > 0 && name !== 'children';

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
        const LV = window.Lightview;
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
    const themeSignal = typeof window !== 'undefined' && window.Lightview ? window.Lightview.signal(
        (typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme')) ||
        getSavedTheme() ||
        'light'
    ) : { value: 'light' };

    /**
     * Set the global theme for Lightview components (updates signal only)
     * @param {string} themeName - The name of the theme (e.g., 'light', 'dark', 'cyberpunk')
     */
    const setTheme = (themeName) => {
        if (!themeName) return;

        // Determine base theme (light or dark) for the main document
        // const darkThemes = ['dark', 'aqua', 'black', 'business', 'coffee', 'dim', 'dracula', 'forest', 'halloween', 'luxury', 'night', 'sunset', 'synthwave'];
        // const baseTheme = darkThemes.includes(themeName) ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', themeName);

        // Update signal
        if (themeSignal && themeSignal.value !== themeName) {
            themeSignal.value = themeName;
        }

        // Persist preference
        try {
            localStorage.setItem('lightview-theme', themeName);
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

    // Named registries for state (used by template literals)
    const stateRegistry = new Map();

    // ============= STATE (Deep Reactivity) =============
    /**
     * Provides deeply reactive state by wrapping objects/arrays in Proxies.
     * Automatically tracks changes via signals.
     */
    // Build method lists dynamically from prototypes
    const protoMethods = (proto, test) => Object.getOwnPropertyNames(proto).filter(k => typeof proto[k] === 'function' && test(k));
    const DATE_TRACKING = protoMethods(Date.prototype, k => /^(to|get|valueOf)/.test(k));
    const DATE_MUTATING = protoMethods(Date.prototype, k => /^set/.test(k));
    const ARRAY_TRACKING = ['map', 'forEach', 'filter', 'find', 'findIndex', 'some', 'every', 'reduce',
        'reduceRight', 'includes', 'indexOf', 'lastIndexOf', 'join', 'slice', 'concat', 'flat', 'flatMap',
        'at', 'entries', 'keys', 'values'];
    const ARRAY_MUTATING = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin'];
    const ARRAY_ITERATION = ['map', 'forEach', 'filter', 'find', 'findIndex', 'some', 'every', 'flatMap'];

    const stateCache = new WeakMap();
    const stateSignals = new WeakMap();

    // Helper to get or create a value in a map
    const getOrSet = (map, key, factory) => {
        let v = map.get(key);
        if (!v) {
            v = factory();
            map.set(key, v);
        }
        return v;
    };

    const proxyGet = (target, prop, receiver, signals) => {
        const LV = window.Lightview;
        if (!signals.has(prop)) signals.set(prop, LV.signal(Reflect.get(target, prop, receiver)));
        const val = signals.get(prop).value;
        return typeof val === 'object' && val !== null ? state(val) : val;
    };

    const proxySet = (target, prop, value, receiver, signals) => {
        const LV = window.Lightview;
        if (!signals.has(prop)) signals.set(prop, LV.signal(Reflect.get(target, prop, receiver)));
        const success = Reflect.set(target, prop, value, receiver);
        if (success) signals.get(prop).value = value;
        return success;
    };

    /**
     * Creates a specialized proxy for complex objects like Date and Array 
     * that require monitoring specific properties (e.g., 'length' or 'time').
     */
    const createSpecialProxy = (obj, monitor, trackingProps = []) => {
        const LV = window.Lightview;
        // Get or create the signals map for this object
        const signals = getOrSet(stateSignals, obj, () => new Map());

        // Create a signal for the monitored property if it doesn't exist
        if (!signals.has(monitor)) {
            const initialValue = typeof obj[monitor] === 'function'
                ? obj[monitor].call(obj)
                : obj[monitor];
            signals.set(monitor, LV.signal(initialValue));
        }

        // Determine which methods should establish tracking (read the monitor signal)
        const isDate = obj instanceof Date;
        const isArray = Array.isArray(obj);

        const trackingMethods = isDate ? DATE_TRACKING : isArray ? ARRAY_TRACKING : trackingProps;
        const mutatingMethods = isDate ? DATE_MUTATING : isArray ? ARRAY_MUTATING : [];

        return new Proxy(obj, {
            get(target, prop, receiver) {
                const value = target[prop];

                // If accessing a method, wrap it appropriately
                if (typeof value === 'function') {
                    const isTracking = trackingMethods.includes(prop);
                    const isMutating = mutatingMethods.includes(prop);

                    return function (...args) {
                        // For tracking methods, read the signal to establish dependency
                        if (isTracking) {
                            const sig = signals.get(monitor);
                            if (sig) void sig.value;
                        }

                        // Get the value before the method call
                        const startValue = typeof target[monitor] === 'function'
                            ? target[monitor].call(target)
                            : target[monitor];

                        // For array iteration methods, wrap the callback to pass state-wrapped elements
                        if (isArray && ARRAY_ITERATION.includes(prop) && typeof args[0] === 'function') {
                            const originalCallback = args[0];
                            args[0] = function (element, index, array) {
                                const wrappedElement = typeof element === 'object' && element !== null
                                    ? state(element)
                                    : element;
                                return originalCallback.call(this, wrappedElement, index, array);
                            };
                        }

                        // Call the original method
                        const result = value.apply(target, args);

                        // Get the value after the method call
                        const endValue = typeof target[monitor] === 'function'
                            ? target[monitor].call(target)
                            : target[monitor];

                        // If the monitored value changed, trigger reactivity
                        if (startValue !== endValue || isMutating) {
                            const sig = signals.get(monitor);
                            if (sig && sig.value !== endValue) {
                                sig.value = endValue;
                            }
                        }

                        return result;
                    };
                }

                // If accessing the monitored property, track it via signal
                if (prop === monitor) {
                    const sig = signals.get(monitor);
                    return sig ? sig.value : Reflect.get(target, prop, receiver);
                }

                // For arrays, handle numeric indices for deep reactivity
                if (isArray && !isNaN(parseInt(prop))) {
                    const monitorSig = signals.get(monitor);
                    if (monitorSig) void monitorSig.value;
                }

                // Deep reactivity for other properties
                return proxyGet(target, prop, receiver, signals);
            },
            set(target, prop, value, receiver) {
                // If setting the monitored property directly, trigger reactivity
                if (prop === monitor) {
                    const success = Reflect.set(target, prop, value, receiver);
                    if (success) {
                        const sig = signals.get(monitor);
                        if (sig) sig.value = value;
                    }
                    return success;
                }

                return proxySet(target, prop, value, receiver, signals);
            }
        });
    };

    const state = (obj, optionsOrName) => {
        if (typeof obj !== 'object' || obj === null) return obj;

        const name = typeof optionsOrName === 'string' ? optionsOrName : optionsOrName?.name;
        const storage = optionsOrName?.storage;

        if (name && storage) {
            try {
                const item = storage.getItem(name);
                if (item) {
                    const loaded = JSON.parse(item);
                    Array.isArray(obj) && Array.isArray(loaded) ? (obj.length = 0, obj.push(...loaded)) : Object.assign(obj, loaded);
                }
            } catch (e) { /* Storage access denied or corrupted JSON */ }
        }

        let proxy = stateCache.get(obj);
        if (!proxy) {
            const isArray = Array.isArray(obj), isDate = obj instanceof Date;
            const isSpecial = isArray || isDate;
            const monitor = isArray ? "length" : isDate ? "getTime" : null;

            if (isSpecial || !(obj instanceof RegExp || obj instanceof Map || obj instanceof Set || obj instanceof WeakMap || obj instanceof WeakSet)) {
                proxy = isSpecial ? createSpecialProxy(obj, monitor) : new Proxy(obj, {
                    get(t, p, r) { return proxyGet(t, p, r, getOrSet(stateSignals, t, () => new Map())); },
                    set(t, p, v, r) { return proxySet(t, p, v, r, getOrSet(stateSignals, t, () => new Map())); }
                });
                stateCache.set(obj, proxy);
            } else return obj;
        }

        if (name && storage && window.Lightview?.effect) {
            window.Lightview.effect(() => {
                try { storage.setItem(name, JSON.stringify(proxy)); } catch (e) { /* Persistence failed */ }
            });
        }
        if (name) stateRegistry.set(name, proxy);
        return proxy;
    };

    state.get = (name, defaultValue) => {
        if (!stateRegistry.has(name) && defaultValue !== undefined) {
            return state(defaultValue, name);
        }
        return stateRegistry.get(name);
    };

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

    /**
     * Converts standard DOM nodes into Lightview reactive elements.
     * This is used to transform HTML templates (with template literals) into live VDOM.
     */
    const domToElements = (domNodes, element, parentTagName = null) => {
        const isRaw = parentTagName === 'script' || parentTagName === 'style';
        const LV = window.Lightview;

        return domNodes.map(node => {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent;
                if (isRaw) return text;
                if (!text.trim() && !text.includes('${')) return null;
                if (text.includes('${')) {
                    const fn = compileTemplate(text);
                    return () => fn(LV.state, LV.signal);
                }
                return text;
            }
            if (node.nodeType !== Node.ELEMENT_NODE) return null;

            const tagName = node.tagName.toLowerCase(), attributes = {};
            const skip = tagName === 'script' || tagName === 'style';

            for (let attr of node.attributes) {
                const val = attr.value;
                attributes[attr.name] = (!skip && val.includes('${')) ? (() => {
                    const fn = compileTemplate(val);
                    return () => fn(LV.state, LV.signal);
                })() : val;
            }
            return element(tagName, attributes, domToElements(Array.from(node.childNodes), element, tagName));
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
                const v = window.Lightview?.hooks.processChild?.(c) || c;
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

    /**
     * Handles the 'src' attribute on non-standard tags.
     * Loads content from a URL or selector and injects it into the element.
     */
    const handleSrcAttribute = async (el, src, tagName, { element, setupChildren }) => {
        if (STANDARD_SRC_TAGS.includes(tagName)) return;
        const isPath = (s) => /^(https?:|\.|\/|[\w])|(\.(html|json|[vo]dom))$/i.test(s);

        let content = null, isJson = false, isHtml = false, raw = '';
        if (isPath(src)) {
            try {
                const res = await fetch(new URL(src, document.baseURI));
                if (res.ok) {
                    const ext = new URL(src, document.baseURI).pathname.split('.').pop().toLowerCase();
                    isJson = (ext === 'vdom' || ext === 'odom');
                    isHtml = (ext === 'html');
                    content = isJson ? await res.json() : await res.text();
                    raw = isJson ? JSON.stringify(content) : content;
                }
            } catch (e) { /* Fetch failed, maybe selector */ }
        }

        let elements = [];
        if (content !== null) {
            if (isJson) elements = Array.isArray(content) ? content : [content];
            else if (isHtml) {
                if (el.domEl.getAttribute('escape') === 'true') elements = [content];
                else {
                    const doc = new DOMParser().parseFromString(content.replace(/<head[^>]*>[\s\S]*?<\/head>/i, ''), 'text/html');
                    elements = domToElements([...Array.from(doc.head.childNodes), ...Array.from(doc.body.childNodes)], element);
                }
            } else elements = [content];
        } else {
            try {
                const sel = document.querySelectorAll(src);
                if (sel.length) {
                    elements = domToElements(Array.from(sel), element);
                    raw = Array.from(sel).map(n => n.outerHTML || n.textContent).join('');
                }
            } catch (e) { /* Invalid selector */ }
        }

        if (!elements.length) return;
        const loc = (el.domEl.getAttribute('location') || 'innerhtml').toLowerCase();
        const hash = hashContent(raw);
        const markerId = `${loc}-${hash.slice(0, 8)}`;

        let track = getOrSet(insertedContentMap, el.domEl, () => ({}));
        if (track[loc] === hash) return;
        if (track[loc]) removeInsertedContent(el.domEl, `${loc}-${track[loc].slice(0, 8)}`);
        track[loc] = hash;

        if (loc === 'shadow') {
            if (!el.domEl.shadowRoot) el.domEl.attachShadow({ mode: 'open' });
            setupChildren(elements, el.domEl.shadowRoot);
            executeScripts(el.domEl.shadowRoot);
        } else if (loc === 'innerhtml') {
            el.children = elements;
            executeScripts(el.domEl);
        } else {
            insert(elements, el.domEl, loc, markerId, { element, setupChildren });
        }
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
                    window.location.href = href;
                    break;
                case '_parent':
                    window.parent.location.href = href;
                    break;
                case '_top':
                    window.top.location.href = href;
                    break;
                case '_blank':
                default:
                    // _blank or any custom _name opens a new window/tab
                    window.open(href, targetAttr);
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

    /**
     * Setup MutationObserver to watch for added nodes with src attributes OR reactive syntax
     * @param {Object} LV - Lightview instance
     */
    const setupSrcObserver = (LV) => {
        const observer = new MutationObserver((mutations) => {
            // Collect all nodes to process
            const nodesToProcess = [];
            const nodesToActivate = [];

            for (const mutation of mutations) {
                // Handle added nodes
                if (mutation.type === 'childList') {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
                            nodesToActivate.push(node);
                        }

                        if (node.nodeType !== Node.ELEMENT_NODE) continue;

                        // Check the added node itself for src
                        nodesToProcess.push(node);

                        // Check descendants with src attribute
                        const selector = '[src]:not(' + STANDARD_SRC_TAGS.join('):not(') + ')';
                        const descendants = node.querySelectorAll(selector);
                        for (const desc of descendants) {
                            if (desc.tagName.toLowerCase().startsWith('lv-')) continue;
                            nodesToProcess.push(desc);
                        }
                    }
                }

                // Handle attribute changes
                if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
                    nodesToProcess.push(mutation.target);
                }
            }

            // Batch processing
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
    if (typeof window !== 'undefined' && window.Lightview) {
        const LV = window.Lightview;

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

        // Extend template literal processor to existing processChild hook
        const existingProcessChild = LV.hooks.processChild;
        LV.hooks.processChild = (child) => {
            // First, use the existing hook (Object DOM conversion from lightview.js)
            if (existingProcessChild) {
                child = existingProcessChild(child) ?? child;
            }

            // Then process template literals
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
                    const slot = window.Lightview.tags.slot();
                    const result = Component(props, slot);

                    // Use Lightview's internal setupChildren to render the result
                    // This handles vDOM, DOM nodes, strings, and reactive content
                    window.Lightview.internals.setupChildren([result], this.themeWrapper);
                };

                // Initial render
                this.render();

                // Observe attribute changes on self to trigger re-render
                this.attrObserver = new MutationObserver((mutations) => {
                    // Only re-render if actual attributes changed
                    this.render();
                });
                this.attrObserver.observe(this, {
                    attributes: true
                });
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
        // Component initialization
        initComponents,
        componentConfig,
        shouldUseShadow,
        getAdoptedStyleSheets,
        preloadComponentCSS,
        createCustomElement
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = LightviewX;
    }
    if (typeof window !== 'undefined') {
        window.LightviewX = LightviewX;
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

        window.addEventListener('load', () => {
            if (window.Lightview) {
                window.Lightview.hooks.processChild = (child) => {
                    // Convert Object DOM syntax if applicable
                    if (typeof child === 'object' && child !== null && !Array.isArray(child)) {
                        return convertObjectDOM(child);
                    }
                    return child;
                };
            }
        });

        // Immediate check in case load already fired or script is defer
        if (window.Lightview) {
            window.Lightview.hooks.processChild = (child) => {
                // Convert Object DOM syntax if applicable
                if (typeof child === 'object' && child !== null && !Array.isArray(child)) {
                    return convertObjectDOM(child);
                }
                return child;
            };
        }
    }
})();
