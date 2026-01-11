/**
 * LIGHTVIEW CDOM PARSER
 * Responsible for resolving reactive paths and expressions.
 */

const helpers = new Map();
const helperOptions = new Map();

/**
 * Operator registration for JPRX.
 * Operators map symbols to helper names and their positions.
 */
const operators = {
    prefix: new Map(),   // e.g., '++' -> { helper: 'increment', precedence: 70 }
    postfix: new Map(),  // e.g., '++' -> { helper: 'increment', precedence: 70 }
    infix: new Map()     // e.g., '+' -> { helper: 'add', precedence: 50 }
};

// Default precedence levels
const DEFAULT_PRECEDENCE = {
    prefix: 80,
    postfix: 80,
    infix: 50
};

/**
 * Registers a global helper function.
 */
export const registerHelper = (name, fn, options = {}) => {
    helpers.set(name, fn);
    if (globalThis.__LIGHTVIEW_INTERNALS__) {
        globalThis.__LIGHTVIEW_INTERNALS__.helpers.set(name, fn);
    }
    if (options) helperOptions.set(name, options);
};

/**
 * Registers a helper as an operator with specified position.
 * @param {string} helperName - The name of the registered helper
 * @param {string} symbol - The operator symbol (e.g., '++', '+', '-')
 * @param {'prefix'|'postfix'|'infix'} position - Operator position
 * @param {number} [precedence] - Optional precedence (higher = binds tighter)
 */
export const registerOperator = (helperName, symbol, position, precedence) => {
    if (!['prefix', 'postfix', 'infix'].includes(position)) {
        throw new Error(`Invalid operator position: ${position}. Must be 'prefix', 'postfix', or 'infix'.`);
    }
    if (!helpers.has(helperName)) {
        // Allow registration before helper exists (will be checked at parse time)
        globalThis.console?.warn(`LightviewCDOM: Operator "${symbol}" registered for helper "${helperName}" which is not yet registered.`);
    }
    const prec = precedence ?? DEFAULT_PRECEDENCE[position];
    operators[position].set(symbol, { helper: helperName, precedence: prec });
};

const getLV = () => globalThis.Lightview || null;
export const getRegistry = () => getLV()?.registry || null;

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
        const LV = getLV();
        const root = LV ? LV.get(rootName, { scope: context?.__node__ || context }) : registry?.get(rootName);
        if (!root) return undefined;
        return traverse(root, rest);
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
        const segments = path.slice(2).split(/[/.]/);
        const rootName = segments.shift();
        const LV = getLV();
        const root = LV ? LV.get(rootName, { scope: context?.__node__ || context }) : registry?.get(rootName);
        if (!root) return undefined;
        return traverseAsContext(root, segments);
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
 * Node helper - identifies if a value is a DOM node.
 */
