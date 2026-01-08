/**
 * LIGHTVIEW-CDOM
 * The Reactive Path and Expression Engine for Lightview.
 */

import { registerHelper, parseExpression, resolvePath, resolvePathAsContext, resolveExpression, parseCDOMC, unwrapSignal, BindingTarget } from '../cdom/parser.js';
import { registerMathHelpers } from '../cdom/helpers/math.js';
import { registerLogicHelpers } from '../cdom/helpers/logic.js';
import { registerStringHelpers } from '../cdom/helpers/string.js';
import { registerArrayHelpers } from '../cdom/helpers/array.js';
import { registerCompareHelpers } from '../cdom/helpers/compare.js';
import { registerConditionalHelpers } from '../cdom/helpers/conditional.js';
import { registerDateTimeHelpers } from '../cdom/helpers/datetime.js';
import { registerFormatHelpers } from '../cdom/helpers/format.js';
import { registerLookupHelpers } from '../cdom/helpers/lookup.js';
import { registerStatsHelpers } from '../cdom/helpers/stats.js';
import { registerStateHelpers, set } from '../cdom/helpers/state.js';
import { registerNetworkHelpers } from '../cdom/helpers/network.js';

import { signal, effect, getRegistry } from './reactivity/signal.js';
import { state } from './reactivity/state.js';

// Initialize Standard Helpers
registerMathHelpers(registerHelper);
registerLogicHelpers(registerHelper);
registerStringHelpers(registerHelper);
registerArrayHelpers(registerHelper);
registerCompareHelpers(registerHelper);
registerConditionalHelpers(registerHelper);
registerDateTimeHelpers(registerHelper);
registerFormatHelpers(registerHelper);
registerLookupHelpers(registerHelper);
registerStatsHelpers(registerHelper);
registerStateHelpers((name, fn) => registerHelper(name, fn, { pathAware: true }));
registerNetworkHelpers(registerHelper);

const localStates = new WeakMap();

/**
 * Builds a reactive context object for a node by chaining all ancestor states.
 * Global state -> cdom-state1 -> cdom-state2 -> ... -> current
 */
export const getContext = (node, event = null) => {
    const chain = [];
    let cur = node;
    const ShadowRoot = globalThis.ShadowRoot;

    // Collate all ancestor states
    while (cur) {
        const local = localStates.get(cur);
        if (local) chain.unshift(local);
        cur = cur.parentElement || (ShadowRoot && cur.parentNode instanceof ShadowRoot ? cur.parentNode.host : null);
    }

    // Access global registry for fallback
    const globalRegistry = getRegistry();

    const handler = {
        get(target, prop, receiver) {
            if (prop === '$event' || prop === 'event') return event;
            if (prop === '__parent__') return undefined; // Should be handled by resolvePath

            // Search chain from bottom to top (most local first)
            for (let i = chain.length - 1; i >= 0; i--) {
                const s = chain[i];
                if (prop in s) return s[prop];
            }

            // Fall back to global state accessed via registry
            if (globalRegistry && globalRegistry.has(prop)) return globalRegistry.get(prop);

            // Or maybe global state object if user manually set Lightview.state
            const globalState = globalThis.Lightview?.state;
            if (globalState && prop in globalState) return globalState[prop];

            return undefined;
        },
        set(target, prop, value, receiver) {
            // Search chain for existing property to update
            for (let i = chain.length - 1; i >= 0; i--) {
                const s = chain[i];
                if (prop in s) {
                    s[prop] = value;
                    return true;
                }
            }

            // If not found, set on the most local state if it exists
            if (chain.length > 0) {
                chain[chain.length - 1][prop] = value;
                return true;
            }

            // Fall back to global state
            const globalState = globalThis.Lightview?.state;
            if (globalState) {
                globalState[prop] = value;
                return true;
            }

            return false;
        },
        has(target, prop) {
            if (prop === '$event' || prop === 'event') return !!event;
            for (const s of chain) if (prop in s) return true;
            const globalState = globalThis.Lightview?.state;
            if (globalState && prop in globalState) return true;
            return false;
        },
        ownKeys(target) {
            const keys = new Set();
            if (event) { keys.add('$event'); keys.add('event'); }
            for (const s of chain) {
                for (const key in s) keys.add(key);
            }
            const globalState = globalThis.Lightview?.state;
            if (globalState) {
                for (const key in globalState) keys.add(key);
            }
            return Array.from(keys);
        },
        getOwnPropertyDescriptor(target, prop) {
            return { enumerable: true, configurable: true };
        }
    };

    return new Proxy({}, handler);
};

