(() => {
    /**
     * LIGHTVIEW CORE
     * A minimalist library for signals-based reactivity and functional UI components.
     */

    // ============= SIGNALS =============

    const core = {
        currentEffect: null
    };


    /**
     * Helper to get a value from a Map or create and set it if it doesn't exist.
     */
    const getOrSet = (map, key, factory) => {
        let v = map.get(key);
        if (!v) {
            v = factory();
            map.set(key, v);
        }
        return v;
    };

    const nodeState = new WeakMap();
    const nodeStateFactory = () => ({ effects: [], onmount: null, onunmount: null });

    const registry = new Map();

    /**
     * Creates a reactive signal.
     * @param {*} initialValue - The initial value of the signal.
     * @param {Object|string} [optionsOrName] - Optional name (for registry) or options object.
     */
    const signal = (initialValue, optionsOrName) => {
        let name = typeof optionsOrName === 'string' ? optionsOrName : optionsOrName?.name;
        const storage = optionsOrName?.storage;

        if (name && storage) {
            const stored = storage.getItem(name);
            if (stored !== null) {
                initialValue = stored;
                try {
                    initialValue = JSON.parse(stored);
                } catch (e) {
                    // Ignore storage errors
                }
            }
        }

        let value = initialValue;
        const subscribers = new Set();

        const f = (...args) => {
            if (args.length === 0) return f.value;
            f.value = args[0];
        };

        Object.defineProperty(f, 'value', {
            get() {
                if (core.currentEffect) {
                    subscribers.add(core.currentEffect);
                    core.currentEffect.dependencies.add(subscribers);
                }
                return value;
            },
            set(newValue) {
                if (value !== newValue) {
                    value = newValue;
                    if (name && storage) {
                        try {
                            storage.setItem(name, JSON.stringify(value));
                        } catch (e) {
                            // Ignore storage errors
                        }
                    }
                    // Copy subscribers to avoid infinite loop when effect re-subscribes during iteration
                    [...subscribers].forEach(effect => effect());
                }
            }
        });

        if (name) {
            if (registry.has(name)) {
                throw new Error(`Lightview: A signal or state with the name "${name}" is already registered.`);
            }
            registry.set(name, f);
        }

        return f;
    };

    const get = (name, defaultValue) => {
        if (!registry.has(name) && defaultValue !== undefined) {
            return signal(defaultValue, name);
        }
        return registry.get(name);
    };
    signal.get = get;

    /**
     * Creates a side-effect that automatically tracks and re-runs when its signal dependencies change.
     * @param {Function} fn - The function to execute as an effect.
     */
    const effect = (fn) => {
        const execute = () => {
            if (!execute.active || execute.running) return;
            // Cleanup old dependencies
            execute.dependencies.forEach(dep => dep.delete(execute));
            execute.dependencies.clear();

            execute.running = true;
            core.currentEffect = execute;
            try {
                fn();
            } finally {
                core.currentEffect = null;
                execute.running = false;
            }
        };

        execute.active = true;
        execute.running = false;
        execute.dependencies = new Set();
        execute.stop = () => {
            execute.dependencies.forEach(dep => dep.delete(execute));
            execute.dependencies.clear();
            execute.active = false;
        };
        execute();
        return execute;
    };

    /**
     * Assocates an effect with a DOM node for automatic cleanup when the node is removed.
     */
    const trackEffect = (node, effectFn) => {
        const state = getOrSet(nodeState, node, nodeStateFactory);
        if (!state.effects) state.effects = [];
        state.effects.push(effectFn);
    };

    /**
     * Creates a read-only signal derived from other signals.
     */
    const computed = (fn) => {
        const sig = signal(undefined);
        effect(() => {
            sig.value = fn();
        });
        return sig;
    };


    // ============= SHADOW DOM SUPPORT =============
    // Marker symbol to identify shadowDOM directives
    const SHADOW_DOM_MARKER = Symbol('lightview.shadowDOM');

    /**
     * Create a shadowDOM directive marker
     * @param {Object} attributes - { mode: 'open'|'closed', styles?: string[], adoptedStyleSheets?: CSSStyleSheet[] }
     * @param {Array} children - Children to render inside the shadow root
     * @returns {Object} - Marker object for setupChildren to process
     */
    const createShadowDOMMarker = (attributes, children) => ({
        [SHADOW_DOM_MARKER]: true,
        mode: attributes.mode || 'open',
        styles: attributes.styles || [],
        adoptedStyleSheets: attributes.adoptedStyleSheets || [],
        children
    });

    /**
     * Check if an object is a shadowDOM marker
     */
    const isShadowDOMMarker = (obj) => obj && typeof obj === 'object' && obj[SHADOW_DOM_MARKER] === true;

    /**
     * Process a shadowDOM marker by attaching shadow root and rendering children
     * @param {Object} marker - The shadowDOM marker
     * @param {HTMLElement} parentNode - The DOM node to attach shadow to
     */
    const processShadowDOM = (marker, parentNode) => {
        // Don't attach if already has shadow root
        if (parentNode.shadowRoot) {
            console.warn('Lightview: Element already has a shadowRoot, skipping shadowDOM directive');
            return;
        }

        // Attach shadow root
        const shadowRoot = parentNode.attachShadow({ mode: marker.mode });

        // Split adoptedStyleSheets into sheets and urls
        const sheets = [];
        const linkUrls = [...(marker.styles || [])];

        if (marker.adoptedStyleSheets && marker.adoptedStyleSheets.length > 0) {
            marker.adoptedStyleSheets.forEach(item => {
                if (item instanceof CSSStyleSheet) {
                    sheets.push(item);
                } else if (typeof item === 'string') {
                    linkUrls.push(item);
                }
            });
        }

        // Handle adoptedStyleSheets (modern, efficient approach)
        if (sheets.length > 0) {
            try {
                shadowRoot.adoptedStyleSheets = sheets;
            } catch (e) {
                console.warn('Lightview: adoptedStyleSheets not supported');
            }
        }

        // Inject stylesheet links
        for (const styleUrl of linkUrls) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = styleUrl;
            shadowRoot.appendChild(link);
        }

        // Setup children inside shadow root
        if (marker.children && marker.children.length > 0) {
            setupChildrenInTarget(marker.children, shadowRoot);
        }
    };

    // ============= REACTIVE UI =============
    let inSVG = false;

    const domToElement = new WeakMap();

    /**
     * Wraps a native DOM element in a Lightview reactive proxy.
     */
    const wrapDomElement = (domNode, tag, attributes = {}, children = []) => {
        const el = {
            tag,
            attributes,
            children,
            get domEl() { return domNode; }
        };
        const proxy = makeReactive(el);
        domToElement.set(domNode, proxy);
        return proxy;
    };

    /**
     * The core virtual-DOM-to-real-DOM factory.
     * Handles tag functions (components), shadow DOM directives, and SVG namespaces.
     */
    const element = (tag, attributes = {}, children = []) => {
        if (customTags[tag]) tag = customTags[tag];
        // If tag is a function (component), call it and process the result
        if (typeof tag === 'function') {
            const result = tag({ ...attributes }, children);
            return processComponentResult(result);
        }

        // Special handling for shadowDOM pseudo-element
        if (tag === 'shadowDOM') {
            return createShadowDOMMarker(attributes, children);
        }

        const isSVG = tag.toLowerCase() === 'svg';
        const wasInSVG = inSVG;
        if (isSVG) inSVG = true;

        const domNode = inSVG
            ? document.createElementNS('http://www.w3.org/2000/svg', tag)
            : document.createElement(tag);

        const proxy = wrapDomElement(domNode, tag, attributes, children);
        proxy.attributes = attributes;
        proxy.children = children;

        if (isSVG) inSVG = wasInSVG;
        return proxy;
    };

    // Process component function return value (HTML string, DOM node, vDOM, or Object DOM)
    const processComponentResult = (result) => {
        if (!result) return null;

        if (Lightview.hooks.processChild) {
            result = Lightview.hooks.processChild(result) ?? result;
        }

        // Already a Lightview element
        if (result.domEl) return result;

        // DOM node - wrap it
        if (result instanceof HTMLElement) {
            return wrapDomElement(result, result.tagName.toLowerCase(), {}, []);
        }

        // HTML string - parse and wrap
        if (typeof result === 'string') {
            const template = document.createElement('template');
            template.innerHTML = result.trim();
            const content = template.content;
            // If single element, return it; otherwise wrap in a fragment-like span
            if (content.childNodes.length === 1 && content.firstChild instanceof HTMLElement) {
                const el = content.firstChild;
                return wrapDomElement(el, el.tagName.toLowerCase(), {}, []);
            } else {
                const wrapper = document.createElement('span');
                wrapper.style.display = 'contents';
                wrapper.appendChild(content);
                return wrapDomElement(wrapper, 'span', {}, []);
            }
        }

        // vDOM object with tag property
        if (typeof result === 'object' && result.tag) {
            return element(result.tag, result.attributes || {}, result.children || []);
        }

        return null;
    };

    /**
     * Internal proxy to intercept 'attributes' and 'children' updates on an element.
     */
    const makeReactive = (el) => {
        const domNode = el.domEl;

        return new Proxy(el, {
            set(target, prop, value) {
                if (prop === 'attributes') {
                    target[prop] = makeReactiveAttributes(value, domNode);
                } else if (prop === 'children') {
                    target[prop] = setupChildren(value, domNode);
                } else {
                    target[prop] = value;
                }
                return true;
            }
        });
    };

    // Properties that should be set directly on the DOM node object rather than as attributes
    const NODE_PROPERTIES = new Set(['value', 'checked', 'selected', 'selectedIndex', 'className', 'innerHTML', 'innerText']);

    // Set attribute with proper handling of boolean attributes and undefined/null values
    const setAttributeValue = (domNode, key, value) => {
        const isBool = typeof domNode[key] === 'boolean';

        // Sanitize href/src attributes to prevent javascript: and other dangerous protocols
        if ((key === 'href' || key === 'src') && typeof value === 'string' && /^(javascript|vbscript|data:text\/html|data:application\/javascript)/i.test(value)) {
            console.warn(`[Lightview] Blocked dangerous protocol in ${key}: ${value}`);
            value = 'javascript:void(0)'; // Safer fallback than # which might trigger scroll or router
        }

        if (NODE_PROPERTIES.has(key) || isBool) {
            domNode[key] = isBool ? (value !== null && value !== undefined && value !== false && value !== 'false') : value;
        } else if (value === null || value === undefined) {
            domNode.removeAttribute(key);
        } else {
            domNode.setAttribute(key, value);
        }
    };

    /**
     * Processes attributes, handling event listeners, reactive bindings, and special 'onmount' hooks.
     */
    const makeReactiveAttributes = (attributes, domNode) => {
        const reactiveAttrs = {};

        for (let [key, value] of Object.entries(attributes)) {
            if (key === 'onmount' || key === 'onunmount') {
                const state = getOrSet(nodeState, domNode, nodeStateFactory);
                state[key] = value;

                if (key === 'onmount' && domNode.isConnected) {
                    value(domNode);
                }
            } else if (key.startsWith('on')) {
                // Event handler
                if (typeof value === 'function') {
                    // Function handler - use addEventListener
                    const eventName = key.slice(2).toLowerCase();
                    domNode.addEventListener(eventName, value);
                } else if (typeof value === 'string') {
                    // String handler (from parsed HTML) - use setAttribute
                    // Browser will compile the string into a handler function
                    domNode.setAttribute(key, value);
                }
                reactiveAttrs[key] = value;
            } else if (typeof value === 'function') {
                // Reactive binding
                const runner = effect(() => {
                    const result = value();
                    if (key === 'style' && typeof result === 'object') {
                        Object.assign(domNode.style, result);
                    } else {
                        setAttributeValue(domNode, key, result);
                    }
                });
                trackEffect(domNode, runner);
                reactiveAttrs[key] = value;
            } else if (key === 'style' && typeof value === 'object') {
                // Handle style object which may contain reactive values
                Object.entries(value).forEach(([styleKey, styleValue]) => {
                    if (typeof styleValue === 'function') {
                        const runner = effect(() => {
                            domNode.style[styleKey] = styleValue();
                        });
                        trackEffect(domNode, runner);
                    } else {
                        domNode.style[styleKey] = styleValue;
                    }
                });
                reactiveAttrs[key] = value;
            } else {
                // Static attribute - handle undefined/null/boolean properly
                setAttributeValue(domNode, key, value);
                reactiveAttrs[key] = value;
            }
        }

        return reactiveAttrs;
    };

    /**
     * Core child processing logic - shared between setupChildren and setupChildrenInTarget
     * @param {Array} children - Children to process
     * @param {HTMLElement|ShadowRoot} targetNode - Where to append children
     * @param {boolean} clearExisting - Whether to clear existing content
     * @returns {Array} - Processed child elements
     */
    /**
     * Core child processing logic. Recursively handles strings, arrays, 
     * reactive functions, vDOM objects, and Shadow DOM markers.
     */
    const processChildren = (children, targetNode, clearExisting = true) => {
        if (clearExisting && targetNode.innerHTML !== undefined) {
            targetNode.innerHTML = ''; // Clear existing
        }
        const childElements = [];

        // Check if we're processing children of script or style elements
        // These need raw text content preserved, not reactive transformations
        const isSpecialElement = targetNode.tagName &&
            (targetNode.tagName.toLowerCase() === 'script' || targetNode.tagName.toLowerCase() === 'style');

        const flatChildren = children.flat(Infinity);

        for (let child of flatChildren) {
            // Allow extensions to transform children (e.g., template literals)
            // BUT skip for script/style elements which need raw content
            if (Lightview.hooks.processChild && !isSpecialElement) {
                child = Lightview.hooks.processChild(child) ?? child;
            }

            // Handle shadowDOM markers - attach shadow to parent and process shadow children
            if (isShadowDOMMarker(child)) {
                // targetNode is the parent element that should get the shadow root
                // For ShadowRoot targets, we can't attach another shadow, so warn
                if (targetNode instanceof ShadowRoot) {
                    console.warn('Lightview: Cannot nest shadowDOM inside another shadowDOM');
                    continue;
                }
                processShadowDOM(child, targetNode);
                continue;
            }

            const type = typeof child;
            if (type === 'function') {
                const startMarker = document.createComment('lv:s');
                const endMarker = document.createComment('lv:e');
                targetNode.appendChild(startMarker);
                targetNode.appendChild(endMarker);

                let runner;
                const update = () => {
                    // 1. Cleanup: Remove everything between markers
                    while (startMarker.nextSibling && startMarker.nextSibling !== endMarker) {
                        startMarker.nextSibling.remove();
                        // Note: MutationObserver handles cleanupNode(removedNode)
                    }

                    // 2. Execution: Get new value and process it
                    const val = child();
                    if (val === undefined || val === null) return;

                    // 3. Render: Process children into a fragment and insert before endMarker
                    const fragment = document.createDocumentFragment();
                    const childrenToProcess = Array.isArray(val) ? val : [val];

                    // Stop the runner if the markers are no longer in the DOM
                    if (runner && !startMarker.isConnected) {
                        runner.stop();
                        return;
                    }

                    processChildren(childrenToProcess, fragment, false);
                    endMarker.parentNode.insertBefore(fragment, endMarker);
                };

                runner = effect(update);
                trackEffect(startMarker, runner);
                childElements.push(child);
            } else if (['string', 'number', 'boolean', 'symbol'].includes(type)) {
                // Static text
                targetNode.appendChild(document.createTextNode(child));
                childElements.push(child);
            } else if (child && type === 'object' && child.tag) {
                // Child element (already wrapped or plain object) - tag can be string or function
                const childEl = child.domEl ? child : element(child.tag, child.attributes || {}, child.children || []);
                targetNode.appendChild(childEl.domEl);
                childElements.push(childEl);
            }
        }

        return childElements;
    };

    /**
     * Setup children in a target node (for shadow roots and other targets)
     * Does not clear existing content
     */
    const setupChildrenInTarget = (children, targetNode) => {
        return processChildren(children, targetNode, false);
    };

    /**
     * Setup children on a DOM node, clearing existing content
     */
    const setupChildren = (children, domNode) => {
        return processChildren(children, domNode, true);
    };

    // ============= EXPORTS =============
    /**
     * Enhances an existing DOM element with Lightview reactivity.
     */
    const enhance = (selectorOrNode, options = {}) => {
        const domNode = typeof selectorOrNode === 'string'
            ? document.querySelector(selectorOrNode)
            : selectorOrNode;

        // If it's already a Lightview element, use its domEl
        const node = domNode.domEl || domNode;
        if (!(node instanceof HTMLElement)) return null;

        const tagName = node.tagName.toLowerCase();
        let el = domToElement.get(node);

        if (!el) {
            el = wrapDomElement(node, tagName);
        }

        const { innerText, innerHTML, ...attrs } = options;

        if (innerText !== undefined) {
            if (typeof innerText === 'function') {
                effect(() => { node.innerText = innerText(); });
            } else {
                node.innerText = innerText;
            }
        }

        if (innerHTML !== undefined) {
            if (typeof innerHTML === 'function') {
                effect(() => { node.innerHTML = innerHTML(); });
            } else {
                node.innerHTML = innerHTML;
            }
        }

        if (Object.keys(attrs).length > 0) {
            // Merge with existing attributes or simply set them triggers the proxy
            el.attributes = attrs;
        }

        return el;
    };

    /**
     * Query selector helper that adds a .content() method for easy DOM manipulation.
     */
    const $ = (cssSelectorOrElement, startingDomEl = document.body) => {
        const el = typeof cssSelectorOrElement === 'string' ? startingDomEl.querySelector(cssSelectorOrElement) : cssSelectorOrElement;
        if (!el) return null;
        Object.defineProperty(el, 'content', {
            value(child, location = 'inner') {
                location = location.toLowerCase();
                const tags = Lightview.tags;

                // Check if target element is script or style
                const isSpecialElement = el.tagName &&
                    (el.tagName.toLowerCase() === 'script' || el.tagName.toLowerCase() === 'style');

                const array = (Array.isArray(child) ? child : [child]).map(item => {
                    // Allow extensions to transform children (e.g., Object DOM syntax)
                    // BUT skip for script/style elements which need raw content
                    if (Lightview.hooks.processChild && !isSpecialElement) {
                        item = Lightview.hooks.processChild(item) ?? item;
                    }
                    if (item.tag && !item.domEl) {
                        return element(item.tag, item.attributes || {}, item.children || []).domEl;
                    } else {
                        return item.domEl || item;
                    }
                });

                const target = location === 'shadow' ? (el.shadowRoot || el.attachShadow({ mode: 'open' })) : el;

                if (location === 'inner' || location === 'shadow') {
                    target.replaceChildren(...array);
                } else if (location === 'outer') {
                    target.replaceWith(...array);
                } else if (location === 'afterbegin') {
                    target.prepend(...array);
                } else if (location === 'beforeend') {
                    target.append(...array);
                } else {
                    array.forEach(item => el.insertAdjacentElement(location, item));
                }
                return el;
            },
            configurable: true,
            writable: true
        });
        return el;
    };

    const customTags = {}
    /**
     * Proxy for accessing or registering tags/components.
     * e.g., Lightview.tags.div(...) or Lightview.tags.MyComponent = ...
     */
    const tags = new Proxy({}, {
        get(_, tag) {
            if (tag === "_customTags") return { ...customTags };

            const wrapper = (...args) => {
                let attributes = {};
                let children = args;
                const arg0 = args[0];
                if (args.length > 0 && arg0 && typeof arg0 === 'object' && !arg0.tag && !arg0.domEl && !Array.isArray(arg0)) {
                    attributes = arg0;
                    children = args.slice(1);
                }
                return element(customTags[tag] || tag, attributes, children);
            };

            // Lift static methods/properties from the component onto the wrapper
            // This allows patterns like Card.Figure to work when Card is retrieved from tags
            if (customTags[tag]) {
                Object.assign(wrapper, customTags[tag]);
            }

            return wrapper;
        },
        set(_, tag, value) {
            customTags[tag] = value;
            return true;
        }
    });

    const Lightview = {
        signal,
        computed,
        effect,
        get,
        registry,
        element, // do not document this
        enhance,
        tags,
        $,
        // Extension hooks
        hooks: {
            onNonStandardHref: null,
            processChild: null,
            validateUrl: null
        },
        // Internals exposed for extensions
        internals: {
            core,
            domToElement,
            wrapDomElement,
            setupChildren
        }
    };

    // Export for use
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Lightview;
    }
    if (typeof window !== 'undefined') {
        globalThis.Lightview = Lightview;

        // Global click handler delegates to hook if registered
        globalThis.addEventListener('click', (e) => {
            // Support fragment navigation piercing Shadow DOM
            // Use composedPath() to find the actual clicked element, even inside shadow roots
            const path = e.composedPath();
            const link = path.find(el => el.tagName === 'A' && el.getAttribute?.('href')?.startsWith('#'));

            if (link && !e.defaultPrevented) {
                const href = link.getAttribute('href');
                if (href.length > 1) {
                    const id = href.slice(1);
                    const root = link.getRootNode();
                    const target = (root.getElementById ? root.getElementById(id) : null) ||
                        (root.querySelector ? root.querySelector(`#${id}`) : null);

                    if (target) {
                        e.preventDefault();
                        requestAnimationFrame(() => {
                            requestAnimationFrame(() => {
                                target.style.scrollMarginTop = 'calc(var(--site-nav-height, 0px) + 2rem)';
                                target.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'start' });
                            });
                        });
                    }
                }
            }

            if (Lightview.hooks.onNonStandardHref) {
                Lightview.hooks.onNonStandardHref(e);
            }
        });

        // Automatic Cleanup & Lifecycle Hooks
        if (typeof MutationObserver !== 'undefined') {
            const walkNodes = (node, fn) => {
                fn(node);
                node.childNodes?.forEach(n => walkNodes(n, fn));
                if (node.shadowRoot) walkNodes(node.shadowRoot, fn);
            };

            const cleanupNode = (node) => walkNodes(node, n => {
                const s = nodeState.get(n);
                if (s) {
                    s.effects?.forEach(e => e.stop());
                    s.onunmount?.(n);
                    nodeState.delete(n);
                }
            });

            const mountNode = (node) => walkNodes(node, n => {
                nodeState.get(n)?.onmount?.(n);
            });

            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.removedNodes.forEach(cleanupNode);
                    mutation.addedNodes.forEach(mountNode);
                });
            });

            // Wait for DOM to be ready before observing
            const startObserving = () => {
                if (document.body) {
                    observer.observe(document.body, {
                        childList: true,
                        subtree: true
                    });
                }
            };

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', startObserving);
            } else {
                startObserving();
            }
        }
    }
})();
