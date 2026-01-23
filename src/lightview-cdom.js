/**
 * LIGHTVIEW-CDOM
 * The Reactive Path and Expression Engine for Lightview.
 */

import { registerHelper, registerOperator, parseExpression, resolvePath, resolvePathAsContext, resolveExpression, parseCDOMC, parseJPRX as oldParseJPRX, unwrapSignal, BindingTarget } from '../jprx/parser.js';
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
import { registerCalcHelpers } from '../jprx/helpers/calc.js';
import { registerDOMHelpers } from '../jprx/helpers/dom.js';

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
registerCalcHelpers(registerHelper);
registerDOMHelpers(registerHelper);
registerHelper('move', (selector, location = 'beforeend') => {
    return {
        isLazy: true,
        resolve: (eventOrNode) => {
            const isEvent = eventOrNode && typeof eventOrNode === 'object' && 'target' in eventOrNode;
            const node = isEvent ? (eventOrNode.currentTarget || eventOrNode.target) : eventOrNode;
            if (!(node instanceof Node) || !selector) return;

            const target = document.querySelector(selector);
            if (!target) {
                console.warn(`[Lightview-CDOM] move target not found: ${selector}`);
                return;
            }

            // Identity logic: if node has ID, check for existing sibling or descendant in target
            if (node.id) {
                // We escape the ID for querySelector
                const escapedId = CSS.escape(node.id);
                // Check if the target itself is the node (unlikely but safe)
                if (target.id === node.id && target !== node) {
                    target.replaceWith(node);
                    return;
                }
                // Check for existing element in target
                const existing = target.querySelector(`#${escapedId}`);
                if (existing && existing !== node) {
                    existing.replaceWith(node);
                    return;
                }
            }

            // Use Lightview's standard placement logic
            globalThis.Lightview.$(target).content(node, location);
        }
    };
}, { pathAware: true });

registerHelper('mount', async (url, options = {}) => {
    const { target = 'body', location = 'beforeend' } = options;

    try {
        const fetchOptions = { ...options };
        delete fetchOptions.target;
        delete fetchOptions.location;

        const headers = { ...fetchOptions.headers };
        let body = fetchOptions.body;

        if (body !== undefined) {
            if (body !== null && typeof body === 'object') {
                body = JSON.stringify(body);
                if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
            } else {
                body = String(body);
                if (!headers['Content-Type']) headers['Content-Type'] = 'text/plain';
            }
            fetchOptions.body = body;
            fetchOptions.headers = headers;
        }

        const response = await globalThis.fetch(url, fetchOptions);
        const contentType = response.headers.get('Content-Type') || '';
        const text = await response.text();

        let content = text;
        const isCDOM = contentType.includes('application/cdom') ||
            contentType.includes('application/jprx') ||
            contentType.includes('application/vdom') ||
            contentType.includes('application/odom') ||
            url.endsWith('.cdom') || url.endsWith('.jprx') ||
            url.endsWith('.vdom') || url.endsWith('.odom');

        if (isCDOM || (contentType.includes('application/json') && text.trim().startsWith('{'))) {
            try {
                content = hydrate(parseCDOMC(text));
            } catch (e) {
                // Fail gracefully to text
            }
        }

        const targetEl = document.querySelector(target);
        if (targetEl) {
            globalThis.Lightview.$(targetEl).content(content, location);
        } else {
            console.warn(`[Lightview-CDOM] $mount target not found: ${target}`);
        }
    } catch (err) {
        console.error(`[Lightview-CDOM] $mount failed for ${url}:`, err);
    }
});

// Register Standard Operators
// Mutation operators (prefix and postfix)
registerOperator('increment', '++', 'prefix', 80);
registerOperator('increment', '++', 'postfix', 80);
registerOperator('decrement', '--', 'prefix', 80);
registerOperator('decrement', '--', 'postfix', 80);
registerOperator('toggle', '!!', 'prefix', 80);
registerOperator('set', '=', 'infix', 20);

// Math infix operators (for expression syntax like $/a + $/b)
// These REQUIRE surrounding whitespace to avoid ambiguity with path separators (especially for /)
registerOperator('+', '+', 'infix', 50);
registerOperator('-', '-', 'infix', 50, { requiresWhitespace: true });
registerOperator('*', '*', 'infix', 60, { requiresWhitespace: true });
registerOperator('/', '/', 'infix', 60, { requiresWhitespace: true });

// Comparison infix operators
registerOperator('gt', '>', 'infix', 40);
registerOperator('lt', '<', 'infix', 40);
registerOperator('gte', '>=', 'infix', 40);
registerOperator('lte', '<=', 'infix', 40);
registerOperator('neq', '!=', 'infix', 40);
registerOperator('strictNeq', '!==', 'infix', 40);
registerOperator('eq', '==', 'infix', 40);
registerOperator('strictEq', '===', 'infix', 40);

