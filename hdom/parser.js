/**
 * LIGHTVIEW HDOM PARSER
 * Responsible for resolving reactive paths and expressions.
 */

const helpers = new Map();

/**
 * Registers a global helper function.
 */
export const registerHelper = (name, fn) => {
    helpers.set(name, fn);
};

const getLV = () => globalThis.Lightview || null;
const getRegistry = () => getLV()?.registry || null;

/**
 * Unwraps a signal-like value to its raw value.
 * This should be used to establish reactive dependencies within a computed context.
 */
const unwrapSignal = (val) => {
    if (val && typeof val === 'function' && 'value' in val) {
        return val.value;
    }
    if (val && typeof val === 'object' && 'value' in val && typeof val.get === 'function') {
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
    for (const segment of segments) {
        if (!segment) continue;
        current = unwrapSignal(current);
        if (current == null) return undefined;

        const key = segment.startsWith('[') ? segment.slice(1, -1) : segment;
        current = current[key];
    }
    // Don't unwrap the final result - we want the proxy
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

    // Path with slashes but no prefix - treat as relative
    if (path.includes('/')) {
        return traverse(context, path.split('/'));
    }

    // Check if it's a single word that exists in the context
    const unwrappedContext = unwrapSignal(context);
    if (unwrappedContext && typeof unwrappedContext === 'object' && path in unwrappedContext) {
        // Use traverse with one segment to ensure signal unwrapping if context[path] is a signal
        return traverse(unwrappedContext, [path]);
    }

    // Return as literal
    return path;
};

/**
 * Like resolvePath, but preserves proxy/signal wrappers for use as evaluation context.
 */
const resolvePathAsContext = (path, context) => {
    if (typeof path !== 'string') return path;

    const registry = getRegistry();

    // Current context: .
    if (path === '.') return context;

    // Global absolute path: $/something
    if (path.startsWith('$/')) {
        const [rootName, ...rest] = path.slice(2).split('/');
        const rootSignal = registry?.get(rootName);
        if (!rootSignal) return undefined;

        return traverseAsContext(rootSignal, rest);
    }

    // Relative path from current context
    if (path.startsWith('./')) {
        return traverseAsContext(context, path.slice(2).split('/'));
    }

    // Parent path
    if (path.startsWith('../')) {
        return traverseAsContext(context?.__parent__, path.slice(3).split('/'));
    }

    // Path with slashes but no prefix
    if (path.includes('/')) {
        return traverseAsContext(context, path.split('/'));
    }

    // Single property access
    const unwrappedContext = unwrapSignal(context);
    if (unwrappedContext && typeof unwrappedContext === 'object' && path in unwrappedContext) {
        return unwrappedContext[path]; // Return the property which might be a proxy
    }

    return path;
};

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

    // 4. Expression / Nested Function
    // 4. Expression / Nested Function
    if (arg.includes('(')) {
        // Nested function call - recursively resolve
        let nestedExpr = arg;
        if (arg.startsWith('/')) {
            nestedExpr = '$' + arg;
        } else if (globalMode && !arg.startsWith('$') && !arg.startsWith('./')) {
            nestedExpr = `$/${arg}`;
        }

        const val = resolveExpression(nestedExpr, context);
        return { value: val, isSignal: false }; // Already resolved in current effect
    }

    // 5. Explosion operator
    const isExplosion = arg.endsWith('...');
    const pathStr = isExplosion ? arg.slice(0, -3) : arg;

    // 6. Path resolution
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

    const value = resolvePath(normalizedPath, context);
    return { value, isExplosion: false };
};

/**
 * Core logic to resolve an HDOM expression.
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
        const funcName = segments.pop().replace(/^\$/, '');
        const navPath = segments.join('/');

        const isGlobalExpr = expr.startsWith('$/') || expr.startsWith('$');

        let baseContext = context;
        if (navPath && navPath !== '$') {
            baseContext = resolvePathAsContext(navPath, context);
        }

        const helper = helpers.get(funcName);
        if (!helper) {
            globalThis.console?.warn(`LightviewHDOM: Helper "${funcName}" not found.`);
            return expr;
        }

        // Split arguments respecting quotes and parentheses
        const argsList = [];
        let current = '', depth = 0, quote = null;
        for (let i = 0; i < argsStr.length; i++) {
            const char = argsStr[i];
            if (char === quote) quote = null;
            else if (!quote && (char === "'" || char === '"')) quote = char;
            else if (!quote && char === '(') depth++;
            else if (!quote && char === ')') depth--;
            else if (!quote && char === ',' && depth === 0) {
                argsList.push(current.trim());
                current = '';
                continue;
            }
            current += char;
        }
        if (current) argsList.push(current.trim());

        const resolvedArgs = [];
        for (const arg of argsList) {
            const useGlobalMode = isGlobalExpr && (navPath === '$' || !navPath);
            const res = resolveArgument(arg, baseContext, useGlobalMode);

            // resolvedArgs should be raw values
            let val = unwrapSignal(res.value);

            if (res.isExplosion && Array.isArray(val)) {
                resolvedArgs.push(...val.map(unwrapSignal));
            } else {
                resolvedArgs.push(val);
            }
        }

        const result = helper(...resolvedArgs);
        return unwrapSignal(result);
    }

    return unwrapSignal(resolvePath(expr, context));
};

/**
 * Parses an HDOM expression into a reactive signal.
 */
export const parseExpression = (expr, context) => {
    const LV = getLV();
    if (!LV || typeof expr !== 'string') return expr;

    return LV.computed(() => resolveExpression(expr, context));
};

/**
 * Parses HDOMC (Concise HDOM) content into a JSON object.
 * Supports unquoted keys/values and strictly avoids 'eval'.
 */
export const parseHDOMC = (input) => {
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

    const parseWord = () => {
        const start = i;
        let depth = 0;

        while (i < len) {
            const char = input[i];

            // If inside parentheses, ignore everything except matching parenthesis
            if (depth > 0) {
                if (char === ')') depth--;
                else if (char === '(') depth++;
                i++;
                continue;
            }

            // Structural characters that end a word (at depth 0)
            if (/[\s:,{}\[\]"'`]/.test(char)) {
                // Special case: if we see '(', we are entering a function call word
                if (char === '(') {
                    depth++;
                    i++;
                    continue;
                }
                break;
            }

            i++;
        }

        const word = input.slice(start, i);
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
            else key = parseWord();

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