/**
 * Handles cdom-state directive.
 */
export const handleCDOMState = (node) => {
    const attr = node['cdom-state'] || node.getAttribute('cdom-state');
    if (!attr || localStates.has(node)) return;

    try {
        const data = typeof attr === 'object' ? attr : JSON.parse(attr);
        // Use imported state factory
        const s = state(data);
        localStates.set(node, s);
    } catch (e) {
        globalThis.console?.error('LightviewCDOM: Failed to parse cdom-state', e);
    }
};

/**
 * Handles cdom-bind directive.
 */
export const handleCDOMBind = (node) => {
    const path = node['cdom-bind'] || node.getAttribute('cdom-bind');
    if (!path) return;

    const type = node.type || '';
    const tagName = node.tagName.toLowerCase();
    let prop = 'value';
    let event = 'input';

    if (type === 'checkbox' || type === 'radio') {
        prop = 'checked';
        event = 'change';
    } else if (tagName === 'select') {
        event = 'change';
    }

    const context = getContext(node);
    let target = resolvePathAsContext(path, context);

    // Smart initialization: if state is undefined, initialize from DOM
    if (target && target.isBindingTarget && target.value === undefined) {
        const val = node[prop];
        if (val !== undefined && val !== '') {
            set(context, { [target.key]: val });
            // Re-resolve to get the now-reactive target if it was newly created
            target = resolvePathAsContext(path, context);
        }
    }

    // State -> DOM
    effect(() => {
        const val = unwrapSignal(target);
        if (node[prop] !== val) {
            node[prop] = val === undefined ? '' : val;
        }
    });

    // DOM -> State
    node.addEventListener(event, () => {
        const val = node[prop];
        if (target && target.isBindingTarget) {
            target.value = val;
        } else {
            // Fallback for non-BindingTarget targets
            set(context, { [path]: val });
        }
    });
};


/**
 * Scans a subtree and activates CDOM directives.
 */
export const activate = (root = document.body) => {
    const walk = (node) => {
        if (node.nodeType === 1) {
            if (node.hasAttribute('cdom-state')) handleCDOMState(node);
            if (node.hasAttribute('cdom-bind')) handleCDOMBind(node);
        }
        let child = node.firstChild;
        while (child) {
            walk(child);
            child = child.nextSibling;
        }
    };
    walk(root);
};

/**
 * Hydrates a static CDOM object into a reactive CDOM graph.
 * Traverses the object, converting expression strings ($...) into Signals/Computeds.
 * Establishes a __parent__ link for relative path resolution.
 */
