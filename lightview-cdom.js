/**
 * LIGHTVIEW-CDOM
 * The Reactive Path and Expression Engine for Lightview.
 */

import { registerHelper, parseExpression, resolvePath, resolvePathAsContext, resolveExpression, parseCDOMC, unwrapSignal, BindingTarget } from './cdom/parser.js';
import { registerMathHelpers } from './cdom/helpers/math.js';
import { registerLogicHelpers } from './cdom/helpers/logic.js';
import { registerStringHelpers } from './cdom/helpers/string.js';
import { registerArrayHelpers } from './cdom/helpers/array.js';
import { registerCompareHelpers } from './cdom/helpers/compare.js';
import { registerConditionalHelpers } from './cdom/helpers/conditional.js';
import { registerDateTimeHelpers } from './cdom/helpers/datetime.js';
import { registerFormatHelpers } from './cdom/helpers/format.js';
import { registerLookupHelpers } from './cdom/helpers/lookup.js';
import { registerStatsHelpers } from './cdom/helpers/stats.js';
import { registerStateHelpers, set } from './cdom/helpers/state.js';

// Access Globals instead of explicit imports from removed directories
const state = (...args) => (globalThis.LightviewX?.state || globalThis.Lightview?.state)(...args);
const effect = (...args) => globalThis.Lightview?.effect?.(...args);
const getRegistry = () => globalThis.Lightview?.getRegistry?.();

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
    const attr = node.getAttribute('cdom-state');
    if (!attr || localStates.has(node)) return;

    try {
        const data = JSON.parse(attr);
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
    const path = node.getAttribute('cdom-bind');
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
 * Handles cdom-on: directive.
 */
export const handleCDOMOn = (node) => {
    Array.from(node.attributes).forEach(attr => {
        if (attr.name.startsWith('cdom-on:')) {
            const eventName = attr.name.slice(8);
            const expr = attr.value;

            node.addEventListener(eventName, (event) => {
                const context = getContext(node, event);
                const result = resolveExpression(expr, context);
                // If it's a lazy value (e.g. contains $event or _), resolve it now
                if (result && typeof result === 'object' && result.isLazy && typeof result.resolve === 'function') {
                    result.resolve(event);
                }
            });
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
            handleCDOMOn(node);
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

        for (const key in node) {
            node[key] = hydrate(node[key], node);
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
    handleCDOMOn,
    activate,
    hydrate,
    version: '1.0.0'
};

// Global export for non-module usage
if (typeof window !== 'undefined') {
    globalThis.LightviewCDOM = LightviewCDOM;
}

export default LightviewCDOM;
