/**
 * LIGHTVIEW-CDOM
 * The Reactive Path and Expression Engine for Lightview.
 */

import { registerHelper, registerOperator, parseExpression, resolvePath, resolvePathAsContext, resolveExpression, parseCDOMC, parseJPRX, unwrapSignal, BindingTarget } from '../jprx/parser.js';
import { registerMathHelpers } from '../jprx/helpers/math.js';
import { registerLogicHelpers } from '../jprx/helpers/logic.js';
import { registerStringHelpers } from '../jprx/helpers/string.js';
import { registerArrayHelpers } from '../jprx/helpers/array.js';
import { registerCompareHelpers } from '../jprx/helpers/compare.js';
import { registerConditionalHelpers } from '../jprx/helpers/conditional.js';
import { registerDateTimeHelpers } from '../jprx/helpers/datetime.js';
import { registerFormatHelpers } from '../jprx/helpers/format.js';
import { registerLookupHelpers } from '../jprx/helpers/lookup.js';
import { registerStatsHelpers } from '../jprx/helpers/stats.js';
import { registerStateHelpers, set } from '../jprx/helpers/state.js';
import { registerNetworkHelpers } from '../jprx/helpers/network.js';

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

// Register Standard Operators
// Mutation operators (prefix and postfix)
registerOperator('increment', '++', 'prefix', 80);
registerOperator('increment', '++', 'postfix', 80);
registerOperator('decrement', '--', 'prefix', 80);
registerOperator('decrement', '--', 'postfix', 80);
registerOperator('toggle', '!!', 'prefix', 80);

// Math infix operators (for expression syntax like $/a + $/b)
// These REQUIRE surrounding whitespace to avoid ambiguity with path separators (especially for /)
registerOperator('+', '+', 'infix', 50);
registerOperator('-', '-', 'infix', 50);
registerOperator('*', '*', 'infix', 60);
registerOperator('/', '/', 'infix', 60);

// Comparison infix operators
registerOperator('gt', '>', 'infix', 40);
registerOperator('lt', '<', 'infix', 40);
registerOperator('gte', '>=', 'infix', 40);
registerOperator('lte', '<=', 'infix', 40);
registerOperator('neq', '!=', 'infix', 40);

const localStates = new WeakMap();

/**
 * Builds a reactive context object for a node by chaining all ancestor states.
 */
export const getContext = (node, event = null) => {
    return new Proxy({}, {
        get(_, prop) {
            if (prop === '$event' || prop === 'event') return event;
            if (prop === '$this' || prop === 'this' || prop === '__node__') return node;
            return unwrapSignal(globalThis.Lightview.getState(prop, { scope: node }));
        },
        set(_, prop, value) {
            const res = globalThis.Lightview.getState(prop, { scope: node });
            if (res && (typeof res === 'object' || typeof res === 'function') && 'value' in res) {
                res.value = value;
                return true;
            }
            return false;
        }
    });
};

/**
 * Hook for Lightview core to process $bind markers.
 */
globalThis.Lightview.hooks.processAttribute = (domNode, key, value) => {
    if (value?.__JPRX_BIND__) {
        const { path, options } = value;
        const type = domNode.type || '';
        const tagName = domNode.tagName.toLowerCase();
        let prop = 'value';
        let event = 'input';

        if (type === 'checkbox' || type === 'radio') {
            prop = 'checked';
            event = 'change';
        } else if (tagName === 'select') {
            event = 'change';
        }

        const res = globalThis.Lightview.get(path.replace(/^\$/, ''), { scope: domNode });

        // State -> DOM
        const runner = globalThis.Lightview.effect(() => {
            const val = unwrapSignal(res);
            if (domNode[prop] !== val) {
                domNode[prop] = val === undefined ? '' : val;
            }
        });
        globalThis.Lightview.internals.trackEffect(domNode, runner);

        // DOM -> State
        domNode.addEventListener(event, () => {
            if (res && 'value' in res) res.value = domNode[prop];
        });

        // Use initial value if available
        return unwrapSignal(res) ?? domNode[prop];
    }
    return undefined;
};

