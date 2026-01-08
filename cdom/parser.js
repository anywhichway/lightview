/**
 * LIGHTVIEW CDOM PARSER
 * Responsible for resolving reactive paths and expressions.
 */

const helpers = new Map();
const helperOptions = new Map();

/**
 * Registers a global helper function.
 */
export const registerHelper = (name, fn, options = {}) => {
    helpers.set(name, fn);
    if (options) helperOptions.set(name, options);
};

const getLV = () => globalThis.Lightview || null;
const getRegistry = () => getLV()?.registry || null;

/**
 * Represents a mutable target (a property on an object).
 * Allows cdom-bind and mutation helpers to work with plain object properties 
 * by treating them as if they had a .value property.
 */
export class BindingTarget {
    constructor(parent, key) {
        this.parent = parent;
        this.key = key;
        this.isBindingTarget = true; // Marker for duck-typing when instanceof fails
    }
    get value() { return this.parent[this.key]; }
    set value(v) { this.parent[this.key] = v; }
    get __parent__() { return this.parent; }
}

/**
 * Unwraps a signal-like value to its raw value.
 * This should be used to establish reactive dependencies within a computed context.
 */
export const unwrapSignal = (val) => {
    if (val && typeof val === 'function' && 'value' in val) {
        return val.value;
    }
    if (val && typeof val === 'object' && !(globalThis.Node && val instanceof globalThis.Node) && 'value' in val) {
        return val.value;
    }
    return val;
};


/**
 * Resolves segments of a path against a root object, unwrapping signals as it goes.
 */
const traverse = (root, segments) => {
    let current = root;
    for (const segment of segments) {
        if (!segment) continue;
        current = unwrapSignal(current);
        if (current == null) return undefined;

        const key = segment.startsWith('[') ? segment.slice(1, -1) : segment;
        current = current[key];
    }
    return unwrapSignal(current);
};

/**
 * Resolves segments but keeps the final value as a proxy/signal for use as context.
 * Only unwraps intermediate values during traversal.
 */
const traverseAsContext = (root, segments) => {
    let current = root;
    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        if (!segment) continue;
        const key = segment.startsWith('[') ? segment.slice(1, -1) : segment;

        const unwrapped = unwrapSignal(current);
        if (unwrapped == null) return undefined;

        if (i === segments.length - 1) {
            return new BindingTarget(unwrapped, key);
        }
        current = unwrapped[key];
    }
    return current;
};

/**
 * Resolves a path against a context and the global registry.
 */
export const resolvePath = (path, context) => {
    if (typeof path !== 'string') return path;

    const registry = getRegistry();

    // Current context: .
    if (path === '.') return unwrapSignal(context);

    // Global absolute path: $/something
    if (path.startsWith('$/')) {
        const [rootName, ...rest] = path.slice(2).split('/');
        const rootSignal = registry?.get(rootName);
        if (!rootSignal) return undefined;

        // Root can be a signal or a state proxy
        return traverse(rootSignal, rest);
    }

    // Relative path from current context
    if (path.startsWith('./')) {
        return traverse(context, path.slice(2).split('/'));
    }

    // Parent path
    if (path.startsWith('../')) {
        return traverse(context?.__parent__, path.slice(3).split('/'));
    }

    // Path with separators - treat as relative
    if (path.includes('/') || path.includes('.')) {
        return traverse(context, path.split(/[\/.]/));
    }

    // Check if it's a single word that exists in the context
    const unwrappedContext = unwrapSignal(context);
    if (unwrappedContext && typeof unwrappedContext === 'object') {
        if (path in unwrappedContext || unwrappedContext[path] !== undefined) {
            // Use traverse with one segment to ensure signal unwrapping if context[path] is a signal
            return traverse(unwrappedContext, [path]);
        }
    }

    // Return as literal
    return path;
};

/**
 * Like resolvePath, but preserves proxy/signal wrappers for use as evaluation context.
 */
export const resolvePathAsContext = (path, context) => {
    if (typeof path !== 'string') return path;

    const registry = getRegistry();

    // Current context: .
    if (path === '.') return context;

    // Global absolute path: $/something
    if (path.startsWith('$/')) {
        const segments = path.slice(2).split(/[\/.]/);
        const rootName = segments.shift();
        const rootSignal = registry?.get(rootName);
        if (!rootSignal) return undefined;

        return traverseAsContext(rootSignal, segments);
    }

    // Relative path from current context
    if (path.startsWith('./')) {
        return traverseAsContext(context, path.slice(2).split(/[\/.]/));
    }

    // Parent path
    if (path.startsWith('../')) {
        return traverseAsContext(context?.__parent__, path.slice(3).split(/[\/.]/));
    }

    // Path with separators
    if (path.includes('/') || path.includes('.')) {
        return traverseAsContext(context, path.split(/[\/.]/));
    }

    // Single property access
    const unwrappedContext = unwrapSignal(context);
    if (unwrappedContext && typeof unwrappedContext === 'object') {
        // If it looks like a variable name, assume it's a property on the context
        if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(path)) {
            return new BindingTarget(unwrappedContext, path);
        }
    }

    return path;
};