const isNode = (val) => val && typeof val === 'object' && globalThis.Node && val instanceof globalThis.Node;

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

    // 5. Context Identifiers ($this, $event)
    if (arg === '$this' || arg.startsWith('$this/') || arg.startsWith('$this.')) {
        return {
            value: new LazyValue((context) => {
                const node = context?.__node__ || context;
                if (arg === '$this') return node;
                const path = arg.startsWith('$this.') ? arg.slice(6) : arg.slice(6);
                return resolvePath(path, node);
            }),
            isLazy: true
        };
    }

    if (arg === '$event' || arg.startsWith('$event/') || arg.startsWith('$event.')) {
        return {
            value: new LazyValue((context) => {
                const event = context?.$event || context?.event || context;
                if (arg === '$event') return event;
                const path = arg.startsWith('$event.') ? arg.slice(7) : arg.slice(7);
                return resolvePath(path, event);
            }),
            isLazy: true
        };
    }

    // 6. Object / Array Literals (Concise)
    if (arg.startsWith('{') || arg.startsWith('[')) {
        try {
            const data = parseJPRX(arg);

            // Define a recursive resolver for template objects
            const resolveTemplate = (node, context) => {
                if (typeof node === 'string') {
                    if (node.startsWith('$')) {
                        const res = resolveExpression(node, context);
                        const final = (res instanceof LazyValue) ? res.resolve(context) : res;
                        return unwrapSignal(final);
                    }
                    if (node === '$this' || node.startsWith('$this/') || node.startsWith('$this.')) {
                        const path = (node.startsWith('$this.') || node.startsWith('$this/')) ? node.slice(6) : node.slice(6);
                        const ctxNode = context?.__node__ || context;
                        const res = node === '$this' ? ctxNode : resolvePath(path, ctxNode);
                        return unwrapSignal(res);
                    }
                    if (node === '$event' || node.startsWith('$event/') || node.startsWith('$event.')) {
                        const path = (node.startsWith('$event.') || node.startsWith('$event/')) ? node.slice(7) : node.slice(7);
                        const event = context?.$event || context?.event || (context && !isNode(context) ? context : null);
                        const res = node === '$event' ? event : resolvePath(path, event);
                        return unwrapSignal(res);
                    }
                    if (node === '_' || node.startsWith('_/') || node.startsWith('_.')) {
                        const path = (node.startsWith('_.') || node.startsWith('_/')) ? node.slice(2) : node.slice(2);
                        const res = node === '_' ? context : resolvePath(path, context);
                        return unwrapSignal(res);
                    }
                    if (node.startsWith('../')) return unwrapSignal(resolvePath(node, context));
                }
                if (Array.isArray(node)) return node.map(n => resolveTemplate(n, context));
                if (node && typeof node === 'object') {
                    const res = {};
                    for (const k in node) res[k] = resolveTemplate(node[k], context);
                    return res;
                }
                return node;
            };

            // Check if it contains any reactive parts
            const hasReactive = (obj) => {
                if (typeof obj === 'string') {
                    return obj.startsWith('$') || obj.startsWith('_') || obj.startsWith('../');
                }
                if (Array.isArray(obj)) return obj.some(hasReactive);
                if (obj && typeof obj === 'object') return Object.values(obj).some(hasReactive);
                return false;
            };

            if (hasReactive(data)) {
                return {
                    value: new LazyValue((context) => resolveTemplate(data, context)),
                    isLazy: true
                };
            }
            return { value: data, isLiteral: true };
        } catch (e) {
            // Fallback to path resolution if JSON parse fails
        }
    }

    // 7. Nested Function Calls
    if (arg.includes('(')) {
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
        return { value: val, isSignal: false };
    }

    // 8. Path normalization
    let normalizedPath;
    if (arg.startsWith('/')) {
        normalizedPath = '$' + arg;
    } else if (arg.startsWith('$') || arg.startsWith('./') || arg.startsWith('../')) {
        normalizedPath = arg;
    } else if (globalMode) {
        normalizedPath = `$/${arg}`;
    } else {
        normalizedPath = `./${arg}`;
    }

    // 9. Explosion operator (path... or path...prop)
    const explosionIdx = arg.indexOf('...');
    if (explosionIdx !== -1) {
        // Use normalizedPath up to the explosion point
        // Note: indexOf('...') might be Different in normalizedPath if we added $/
        const normExplosionIdx = normalizedPath.indexOf('...');
        const pathPart = normalizedPath.slice(0, normExplosionIdx);
        const propName = arg.slice(explosionIdx + 3);

        const parent = resolvePath(pathPart, context);
        const unwrappedParent = unwrapSignal(parent);

        if (Array.isArray(unwrappedParent)) {
            const values = unwrappedParent.map(item => {
                const unwrappedItem = unwrapSignal(item);
                if (!propName) return unwrappedItem;
                return unwrappedItem && typeof unwrappedItem === 'object' ? unwrapSignal(unwrappedItem[propName]) : undefined;
            });
            return { value: values, isExplosion: true };
        } else if (unwrappedParent && typeof unwrappedParent === 'object') {
            if (!propName) return { value: unwrappedParent, isExplosion: true };
            const val = unwrappedParent[propName];
            return { value: unwrapSignal(val), isExplosion: true };
        }
        return { value: undefined, isExplosion: true };
    }

    const value = resolvePathAsContext(normalizedPath, context);
    return { value, isExplosion: false };
};


// ============================================================================
// JPRX TOKENIZER & PRATT PARSER
// ============================================================================

/**
 * Token types for JPRX expressions.
 */
const TokenType = {
    PATH: 'PATH',           // $/user/age, ./name, ../parent
    LITERAL: 'LITERAL',     // 123, "hello", true, false, null
    OPERATOR: 'OPERATOR',   // +, -, *, /, ++, --, etc.
    LPAREN: 'LPAREN',       // (
    RPAREN: 'RPAREN',       // )
    COMMA: 'COMMA',         // ,
    EXPLOSION: 'EXPLOSION', // ... suffix
    PLACEHOLDER: 'PLACEHOLDER', // _, _/path
    THIS: 'THIS',           // $this
    EVENT: 'EVENT',         // $event, $event.target
    EOF: 'EOF'
};