const localStates = new WeakMap();

/**
 * Builds a reactive context object for a node by chaining all ancestor states.
 */
const getContext = (node, event = null) => {
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

        const res = globalThis.Lightview.get(path.replace(/^=/, ''), { scope: domNode });

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
const activate = (root = document.body) => { };

const makeEventHandler = (expr) => (eventOrNode) => {
    const isEvent = eventOrNode && typeof eventOrNode === 'object' && 'target' in eventOrNode;
    const target = isEvent ? (eventOrNode.currentTarget || eventOrNode.target) : eventOrNode;
    const context = getContext(target, isEvent ? eventOrNode : null);
    const result = resolveExpression(expr, context);
    if (result && typeof result === 'object' && result.isLazy) return result.resolve(context);
    return result;
};

/**
 * Hydrates a static CDOM object into a reactive CDOM graph.
 * Traverses the object, converting expression strings (=...) into Signals/Computeds.
 * Establishes a __parent__ link for relative path resolution.
 */
const hydrate = (node, parent = null) => {
    if (!node) return node;

    // 1. Handle Escape and Expressions
    // Escape sequence: '= at start produces a literal string starting with =
    if (typeof node === 'string' && node.startsWith("'=")) {
        return node.slice(1); // Strip the ' and return as literal
    }
    // Escape sequence: '# at start produces a literal string starting with #
    if (typeof node === 'string' && node.startsWith("'#")) {
        return node.slice(1); // Strip the ' and return as literal
    }
    // XPath expression: # at start marks for static resolution
    if (typeof node === 'string' && node.startsWith('#')) {
        return { __xpath__: node.slice(1), __static__: true };
    }
    if (typeof node === 'string' && node.startsWith('=')) {
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
                // Escape sequence: '= at start produces a literal string starting with =
                if (typeof attrVal === 'string' && attrVal.startsWith("'=")) {
                    value[attrKey] = attrVal.slice(1);
                    // Escape sequence: '# at start produces a literal string starting with #
                } else if (typeof attrVal === 'string' && attrVal.startsWith("'#")) {
                    value[attrKey] = attrVal.slice(1);
                    // XPath expression: # at start marks for static resolution
                } else if (typeof attrVal === 'string' && attrVal.startsWith('#')) {
                    value[attrKey] = { __xpath__: attrVal.slice(1), __static__: true };
                } else if (typeof attrVal === 'string' && attrVal.startsWith('=')) {
                    if (attrKey.startsWith('on')) {
                        value[attrKey] = makeEventHandler(attrVal);
                    } else {
                        value[attrKey] = parseExpression(attrVal, node);
                    }
                } else if (typeof attrVal === 'object' && attrVal !== null) {
                    value[attrKey] = hydrate(attrVal, node);
                }
            }
            continue;
        }

        // Escape sequence: '= at start produces a literal string starting with =
        if (typeof value === 'string' && value.startsWith("'=")) {
            node[key] = value.slice(1);
            // Escape sequence: '# at start produces a literal string starting with #
        } else if (typeof value === 'string' && value.startsWith("'#")) {
            node[key] = value.slice(1);
            // XPath expression: # at start marks for static resolution
        } else if (typeof value === 'string' && value.startsWith('#')) {
            node[key] = { __xpath__: value.slice(1), __static__: true };
        } else if (typeof value === 'string' && value.startsWith('=')) {
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

    // 4. Automatic XPath Resolution
    // If this is a top-level hydrated element, ensure it resolves its static XPaths on mount.
    // We add it to node.attributes so Lightview's element() factory picks it up.
    if (!parent && node.tag) {
        node.attributes = node.attributes || {};
        const originalOnMount = node.attributes.onmount;
        node.attributes.onmount = (el) => {
            if (typeof originalOnMount === 'function') originalOnMount(el);
            resolveStaticXPath(el);
        };
    }

    return node;
};

/**
 * Validates that an XPath expression only uses backward-looking axes.
 * Throws an error if forward-looking axes are detected.
 * @param {string} xpath - The XPath expression to validate
 */
const validateXPath = (xpath) => {
    if (!xpath) return;

    // Check for forbidden forward-looking axes
    const forbiddenAxes = /\b(child|descendant|following|following-sibling)::/;
    if (forbiddenAxes.test(xpath)) {
        throw new Error(`XPath: Forward-looking axes not allowed during DOM construction: ${xpath}`);
    }

    // Check for shorthand forward references like /div (implies child axis)
    // We allow '/' if it's followed by '@' (attribute), '.' (parent/self shorthand), 
    // or is the start of the document root '/html'.
    const hasShorthandChild = /\/(?![@.])(?![a-zA-Z0-9_-]+::)[a-zA-Z]/.test(xpath) && !xpath.startsWith('/html');
    if (hasShorthandChild) {
        throw new Error(`XPath: Shorthand child axis (/) not allowed during DOM construction: ${xpath}`);
    }
};

/**
 * Resolves static XPath expressions marked during hydration.
 * This is called after the DOM tree is fully constructed.
 * Walks the tree and resolves all __xpath__ markers.
 * @param {Node} rootNode - The root DOM node to start walking from
 */
/**
 * Resolves static XPath markers for attributes on a specific element.
 */
const resolveAttributeXPaths = (el) => {
    const attributes = [...el.attributes];
    for (const attr of attributes) {
        if (attr.name.startsWith('data-xpath-')) {
            const realAttr = attr.name.replace('data-xpath-', '');
            try {
                validateXPath(attr.value);
                const doc = globalThis.document || el.ownerDocument;
                const result = doc.evaluate(
                    attr.value,
                    el,
                    null,
                    XPathResult.STRING_TYPE,
                    null
                );
                el.setAttribute(realAttr, result.stringValue);
                el.removeAttribute(attr.name);
            } catch (e) {
                globalThis.console?.error(`[Lightview-CDOM] XPath attribute error ("${realAttr}") at <${el.tagName.toLowerCase()} id="${el.id}">:`, e.message);
            }
        }
    }
};

/**
 * Resolves static XPath markers for a text node.
 */
const resolveTextNodeXPath = (node) => {
    if (!node.__xpathExpr) return;
    const xpath = node.__xpathExpr;
    try {
        validateXPath(xpath);
        const doc = globalThis.document || node.ownerDocument;
        // Use the parent node (the element) as the context for evaluation
        // This avoids errors in browsers that don't support Text nodes as context nodes
        // and keeps evaluation consistent with attributes.
        const contextNode = node.parentNode || node;
        const result = doc.evaluate(
            xpath,
            contextNode,
            null,
            XPathResult.STRING_TYPE,
            null
        );
        node.textContent = result.stringValue;
    } catch (e) {
        globalThis.console?.error(`[Lightview-CDOM] XPath text node error on <${node.parentNode?.tagName.toLowerCase()} id="${node.parentNode?.id}">:`, e.message);
    } finally {
        delete node.__xpathExpr;
    }
};

/**
 * Walks the tree and resolves all __xpath__ markers.
 * @param {Node} rootNode - The root DOM node to start walking from
 */
const resolveStaticXPath = (rootNode) => {
    const node = rootNode instanceof Node ? rootNode : (rootNode?.domEl || rootNode);
    if (!node || !node.nodeType) return;

    // Process the root node itself
    if (node.nodeType === Node.ELEMENT_NODE) resolveAttributeXPaths(node);
    resolveTextNodeXPath(node);

    // Process all descendants
    const doc = globalThis.document || node.ownerDocument;
    const walker = doc.createTreeWalker(node, NodeFilter.SHOW_ALL);
    let current = walker.nextNode();
    while (current) {
        if (current.nodeType === Node.ELEMENT_NODE) resolveAttributeXPaths(current);
        resolveTextNodeXPath(current);
        current = walker.nextNode();
    }
};


// Prevent tree-shaking of parser functions by creating a side-effect
// These are used externally by lightview-x.js for .cdomc file loading
// The typeof check creates a runtime branch the bundler can't eliminate
if (typeof parseCDOMC !== 'function') throw new Error('parseCDOMC not found');
if (typeof oldParseJPRX !== 'function') throw new Error('oldParseJPRX not found');

const LightviewCDOM = {
    registerHelper,
    registerOperator,
    parseExpression,
    resolvePath,
    resolvePathAsContext,
    resolveExpression,
    parseCDOMC,
    parseJPRX: parseCDOMC, // Alias parseJPRX to the more robust parseCDOMC
    oldParseJPRX,
    unwrapSignal,
    getContext,
    handleCDOMState: () => { },
    handleCDOMBind: () => { },
    activate,
    hydrate,
    resolveStaticXPath,
    version: '1.1.0'
};

// Global export for non-module usage
if (typeof window !== 'undefined') {
    globalThis.LightviewCDOM = {};
    Object.assign(globalThis.LightviewCDOM, LightviewCDOM);
}


export {
    registerHelper,
    registerOperator,
    parseExpression,
    resolvePath,
    resolvePathAsContext,
    resolveExpression,
    parseCDOMC,
    parseCDOMC as parseJPRX,
    oldParseJPRX,
    unwrapSignal,
    BindingTarget,
    getContext,
    activate,
    hydrate,
    resolveStaticXPath
};

export default LightviewCDOM;