/**
 * Legacy activation no longer needed.
 */
export const activate = (root = document.body) => { };

const makeEventHandler = (expr) => (eventOrNode) => {
    const isEvent = eventOrNode && typeof eventOrNode === 'object' && 'target' in eventOrNode;
    const target = isEvent ? (eventOrNode.currentTarget || eventOrNode.target) : eventOrNode;
    const context = getContext(target, isEvent ? eventOrNode : null);
    const result = resolveExpression(expr, context);
    if (result && typeof result === 'object' && result.isLazy) return result.resolve(eventOrNode);
    return result;
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

    if (typeof node !== 'object') return node;

    // 2. Handle Arrays
    if (Array.isArray(node)) {
        return node.map(item => hydrate(item, parent));
    }

    // 2. Handle String Objects (rare but possible)
    if (node instanceof String) return node.toString();

    // 3. Handle Nodes
    // Parent link
    if (parent && !('__parent__' in node)) {
        Object.defineProperty(node, '__parent__', { value: parent, enumerable: false, writable: true });
        globalThis.Lightview?.internals?.parents?.set(node, parent);
    }

    // oDOM Normalization - convert shorthand { div: "text" } to { tag: "div", children: ["text"] }
    if (!node.tag) {
        let potentialTag = null;
        const reserved = ['children', 'attributes', 'tag', '__parent__'];
        for (const key in node) {
            if (reserved.includes(key) || key.startsWith('on')) continue;
            potentialTag = key;
            break;
        }

        if (potentialTag) {
            const content = node[potentialTag];
            node.tag = potentialTag;
            if (Array.isArray(content)) {
                node.children = content;
            } else if (typeof content === 'object') {
                node.attributes = node.attributes || {};
                for (const k in content) {
                    if (k === 'children') node.children = content[k];
                    else node.attributes[k] = content[k];
                }
            } else node.children = [content];
            delete node[potentialTag];
        }
    }

    // Recursive Processing
    for (const key in node) {
        if (key === 'tag' || key === '__parent__') continue;
        const value = node[key];

        // Special case: attributes object
        if (key === 'attributes' && typeof value === 'object' && value !== null) {
            for (const attrKey in value) {
                const attrVal = value[attrKey];
                if (typeof attrVal === 'string' && attrVal.startsWith('$') && attrKey.startsWith('on')) {
                    value[attrKey] = makeEventHandler(attrVal);
                } else if (typeof attrVal === 'string' && attrVal.startsWith('$')) {
                    value[attrKey] = parseExpression(attrVal, node);
                } else if (typeof attrVal === 'object' && attrVal !== null) {
                    value[attrKey] = hydrate(attrVal, node);
                }
            }
            continue;
        }

        if (typeof value === 'string' && value.startsWith('$')) {
            if (key === 'onmount' || key === 'onunmount' || key.startsWith('on')) {
                node[key] = makeEventHandler(value);
            } else if (key === 'children') {
                node[key] = [parseExpression(value, node)];
            } else {
                node[key] = parseExpression(value, node);
            }
        } else {
            node[key] = hydrate(value, node);
        }
    }

    return node;
};

const LightviewCDOM = {
    registerHelper,
    registerOperator,
    parseExpression,
    resolvePath,
    resolvePathAsContext,
    resolveExpression,
    parseCDOMC,
    parseJPRX,
    unwrapSignal,
    getContext,
    handleCDOMState: () => { },
    handleCDOMBind: () => { },
    activate,
    hydrate,
    version: '1.0.0'
};

// Global export for non-module usage
if (typeof window !== 'undefined') {
    globalThis.LightviewCDOM = LightviewCDOM;
}

export default LightviewCDOM;
