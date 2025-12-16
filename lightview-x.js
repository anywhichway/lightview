(() => {
    // ============= LIGHTVIEW-X =============
    // Hypermedia extension for Lightview
    // Adds: src attribute fetching, href navigation, DOM-to-element conversion, template literals, named registries, Object DOM syntax

    const STANDARD_SRC_TAGS = ['img', 'script', 'iframe', 'video', 'audio', 'source', 'track', 'embed', 'input'];
    const STANDARD_HREF_TAGS = ['a', 'area', 'base', 'link'];

    // ============= COMPONENT CONFIGURATION =============
    // Global configuration for Lightview components

    const DAISYUI_CDN = 'https://cdn.jsdelivr.net/npm/daisyui@5';

    // Component configuration (set by initComponents)
    const componentConfig = {
        initialized: false,
        shadowDefault: true,  // Default: components use shadow DOM
        daisyStyleSheet: null,
        componentStyleSheets: new Map(),
        customStyleSheets: new Map() // Registry for named custom stylesheets
    };

    /**
     * Register a named stylesheet for use in components
     * @param {string} url - URL to the CSS file
     * @returns {Promise<void>}
     */
    const registerStyleSheet = async (url) => {
        // Use the URL as the key
        if (componentConfig.customStyleSheets.has(url)) return;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch CSS for '${url}': ${response.status}`);
            }
            const cssText = await response.text();
            const sheet = new CSSStyleSheet();
            sheet.replaceSync(cssText);
            componentConfig.customStyleSheets.set(url, sheet);
        } catch (e) {
            console.error(`LightviewX: Failed to register stylesheet '${url}':`, e);
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
        return componentConfig.initialized && componentConfig.shadowDefault;
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

    // ============= OBJECT DOM SYNTAX =============
    // Converts { div: { class: "foo", children: [...] } } to { tagName: "div", attributes: {...}, children: [...] }

    // Valid HTML tag name pattern: starts with letter, can contain letters, digits, hyphens (for custom elements)
    const HTML_TAG_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/i;

    // Cache for browser-validated tag names
    const tagValidationCache = new Map();

    /**
     * Check if a tag name is a known HTML tag (standard or valid custom element)
     * Uses the browser's own parser - unknown tags return HTMLUnknownElement
     * @param {string} tagName 
     * @returns {boolean}
     */
    const isKnownHTMLTag = (tagName) => {
        if (typeof document === 'undefined') {
            // Fallback for non-browser environments: use pattern matching
            return HTML_TAG_PATTERN.test(tagName);
        }

        // Check cache first
        if (tagValidationCache.has(tagName)) {
            return tagValidationCache.get(tagName);
        }

        // Ask the browser by creating an element
        const el = document.createElement(tagName);
        // HTMLUnknownElement means it's not a valid/known tag
        // Custom elements (with hyphen) return HTMLElement, which is valid
        const isValid = !(el instanceof HTMLUnknownElement);

        // Cache the result
        tagValidationCache.set(tagName, isValid);
        return isValid;
    };

    let objectDOMEnabled = false;
    let objectDOMStrict = false;

    /**
     * Check if a string is a valid HTML tag name
     * @param {string} name - The tag name to check
     * @param {boolean} strict - If true, validates using browser's HTML parser
     * @returns {boolean}
     */
    const isValidTagName = (name, strict = objectDOMStrict) => {
        if (typeof name !== 'string' || name.length === 0 || name === 'children') {
            return false;
        }
        if (strict) {
            // Strict mode: use browser validation (rejects unknown tags like 'foo')
            return isKnownHTMLTag(name);
        }
        // Non-strict mode: accept anything that looks reasonable
        return true;
    };

    /**
     * Check if an object is in Object DOM syntax
     * Object DOM: { div: { class: "foo", children: [...] } }
     * vDOM: { tag: "div", attributes: {...}, children: [...] }
     * @param {any} obj 
     * @returns {boolean}
     */
    const isObjectDOM = (obj) => {
        if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return false;
        if (obj.tag || obj.domEl) return false; // Already vDOM or live element

        const keys = Object.keys(obj);
        if (keys.length === 0) return false;

        // Object DOM has exactly one key (the tag name or component name) whose value is an object
        // That object may contain attributes and optionally a 'children' property
        if (keys.length === 1) {
            const tag = keys[0];
            const value = obj[tag];
            if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;

            // Check if it's a registered component first (before HTML tag validation)
            if (getComponent(tag)) return true;

            // Otherwise check if it's a valid tag name
            return isValidTagName(tag);
        }

        return false;
    };

    /**
     * Convert Object DOM syntax to vDOM syntax (recursive)
     * @param {any} obj - Object in Object DOM format or any child
     * @returns {any} - Converted to vDOM format
     */
    const convertObjectDOM = (obj) => {
        // Not an object or array - return as-is (strings, numbers, functions, etc.)
        if (typeof obj !== 'object' || obj === null) return obj;

        // Array - recursively convert children
        if (Array.isArray(obj)) {
            return obj.map(convertObjectDOM);
        }

        // Already vDOM format - recurse into children only
        if (obj.tag) {
            return {
                ...obj,
                children: obj.children ? convertObjectDOM(obj.children) : []
            };
        }

        // Live element - pass through
        if (obj.domEl) return obj;

        // Check for Object DOM syntax
        if (isObjectDOM(obj)) {
            const tagKey = Object.keys(obj)[0];
            const content = obj[tagKey];

            // Check if tagKey is a registered component
            const component = getComponent(tagKey);
            const tag = component || tagKey; // Use function if found, otherwise string

            // Extract children and attributes
            const { children, ...attributes } = content;

            return {
                tag,
                attributes,
                children: children ? convertObjectDOM(children) : []
            };
        }

        // Unknown object format - return as-is
        return obj;
    };

    /**
     * Enable Object DOM syntax support
     * @param {boolean} strict - If true, validates tag names against HTML spec
     */
    const useObjectDOMSyntax = (strict = false) => {
        objectDOMEnabled = true;
        objectDOMStrict = strict;
    };

    // Named registries for signals and state (used by template literals)
    const signalRegistry = new Map();
    const stateRegistry = new Map();

    // ============= STATE (Deep Reactivity) =============
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

    // Shared proxy handler helpers (uses Lightview.signal internally)
    const proxyGet = (target, prop, receiver, signals) => {
        const LV = window.Lightview;
        if (!signals.has(prop)) {
            signals.set(prop, LV.signal(Reflect.get(target, prop, receiver)));
        }
        const val = signals.get(prop).value;
        return typeof val === 'object' && val !== null ? state(val) : val;
    };

    const proxySet = (target, prop, value, receiver, signals) => {
        const LV = window.Lightview;
        if (!signals.has(prop)) {
            signals.set(prop, LV.signal(Reflect.get(target, prop, receiver)));
        }
        const success = Reflect.set(target, prop, value, receiver);
        if (success) signals.get(prop).value = value;
        return success;
    };

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

    /**
     * Create a deeply reactive proxy for an object or array
     * @param {Object|Array} obj - The object to make reactive
     * @returns {Proxy} - A reactive proxy
     */
    const state = (obj) => {
        if (typeof obj !== 'object' || obj === null) return obj;
        if (stateCache.has(obj)) return stateCache.get(obj);

        // Don't proxy objects with internal slots (RegExp, Map, Set, etc.)
        const isSpecialObject = obj instanceof RegExp ||
            obj instanceof Map || obj instanceof Set ||
            obj instanceof WeakMap || obj instanceof WeakSet;

        if (isSpecialObject) return obj;

        const isArray = Array.isArray(obj);
        const isDate = obj instanceof Date;
        const monitor = isArray ? "length" : isDate ? "getTime" : null;

        const proxy = isArray || isDate ? createSpecialProxy(obj, monitor) : new Proxy(obj, {
            get(target, prop, receiver) {
                const signals = getOrSet(stateSignals, target, () => new Map());
                return proxyGet(target, prop, receiver, signals);
            },
            set(target, prop, value, receiver) {
                const signals = getOrSet(stateSignals, target, () => new Map());
                return proxySet(target, prop, value, receiver, signals);
            }
        });

        stateCache.set(obj, proxy);
        return proxy;
    };

    // ============= COMPONENT REGISTRY =============
    const componentRegistry = new Map();
    let allowGlobalComponents = false;

    /**
     * Register a component for use in Object DOM syntax
     * @param {string} name - Component name (use '*' to enable global scope fallback)
     * @param {Function} [component] - Component function (omit when using '*')
     */
    const registerComponent = (name, component) => {
        if (name === '*') {
            allowGlobalComponents = true;
            return;
        }
        if (typeof component !== 'function') {
            throw new Error(`registerComponent: component must be a function`);
        }
        componentRegistry.set(name, component);
    };

    /**
     * Look up a component by name
     * @param {string} name - Component name to look up
     * @returns {Function|null} - Component function or null if not found
     */
    const getComponent = (name) => {
        // Check registry first
        if (componentRegistry.has(name)) {
            return componentRegistry.get(name);
        }
        // Check global scope if allowed
        if (allowGlobalComponents && typeof window !== 'undefined' && typeof window[name] === 'function') {
            return window[name];
        }
        return null;
    };

    // Template literal processing: converts "${...}" strings to reactive functions
    const processTemplateChild = (child, { state, signal }) => {
        if (typeof child === 'string' && child.includes('${')) {
            const template = child;
            return () => {
                try {
                    return new Function('state', 'signal', 'return `' + template + '`')(state, signal);
                } catch (e) {
                    return "";
                }
            };
        }
        return child; // No transformation needed
    };

    const domToElements = (domNodes, element) => {
        return domNodes.map(node => {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent.trim();
                return text ? text : null;
            }
            if (node.nodeType !== Node.ELEMENT_NODE) return null;

            const attributes = {};
            for (let attr of node.attributes) {
                attributes[attr.name] = attr.value;
            }

            const children = domToElements(Array.from(node.childNodes), element);
            return element(node.tagName.toLowerCase(), attributes, children);
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

    const handleSrcAttribute = async (el, src, tagName, { element, setupChildren }) => {
        // Skip standard src tags
        if (STANDARD_SRC_TAGS.includes(tagName)) return;

        const isPath = (s) => /^(https?:|\.|\/|\w)/.test(s) || /\.(html|json)$/.test(s);

        let content = null;
        let isJson = false;
        let rawContent = '';

        if (isPath(src)) {
            try {
                const res = await fetch(new URL(src, document.baseURI).href);
                if (res.ok) {
                    const contentType = res.headers.get('content-type');
                    isJson = contentType && contentType.includes('application/json');
                    if (isJson) {
                        content = await res.json();
                        rawContent = JSON.stringify(content);
                    } else {
                        content = await res.text();
                        rawContent = content;
                    }
                }
            } catch {
                // Fetch failed, try selector
            }
        }

        let elements = [];
        if (content !== null) {
            if (isJson) {
                elements = Array.isArray(content) ? content : [content];
            } else {
                // Check if escape attribute is set - if so, add as escaped text instead of parsing
                const shouldEscape = el.domEl.getAttribute('escape') === 'true';
                if (shouldEscape) {
                    // Add the raw HTML as escaped text content
                    el.domEl.textContent = content;
                    return;
                }

                const parser = new DOMParser();
                // Remove explicit <head> content to prevent collecting metadata
                // while preserving nodes that the parser auto-moves to head (e.g. styles outside head)
                const contentWithoutHead = content.replace(/<head[^>]*>[\s\S]*?<\/head>/i, '');
                const doc = parser.parseFromString(contentWithoutHead, 'text/html');

                // Collect all resulting nodes (auto-moved head nodes + body nodes)
                const allNodes = [...Array.from(doc.head.childNodes), ...Array.from(doc.body.childNodes)];
                elements = domToElements(allNodes, element);
            }
        } else {
            try {
                const selected = document.querySelectorAll(src);
                if (selected.length > 0) {
                    elements = domToElements(Array.from(selected), element);
                    // For selector content, create a string representation for hashing
                    rawContent = Array.from(selected).map(n => n.outerHTML || n.textContent).join('');
                }
            } catch {
                // Invalid selector
            }
        }

        if (elements.length === 0) return;

        // Get location attribute (default to 'innerhtml')
        const location = (el.domEl.getAttribute('location') || 'innerhtml').toLowerCase();

        // Generate content hash for deduplication
        const contentHash = hashContent(rawContent);
        const markerId = `${location}-${contentHash.slice(0, 8)}`;

        // Check if same content was already inserted
        let tracking = insertedContentMap.get(el.domEl);
        if (!tracking) {
            tracking = {};
            insertedContentMap.set(el.domEl, tracking);
        }

        if (tracking[location] === contentHash) {
            // Same content already inserted at this location - no-op
            return;
        }

        // Different content or first insert - remove old content if any
        if (tracking[location]) {
            const oldMarkerId = `${location}-${tracking[location].slice(0, 8)}`;
            removeInsertedContent(el.domEl, oldMarkerId);
        }

        // Update tracking
        tracking[location] = contentHash;

        // Check for shadow DOM via location attribute
        if (location === 'shadow') {
            if (!el.domEl.shadowRoot) {
                el.domEl.attachShadow({ mode: 'open' });
            }
            setupChildren(elements, el.domEl.shadowRoot);
            return;
        }

        // Handle different location modes
        switch (location) {
            case 'beforebegin':
            case 'afterend': {
                // Insert as siblings - need to use DOM insertion
                const parent = el.domEl.parentElement;
                if (!parent) {
                    console.warn('Cannot use beforebegin/afterend without parent element');
                    return;
                }

                const fragment = document.createDocumentFragment();
                fragment.appendChild(createMarker(markerId, false));

                elements.forEach(childEl => {
                    if (typeof childEl === 'string') {
                        fragment.appendChild(document.createTextNode(childEl));
                    } else if (childEl.domEl) {
                        fragment.appendChild(childEl.domEl);
                    } else if (childEl instanceof Node) {
                        fragment.appendChild(childEl);
                    } else {
                        // It's a vDOM object, create it
                        const created = element(childEl.tag, childEl.attributes || {}, childEl.children || []);
                        if (created && created.domEl) {
                            fragment.appendChild(created.domEl);
                        }
                    }
                });

                fragment.appendChild(createMarker(markerId, true));

                if (location === 'beforebegin') {
                    el.domEl.parentElement.insertBefore(fragment, el.domEl);
                } else {
                    el.domEl.parentElement.insertBefore(fragment, el.domEl.nextSibling);
                }
                break;
            }

            case 'afterbegin': {
                // Prepend to children
                const fragment = document.createDocumentFragment();
                fragment.appendChild(createMarker(markerId, false));

                elements.forEach(childEl => {
                    if (typeof childEl === 'string') {
                        fragment.appendChild(document.createTextNode(childEl));
                    } else if (childEl.domEl) {
                        fragment.appendChild(childEl.domEl);
                    } else if (childEl instanceof Node) {
                        fragment.appendChild(childEl);
                    } else {
                        const created = element(childEl.tag, childEl.attributes || {}, childEl.children || []);
                        if (created && created.domEl) {
                            fragment.appendChild(created.domEl);
                        }
                    }
                });

                fragment.appendChild(createMarker(markerId, true));
                el.domEl.insertBefore(fragment, el.domEl.firstChild);
                break;
            }

            case 'beforeend': {
                // Append to children
                el.domEl.appendChild(createMarker(markerId, false));

                elements.forEach(childEl => {
                    if (typeof childEl === 'string') {
                        el.domEl.appendChild(document.createTextNode(childEl));
                    } else if (childEl.domEl) {
                        el.domEl.appendChild(childEl.domEl);
                    } else if (childEl instanceof Node) {
                        el.domEl.appendChild(childEl);
                    } else {
                        const created = element(childEl.tag, childEl.attributes || {}, childEl.children || []);
                        if (created && created.domEl) {
                            el.domEl.appendChild(created.domEl);
                        }
                    }
                });

                el.domEl.appendChild(createMarker(markerId, true));
                break;
            }

            case 'outerhtml': {
                // Replace the element entirely
                const parent = el.domEl.parentElement;
                if (!parent) {
                    console.warn('Cannot use outerhtml without parent element');
                    return;
                }

                const fragment = document.createDocumentFragment();
                fragment.appendChild(createMarker(markerId, false));

                elements.forEach(childEl => {
                    if (typeof childEl === 'string') {
                        fragment.appendChild(document.createTextNode(childEl));
                    } else if (childEl.domEl) {
                        fragment.appendChild(childEl.domEl);
                    } else if (childEl instanceof Node) {
                        fragment.appendChild(childEl);
                    } else {
                        const created = element(childEl.tag, childEl.attributes || {}, childEl.children || []);
                        if (created && created.domEl) {
                            fragment.appendChild(created.domEl);
                        }
                    }
                });

                fragment.appendChild(createMarker(markerId, true));
                parent.replaceChild(fragment, el.domEl);
                break;
            }

            case 'innerhtml':
            default: {
                // Replace all children (original behavior)
                el.children = elements;
                break;
            }
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

    // ============= ENHANCE EXISTING DOM ELEMENTS =============

    /**
     * Enhance an existing DOM element with Lightview reactivity.
     * @param {string|HTMLElement} selectorOrNode - CSS selector or DOM element
     * @param {Object} options - Reactive options (attributes, event handlers, innerText, innerHTML)
     * @returns {Object} - Lightview reactive element wrapper
     */
    const enhance = (selectorOrNode, options = {}) => {
        // Resolve to DOM node
        const domNode = typeof selectorOrNode === 'string'
            ? document.querySelector(selectorOrNode)
            : selectorOrNode;

        if (!domNode || !(domNode instanceof HTMLElement)) {
            console.warn('enhance: Invalid selector or DOM node', selectorOrNode);
            return null;
        }

        // Check if Lightview is available
        if (typeof window === 'undefined' || !window.Lightview) {
            console.warn('enhance: Lightview not available');
            return null;
        }

        const LV = window.Lightview;
        const tagName = domNode.tagName.toLowerCase();

        // Check if already wrapped
        let el = LV.internals.domToElement.get(domNode);
        if (!el) {
            // Create reactive wrapper for existing element
            el = LV.internals.wrapDomElement(domNode, tagName, {}, []);
        }

        // Extract special properties
        const { innerText, innerHTML, ...attrs } = options;

        // Handle innerText reactivity
        if (innerText !== undefined) {
            if (typeof innerText === 'function') {
                LV.effect(() => {
                    domNode.innerText = innerText();
                });
            } else {
                domNode.innerText = innerText;
            }
        }

        // Handle innerHTML reactivity
        if (innerHTML !== undefined) {
            if (typeof innerHTML === 'function') {
                LV.effect(() => {
                    domNode.innerHTML = innerHTML();
                });
            } else {
                domNode.innerHTML = innerHTML;
            }
        }

        // Apply remaining attributes (includes event handlers)
        if (Object.keys(attrs).length > 0) {
            el.attributes = attrs;
        }

        return el;
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
        if (STANDARD_SRC_TAGS.includes(tagName)) return;

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

    /**
     * Setup MutationObserver to watch for added nodes with src attributes
     * @param {Object} LV - Lightview instance
     */
    const setupSrcObserver = (LV) => {
        const observer = new MutationObserver((mutations) => {
            // Collect all nodes to process
            const nodesToProcess = [];

            for (const mutation of mutations) {
                // Handle added nodes
                if (mutation.type === 'childList') {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType !== Node.ELEMENT_NODE) continue;

                        // Check the added node itself
                        nodesToProcess.push(node);

                        // Check descendants with src attribute (excluding standard src tags)
                        const selector = '[src]:not(' + STANDARD_SRC_TAGS.join('):not(') + ')';
                        const descendants = node.querySelectorAll(selector);
                        for (const desc of descendants) {
                            nodesToProcess.push(desc);
                        }
                    }
                }

                // Handle attribute changes (specifically 'src' attribute)
                if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
                    nodesToProcess.push(mutation.target);
                }
            }

            // Defer processing to next animation frame
            // This allows the router's pushState to complete first,
            // ensuring document.baseURI reflects the correct path
            if (nodesToProcess.length > 0) {
                requestAnimationFrame(() => {
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

        // Extend signal with named registry support
        const originalSignal = LV.signal;
        LV.signal = (initialValue, name) => {
            const sig = originalSignal(initialValue);
            if (name) signalRegistry.set(name, sig);
            return sig;
        };
        LV.signal.get = (name, defaultValue) => {
            if (!signalRegistry.has(name) && defaultValue !== undefined) {
                return LV.signal(defaultValue, name);
            }
            return signalRegistry.get(name);
        };

        // Create named-registry-aware state wrapper
        const stateWithRegistry = (obj, name) => {
            const st = state(obj);
            if (name) stateRegistry.set(name, st);
            return st;
        };
        stateWithRegistry.get = (name, defaultValue) => {
            if (!stateRegistry.has(name) && defaultValue !== undefined) {
                return stateWithRegistry(defaultValue, name);
            }
            return stateRegistry.get(name);
        };

        // Setup DOM observer for src attributes on added nodes
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => setupSrcObserver(LV));
        } else {
            setupSrcObserver(LV);
        }

        // Also process any existing elements with src attributes on non-standard tags
        if (document.body) {
            setTimeout(() => {
                const selector = '[src]:not(' + STANDARD_SRC_TAGS.join('):not(') + ')';
                const nodes = document.querySelectorAll(selector);
                nodes.forEach(node => processSrcOnNode(node, LV));
            }, 250);
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                const selector = '[src]:not(' + STANDARD_SRC_TAGS.join('):not(') + ')';
                const nodes = document.querySelectorAll(selector)
                nodes.forEach(node => processSrcOnNode(node, LV));
            });
        }

        // Register href click handler
        LV.hooks.onNonStandardHref = (e) => {
            handleNonStandardHref(e, {
                domToElement: LV.internals.domToElement,
                wrapDomElement: LV.internals.wrapDomElement
            });
        };

        // Register template literal processor (and Object DOM converter)
        LV.hooks.processChild = (child) => {
            // First, convert Object DOM syntax if enabled
            if (objectDOMEnabled && typeof child === 'object' && child !== null && !Array.isArray(child)) {
                child = convertObjectDOM(child);
            }

            // Then process template literals
            return processTemplateChild(child, {
                state: stateWithRegistry,
                signal: LV.signal
            });
        };
    }



    // Export for module usage
    const LightviewX = {
        state,
        enhance,
        registerComponent,
        registerStyleSheet,
        getComponent,
        useObjectDOMSyntax,
        convertObjectDOM,
        // Component initialization
        initComponents,
        componentConfig,
        shouldUseShadow,
        getAdoptedStyleSheets,
        preloadComponentCSS
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = LightviewX;
    }
    if (typeof window !== 'undefined') {
        window.LightviewX = LightviewX;
    }
})();