export const hydrate = (node, parent = null) => {
    if (!node) return node;

    // 1. Handle Expressions (Strings starting with $)
    if (typeof node === 'string' && node.startsWith('$')) {
        return parseExpression(node, parent);
    }

    // 2. Handle Arrays
    if (Array.isArray(node)) {
        return node.map(item => hydrate(item, parent));
    }

    // 3. Handle String Objects (Quoted literals from parser)
    if (node instanceof String) {
        return node.toString();
    }

    // 4. Handle Objects (Nodes)
    if (typeof node === 'object' && node !== null) {
        // Set back-reference for relative path resolution (../)
        if (parent && !('__parent__' in node)) {
            Object.defineProperty(node, '__parent__', {
                value: parent,
                enumerable: false,
                writable: true,
                configurable: true
            });
        }

        // NEW: Normalize cDOM shorthand { tag: content } -> { tag: 'tag', ...content }
        // But skip if this looks like pure data (no potential tag keys)
        if (!node.tag) {
            let potentialTag = null;
            for (const key in node) {
                // Skip reserved keys and directives
                if (key === 'children' || key === 'attributes' || key === 'tag' ||
                    key.startsWith('cdom-') || key.startsWith('on') || key === '__parent__') {
                    continue;
                }
                // Skip common HTML attribute names (not tag names)
                const attrNames = [
                    // Form/input attributes
                    'type', 'name', 'value', 'placeholder', 'step', 'min', 'max', 'pattern',
                    'disabled', 'checked', 'selected', 'readonly', 'required', 'multiple',
                    'rows', 'cols', 'size', 'maxlength', 'minlength', 'autocomplete',
                    // Common element attributes
                    'id', 'class', 'className', 'style', 'title', 'tabindex', 'role',
                    'href', 'src', 'alt', 'width', 'height', 'target', 'rel',
                    // Data attributes
                    'data', 'label', 'text', 'description', 'content',
                    // Common data property names
                    'price', 'qty', 'items', 'count', 'total', 'amount', 'url'
                ];
                if (attrNames.includes(key)) {
                    continue;
                }
                // If we find a key that looks like a tag name, use it
                potentialTag = key;
                break;
            }

            if (potentialTag) {
                const content = node[potentialTag];
                if (content !== undefined && content !== null) {
                    node.tag = potentialTag;
                    // Move the content into the node
                    if (Array.isArray(content)) {
                        node.children = content;
                    } else if (typeof content === 'object') {
                        // Separate children, directives from attributes
                        node.attributes = node.attributes || {};
                        for (const k in content) {
                            if (k === 'children') {
                                node.children = content[k];
                            } else if (k.startsWith('cdom-')) {
                                // cDOM directives go on the node directly
                                node[k] = content[k];
                            } else {
                                // Everything else (including event handlers) is an attribute
                                node.attributes[k] = content[k];
                            }
                        }
                    } else {
                        // Treat primitive value as text child
                        node.children = [content];
                    }
                    // Remove the shorthand key to avoid processing it again
                    delete node[potentialTag];
                }
            }
        }

        // Process each property
        for (const key in node) {
            const value = node[key];

            // SKIP cdom-state value - it's application data, not DOM structure
            if (key === 'cdom-state') {
                // Don't hydrate state data, just leave it as-is
                continue;
            }

            // Handle $ expressions - convert to reactive computed values or event handlers
            if (typeof value === 'string' && value.startsWith('$')) {
                if (key.startsWith('on')) {
                    // Event handlers: create a function that resolves the expression with event context
                    node[key] = (event) => {
                        const element = event.currentTarget;
                        const context = getContext(element, event);
                        const result = resolveExpression(value, context);

                        // If it's a lazy value (contains $event or _), resolve it
                        if (result && typeof result === 'object' && result.isLazy && typeof result.resolve === 'function') {
                            return result.resolve(event);
                        }
                        return result;
                    };
                } else if (key === 'children') {
                    // Children must always be an array. If it's a reactive expression (like $map),
                    // wrap the computed signal in an array so Lightview can process it.
                    node[key] = [parseExpression(value, node)];
                } else {
                    // Other properties: create a computed expression that evaluates reactively
                    node[key] = parseExpression(value, node);
                }
            } else if (key === 'attributes' && typeof value === 'object' && value !== null) {
                // Process attributes object - convert $expressions there too
                for (const attrKey in value) {
                    const attrValue = value[attrKey];
                    if (typeof attrValue === 'string' && attrValue.startsWith('$')) {
                        if (attrKey.startsWith('on')) {
                            // Event handlers in attributes
                            value[attrKey] = (event) => {
                                const element = event.currentTarget;
                                const context = getContext(element, event);
                                const result = resolveExpression(attrValue, context);
                                if (result && typeof result === 'object' && result.isLazy && typeof result.resolve === 'function') {
                                    return result.resolve(event);
                                }
                                return result;
                            };
                        } else {
                            // Other reactive attributes
                            value[attrKey] = parseExpression(attrValue, node);
                        }
                    }
                }
                node[key] = value;
            } else {
                // Recursively hydrate other values
                node[key] = hydrate(value, node);
            }
        }
        return node;
    }

    return node;
};

const LightviewCDOM = {
    registerHelper,
    parseExpression,
    resolvePath,
    resolvePathAsContext,
    resolveExpression,
    parseCDOMC,
    unwrapSignal,
    getContext,
    handleCDOMState,
    handleCDOMBind,
    activate,
    hydrate,
    version: '1.0.0'
};

// Global export for non-module usage
if (typeof window !== 'undefined') {
    globalThis.LightviewCDOM = LightviewCDOM;
}

export default LightviewCDOM;
