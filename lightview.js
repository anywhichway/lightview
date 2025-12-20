(() => {
    // ============= SIGNALS =============

    let currentEffect = null;


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

    const signalRegistry = new Map();

    const signal = (initialValue, name) => {
        let value = initialValue;
        const subscribers = new Set();

        const f = (...args) => {
            if (args.length === 0) return f.value;
            f.value = args[0];
        };

        Object.defineProperty(f, 'value', {
            get() {
                if (currentEffect) {
                    subscribers.add(currentEffect);
                    currentEffect.dependencies.add(subscribers);
                }
                return value;
            },
            set(newValue) {
                if (value !== newValue) {
                    value = newValue;
                    // Copy subscribers to avoid infinite loop when effect re-subscribes during iteration
                    [...subscribers].forEach(effect => effect());
                }
            }
        });

        if (name) {
            signalRegistry.set(name, f);
        }

        return f;
    };

    signal.get = (name, defaultValue) => {
        if (!signalRegistry.has(name) && defaultValue !== undefined) {
            return signal(defaultValue, name);
        }
        return signalRegistry.get(name);
    };

    const effect = (fn) => {
        const execute = () => {
            if (!execute.active) return;
            // Cleanup old dependencies
            execute.dependencies.forEach(dep => dep.delete(execute));
            execute.dependencies.clear();

            currentEffect = execute;
            fn();
            currentEffect = null;
        };

        execute.active = true;
        execute.dependencies = new Set();
        execute.stop = () => {
            execute.dependencies.forEach(dep => dep.delete(execute));
            execute.dependencies.clear();
            execute.active = false;
        };
        execute();
        return execute;
    };

    const trackEffect = (node, effectFn) => {
        const state = getOrSet(nodeState, node, nodeStateFactory);
        if (!state.effects) state.effects = [];
        state.effects.push(effectFn);
    };

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

        // Handle adoptedStyleSheets (modern, efficient approach)
        if (marker.adoptedStyleSheets.length > 0) {
            try {
                shadowRoot.adoptedStyleSheets = [...marker.adoptedStyleSheets];
            } catch (e) {
                console.warn('Lightview: adoptedStyleSheets not supported, falling back to <style> injection');
            }
        }

        // Inject stylesheet links
        for (const styleUrl of marker.styles) {
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

    /**
     * Check if a string is a valid HTML tag name
     * @param {string} name - The tag name to check
     * @returns {boolean}
     */
    const isValidTagName = (name) => {
        if (typeof name !== 'string' || name.length === 0 || name === 'children') {
            return false;
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
            const component = customTags[tagKey];
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

    // ============= REACTIVE UI =============
    const SVG_TAGS = new Set([
        'svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'g', 'defs', 'marker',
        'pattern', 'mask', 'image', 'text', 'tspan', 'foreignObject', 'use', 'symbol', 'clipPath',
        'linearGradient', 'radialGradient', 'stop', 'filter', 'animate', 'animateMotion',
        'animateTransform', 'mpath', 'desc', 'metadata', 'title', 'feBlend', 'feColorMatrix',
        'feComponentTransfer', 'feComposite', 'feConvolveMatrix', 'feDiffuseLighting',
        'feDisplacementMap', 'feDistantLight', 'feDropShadow', 'feFlood', 'feFuncA', 'feFuncB',
        'feFuncG', 'feFuncR', 'feGaussianBlur', 'feImage', 'feMerge', 'feMergeNode',
        'feMorphology', 'feOffset', 'fePointLight', 'feSpecularLighting', 'feSpotLight',
        'feTile', 'feTurbulence', 'view'
    ]);

    const domToElement = new WeakMap();

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

        const isSvg = SVG_TAGS.has(tag.toLowerCase());
        const domNode = isSvg
            ? document.createElementNS('http://www.w3.org/2000/svg', tag)
            : document.createElement(tag);
        const proxy = wrapDomElement(domNode, tag, attributes, children);
        proxy.attributes = attributes;
        proxy.children = children;
        return proxy;
    };

    // Process component function return value (HTML string, DOM node, vDOM, or Object DOM)
    const processComponentResult = (result) => {
        if (!result) return null;

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

        // Object DOM syntax will be handled by processChild hook in lightview-x
        // But we can do basic detection here
        if (typeof result === 'object') {
            const keys = Object.keys(result);
            if (keys.length === 1 && typeof result[keys[0]] === 'object') {
                const tag = keys[0];
                const content = result[tag];
                const { children, ...attributes } = content;
                return element(tag, attributes, children || []);
            }
        }

        return null;
    };

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

    // Boolean attributes that should be present/absent rather than having a value
    const BOOLEAN_ATTRIBUTES = new Set([
        'disabled', 'checked', 'readonly', 'required', 'hidden', 'autofocus',
        'autoplay', 'controls', 'loop', 'muted', 'default', 'defer', 'async',
        'novalidate', 'formnovalidate', 'open', 'selected', 'multiple', 'reversed',
        'ismap', 'nomodule', 'playsinline', 'allowfullscreen', 'inert'
    ]);

    // Set attribute with proper handling of boolean attributes and undefined/null values
    const setAttributeValue = (domNode, key, value) => {
        const isBooleanAttr = BOOLEAN_ATTRIBUTES.has(key.toLowerCase());

        if (value === null || value === undefined) {
            domNode.removeAttribute(key);
        } else if (isBooleanAttr) {
            if (value && value !== 'false') {
                domNode.setAttribute(key, '');
            } else {
                domNode.removeAttribute(key);
            }
        } else {
            domNode.setAttribute(key, value);
        }
    };

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
    const processChildren = (children, targetNode, clearExisting = true) => {
        if (clearExisting && targetNode.innerHTML !== undefined) {
            targetNode.innerHTML = ''; // Clear existing
        }
        const childElements = [];

        // Check if we're processing children of script or style elements
        // These need raw text content preserved, not reactive transformations
        const isSpecialElement = targetNode.tagName &&
            (targetNode.tagName.toLowerCase() === 'script' || targetNode.tagName.toLowerCase() === 'style');

        for (let child of children) {
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
                const result = child();
                // Determine if the result implies complex content (DOM/vDOM/Array)
                // Treat as complex if it's an object (including arrays) but not null
                const isComplex = result && (typeof result === 'object' || Array.isArray(result));

                if (isComplex) {
                    // Reactive element, vDOM object, or list of items
                    // Use a stable wrapper div to hold the reactive content
                    const wrapper = document.createElement('span');
                    wrapper.style.display = 'contents';
                    targetNode.appendChild(wrapper);

                    let runner;
                    const update = () => {
                        const val = child();
                        // Check if wrapper is still in the DOM (skip check on first run)
                        if (runner && !wrapper.parentNode) {
                            runner.stop();
                            return;
                        }
                        const childrenToProcess = Array.isArray(val) ? val : [val];
                        // processChildren handles clearing existing content via 3rd arg=true
                        processChildren(childrenToProcess, wrapper, true);
                    };

                    runner = effect(update);
                    trackEffect(wrapper, runner);
                    childElements.push(child);
                } else {
                    // Reactive text node for primitives
                    const textNode = document.createTextNode('');
                    targetNode.appendChild(textNode);
                    const runner = effect(() => {
                        const val = child();
                        textNode.textContent = val !== undefined ? val : '';
                    });
                    trackEffect(textNode, runner);
                    childElements.push(child);
                }
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

                if (location === 'shadow') {
                    let shadow = el.shadowRoot;
                    if (!shadow) {
                        shadow = el.attachShadow({ mode: 'open' });
                    }
                    shadow.innerHTML = '';
                    array.forEach(item => {
                        shadow.appendChild(item);
                    });
                    return el;
                }

                if (location === 'inner') {
                    el.innerHTML = '';
                    array.forEach(item => {
                        el.appendChild(item);
                    });
                    return el;
                }

                if (location === 'outer') {
                    el.replaceWith(...array);
                    return el;
                }

                if (location === 'afterbegin' || location === 'afterend') {
                    array.reverse();
                }
                array.forEach(item => {
                    el.insertAdjacentElement(location, item);
                });
                return el;
            },
            configurable: true,
            writable: true
        });
        return el;
    };

    const customTags = {}
    const tags = new Proxy({}, {
        get(_, tag) {
            if (tag === "_customTags") return { ...customTags };
            return (...args) => {
                let attributes = {};
                let children = args;
                const arg0 = args[0];
                if (args.length > 0 && arg0 && typeof arg0 === 'object' && !arg0.tag && !arg0.domEl && !Array.isArray(arg0)) {
                    attributes = arg0;
                    children = args.slice(1);
                }
                return element(customTags[tag] || tag, attributes, children.flat());
            };
        },
        set(_, tag, value) {
            customTags[tag] = value;
            return true;
        }
    });

    const Lightview = {
        signal, computed, effect, element, enhance, tags, $,
        // Extension hooks
        hooks: {
            onNonStandardHref: null,
            processChild: null
        },
        // Internals exposed for extensions
        internals: {
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
        window.Lightview = Lightview;

        // Setup Object DOM converter hook
        Lightview.hooks.processChild = (child) => {
            // Convert Object DOM syntax if applicable
            if (typeof child === 'object' && child !== null && !Array.isArray(child)) {
                return convertObjectDOM(child);
            }
            return child;
        };

        // Global click handler delegates to hook if registered
        window.addEventListener('click', (e) => {
            if (Lightview.hooks.onNonStandardHref) {
                Lightview.hooks.onNonStandardHref(e);
            }
        });

        // Automatic Cleanup & Lifecycle Hooks
        const walkNodes = (node, fn) => { fn(node); node.childNodes?.forEach(n => walkNodes(n, fn)); };

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
})();
