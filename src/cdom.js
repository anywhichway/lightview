(function () {
    /* global document, window, MutationObserver, queueMicrotask, XPathResult, Node, NodeFilter, globalThis */
    const registry = new Map();
    const listeners = new Map();
    const helpers = new Map();
    const expressionCache = new Map();
    const mathCache = new Map();
    const domListeners = new Set();
    let mathParser = null;
    let currentSubscriber = null;
    let domChangeQueued = false;
    const mountedNodes = new WeakSet();

    function queueDOMChange() {
        if (domChangeQueued) return;
        domChangeQueued = true;
        queueMicrotask(() => {
            notifyDOMChange();
            domChangeQueued = false;
        });
    }

    function addToScope(scope, name, value) {
        if (!name) return;
        const targetScope = (scope === undefined || scope === window || scope === globalThis) ? null : scope;
        if (!targetScope) {
            registry.set(name, value);
        } else {
            if (!targetScope._lv_state) targetScope._lv_state = {};
            targetScope._lv_state[name] = value;
        }
    }

    function signal(val, options = {}) {
        let value = val;
        const name = options.name;
        const s = {
            get value() {
                if (currentSubscriber) registerDependency(name);
                return value;
            },
            set value(v) {
                value = v;
                if (name) notify(name, value);
            },
            toString() { return String(this.value); }
        };
        addToScope(options.scope, name, s);
        return s;
    }

    function state(val, options = {}) {
        const name = options.name;
        let result;
        if (typeof val !== 'object' || val === null) {
            result = val;
        } else {
            result = new Proxy(val, {
                get(target, prop) {
                    if (typeof prop === 'string' && currentSubscriber) {
                        registerDependency(name);
                    }
                    return target[prop];
                },
                set(target, prop, value) {
                    target[prop] = value;
                    if (name) notify(name, target);
                    return true;
                }
            });
        }
        addToScope(options.scope, name, result);
        return result;
    }

    function registerDependency(name) {
        if (!name) return;
        if (!listeners.has(name)) listeners.set(name, []);
        const list = listeners.get(name);
        if (!list.some(s => s.node === currentSubscriber.node && s.attr === currentSubscriber.attr)) {
            list.push(currentSubscriber);
        }
    }

    function helper(name, fn) {
        helpers.set(name, fn);
    }

    function notify(name, value) {
        if (listeners.has(name)) {
            const subs = listeners.get(name);
            for (let i = subs.length - 1; i >= 0; i--) {
                const sub = subs[i];
                const { node, attr, expression, contextNode, fn } = sub;

                if (!node.isConnected && !(typeof Attr !== 'undefined' && node instanceof Attr && node.ownerElement?.isConnected)) {
                    subs.splice(i, 1);
                    continue;
                }

                if (fn) {
                    const result = fn();
                    const newNode = cdomToDOM(result, {});
                    if (node.replaceWith) {
                        node.replaceWith(newNode);
                        sub.node = newNode;
                    }
                } else if (attr) {
                    const expressions = extractExpressions(attr.value);
                    let newValue = attr.originalValue || attr.value;
                    for (const expr of expressions) {
                        const res = evaluateExpression(expr.expression, contextNode, false, expr.type);
                        newValue = newValue.replace(expr.fullMatch, String(res.value));
                    }
                    if (node.ownerElement.getAttribute(node.name) !== newValue) {
                        node.ownerElement.setAttribute(node.name, newValue);
                    }
                } else if (node.nodeType === 3) { // Node.TEXT_NODE
                    const newVal = String(evaluateStateExpression(expression, contextNode));
                    if (node.nodeValue !== newVal) {
                        node.nodeValue = newVal;
                    }
                }
            }
        }
    }

    function findInScope(node, name) {
        let curr = node;
        while (curr) {
            if (curr._lv_state && curr._lv_state[name] !== undefined) {
                return curr._lv_state[name];
            }
            curr = curr.parentNode || curr.host || curr._lv_parent;
        }
        return registry.get(name);
    }

    function evaluateStateExpression(expression, contextNode, event) {
        expression = expression.trim();

        if (expression === '$this') return contextNode;
        if (expression === '$event') return event;

        let root = null;
        let pathStr = expression;
        if (expression.startsWith('$this.') || expression.startsWith('$this/')) {
            root = contextNode;
            pathStr = expression.substring(6);
        } else if (expression.startsWith('$event.') || expression.startsWith('$event/')) {
            root = event;
            pathStr = expression.substring(7);
        }

        if (root !== null) {
            const parts = pathStr.split(/[./]/);
            let target = root;
            for (const part of parts) {
                if (target === null || target === undefined) return undefined;
                target = (target && typeof target === 'object' && 'value' in target) ? target.value[part] : target[part];
            }
            return target;
        }

        if ((expression.startsWith("'") && expression.endsWith("'")) ||
            (expression.startsWith('"') && expression.endsWith('"'))) {
            return expression.slice(1, -1);
        }

        const callMatch = expression.match(/^(\w+)\((.*)\)$/);
        if (callMatch) {
            const funcName = callMatch[1];
            const argsStr = callMatch[2];
            const fn = helpers.get(funcName);
            if (!fn) return `[Unknown helper: ${funcName}]`;

            const args = argsStr.split(',').map(arg => evaluateStateExpression(arg.trim(), contextNode, event));
            return fn(...args);
        }

        const isSimplePath = expression.startsWith('/') && !/[+\-*%^<>=!&|?:]/.test(expression.substring(1));
        if (!isSimplePath && /[+\-*%^<>=!&|?:]/.test(expression)) {
            if (!mathParser && typeof window.exprEval !== 'undefined') {
                mathParser = new window.exprEval.Parser();
            }

            if (mathParser) {
                try {
                    const scope = {};
                    const processedExpr = expression.replace(/\/(\w+(?:\/\w+)*)/g, (match) => {
                        const val = evaluateStateExpression(match, contextNode, event);
                        const resolved = (val && typeof val === 'object' && 'value' in val) ? val.value : val;
                        const id = 'v_' + Math.random().toString(36).substr(2, 5);
                        scope[id] = resolved;
                        return id;
                    });
                    return mathParser.evaluate(processedExpr, scope);
                } catch (e) {
                    console.warn('Math evaluation failed:', e, expression);
                }
            }
        }

        const parts = expression.startsWith('/') ? expression.substring(1).split('/') : expression.split('/');
        const name = parts[0];
        const path = parts.slice(1);

        const item = findInScope(contextNode, name);
        if (!item) return `[Unknown: ${name}]`;

        return resolvePath(item, path, name);
    }

    function resolvePath(root, path, contextName) {
        if (path.length === 0) return root;

        let target = root;
        if (root && typeof root === 'object' && 'value' in root) {
            target = root.value;
        }

        for (let i = 0; i < path.length - 1; i++) {
            target = target[path[i]];
            if (!target || typeof target !== 'object') return undefined;
        }

        const key = path[path.length - 1];
        if (target === undefined || target === null) return undefined;

        if (currentSubscriber) registerDependency(contextName);

        return {
            target,
            key,
            get value() { return target[key]; },
            set value(v) {
                target[key] = v;
                if (contextName) notify(contextName, target);
            },
            toString() { return String(this.value); }
        };
    }

    function extractExpressions(text) {
        if (expressionCache.has(text)) return expressionCache.get(text);

        const expressions = [];
        let i = 0;
        while (i < text.length) {
            if ((text[i] === '#' || text[i] === '=') && text[i + 1] === '(') {
                const type = text[i];
                const start = i;
                i += 2;
                let depth = 1;
                let expr = '';

                while (i < text.length && depth > 0) {
                    if (text[i] === '(') depth++;
                    else if (text[i] === ')') depth--;

                    if (depth > 0) expr += text[i];
                    i++;
                }

                if (depth === 0) {
                    expressions.push({ type, start, end: i, expression: expr, fullMatch: text.substring(start, i) });
                }
            } else {
                i++;
            }
        }
        expressionCache.set(text, expressions);
        return expressions;
    }

    function isXPath(expression) {
        const xpathIndicators = [
            /^\/\//, /^\//, /^\.\//, /^\.\.\//, /\.\//, /\.\.\//, /@[\w-]+/, /\bcount\(/, /\btext\(/,
            /\bnode\(/, /\bposition\(/, /\blast\(/, /\bsum\(/, /\bconcat\(/, /\bcontains\(/,
            /\bstarts-with\(/, /\bstring\(/, /\bnumber\(/, /\bboolean\(/, /::/,
        ];
        return xpathIndicators.some(pattern => pattern.test(expression));
    }

    function evaluateExpression(expression, contextNode, returnNodes = false, type = '#', event) {
        if (type === '=') {
            return { type: 'value', value: evaluateStateExpression(expression, contextNode, event) };
        }
        return isXPath(expression)
            ? evaluateXPath(expression, contextNode, returnNodes)
            : evaluateCSS(expression, contextNode, returnNodes);
    }

    function evaluateCSS(selector, contextNode, returnNodes = false) {
        try {
            const context = contextNode?.nodeType === 1
                ? contextNode
                : contextNode?.parentElement || document;

            const elements = Array.from(context.querySelectorAll(selector));

            if (elements.length === 0) return { type: 'value', value: '' };
            if (returnNodes) return { type: 'nodes', value: elements };

            return { type: 'value', value: elements.map(el => el.textContent || '').join(', ') };
        } catch (e) {
            console.error('CSS selector error:', e, 'Selector:', selector);
            return { type: 'value', value: `[CSS Error: ${selector}]` };
        }
    }

    function evaluateXPath(expression, contextNode, returnNodes = false) {
        try {
            const result = document.evaluate(
                expression,
                contextNode || document,
                null,
                XPathResult.ANY_TYPE,
                null
            );

            switch (result.resultType) {
                case XPathResult.NUMBER_TYPE: return { type: 'value', value: result.numberValue };
                case XPathResult.STRING_TYPE: return { type: 'value', value: result.stringValue };
                case XPathResult.BOOLEAN_TYPE: return { type: 'value', value: result.booleanValue };
                case XPathResult.UNORDERED_NODE_ITERATOR_TYPE:
                case XPathResult.ORDERED_NODE_ITERATOR_TYPE:
                    const nodes = [];
                    let node = result.iterateNext();
                    while (node) {
                        nodes.push(node);
                        node = result.iterateNext();
                    }
                    if (returnNodes && nodes.length > 0) return { type: 'nodes', value: nodes };
                    return { type: 'value', value: nodes.map(n => n.textContent || n.nodeValue).join(', ') };
                case XPathResult.FIRST_ORDERED_NODE_TYPE:
                case XPathResult.ANY_UNORDERED_NODE_TYPE:
                    if (returnNodes && result.singleNodeValue) return { type: 'nodes', value: [result.singleNodeValue] };
                    return { type: 'value', value: result.singleNodeValue?.textContent || result.singleNodeValue?.nodeValue || '' };
                default: return { type: 'value', value: '' };
            }
        } catch (e) {
            console.error('XPath evaluation error:', e, 'Expression:', expression);
            return { type: 'value', value: `[XPath Error: ${expression}]` };
        }
    }

    function notifyDOMChange() {
        for (const sub of domListeners) {
            if (!sub.node.isConnected && !(typeof window.Attr !== 'undefined' && sub.node instanceof window.Attr && sub.node.ownerElement?.isConnected)) {
                domListeners.delete(sub);
                continue;
            }
            if (sub.attr) {
                const expressions = extractExpressions(sub.attr.value);
                let newValue = sub.attr.originalValue || sub.attr.value;
                for (const expr of expressions) {
                    if (expr.type === '#') {
                        const res = evaluateExpression(expr.expression, sub.contextNode, false, '#');
                        newValue = newValue.replace(expr.fullMatch, String(res.value));
                    }
                }
                if (sub.node.ownerElement.getAttribute(sub.node.name) !== newValue) {
                    sub.node.ownerElement.setAttribute(sub.node.name, newValue);
                }
            } else {
                const res = evaluateExpression(sub.expression, sub.contextNode, false, '#');
                const newValue = String(res.value);
                if (sub.node.nodeValue !== newValue) {
                    sub.node.nodeValue = newValue;
                }
            }
        }
    }

    function cdomToDOM(onode, wasString, unsafe, context) {
        if (onode === null || onode === undefined) return null;
        if (typeof onode !== 'object') {
            const node = document.createTextNode(String(onode));
            processTextNode(node, context);
            return node;
        }

        if (Array.isArray(onode)) {
            const frag = document.createDocumentFragment();
            for (let i = 0, len = onode.length; i < len; i++) {
                const childNode = cdomToDOM(onode[i], wasString, unsafe, context);
                if (childNode) frag.appendChild(childNode);
            }
            return frag;
        }

        let tag;
        for (tag in onode) break;
        if (!tag) return document.createDocumentFragment();

        const content = onode[tag];
        const el = document.createElement(tag);
        if (context) Object.defineProperty(el, '_lv_parent', { value: context, enumerable: false, configurable: true });

        // Path A: Properties Object (Detailed definitions)
        if (typeof content === 'object' && content !== null && !Array.isArray(content)) {
            if (content.oncreate) try { content.oncreate.call(el); } catch (e) { /* ignore */ }
            if (content.onmount) el.onmount = content.onmount;

            for (const key in content) {
                const val = content[key];
                if (key === 'children') {
                    if (Array.isArray(val)) {
                        for (let i = 0, len = val.length; i < len; i++) {
                            const childNode = cdomToDOM(val[i], wasString, unsafe, el);
                            if (childNode) el.appendChild(childNode);
                        }
                    } else {
                        const childNode = cdomToDOM(val, wasString, unsafe, el);
                        if (childNode) el.appendChild(childNode);
                    }
                } else if (key === 'class') {
                    el.className = val;
                } else if (key === 'style' && typeof val === 'object' && val !== null && !Array.isArray(val)) {
                    for (const s in val) el.style[s] = val[s];
                } else if (key === 'oncreate' || key === 'onmount') {
                    continue;
                } else if (key.startsWith('on')) {
                    if (typeof val === "string") {
                        if (val.startsWith('=(') && val.endsWith(')')) {
                            const expr = val.substring(2, val.length - 1);
                            el[key] = (event) => evaluateStateExpression(expr, el, event);
                        } else if (!wasString || unsafe) {
                            try { el[key] = new Function("event", val); } catch (e) { el.setAttribute(key, val); }
                        } else { el.setAttribute(key, val); }
                    } else { el[key] = val; }
                } else {
                    el.setAttribute(key, val);
                    if (typeof val === 'string' && (val.includes('#(') || val.includes('=('))) {
                        processAttribute(el, el.getAttributeNode(key));
                    }
                }
            }
        }
        // Path B: Direct Content (Shorthand or template)
        else {
            if (typeof content === 'function') {
                const placeholder = document.createComment('fx');
                el.appendChild(placeholder);
                const fn = () => content.call(el);
                currentSubscriber = { node: placeholder, fn, contextNode: el };
                const initial = fn();
                currentSubscriber = null;
                placeholder.replaceWith(cdomToDOM(initial, wasString, unsafe, el));
            } else if (Array.isArray(content)) {
                for (let i = 0, len = content.length; i < len; i++) {
                    const childNode = cdomToDOM(content[i], wasString, unsafe, el);
                    if (childNode) el.appendChild(childNode);
                }
            } else if (content !== undefined && content !== null) {
                const childNode = cdomToDOM(content, wasString, unsafe, el);
                if (childNode) el.appendChild(childNode);
            }
        }

        return el;
    }

    function processAttribute(element, attr) {
        const expressions = extractExpressions(attr.value);
        if (expressions.length === 0) return;
        if (!attr.originalValue) attr.originalValue = attr.value;

        let newValue = attr.value;
        for (const expr of expressions) {
            if (expr.type === '=') {
                currentSubscriber = { node: attr, attr, expression: expr.expression, contextNode: element };
                const res = evaluateStateExpression(expr.expression, element);
                newValue = newValue.replace(expr.fullMatch, String(res));
                currentSubscriber = null;
            } else {
                const res = evaluateExpression(expr.expression, element, false, '#');
                newValue = newValue.replace(expr.fullMatch, String(res.value));
                domListeners.add({ node: attr, attr, contextNode: element });
            }
        }
        element.setAttribute(attr.name, newValue);
    }

    function processTextNode(textNode, context) {
        const text = textNode.nodeValue;
        if (!text || (!text.includes('#(') && !text.includes('=('))) return;

        const expressions = extractExpressions(text);
        if (expressions.length === 0) return;

        const parent = context || textNode.parentNode || textNode.parentElement;
        const trimmedText = text.trim();
        if (expressions.length === 1 && expressions[0].fullMatch.trim() === trimmedText) {
            const expr = expressions[0];
            if (expr.type === '=') {
                currentSubscriber = { node: textNode, expression: expr.expression, contextNode: parent };
                const newValue = String(evaluateStateExpression(expr.expression, parent));
                if (textNode.nodeValue !== newValue) {
                    textNode.nodeValue = newValue;
                }
                currentSubscriber = null;
            } else {
                const result = evaluateExpression(expr.expression, parent, true, '#');
                if (result.type === 'nodes') {
                    const fragment = document.createDocumentFragment();
                    for (const n of result.value) {
                        try { fragment.appendChild(n.cloneNode(true)); } catch (e) { }
                    }
                    textNode.replaceWith(fragment);
                } else {
                    const newValue = String(result.value);
                    if (textNode.nodeValue !== newValue) {
                        textNode.nodeValue = newValue;
                    }
                    domListeners.add({ node: textNode, expression: expr.expression, contextNode: parent });
                }
            }
        }
    }

    const cDOM = (cdom, options, script = document.currentScript) => {
        const type = typeof cdom;
        if (type === 'string') {
            cdom = JSON.parse(cdom);
        }
        const o = options || {};
        const dom = cdomToDOM(cdom, type === 'string', o.unsafe, o.context);
        if (options) {
            let { target = script, location = 'outerHTML' } = options;
            location = location.toLowerCase();
            if (location === 'outerhtml') target.replaceWith(dom);
            else if (location === 'innerhtml') { target.replaceChildren(dom); }
            else if (location === 'beforebegin') { target.insertAdjacentElement('beforebegin', dom); }
            else if (location === 'afterbegin') { target.insertAdjacentElement('afterbegin', dom); }
            else if (location === 'beforeend') { target.insertAdjacentElement('beforeend', dom); }
            else if (location === 'afterend') { target.insertAdjacentElement('afterend', dom); }
        }
        return dom;
    }

    cDOM.signal = signal;
    cDOM.state = state;
    cDOM.helper = helper;
    window.cDOM = cDOM;

    const observer = new MutationObserver((mutations) => {
        let changed = false;
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === 1) { // ELEMENT_NODE
                        const process = (el) => {
                            if (el.onmount && !mountedNodes.has(el)) {
                                mountedNodes.add(el);
                                try { el.onmount.call(el); } catch (e) { console.error('onmount error:', e); }
                            }
                        };
                        process(node);
                        const all = node.querySelectorAll('*');
                        for (const el of all) process(el);
                    }
                }
                changed = true;
            } else if (mutation.type === 'attributes' || mutation.type === 'characterData') {
                changed = true;
            }
        }
        if (changed) queueDOMChange();
    });

    observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true
    });
})();