/**
 * Represents a lazy value that will be resolved later with a specific context.
 * Used for iteration placeholders like '_' and '$event'.
 */
class LazyValue {
    constructor(fn) {
        this.fn = fn;
        this.isLazy = true;
    }
    resolve(context) {
        return this.fn(context);
    }
}

/**
 * Helper to resolve an argument which could be a literal, a path, or an explosion.
 * @param {string} arg - The argument string
 * @param {object} context - The local context object
 * @param {boolean} globalMode - If true, bare paths are resolved against global registry
 */
const resolveArgument = (arg, context, globalMode = false) => {
    // 1. Quoted Strings
    if ((arg.startsWith("'") && arg.endsWith("'")) || (arg.startsWith('"') && arg.endsWith('"'))) {
        return { value: arg.slice(1, -1), isLiteral: true };
    }

    // 2. Numbers
    if (arg !== '' && !isNaN(Number(arg))) {
        return { value: Number(arg), isLiteral: true };
    }

    // 3. Booleans / Null
    if (arg === 'true') return { value: true, isLiteral: true };
    if (arg === 'false') return { value: false, isLiteral: true };
    if (arg === 'null') return { value: null, isLiteral: true };

    // 4. Placeholder / Lazy Evaluation (_)
    if (arg === '_' || arg.startsWith('_/') || arg.startsWith('_.')) {
        return {
            value: new LazyValue((item) => {
                if (arg === '_') return item;
                const path = arg.startsWith('_.') ? arg.slice(2) : arg.slice(2);
                return resolvePath(path, item);
            }),
            isLazy: true
        };
    }

    // 5. Event Placeholder ($event)
    if (arg === '$event' || arg.startsWith('$event/') || arg.startsWith('$event.')) {
        return {
            value: new LazyValue((event) => {
                if (arg === '$event') return event;
                const path = arg.startsWith('$event.') ? arg.slice(7) : arg.slice(7);
                return resolvePath(path, event);
            }),
            isLazy: true
        };
    }

    // 6. Expression / Nested Function
    if (arg.includes('(')) {
        // Nested function call - recursively resolve
        let nestedExpr = arg;
        if (arg.startsWith('/')) {
            nestedExpr = '$' + arg;
        } else if (globalMode && !arg.startsWith('$') && !arg.startsWith('./')) {
            nestedExpr = `$/${arg}`;
        }

        const val = resolveExpression(nestedExpr, context);
        if (val instanceof LazyValue) {
            return { value: val, isLazy: true };
        }
        return { value: val, isSignal: false }; // Already resolved in current effect
    }

    // 7. Explosion operator
    const isExplosion = arg.endsWith('...');
    const pathStr = isExplosion ? arg.slice(0, -3) : arg;

    // 8. Path resolution
    let normalizedPath;
    if (pathStr.startsWith('/')) {
        normalizedPath = '$' + pathStr;
    } else if (pathStr.startsWith('$') || pathStr.startsWith('./') || pathStr.startsWith('../')) {
        normalizedPath = pathStr;
    } else if (globalMode) {
        normalizedPath = `$/${pathStr}`;
    } else {
        normalizedPath = `./${pathStr}`;
    }

    // For explosion, we may need to extract a property from each item in an array
    if (isExplosion) {
        const pathParts = normalizedPath.split('/');
        const propName = pathParts.pop();
        const parentPath = pathParts.join('/');

        const parent = parentPath ? resolvePath(parentPath, context) : context;
        const unwrappedParent = unwrapSignal(parent);

        if (Array.isArray(unwrappedParent)) {
            const values = unwrappedParent.map(item => {
                const unwrappedItem = unwrapSignal(item);
                return unwrappedItem && unwrappedItem[propName];
            });
            return { value: values, isExplosion: true };
        } else if (unwrappedParent && typeof unwrappedParent === 'object') {
            const val = unwrappedParent[propName];
            return { value: unwrapSignal(val), isExplosion: true };
        }
        return { value: undefined, isExplosion: true };
    }

    const value = resolvePathAsContext(normalizedPath, context);
    return { value, isExplosion: false };
};