/**
 * Get all registered operator symbols sorted by length (longest first).
 * This ensures we match '++' before '+'.
 */
const getOperatorSymbols = () => {
    const allOps = new Set([
        ...operators.prefix.keys(),
        ...operators.postfix.keys(),
        ...operators.infix.keys()
    ]);
    return [...allOps].sort((a, b) => b.length - a.length);
};

/**
 * Checks if a symbol is registered as any type of operator.
 */
const isOperator = (symbol) => {
    return operators.prefix.has(symbol) ||
        operators.postfix.has(symbol) ||
        operators.infix.has(symbol);
};

/**
 * Tokenizes a JPRX expression into an array of tokens.
 * @param {string} expr - The expression to tokenize
 * @returns {Array<{type: string, value: any}>}
 */
const tokenize = (expr) => {
    const tokens = [];
    let i = 0;
    const len = expr.length;
    const opSymbols = getOperatorSymbols();

    while (i < len) {
        // Skip whitespace
        if (/\s/.test(expr[i])) {
            i++;
            continue;
        }

        // Special: $ followed immediately by an operator symbol
        // In expressions like "$++/count", the $ is just the JPRX delimiter
        // and ++ is a prefix operator applied to /count
        if (expr[i] === '$' && i + 1 < len) {
            // Check if next chars are a PREFIX operator (sort by length to match longest first)
            const prefixOps = [...operators.prefix.keys()].sort((a, b) => b.length - a.length);
            let isPrefixOp = false;
            for (const op of prefixOps) {
                if (expr.slice(i + 1, i + 1 + op.length) === op) {
                    isPrefixOp = true;
                    break;
                }
            }
            if (isPrefixOp) {
                // Skip the $, it's just a delimiter for a prefix operator (e.g., $++/count)
                i++;
                continue;
            }
        }

        // Parentheses
        if (expr[i] === '(') {
            tokens.push({ type: TokenType.LPAREN, value: '(' });
            i++;
            continue;
        }
        if (expr[i] === ')') {
            tokens.push({ type: TokenType.RPAREN, value: ')' });
            i++;
            continue;
        }

        // Comma
        if (expr[i] === ',') {
            tokens.push({ type: TokenType.COMMA, value: ',' });
            i++;
            continue;
        }

        // Check for operators (longest match first)
        let matchedOp = null;
        for (const op of opSymbols) {
            if (expr.slice(i, i + op.length) === op) {
                // Make sure it's not part of a path (e.g., don't match + in $/a+b if that's a path)
                // Operators should be surrounded by whitespace or other tokens
                const before = i > 0 ? expr[i - 1] : ' ';
                const after = i + op.length < len ? expr[i + op.length] : ' ';

                const isInfix = operators.infix.has(op);
                const isPrefix = operators.prefix.has(op);
                const isPostfix = operators.postfix.has(op);

                // For infix-only operators (like /, +, -, >, <, >=, <=, !=), we now REQUIRE surrounding whitespace
                // This prevents collision with path separators (especially for /)
                if (isInfix && !isPrefix && !isPostfix) {
                    if (/\s/.test(before) && /\s/.test(after)) {
                        matchedOp = op;
                        break;
                    }
                    continue;
                }

                // Accept prefix/postfix operator if:
                // - Previous char is whitespace, ), or another operator end
                // - Or we're at start of expression
                // - And next char is whitespace, (, $, ., /, digit, quote, or another operator start
                const validBefore = /[\s)]/.test(before) || i === 0 ||
                    tokens.length === 0 ||
                    tokens[tokens.length - 1].type === TokenType.LPAREN ||
                    tokens[tokens.length - 1].type === TokenType.COMMA ||
                    tokens[tokens.length - 1].type === TokenType.OPERATOR;
                const validAfter = /[\s($./'"0-9_]/.test(after) ||
                    i + op.length >= len ||
                    opSymbols.some(o => expr.slice(i + op.length).startsWith(o));

                if (validBefore || validAfter) {
                    matchedOp = op;
                    break;
                }
            }
        }

        if (matchedOp) {
            tokens.push({ type: TokenType.OPERATOR, value: matchedOp });
            i += matchedOp.length;
            continue;
        }

        // Quoted strings
        if (expr[i] === '"' || expr[i] === "'") {
            const quote = expr[i];
            let str = '';
            i++; // skip opening quote
            while (i < len && expr[i] !== quote) {
                if (expr[i] === '\\' && i + 1 < len) {
                    i++;
                    if (expr[i] === 'n') str += '\n';
                    else if (expr[i] === 't') str += '\t';
                    else str += expr[i];
                } else {
                    str += expr[i];
                }
                i++;
            }
            i++; // skip closing quote
            tokens.push({ type: TokenType.LITERAL, value: str });
            continue;
        }

        // Numbers (including negative numbers at start or after operator)
        if (/\d/.test(expr[i]) ||
            (expr[i] === '-' && /\d/.test(expr[i + 1]) &&
                (tokens.length === 0 ||
                    tokens[tokens.length - 1].type === TokenType.OPERATOR ||
                    tokens[tokens.length - 1].type === TokenType.LPAREN ||
                    tokens[tokens.length - 1].type === TokenType.COMMA))) {
            let num = '';
            if (expr[i] === '-') {
                num = '-';
                i++;
            }
            while (i < len && /[\d.]/.test(expr[i])) {
                num += expr[i];
                i++;
            }
            tokens.push({ type: TokenType.LITERAL, value: parseFloat(num) });
            continue;
        }

        // Placeholder (_)
        if (expr[i] === '_' && (i + 1 >= len || !/[a-zA-Z0-9]/.test(expr[i + 1]) || expr[i + 1] === '/' || expr[i + 1] === '.')) {
            let placeholder = '_';
            i++;
            // Check for path after placeholder: _/path or _.path
            if (i < len && (expr[i] === '/' || expr[i] === '.')) {
                while (i < len && !/[\s,)(]/.test(expr[i])) {
                    placeholder += expr[i];
                    i++;
                }
            }
            tokens.push({ type: TokenType.PLACEHOLDER, value: placeholder });
            continue;
        }

        // $this placeholder
        if (expr.slice(i, i + 5) === '$this') {
            let thisPath = '$this';
            i += 5;
            while (i < len && /[a-zA-Z0-9_./]/.test(expr[i])) {
                thisPath += expr[i];
                i++;
            }
            tokens.push({ type: TokenType.THIS, value: thisPath });
            continue;
        }

        // $event placeholder
        if (expr.slice(i, i + 6) === '$event') {
            let eventPath = '$event';
            i += 6;
            while (i < len && /[a-zA-Z0-9_./]/.test(expr[i])) {
                eventPath += expr[i];
                i++;
            }
            tokens.push({ type: TokenType.EVENT, value: eventPath });
            continue;
        }

        // Paths: start with $, ., or /
        if (expr[i] === '$' || expr[i] === '.' || expr[i] === '/') {
            let path = '';
            // Consume the path, but stop at operators
            while (i < len) {
                // Check if we've hit an operator
                let isOp = false;
                for (const op of opSymbols) {
                    if (expr.slice(i, i + op.length) === op) {
                        const isInfix = operators.infix.has(op);
                        const isPrefix = operators.prefix.has(op);
                        const isPostfix = operators.postfix.has(op);

                        // Strict infix (like /) MUST have spaces to break the path
                        if (isInfix && !isPrefix && !isPostfix) {
                            const after = i + op.length < len ? expr[i + op.length] : ' ';
                            if (/\s/.test(expr[i - 1]) && /\s/.test(after)) {
                                isOp = true;
                                break;
                            }
                            continue;
                        }

                        // Prefix/Postfix: if they appear after a path, they are operators
                        // (e.g., $/count++)
                        if (path.length > 0 && path[path.length - 1] !== '/') {
                            isOp = true;
                            break;
                        }
                    }
                }
                if (isOp) break;

                // Stop at whitespace, comma, or parentheses
                if (/[\s,()]/.test(expr[i])) break;

                // Check for explosion operator
                if (expr.slice(i, i + 3) === '...') {
                    break;
                }

                path += expr[i];
                i++;
            }

            // Check for explosion suffix
            if (expr.slice(i, i + 3) === '...') {
                tokens.push({ type: TokenType.PATH, value: path });
                tokens.push({ type: TokenType.EXPLOSION, value: '...' });
                i += 3;
            } else {
                tokens.push({ type: TokenType.PATH, value: path });
            }
            continue;
        }

        // Boolean/null literals or identifiers
        if (/[a-zA-Z]/.test(expr[i])) {
            let ident = '';
            while (i < len && /[a-zA-Z0-9_]/.test(expr[i])) {
                ident += expr[i];
                i++;
            }
            if (ident === 'true') tokens.push({ type: TokenType.LITERAL, value: true });
            else if (ident === 'false') tokens.push({ type: TokenType.LITERAL, value: false });
            else if (ident === 'null') tokens.push({ type: TokenType.LITERAL, value: null });
            else tokens.push({ type: TokenType.PATH, value: ident }); // treat as path/identifier
            continue;
        }

        // Unknown character, skip
        i++;
    }

    tokens.push({ type: TokenType.EOF, value: null });
    return tokens;
};

/**
 * Checks if an expression contains operator syntax (not just function calls).
 * Used to determine whether to use Pratt parser or legacy parser.
 * 
 * CONSERVATIVE: Only detect explicit patterns to avoid false positives.
 * - Prefix: $++/path, $--/path, $!!/path (operator immediately after $ before path)
 * - Postfix: $/path++ or $/path-- (operator at end of expression, not followed by ()
 * - Infix with spaces: $/path + $/other (spaces around operator)
 */
const hasOperatorSyntax = (expr) => {
    if (!expr || typeof expr !== 'string') return false;

    // Skip function calls - they use legacy parser
    if (expr.includes('(')) return false;

    // Check for prefix operator pattern: $++ or $-- followed by /
    // This catches: $++/counter, $--/value
    if (/^\$(\+\+|--|!!)\/?/.test(expr)) {
        return true;
    }

    // Check for postfix operator pattern: path ending with ++ or --
    // This catches: $/counter++, $/value--
    if (/(\+\+|--)$/.test(expr)) {
        return true;
    }

    // Check for infix with explicit whitespace: $/a + $/b
    // The spaces make it unambiguous that the symbol is an operator, not part of a path
    if (/\s+([+\-*/]|>|<|>=|<=|!=)\s+/.test(expr)) {
        return true;
    }

    return false;
};

/**
 * Pratt Parser for JPRX expressions.
 * Parses tokens into an AST respecting operator precedence.
 */
class PrattParser {
    constructor(tokens, context, isGlobalMode = false) {
        this.tokens = tokens;
        this.pos = 0;
        this.context = context;
        this.isGlobalMode = isGlobalMode;
    }

    peek() {
        return this.tokens[this.pos] || { type: TokenType.EOF, value: null };
    }

    consume() {
        return this.tokens[this.pos++];
    }

    expect(type) {
        const tok = this.consume();
        if (tok.type !== type) {
            throw new Error(`JPRX: Expected ${type} but got ${tok.type}`);
        }
        return tok;
    }

    /**
     * Get binding power (precedence) for an infix or postfix operator.
     */
    getInfixPrecedence(op) {
        const infixInfo = operators.infix.get(op);
        if (infixInfo) return infixInfo.precedence;
        const postfixInfo = operators.postfix.get(op);
        if (postfixInfo) return postfixInfo.precedence;
        return 0;
    }

    /**
     * Parse an expression with given minimum precedence.
     */
    parseExpression(minPrecedence = 0) {
        let left = this.parsePrefix();
        let tok = this.peek();

        while (tok.type === TokenType.OPERATOR) {
            const prec = this.getInfixPrecedence(tok.value);
            if (prec < minPrecedence) break;

            // Check if it's a postfix-only operator
            if (operators.postfix.has(tok.value) && !operators.infix.has(tok.value)) {
                this.consume();
                left = { type: 'Postfix', operator: tok.value, operand: left };
                tok = this.peek();
                continue;
            }

            // Check if it's an infix operator
            if (operators.infix.has(tok.value)) {
                this.consume();
                // Right associativity would use prec, left uses prec + 1
                const right = this.parseExpression(prec + 1);
                left = { type: 'Infix', operator: tok.value, left, right };
                tok = this.peek();
                continue;
            }

            // Operator not registered as postfix or infix - treat as unknown and stop
            // This prevents infinite loops when operators are tokenized but not registered
            if (!operators.postfix.has(tok.value) && !operators.infix.has(tok.value)) {
                break;
            }

            // Postfix that's also infix - context determines
            // If next token is a value, treat as infix
            this.consume();
            const nextTok = this.peek();
            if (nextTok.type === TokenType.PATH ||
                nextTok.type === TokenType.LITERAL ||
                nextTok.type === TokenType.LPAREN ||
                nextTok.type === TokenType.PLACEHOLDER ||
                nextTok.type === TokenType.EVENT ||
                (nextTok.type === TokenType.OPERATOR && operators.prefix.has(nextTok.value))) {
                // Infix
                const right = this.parseExpression(prec + 1);
                left = { type: 'Infix', operator: tok.value, left, right };
            } else {
                // Postfix
                left = { type: 'Postfix', operator: tok.value, operand: left };
            }
            tok = this.peek();
        }

        return left;
    }

    /**
     * Parse a prefix expression (literals, paths, prefix operators, groups).
     */
    parsePrefix() {
        const tok = this.peek();

        // Prefix operator
        if (tok.type === TokenType.OPERATOR && operators.prefix.has(tok.value)) {
            this.consume();
            const prefixInfo = operators.prefix.get(tok.value);
            const operand = this.parseExpression(prefixInfo.precedence);
            return { type: 'Prefix', operator: tok.value, operand };
        }

        // Grouped expression
        if (tok.type === TokenType.LPAREN) {
            this.consume();
            const inner = this.parseExpression(0);
            this.expect(TokenType.RPAREN);
            return inner;
        }

        // Literal
        if (tok.type === TokenType.LITERAL) {
            this.consume();
            return { type: 'Literal', value: tok.value };
        }

        // Placeholder
        if (tok.type === TokenType.PLACEHOLDER) {
            this.consume();
            return { type: 'Placeholder', value: tok.value };
        }

        // This
        if (tok.type === TokenType.THIS) {
            this.consume();
            return { type: 'This', value: tok.value };
        }

        // Event
        if (tok.type === TokenType.EVENT) {
            this.consume();
            return { type: 'Event', value: tok.value };
        }

        // Path (possibly with explosion)
        if (tok.type === TokenType.PATH) {
            this.consume();
            const nextTok = this.peek();
            if (nextTok.type === TokenType.EXPLOSION) {
                this.consume();
                return { type: 'Explosion', path: tok.value };
            }
            return { type: 'Path', value: tok.value };
        }

        // EOF or unknown
        if (tok.type === TokenType.EOF) {
            return { type: 'Literal', value: undefined };
        }

        throw new Error(`JPRX: Unexpected token ${tok.type}: ${tok.value}`);
    }
}

/**
 * Evaluates a Pratt parser AST node into a value.
 * @param {object} ast - The AST node
 * @param {object} context - The evaluation context
 * @param {boolean} forMutation - Whether to preserve BindingTarget for mutation
 * @returns {any}
 */
const evaluateAST = (ast, context, forMutation = false) => {
    if (!ast) return undefined;

    switch (ast.type) {
        case 'Literal':
            return ast.value;

        case 'Path': {
            const resolved = forMutation
                ? resolvePathAsContext(ast.value, context)
                : resolvePath(ast.value, context);
            return forMutation ? resolved : unwrapSignal(resolved);
        }

        case 'Placeholder': {
            // Return a LazyValue for placeholder resolution
            return new LazyValue((item) => {
                if (ast.value === '_') return item;
                const path = ast.value.startsWith('_.') ? ast.value.slice(2) : ast.value.slice(2);
                return resolvePath(path, item);
            });
        }

        case 'This': {
            return new LazyValue((context) => {
                const node = context?.__node__ || context;
                if (ast.value === '$this') return node;
                const path = ast.value.startsWith('$this.') ? ast.value.slice(6) : ast.value.slice(6);
                return resolvePath(path, node);
            });
        }

        case 'Event': {
            return new LazyValue((context) => {
                const event = context?.$event || context?.event || context;
                if (ast.value === '$event') return event;
                const path = ast.value.startsWith('$event.') ? ast.value.slice(7) : ast.value.slice(7);
                return resolvePath(path, event);
            });
        }

        case 'Explosion': {
            const result = resolveArgument(ast.path + '...', context, false);
            return result.value;
        }

        case 'Prefix': {
            const opInfo = operators.prefix.get(ast.operator);
            if (!opInfo) {
                throw new Error(`JPRX: Unknown prefix operator: ${ast.operator}`);
            }
            const helper = helpers.get(opInfo.helper);
            if (!helper) {
                throw new Error(`JPRX: Helper "${opInfo.helper}" for operator "${ast.operator}" not found.`);
            }

            // Check if helper needs BindingTarget (pathAware)
            const opts = helperOptions.get(opInfo.helper) || {};
            const operand = evaluateAST(ast.operand, context, opts.pathAware);
            return helper(operand);
        }

        case 'Postfix': {
            const opInfo = operators.postfix.get(ast.operator);
            if (!opInfo) {
                throw new Error(`JPRX: Unknown postfix operator: ${ast.operator}`);
            }
            const helper = helpers.get(opInfo.helper);
            if (!helper) {
                throw new Error(`JPRX: Helper "${opInfo.helper}" for operator "${ast.operator}" not found.`);
            }

            const opts = helperOptions.get(opInfo.helper) || {};
            const operand = evaluateAST(ast.operand, context, opts.pathAware);
            return helper(operand);
        }

        case 'Infix': {
            const opInfo = operators.infix.get(ast.operator);
            if (!opInfo) {
                throw new Error(`JPRX: Unknown infix operator: ${ast.operator}`);
            }
            const helper = helpers.get(opInfo.helper);
            if (!helper) {
                throw new Error(`JPRX: Helper "${opInfo.helper}" for operator "${ast.operator}" not found.`);
            }

            const opts = helperOptions.get(opInfo.helper) || {};
            // For infix, typically first arg might be pathAware
            const left = evaluateAST(ast.left, context, opts.pathAware);
            const right = evaluateAST(ast.right, context, false);

            const finalArgs = [];

            // Handle potentially exploded arguments (like in sum(/items...p))
            // Although infix operators usually take exactly 2 args, we treat them consistently
            if (Array.isArray(left) && ast.left.type === 'Explosion') finalArgs.push(...left);
            else finalArgs.push(unwrapSignal(left));

            if (Array.isArray(right) && ast.right.type === 'Explosion') finalArgs.push(...right);
            else finalArgs.push(unwrapSignal(right));

            return helper(...finalArgs);
        }

        default:
            throw new Error(`JPRX: Unknown AST node type: ${ast.type}`);
    }
};

/**
 * Parses and evaluates a JPRX expression using the Pratt parser.
 * @param {string} expr - The expression string
 * @param {object} context - The evaluation context
 * @returns {any}
 */
const parseWithPratt = (expr, context) => {
    const tokens = tokenize(expr);
    const parser = new PrattParser(tokens, context);
    const ast = parser.parseExpression(0);
    return evaluateAST(ast, context);
};


/**
 * Core logic to resolve an CDOM expression.
 * This can be called recursively and will register all accessed dependencies
 * against the currently active Lightview effect.
 */
export const resolveExpression = (expr, context) => {
    if (typeof expr !== 'string') return expr;

    // Check if this expression uses operator syntax (prefix/postfix/infix operators)
    // If so, use the Pratt parser for proper precedence handling
    if (hasOperatorSyntax(expr)) {
        try {
            return parseWithPratt(expr, context);
        } catch (e) {
            // Fall back to legacy parsing if Pratt fails
            globalThis.console?.warn('JPRX: Pratt parser failed, falling back to legacy:', e.message);
        }
    }

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

            // Don't unwrap LazyValues - pass them directly to helpers
            // Helpers like map() need the LazyValue.resolve method
            let val = res.value;
            if (shouldUnwrap && !(val && val.isLazy)) {
                val = unwrapSignal(val);
            }

            if (res.isExplosion && Array.isArray(val)) {
                resolvedArgs.push(...val.map(v => (shouldUnwrap && !(v && v.isLazy)) ? unwrapSignal(v) : v));
            } else {
                resolvedArgs.push(val);
            }
        }

        if (hasLazy && !options.lazyAware) {
            // Return a new LazyValue that resolves all its lazy arguments
            // Only for helpers that don't know how to handle LazyValue internally
            return new LazyValue((contextOverride) => {
                const finalArgs = resolvedArgs.map((arg, i) => {
                    const shouldUnwrap = !(options.pathAware && i === 0);
                    const resolved = arg instanceof LazyValue ? arg.resolve(contextOverride) : arg;
                    return shouldUnwrap ? unwrapSignal(resolved) : resolved;
                });
                return helper(...finalArgs);
            });
        }

        const result = helper.apply(context?.__node__ || null, resolvedArgs);
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

/**
 * JPRXC Preprocessor: Converts concise JPRX format to valid JSON.
 * 
 * JPRXC allows:
 * - Unquoted property names (tag, children, onclick)
 * - Unquoted JPRX expressions ($++/counter, $/path)
 * - Single-line and multi-line comments
 * 
 * This preprocessor transforms JPRXC to JSON string, then uses native JSON.parse.
 * 
 * @param {string} input - JPRXC content
 * @returns {object} - Parsed JSON object
 */
export const parseJPRX = (input) => {
    let result = '';
    let i = 0;
    const len = input.length;

    while (i < len) {
        const char = input[i];

        // Handle // single-line comments
        if (char === '/' && input[i + 1] === '/') {
            while (i < len && input[i] !== '\n') i++;
            continue;
        }

        // Handle /* multi-line comments */
        if (char === '/' && input[i + 1] === '*') {
            i += 2;
            while (i < len && !(input[i] === '*' && input[i + 1] === '/')) i++;
            i += 2; // skip */
            continue;
        }

        // Handle quoted strings
        if (char === '"' || char === "'") {
            const quote = char;
            result += '"'; // Start double quoted string
            i++; // skip opening quote

            while (i < len && input[i] !== quote) {
                const c = input[i];
                if (c === '\\') {
                    // Handle existing specific escapes
                    result += '\\'; // Preserved backslash
                    i++;
                    if (i < len) {
                        const next = input[i];
                        // If it's a quote that matches our output quote ("), we need to ensure it's escaped
                        if (next === '"') result += '\\"';
                        else result += next;
                        i++;
                    }
                } else if (c === '"') {
                    result += '\\"'; // Escape double quotes since we're outputting "
                    i++;
                } else if (c === '\n') {
                    result += '\\n';
                    i++;
                } else if (c === '\r') {
                    result += '\\r';
                    i++;
                } else if (c === '\t') {
                    result += '\\t';
                    i++;
                } else {
                    result += c;
                    i++;
                }
            }
            result += '"'; // End double quoted string
            i++; // skip closing quote
            continue;
        }

        // Handle JPRX expressions starting with $ (MUST come before word handler!)
        if (char === '$') {
            let expr = '';
            let parenDepth = 0;
            let braceDepth = 0;
            let bracketDepth = 0;
            let inExprQuote = null;

            while (i < len) {
                const c = input[i];

                if (inExprQuote) {
                    if (c === inExprQuote && input[i - 1] !== '\\') inExprQuote = null;
                } else if (c === '"' || c === "'") {
                    inExprQuote = c;
                } else {
                    // Check for break BEFORE updating depth
                    if (parenDepth === 0 && braceDepth === 0 && bracketDepth === 0) {
                        if (/[\s,}\]:]/.test(c) && expr.length > 1) break;
                    }

                    if (c === '(') parenDepth++;
                    else if (c === ')') parenDepth--;
                    else if (c === '{') braceDepth++;
                    else if (c === '}') braceDepth--;
                    else if (c === '[') bracketDepth++;
                    else if (c === ']') bracketDepth--;
                }

                expr += c;
                i++;
            }

            // Use JSON.stringify to safely quote and escape the expression
            result += JSON.stringify(expr);
            continue;
        }

        // Handle unquoted property names, identifiers, and paths
        if (/[a-zA-Z_./]/.test(char)) {
            let word = '';
            while (i < len && /[a-zA-Z0-9_$/.-]/.test(input[i])) {
                word += input[i];
                i++;
            }

            // Skip whitespace to check for :
            let j = i;
            while (j < len && /\s/.test(input[j])) j++;

            if (input[j] === ':') {
                // It's a property name - quote it
                result += `"${word}"`;
            } else {
                // It's a value - check if it's a keyword
                if (word === 'true' || word === 'false' || word === 'null') {
                    result += word;
                } else if (!isNaN(Number(word))) {
                    result += word;
                } else {
                    // Quote as string value
                    result += `"${word}"`;
                }
            }
            continue;
        }

        // Handle numbers
        if (/[\d]/.test(char) || (char === '-' && /\d/.test(input[i + 1]))) {
            let num = '';
            while (i < len && /[\d.\-eE]/.test(input[i])) {
                num += input[i];
                i++;
            }
            result += num;
            continue;
        }

        // Pass through structural characters and whitespace
        result += char;
        i++;
    }

    try {
        return JSON.parse(result);
    } catch (e) {
        globalThis.console?.error('parseJPRX: JSON parse failed', e);
        globalThis.console?.error('Transformed input:', result);
        throw e;
    }
};