/**
 * Core logic to resolve an CDOM expression.
 * This can be called recursively and will register all accessed dependencies
 * against the currently active Lightview effect.
 */
export const resolveExpression = (expr, context) => {
    if (typeof expr !== 'string') return expr;

    const funcStart = expr.indexOf('(');
    if (funcStart !== -1 && expr.endsWith(')')) {
        const fullPath = expr.slice(0, funcStart).trim();
        const argsStr = expr.slice(funcStart + 1, -1);

        const segments = fullPath.split('/');
        let funcName = segments.pop().replace(/^\$/, '');

        // Handle case where path ends in / (like $/ for division helper)
        if (funcName === '' && (segments.length > 0 || fullPath === '/')) {
            funcName = '/';
        }

        const navPath = segments.join('/');

        const isGlobalExpr = expr.startsWith('$/') || expr.startsWith('$');

        let baseContext = context;
        if (navPath && navPath !== '$') {
            baseContext = resolvePathAsContext(navPath, context);
        }

        const helper = helpers.get(funcName);
        if (!helper) {
            globalThis.console?.warn(`LightviewCDOM: Helper "${funcName}" not found.`);
            return expr;
        }

        const options = helperOptions.get(funcName) || {};

        // Split arguments respecting quotes, parentheses, curly braces, and square brackets
        const argsList = [];
        let current = '', parenDepth = 0, braceDepth = 0, bracketDepth = 0, quote = null;
        for (let i = 0; i < argsStr.length; i++) {
            const char = argsStr[i];
            if (char === quote) quote = null;
            else if (!quote && (char === "'" || char === '"')) quote = char;
            else if (!quote && char === '(') parenDepth++;
            else if (!quote && char === ')') parenDepth--;
            else if (!quote && char === '{') braceDepth++;
            else if (!quote && char === '}') braceDepth--;
            else if (!quote && char === '[') bracketDepth++;
            else if (!quote && char === ']') bracketDepth--;
            else if (!quote && char === ',' && parenDepth === 0 && braceDepth === 0 && bracketDepth === 0) {
                argsList.push(current.trim());
                current = '';
                continue;
            }
            current += char;
        }
        if (current) argsList.push(current.trim());

        const resolvedArgs = [];
        let hasLazy = false;
        for (let i = 0; i < argsList.length; i++) {
            const arg = argsList[i];
            const useGlobalMode = isGlobalExpr && (navPath === '$' || !navPath);
            const res = resolveArgument(arg, baseContext, useGlobalMode);

            if (res.isLazy) hasLazy = true;

            // For mutation helpers, skip unwrapping for specific arguments (usually the first)
            const shouldUnwrap = !(options.pathAware && i === 0);

            let val = shouldUnwrap ? unwrapSignal(res.value) : res.value;

            if (res.isExplosion && Array.isArray(val)) {
                resolvedArgs.push(...val.map(v => shouldUnwrap ? unwrapSignal(v) : v));
            } else {
                resolvedArgs.push(val);
            }
        }

        if (hasLazy) {
            // Return a new LazyValue that resolves all its lazy arguments
            return new LazyValue((contextOverride) => {
                const finalArgs = resolvedArgs.map((arg, i) => {
                    const shouldUnwrap = !(options.pathAware && i === 0);
                    const resolved = arg instanceof LazyValue ? arg.resolve(contextOverride) : arg;
                    return shouldUnwrap ? unwrapSignal(resolved) : resolved;
                });
                return helper(...finalArgs);
            });
        }

        const result = helper(...resolvedArgs);
        return unwrapSignal(result);
    }

    return unwrapSignal(resolvePath(expr, context));
};

/**
 * Parses an CDOM expression into a reactive signal.
 */
export const parseExpression = (expr, context) => {
    const LV = getLV();
    if (!LV || typeof expr !== 'string') return expr;

    return LV.computed(() => resolveExpression(expr, context));
};

/**
 * Parses CDOMC (Concise CDOM) content into a JSON object.
 * Supports unquoted keys/values and strictly avoids 'eval'.
 */
export const parseCDOMC = (input) => {
    let i = 0;
    const len = input.length;

    const skipWhitespace = () => {
        while (i < len) {
            const char = input[i];

            // Standard whitespace
            if (/\s/.test(char)) {
                i++;
                continue;
            }

            // Comments
            if (char === '/') {
                const next = input[i + 1];
                if (next === '/') {
                    // Single-line comment
                    i += 2;
                    while (i < len && input[i] !== '\n' && input[i] !== '\r') i++;
                    continue;
                } else if (next === '*') {
                    // Multi-line comment (non-nested)
                    i += 2;
                    while (i < len) {
                        if (input[i] === '*' && input[i + 1] === '/') {
                            i += 2;
                            break;
                        }
                        i++;
                    }
                    continue;
                }
            }

            break;
        }
    };

    const parseString = () => {
        const quote = input[i++];
        let res = '';
        while (i < len) {
            const char = input[i++];
            if (char === quote) return res;
            if (char === '\\') {
                const next = input[i++];
                if (next === 'n') res += '\n';
                else if (next === 't') res += '\t';
                else if (next === '"') res += '"';
                else if (next === "'") res += "'";
                else if (next === '\\') res += '\\';
                else res += next;
            } else {
                res += char;
            }
        }
        throw new Error("Unterminated string");
    };

    /**
     * Parses an unquoted word (identifier, path, or literal).
     * Supports dashes in identifiers (e.g. cdom-state).
     * Words starting with $ are preserved as strings for cDOM expression parsing.
     */
    const parseWord = () => {
        const start = i;
        let pDepth = 0;
        let bDepth = 0;
        let brDepth = 0;
        let quote = null;

        while (i < len) {
            const char = input[i];

            if (quote) {
                if (char === quote) quote = null;
                i++;
                continue;
            } else if (char === '"' || char === "'" || char === "`") {
                quote = char;
                i++;
                continue;
            }

            // Nesting
            if (char === '(') { pDepth++; i++; continue; }
            if (char === '{') { bDepth++; i++; continue; }
            if (char === '[') { brDepth++; i++; continue; }

            if (char === ')') { if (pDepth > 0) { pDepth--; i++; continue; } }
            if (char === '}') { if (bDepth > 0) { bDepth--; i++; continue; } }
            if (char === ']') { if (brDepth > 0) { brDepth--; i++; continue; } }

            // Termination at depth 0
            if (pDepth === 0 && bDepth === 0 && brDepth === 0) {
                if (/[\s:,{}\[\]"'`()]/.test(char)) {
                    break;
                }
            }

            i++;
        }

        const word = input.slice(start, i);

        // If word starts with $, preserve it as a string for cDOM expression parsing
        if (word.startsWith('$')) {
            return word;
        }

        if (word === 'true') return true;
        if (word === 'false') return false;
        if (word === 'null') return null;
        // Check if valid number
        if (word.trim() !== '' && !isNaN(Number(word))) return Number(word);
        return word;
    };

    const parseValue = () => {
        skipWhitespace();
        if (i >= len) return undefined;
        const char = input[i];

        if (char === '{') return parseObject();
        if (char === '[') return parseArray();
        if (char === '"' || char === "'") return parseString();

        return parseWord();
    };

    const parseObject = () => {
        i++; // skip '{'
        const obj = {};
        skipWhitespace();
        if (i < len && input[i] === '}') {
            i++;
            return obj;
        }

        while (i < len) {
            skipWhitespace();
            let key;
            if (input[i] === '"' || input[i] === "'") key = parseString();
            else key = parseWord(); // No longer need special key handling

            skipWhitespace();
            if (input[i] !== ':') throw new Error(`Expected ':' at position ${i}, found '${input[i]}'`);
            i++; // skip ':'

            const value = parseValue();
            obj[String(key)] = value;

            skipWhitespace();
            if (input[i] === '}') {
                i++;
                return obj;
            }
            if (input[i] === ',') {
                i++;
                skipWhitespace();
                if (input[i] === '}') {
                    i++;
                    return obj;
                }
                continue;
            }
            throw new Error(`Expected '}' or ',' at position ${i}, found '${input[i]}'`);
        }
    };

    const parseArray = () => {
        i++; // skip '['
        const arr = [];
        skipWhitespace();
        if (i < len && input[i] === ']') {
            i++;
            return arr;
        }

        while (i < len) {
            const val = parseValue();
            arr.push(val);

            skipWhitespace();
            if (input[i] === ']') {
                i++;
                return arr;
            }
            if (input[i] === ',') {
                i++;
                skipWhitespace();
                if (input[i] === ']') {
                    i++;
                    return arr;
                }
                continue;
            }
            throw new Error(`Expected ']' or ',' at position ${i}, found '${input[i]}'`);
        }
    };

    skipWhitespace();
    const res = parseValue();
    return res;
};
