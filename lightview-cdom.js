var LightviewCDOM = function(exports) {
  "use strict";
  const helpers = /* @__PURE__ */ new Map();
  const helperOptions = /* @__PURE__ */ new Map();
  const operators = {
    prefix: /* @__PURE__ */ new Map(),
    // e.g., '++' -> { helper: 'increment', precedence: 70 }
    postfix: /* @__PURE__ */ new Map(),
    // e.g., '++' -> { helper: 'increment', precedence: 70 }
    infix: /* @__PURE__ */ new Map()
    // e.g., '+' -> { helper: 'add', precedence: 50 }
  };
  const DEFAULT_PRECEDENCE = {
    prefix: 80,
    postfix: 80,
    infix: 50
  };
  const registerHelper = (name, fn, options = {}) => {
    helpers.set(name, fn);
    if (globalThis.__LIGHTVIEW_INTERNALS__) {
      globalThis.__LIGHTVIEW_INTERNALS__.helpers.set(name, fn);
    }
    if (options) helperOptions.set(name, options);
  };
  const registerOperator = (helperName, symbol, position, precedence, options = {}) => {
    var _a;
    if (!["prefix", "postfix", "infix"].includes(position)) {
      throw new Error(`Invalid operator position: ${position}. Must be 'prefix', 'postfix', or 'infix'.`);
    }
    if (!helpers.has(helperName)) {
      (_a = globalThis.console) == null ? void 0 : _a.warn(`LightviewCDOM: Operator "${symbol}" registered for helper "${helperName}" which is not yet registered.`);
    }
    const prec = precedence ?? DEFAULT_PRECEDENCE[position];
    operators[position].set(symbol, { helper: helperName, precedence: prec, options });
  };
  const getLV = () => globalThis.Lightview || null;
  const getRegistry = () => {
    var _a;
    return ((_a = getLV()) == null ? void 0 : _a.registry) || null;
  };
  class BindingTarget {
    constructor(parent, key) {
      this.parent = parent;
      this.key = key;
      this.isBindingTarget = true;
    }
    get value() {
      return this.parent[this.key];
    }
    set value(v) {
      this.parent[this.key] = v;
    }
    get __parent__() {
      return this.parent;
    }
  }
  const unwrapSignal = (val) => {
    if (val && typeof val === "function" && "value" in val) {
      return val.value;
    }
    if (val && typeof val === "object" && !(globalThis.Node && val instanceof globalThis.Node) && "value" in val) {
      return val.value;
    }
    return val;
  };
  const traverse = (root, segments) => {
    let current = root;
    for (const segment of segments) {
      if (!segment) continue;
      current = unwrapSignal(current);
      if (current == null) return void 0;
      const key = segment.startsWith("[") ? segment.slice(1, -1) : segment;
      current = current[key];
    }
    return unwrapSignal(current);
  };
  const traverseAsContext = (root, segments) => {
    let current = root;
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (!segment) continue;
      const key = segment.startsWith("[") ? segment.slice(1, -1) : segment;
      const unwrapped = unwrapSignal(current);
      if (unwrapped == null) return void 0;
      if (i === segments.length - 1) {
        return new BindingTarget(unwrapped, key);
      }
      current = unwrapped[key];
    }
    return current;
  };
  const resolvePath = (path, context) => {
    if (typeof path !== "string") return path;
    const registry = getRegistry();
    if (path === ".") return unwrapSignal(context);
    if (path.startsWith("=/") || path.startsWith("/")) {
      const segments = path.startsWith("=/") ? path.slice(2).split("/") : path.slice(1).split("/");
      const rootName = segments.shift();
      const LV = getLV();
      const root = LV ? LV.get(rootName, { scope: (context == null ? void 0 : context.__node__) || context }) : registry == null ? void 0 : registry.get(rootName);
      if (!root) return void 0;
      return traverse(root, segments);
    }
    if (path.startsWith("./")) {
      return traverse(context, path.slice(2).split("/"));
    }
    if (path.startsWith("../")) {
      return traverse(context == null ? void 0 : context.__parent__, path.slice(3).split("/"));
    }
    if (path.includes("/") || path.includes(".")) {
      const unwrapped = unwrapSignal(context);
      if (unwrapped && typeof unwrapped === "object" && path in unwrapped) {
        return unwrapSignal(unwrapped[path]);
      }
      return traverse(context, path.split(/[\/.]/));
    }
    const unwrappedContext = unwrapSignal(context);
    if (unwrappedContext && typeof unwrappedContext === "object") {
      if (path in unwrappedContext || unwrappedContext[path] !== void 0) {
        return traverse(unwrappedContext, [path]);
      }
    }
    return path;
  };
  const resolvePathAsContext = (path, context) => {
    if (typeof path !== "string") return path;
    const registry = getRegistry();
    if (path === ".") return context;
    if (path.startsWith("=/") || path.startsWith("/")) {
      const segments = path.startsWith("=/") ? path.slice(2).split(/[/.]/) : path.slice(1).split(/[/.]/);
      const rootName = segments.shift();
      const LV = getLV();
      const root = LV ? LV.get(rootName, { scope: (context == null ? void 0 : context.__node__) || context }) : registry == null ? void 0 : registry.get(rootName);
      if (!root) return void 0;
      return traverseAsContext(root, segments);
    }
    if (path.startsWith("./")) {
      return traverseAsContext(context, path.slice(2).split(/[\/.]/));
    }
    if (path.startsWith("../")) {
      return traverseAsContext(context == null ? void 0 : context.__parent__, path.slice(3).split(/[\/.]/));
    }
    if (path.includes("/") || path.includes(".")) {
      const unwrapped = unwrapSignal(context);
      if (unwrapped && typeof unwrapped === "object" && path in unwrapped) {
        return new BindingTarget(unwrapped, path);
      }
      return traverseAsContext(context, path.split(/[\/.]/));
    }
    const unwrappedContext = unwrapSignal(context);
    if (unwrappedContext && typeof unwrappedContext === "object") {
      if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(path)) {
        return new BindingTarget(unwrappedContext, path);
      }
    }
    return path;
  };
  class LazyValue {
    constructor(fn) {
      this.fn = fn;
      this.isLazy = true;
    }
    resolve(context) {
      return this.fn(context);
    }
  }
  const isNode = (val) => val && typeof val === "object" && globalThis.Node && val instanceof globalThis.Node;
  const resolveArgument = (arg, context, globalMode = false) => {
    if (arg.startsWith("'") && arg.endsWith("'") || arg.startsWith('"') && arg.endsWith('"')) {
      return { value: arg.slice(1, -1), isLiteral: true };
    }
    if (arg !== "" && !isNaN(Number(arg))) {
      return { value: Number(arg), isLiteral: true };
    }
    if (arg === "true") return { value: true, isLiteral: true };
    if (arg === "false") return { value: false, isLiteral: true };
    if (arg === "null") return { value: null, isLiteral: true };
    if (arg === "_" || arg.startsWith("_/") || arg.startsWith("_.")) {
      return {
        value: new LazyValue((item) => {
          if (arg === "_") return item;
          const path = arg.startsWith("_.") ? arg.slice(2) : arg.slice(2);
          return resolvePath(path, item);
        }),
        isLazy: true
      };
    }
    if (arg === "$this" || arg.startsWith("$this/") || arg.startsWith("$this.")) {
      return {
        value: new LazyValue((context2) => {
          const node = (context2 == null ? void 0 : context2.__node__) || context2;
          if (arg === "$this") return node;
          const path = arg.startsWith("$this.") ? arg.slice(6) : arg.slice(6);
          return resolvePath(path, node);
        }),
        isLazy: true
      };
    }
    if (arg === "$event" || arg.startsWith("$event/") || arg.startsWith("$event.")) {
      return {
        value: new LazyValue((context2) => {
          const event = (context2 == null ? void 0 : context2.$event) || (context2 == null ? void 0 : context2.event) || context2;
          if (arg === "$event") return event;
          const path = arg.startsWith("$event.") ? arg.slice(7) : arg.slice(7);
          return resolvePath(path, event);
        }),
        isLazy: true
      };
    }
    if (arg.startsWith("{") || arg.startsWith("[")) {
      try {
        const data = parseJPRX(arg);
        const resolveTemplate = (node, context2) => {
          if (typeof node === "string") {
            if (node.startsWith("=")) {
              const res = resolveExpression$1(node, context2);
              const final = res instanceof LazyValue ? res.resolve(context2) : res;
              return unwrapSignal(final);
            }
            if (node === "$this" || node.startsWith("$this/") || node.startsWith("$this.")) {
              const path = node.startsWith("$this.") || node.startsWith("$this/") ? node.slice(6) : node.slice(6);
              const ctxNode = (context2 == null ? void 0 : context2.__node__) || context2;
              const res = node === "$this" ? ctxNode : resolvePath(path, ctxNode);
              return unwrapSignal(res);
            }
            if (node === "$event" || node.startsWith("$event/") || node.startsWith("$event.")) {
              const path = node.startsWith("$event.") || node.startsWith("$event/") ? node.slice(7) : node.slice(7);
              const event = (context2 == null ? void 0 : context2.$event) || (context2 == null ? void 0 : context2.event) || (context2 && !isNode(context2) ? context2 : null);
              const res = node === "$event" ? event : resolvePath(path, event);
              return unwrapSignal(res);
            }
            if (node === "_" || node.startsWith("_/") || node.startsWith("_.")) {
              const path = node.startsWith("_.") || node.startsWith("_/") ? node.slice(2) : node.slice(2);
              const res = node === "_" ? context2 : resolvePath(path, context2);
              return unwrapSignal(res);
            }
            if (node.startsWith("../")) return unwrapSignal(resolvePath(node, context2));
          }
          if (Array.isArray(node)) return node.map((n) => resolveTemplate(n, context2));
          if (node && typeof node === "object") {
            const res = {};
            for (const k in node) res[k] = resolveTemplate(node[k], context2);
            return res;
          }
          return node;
        };
        const hasReactive = (obj) => {
          if (typeof obj === "string") {
            return obj.startsWith("=") || obj.startsWith("_") || obj.startsWith("../");
          }
          if (Array.isArray(obj)) return obj.some(hasReactive);
          if (obj && typeof obj === "object") return Object.values(obj).some(hasReactive);
          return false;
        };
        if (hasReactive(data)) {
          return {
            value: new LazyValue((context2) => resolveTemplate(data, context2)),
            isLazy: true
          };
        }
        return { value: data, isLiteral: true };
      } catch (e) {
      }
    }
    if (arg.includes("(")) {
      let nestedExpr = arg;
      if (arg.startsWith("/")) {
        nestedExpr = "=" + arg;
      } else if (globalMode && !arg.startsWith("=") && !arg.startsWith("./")) {
        nestedExpr = `=/${arg}`;
      }
      const val = resolveExpression$1(nestedExpr, context);
      if (val instanceof LazyValue) {
        return { value: val, isLazy: true };
      }
      return { value: val, isSignal: false };
    }
    let normalizedPath;
    if (arg.startsWith("/")) {
      normalizedPath = "=" + arg;
    } else if (arg.startsWith("=") || arg.startsWith("./") || arg.startsWith("../")) {
      normalizedPath = arg;
    } else if (globalMode) {
      normalizedPath = `=/${arg}`;
    } else {
      normalizedPath = `./${arg}`;
    }
    const explosionIdx = arg.indexOf("...");
    if (explosionIdx !== -1) {
      const normExplosionIdx = normalizedPath.indexOf("...");
      const pathPart = normalizedPath.slice(0, normExplosionIdx);
      const propName = arg.slice(explosionIdx + 3);
      const parent = resolvePath(pathPart, context);
      const unwrappedParent = unwrapSignal(parent);
      if (Array.isArray(unwrappedParent)) {
        const values = unwrappedParent.map((item) => {
          const unwrappedItem = unwrapSignal(item);
          if (!propName) return unwrappedItem;
          return unwrappedItem && typeof unwrappedItem === "object" ? unwrapSignal(unwrappedItem[propName]) : void 0;
        });
        return { value: values, isExplosion: true };
      } else if (unwrappedParent && typeof unwrappedParent === "object") {
        if (!propName) return { value: unwrappedParent, isExplosion: true };
        const val = unwrappedParent[propName];
        return { value: unwrapSignal(val), isExplosion: true };
      }
      return { value: void 0, isExplosion: true };
    }
    const value = resolvePathAsContext(normalizedPath, context);
    return { value, isExplosion: false };
  };
  const TokenType = {
    PATH: "PATH",
    // $/user/age, ./name, ../parent
    LITERAL: "LITERAL",
    // 123, "hello", true, false, null
    OPERATOR: "OPERATOR",
    // +, -, *, /, ++, --, etc.
    LPAREN: "LPAREN",
    // (
    RPAREN: "RPAREN",
    // )
    COMMA: "COMMA",
    // ,
    EXPLOSION: "EXPLOSION",
    // ... suffix
    PLACEHOLDER: "PLACEHOLDER",
    // _, _/path
    THIS: "THIS",
    // $this
    EVENT: "EVENT",
    // $event, $event.target
    LBRACE: "LBRACE",
    // {
    RBRACE: "RBRACE",
    // }
    LBRACKET: "LBRACKET",
    // [
    RBRACKET: "RBRACKET",
    // ]
    COLON: "COLON",
    // :
    EOF: "EOF"
  };
  const getOperatorSymbols = () => {
    const allOps = /* @__PURE__ */ new Set([
      ...operators.prefix.keys(),
      ...operators.postfix.keys(),
      ...operators.infix.keys()
    ]);
    return [...allOps].sort((a, b) => b.length - a.length);
  };
  const tokenize = (expr) => {
    var _a, _b;
    const tokens = [];
    let i = 0;
    const len2 = expr.length;
    const opSymbols = getOperatorSymbols();
    while (i < len2) {
      if (/\s/.test(expr[i])) {
        i++;
        continue;
      }
      if (expr[i] === "=" && i === 0 && i + 1 < len2) {
        const prefixOps = [...operators.prefix.keys()].sort((a, b) => b.length - a.length);
        let matchedPrefix = null;
        for (const op of prefixOps) {
          if (expr.slice(i + 1, i + 1 + op.length) === op) {
            matchedPrefix = op;
            break;
          }
        }
        if (matchedPrefix) {
          i++;
          continue;
        }
        const next = expr[i + 1];
        if (next === "/" || next === "." || /[a-zA-Z_$]/.test(next)) {
          i++;
          continue;
        }
      }
      if (expr[i] === "(") {
        tokens.push({ type: TokenType.LPAREN, value: "(" });
        i++;
        continue;
      }
      if (expr[i] === ")") {
        tokens.push({ type: TokenType.RPAREN, value: ")" });
        i++;
        continue;
      }
      if (expr[i] === ",") {
        tokens.push({ type: TokenType.COMMA, value: "," });
        i++;
        continue;
      }
      if (expr[i] === "{") {
        tokens.push({ type: TokenType.LBRACE, value: "{" });
        i++;
        continue;
      }
      if (expr[i] === "}") {
        tokens.push({ type: TokenType.RBRACE, value: "}" });
        i++;
        continue;
      }
      if (expr[i] === "[") {
        tokens.push({ type: TokenType.LBRACKET, value: "[" });
        i++;
        continue;
      }
      if (expr[i] === "]") {
        tokens.push({ type: TokenType.RBRACKET, value: "]" });
        i++;
        continue;
      }
      if (expr[i] === ":") {
        tokens.push({ type: TokenType.COLON, value: ":" });
        i++;
        continue;
      }
      let matchedOp = null;
      for (const op of opSymbols) {
        if (expr.slice(i, i + op.length) === op) {
          const before = i > 0 ? expr[i - 1] : " ";
          const after = i + op.length < len2 ? expr[i + op.length] : " ";
          const infixConf = operators.infix.get(op);
          const prefixConf = operators.prefix.get(op);
          const postfixConf = operators.postfix.get(op);
          if ((_a = infixConf == null ? void 0 : infixConf.options) == null ? void 0 : _a.requiresWhitespace) {
            if (!prefixConf && !postfixConf) {
              const isWhitespaceMatch = /\s/.test(before) && /\s/.test(after);
              if (!isWhitespaceMatch) continue;
            }
          }
          if (infixConf) {
            const lastTok = tokens[tokens.length - 1];
            const isValueContext = lastTok && (lastTok.type === TokenType.PATH || lastTok.type === TokenType.LITERAL || lastTok.type === TokenType.RPAREN || lastTok.type === TokenType.PLACEHOLDER || lastTok.type === TokenType.THIS || lastTok.type === TokenType.EVENT);
            if (isValueContext) {
              matchedOp = op;
              break;
            }
          }
          const validBefore = /[\s)]/.test(before) || i === 0 || tokens.length === 0 || tokens[tokens.length - 1].type === TokenType.LPAREN || tokens[tokens.length - 1].type === TokenType.COMMA || tokens[tokens.length - 1].type === TokenType.OPERATOR;
          const validAfter = /[\s(=./'"0-9_]/.test(after) || i + op.length >= len2 || opSymbols.some((o) => expr.slice(i + op.length).startsWith(o));
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
      if (expr[i] === '"' || expr[i] === "'") {
        const quote = expr[i];
        let str = "";
        i++;
        while (i < len2 && expr[i] !== quote) {
          if (expr[i] === "\\" && i + 1 < len2) {
            i++;
            if (expr[i] === "n") str += "\n";
            else if (expr[i] === "t") str += "	";
            else str += expr[i];
          } else {
            str += expr[i];
          }
          i++;
        }
        i++;
        tokens.push({ type: TokenType.LITERAL, value: str });
        continue;
      }
      if (/\d/.test(expr[i]) || expr[i] === "-" && /\d/.test(expr[i + 1]) && (tokens.length === 0 || tokens[tokens.length - 1].type === TokenType.OPERATOR || tokens[tokens.length - 1].type === TokenType.LPAREN || tokens[tokens.length - 1].type === TokenType.COMMA)) {
        let num = "";
        if (expr[i] === "-") {
          num = "-";
          i++;
        }
        while (i < len2 && /[\d.]/.test(expr[i])) {
          num += expr[i];
          i++;
        }
        tokens.push({ type: TokenType.LITERAL, value: parseFloat(num) });
        continue;
      }
      if (expr[i] === "_" && (i + 1 >= len2 || !/[a-zA-Z0-9]/.test(expr[i + 1]) || expr[i + 1] === "/" || expr[i + 1] === ".")) {
        let placeholder = "_";
        i++;
        if (i < len2 && (expr[i] === "/" || expr[i] === ".")) {
          while (i < len2 && !/[\s,)(]/.test(expr[i])) {
            placeholder += expr[i];
            i++;
          }
        }
        tokens.push({ type: TokenType.PLACEHOLDER, value: placeholder });
        continue;
      }
      if (expr.slice(i, i + 5) === "$this") {
        let thisPath = "$this";
        i += 5;
        while (i < len2 && /[a-zA-Z0-9_./]/.test(expr[i])) {
          thisPath += expr[i];
          i++;
        }
        tokens.push({ type: TokenType.THIS, value: thisPath });
        continue;
      }
      if (expr.slice(i, i + 6) === "$event") {
        let eventPath = "$event";
        i += 6;
        while (i < len2 && /[a-zA-Z0-9_./]/.test(expr[i])) {
          eventPath += expr[i];
          i++;
        }
        tokens.push({ type: TokenType.EVENT, value: eventPath });
        continue;
      }
      if (expr[i] === "=" || expr[i] === "." || expr[i] === "/") {
        let path = "";
        while (i < len2) {
          let isOp = false;
          for (const op of opSymbols) {
            if (expr.slice(i, i + op.length) === op) {
              const infixConf = operators.infix.get(op);
              const prefixConf = operators.prefix.get(op);
              const postfixConf = operators.postfix.get(op);
              if ((_b = infixConf == null ? void 0 : infixConf.options) == null ? void 0 : _b.requiresWhitespace) {
                if (!prefixConf && !postfixConf) {
                  const after = i + op.length < len2 ? expr[i + op.length] : " ";
                  if (/\s/.test(expr[i - 1]) && /\s/.test(after)) {
                    isOp = true;
                    break;
                  }
                  continue;
                }
              }
              if (path.length > 0 && path[path.length - 1] !== "/") {
                isOp = true;
                break;
              }
            }
          }
          if (isOp) break;
          if (/[\s,()]/.test(expr[i])) break;
          if (expr.slice(i, i + 3) === "...") {
            break;
          }
          path += expr[i];
          i++;
        }
        if (expr.slice(i, i + 3) === "...") {
          tokens.push({ type: TokenType.PATH, value: path });
          tokens.push({ type: TokenType.EXPLOSION, value: "..." });
          i += 3;
        } else {
          tokens.push({ type: TokenType.PATH, value: path });
        }
        continue;
      }
      if (/[a-zA-Z]/.test(expr[i])) {
        let ident = "";
        while (i < len2 && /[a-zA-Z0-9_]/.test(expr[i])) {
          ident += expr[i];
          i++;
        }
        if (ident === "true") tokens.push({ type: TokenType.LITERAL, value: true });
        else if (ident === "false") tokens.push({ type: TokenType.LITERAL, value: false });
        else if (ident === "null") tokens.push({ type: TokenType.LITERAL, value: null });
        else tokens.push({ type: TokenType.PATH, value: ident });
        continue;
      }
      i++;
    }
    tokens.push({ type: TokenType.EOF, value: null });
    return tokens;
  };
  const hasOperatorSyntax = (expr) => {
    if (!expr || typeof expr !== "string") return false;
    if (/^=?(\+\+|--|!!)\/?/.test(expr)) {
      return true;
    }
    if (/(\+\+|--)$/.test(expr)) {
      return true;
    }
    if (/\s+([+\-*/%]|>|<|>=|<=|!=|===|==|=)\s+/.test(expr)) {
      return true;
    }
    if (/[^=\s]([+%=]|==|===|!=|!==|<=|>=|<|>)[^=\s]/.test(expr)) {
      return true;
    }
    return false;
  };
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
        if (operators.postfix.has(tok.value) && !operators.infix.has(tok.value)) {
          this.consume();
          left = { type: "Postfix", operator: tok.value, operand: left };
          tok = this.peek();
          continue;
        }
        if (operators.infix.has(tok.value)) {
          this.consume();
          const right = this.parseExpression(prec + 1);
          left = { type: "Infix", operator: tok.value, left, right };
          tok = this.peek();
          continue;
        }
        if (!operators.postfix.has(tok.value) && !operators.infix.has(tok.value)) {
          break;
        }
        this.consume();
        const nextTok = this.peek();
        if (nextTok.type === TokenType.PATH || nextTok.type === TokenType.LITERAL || nextTok.type === TokenType.LPAREN || nextTok.type === TokenType.PLACEHOLDER || nextTok.type === TokenType.EVENT || nextTok.type === TokenType.OPERATOR && operators.prefix.has(nextTok.value)) {
          const right = this.parseExpression(prec + 1);
          left = { type: "Infix", operator: tok.value, left, right };
        } else {
          left = { type: "Postfix", operator: tok.value, operand: left };
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
      if (tok.type === TokenType.OPERATOR && operators.prefix.has(tok.value)) {
        this.consume();
        const prefixInfo = operators.prefix.get(tok.value);
        const operand = this.parseExpression(prefixInfo.precedence);
        return { type: "Prefix", operator: tok.value, operand };
      }
      if (tok.type === TokenType.LPAREN) {
        this.consume();
        const inner = this.parseExpression(0);
        this.expect(TokenType.RPAREN);
        return inner;
      }
      if (tok.type === TokenType.LITERAL) {
        this.consume();
        return { type: "Literal", value: tok.value };
      }
      if (tok.type === TokenType.PLACEHOLDER) {
        this.consume();
        return { type: "Placeholder", value: tok.value };
      }
      if (tok.type === TokenType.THIS) {
        this.consume();
        return { type: "This", value: tok.value };
      }
      if (tok.type === TokenType.EVENT) {
        this.consume();
        return { type: "Event", value: tok.value };
      }
      if (tok.type === TokenType.PATH) {
        this.consume();
        const nextTok = this.peek();
        if (nextTok.type === TokenType.EXPLOSION) {
          this.consume();
          return { type: "Explosion", path: tok.value };
        }
        if (nextTok.type === TokenType.LPAREN) {
          this.consume();
          const args = [];
          while (this.peek().type !== TokenType.RPAREN && this.peek().type !== TokenType.EOF) {
            args.push(this.parseExpression(0));
            if (this.peek().type === TokenType.COMMA) {
              this.consume();
            }
          }
          this.expect(TokenType.RPAREN);
          return { type: "Call", helper: tok.value, args };
        }
        return { type: "Path", value: tok.value };
      }
      if (tok.type === TokenType.LBRACE) {
        return this.parseObjectLiteral();
      }
      if (tok.type === TokenType.LBRACKET) {
        return this.parseArrayLiteral();
      }
      if (tok.type === TokenType.EOF) {
        return { type: "Literal", value: void 0 };
      }
      throw new Error(`JPRX: Unexpected token ${tok.type}: ${tok.value}`);
    }
    parseObjectLiteral() {
      this.consume();
      const properties = {};
      while (this.peek().type !== TokenType.RBRACE && this.peek().type !== TokenType.EOF) {
        const keyTok = this.consume();
        let key;
        if (keyTok.type === TokenType.LITERAL) key = String(keyTok.value);
        else if (keyTok.type === TokenType.PATH) key = keyTok.value;
        else if (keyTok.type === TokenType.PATH) key = keyTok.value;
        else throw new Error(`JPRX: Expected property name but got ${keyTok.type}`);
        this.expect(TokenType.COLON);
        const value = this.parseExpression(0);
        properties[key] = value;
        if (this.peek().type === TokenType.COMMA) {
          this.consume();
        } else if (this.peek().type !== TokenType.RBRACE) {
          break;
        }
      }
      this.expect(TokenType.RBRACE);
      return { type: "ObjectLiteral", properties };
    }
    parseArrayLiteral() {
      this.consume();
      const elements = [];
      while (this.peek().type !== TokenType.RBRACKET && this.peek().type !== TokenType.EOF) {
        const value = this.parseExpression(0);
        elements.push(value);
        if (this.peek().type === TokenType.COMMA) {
          this.consume();
        } else if (this.peek().type !== TokenType.RBRACKET) {
          break;
        }
      }
      this.expect(TokenType.RBRACKET);
      return { type: "ArrayLiteral", elements };
    }
  }
  const evaluateAST = (ast, context, forMutation = false) => {
    var _a;
    if (!ast) return void 0;
    switch (ast.type) {
      case "Literal":
        return ast.value;
      case "Path": {
        const resolved = forMutation ? resolvePathAsContext(ast.value, context) : resolvePath(ast.value, context);
        return forMutation ? resolved : unwrapSignal(resolved);
      }
      case "Placeholder": {
        return new LazyValue((item) => {
          if (ast.value === "_") return item;
          const path = ast.value.startsWith("_.") ? ast.value.slice(2) : ast.value.slice(2);
          return resolvePath(path, item);
        });
      }
      case "This": {
        return new LazyValue((context2) => {
          const node = (context2 == null ? void 0 : context2.__node__) || context2;
          if (ast.value === "$this") return node;
          const path = ast.value.startsWith("$this.") ? ast.value.slice(6) : ast.value.slice(6);
          return resolvePath(path, node);
        });
      }
      case "Event": {
        return new LazyValue((context2) => {
          const event = (context2 == null ? void 0 : context2.$event) || (context2 == null ? void 0 : context2.event) || context2;
          if (ast.value === "$event") return event;
          const path = ast.value.startsWith("$event.") ? ast.value.slice(7) : ast.value.slice(7);
          return resolvePath(path, event);
        });
      }
      case "ObjectLiteral": {
        const res = {};
        let hasLazy = false;
        for (const key in ast.properties) {
          const val = evaluateAST(ast.properties[key], context, forMutation);
          if (val && val.isLazy) hasLazy = true;
          res[key] = val;
        }
        if (hasLazy) {
          return new LazyValue((ctx) => {
            const resolved = {};
            for (const key in res) {
              resolved[key] = res[key] && res[key].isLazy ? res[key].resolve(ctx) : unwrapSignal(res[key]);
            }
            return resolved;
          });
        }
        return res;
      }
      case "ArrayLiteral": {
        const elements = ast.elements.map((el) => evaluateAST(el, context, forMutation));
        const hasLazy = elements.some((el) => el && el.isLazy);
        if (hasLazy) {
          return new LazyValue((ctx) => {
            return elements.map((el) => el && el.isLazy ? el.resolve(ctx) : unwrapSignal(el));
          });
        }
        return elements.map((el) => unwrapSignal(el));
      }
      case "Prefix": {
        const opInfo = operators.prefix.get(ast.operator);
        if (!opInfo) throw new Error(`JPRX: Unknown prefix operator: ${ast.operator}`);
        const helper = helpers.get(opInfo.helper);
        if (!helper) throw new Error(`JPRX: Helper "${opInfo.helper}" for operator "${ast.operator}" not found.`);
        const opts = helperOptions.get(opInfo.helper) || {};
        const operand = evaluateAST(ast.operand, context, opts.pathAware);
        if (operand && operand.isLazy && !opts.lazyAware) {
          return new LazyValue((ctx) => {
            const resolved = operand.resolve(ctx);
            return helper(opts.pathAware ? resolved : unwrapSignal(resolved));
          });
        }
        return helper(opts.pathAware ? operand : unwrapSignal(operand));
      }
      case "Postfix": {
        const opInfo = operators.postfix.get(ast.operator);
        if (!opInfo) throw new Error(`JPRX: Unknown postfix operator: ${ast.operator}`);
        const helper = helpers.get(opInfo.helper);
        if (!helper) throw new Error(`JPRX: Helper "${opInfo.helper}" for operator "${ast.operator}" not found.`);
        const opts = helperOptions.get(opInfo.helper) || {};
        const operand = evaluateAST(ast.operand, context, opts.pathAware);
        if (operand && operand.isLazy && !opts.lazyAware) {
          return new LazyValue((ctx) => {
            const resolved = operand.resolve(ctx);
            return helper(opts.pathAware ? resolved : unwrapSignal(resolved));
          });
        }
        return helper(opts.pathAware ? operand : unwrapSignal(operand));
      }
      case "Infix": {
        const opInfo = operators.infix.get(ast.operator);
        if (!opInfo) throw new Error(`JPRX: Unknown infix operator: ${ast.operator}`);
        const helper = helpers.get(opInfo.helper);
        if (!helper) throw new Error(`JPRX: Helper "${opInfo.helper}" for operator "${ast.operator}" not found.`);
        const opts = helperOptions.get(opInfo.helper) || {};
        const left = evaluateAST(ast.left, context, opts.pathAware);
        const right = evaluateAST(ast.right, context, false);
        if ((left && left.isLazy || right && right.isLazy) && !opts.lazyAware) {
          return new LazyValue((ctx) => {
            const l = left && left.isLazy ? left.resolve(ctx) : left;
            const r = right && right.isLazy ? right.resolve(ctx) : right;
            return helper(opts.pathAware ? l : unwrapSignal(l), unwrapSignal(r));
          });
        }
        return helper(opts.pathAware ? left : unwrapSignal(left), unwrapSignal(right));
      }
      case "Call": {
        const helperName = ast.helper.replace(/^=/, "");
        const helper = helpers.get(helperName);
        if (!helper) {
          (_a = globalThis.console) == null ? void 0 : _a.warn(`JPRX: Helper "${helperName}" not found.`);
          return void 0;
        }
        const opts = helperOptions.get(helperName) || {};
        const args = ast.args.map((arg, i) => evaluateAST(arg, context, opts.pathAware && i === 0));
        const hasLazy = args.some((arg) => arg && arg.isLazy);
        if (hasLazy && !opts.lazyAware) {
          return new LazyValue((ctx) => {
            const finalArgs2 = args.map((arg, i) => {
              const val = arg && arg.isLazy ? arg.resolve(ctx) : arg;
              if (ast.args[i].type === "Explosion" && Array.isArray(val)) {
                return val.map((v) => unwrapSignal(v));
              }
              return opts.pathAware && i === 0 ? val : unwrapSignal(val);
            });
            const flatArgs = [];
            for (let i = 0; i < finalArgs2.length; i++) {
              if (ast.args[i].type === "Explosion" && Array.isArray(finalArgs2[i])) {
                flatArgs.push(...finalArgs2[i]);
              } else {
                flatArgs.push(finalArgs2[i]);
              }
            }
            return helper.apply((context == null ? void 0 : context.__node__) || null, flatArgs);
          });
        }
        const finalArgs = [];
        for (let i = 0; i < args.length; i++) {
          const arg = args[i];
          if (ast.args[i].type === "Explosion" && Array.isArray(arg)) {
            finalArgs.push(...arg.map((v) => unwrapSignal(v)));
          } else {
            finalArgs.push(opts.pathAware && i === 0 ? arg : unwrapSignal(arg));
          }
        }
        return helper.apply((context == null ? void 0 : context.__node__) || null, finalArgs);
      }
      case "Explosion": {
        const result = resolveArgument(ast.path + "...", context, false);
        return result.value;
      }
      default:
        throw new Error(`JPRX: Unknown AST node type: ${ast.type}`);
    }
  };
  const parseWithPratt = (expr, context) => {
    const tokens = tokenize(expr);
    const parser = new PrattParser(tokens, context);
    const ast = parser.parseExpression(0);
    return evaluateAST(ast, context);
  };
  const resolveExpression$1 = (expr, context) => {
    var _a, _b;
    if (typeof expr !== "string") return expr;
    if (hasOperatorSyntax(expr)) {
      try {
        return parseWithPratt(expr, context);
      } catch (e) {
        (_a = globalThis.console) == null ? void 0 : _a.warn("JPRX: Pratt parser failed, falling back to legacy:", e.message);
      }
    }
    const funcStart = expr.indexOf("(");
    if (funcStart !== -1 && expr.endsWith(")")) {
      const fullPath = expr.slice(0, funcStart).trim();
      const argsStr = expr.slice(funcStart + 1, -1);
      const segments = fullPath.split("/");
      let funcName = segments.pop().replace(/^=/, "");
      if (funcName === "" && (segments.length > 0 || fullPath === "/")) {
        funcName = "/";
      }
      const navPath = segments.join("/");
      const isGlobalExpr = expr.startsWith("=/") || expr.startsWith("=");
      let baseContext = context;
      if (navPath && navPath !== "=") {
        baseContext = resolvePathAsContext(navPath, context);
      }
      const helper = helpers.get(funcName);
      if (!helper) {
        (_b = globalThis.console) == null ? void 0 : _b.warn(`LightviewCDOM: Helper "${funcName}" not found.`);
        return expr;
      }
      const options = helperOptions.get(funcName) || {};
      const argsList = [];
      let current = "", parenDepth = 0, braceDepth = 0, bracketDepth = 0, quote = null;
      for (let i = 0; i < argsStr.length; i++) {
        const char = argsStr[i];
        if (char === quote) quote = null;
        else if (!quote && (char === "'" || char === '"')) quote = char;
        else if (!quote && char === "(") parenDepth++;
        else if (!quote && char === ")") parenDepth--;
        else if (!quote && char === "{") braceDepth++;
        else if (!quote && char === "}") braceDepth--;
        else if (!quote && char === "[") bracketDepth++;
        else if (!quote && char === "]") bracketDepth--;
        else if (!quote && char === "," && parenDepth === 0 && braceDepth === 0 && bracketDepth === 0) {
          argsList.push(current.trim());
          current = "";
          continue;
        }
        current += char;
      }
      if (current) argsList.push(current.trim());
      const resolvedArgs = [];
      let hasLazy = false;
      for (let i = 0; i < argsList.length; i++) {
        const arg = argsList[i];
        const useGlobalMode = isGlobalExpr && (navPath === "=" || !navPath);
        const res = resolveArgument(arg, baseContext, useGlobalMode);
        if (res.isLazy) hasLazy = true;
        const shouldUnwrap = !(options.pathAware && i === 0);
        let val = res.value;
        if (shouldUnwrap && !(val && val.isLazy)) {
          val = unwrapSignal(val);
        }
        if (res.isExplosion && Array.isArray(val)) {
          resolvedArgs.push(...val.map((v) => shouldUnwrap && !(v && v.isLazy) ? unwrapSignal(v) : v));
        } else {
          resolvedArgs.push(val);
        }
      }
      if (hasLazy && !options.lazyAware) {
        return new LazyValue((contextOverride) => {
          const finalArgs = resolvedArgs.map((arg, i) => {
            const shouldUnwrap = !(options.pathAware && i === 0);
            const resolved = arg instanceof LazyValue ? arg.resolve(contextOverride) : arg;
            return shouldUnwrap ? unwrapSignal(resolved) : resolved;
          });
          return helper(...finalArgs);
        });
      }
      const result = helper.apply((context == null ? void 0 : context.__node__) || null, resolvedArgs);
      return unwrapSignal(result);
    }
    return unwrapSignal(resolvePath(expr, context));
  };
  const parseExpression = (expr, context) => {
    const LV = getLV();
    if (!LV || typeof expr !== "string") return expr;
    return LV.computed(() => resolveExpression$1(expr, context));
  };
  const parseCDOMC = (input) => {
    if (typeof input !== "string") return input;
    let i = 0;
    const len2 = input.length;
    const skipWhitespace = () => {
      while (i < len2) {
        const char = input[i];
        if (/\s/.test(char)) {
          i++;
          continue;
        }
        if (char === "/") {
          const next = input[i + 1];
          if (next === "/") {
            i += 2;
            while (i < len2 && input[i] !== "\n" && input[i] !== "\r") i++;
            continue;
          } else if (next === "*") {
            i += 2;
            while (i < len2) {
              if (input[i] === "*" && input[i + 1] === "/") {
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
      let res2 = "";
      while (i < len2) {
        const char = input[i++];
        if (char === quote) return res2;
        if (char === "\\") {
          const next = input[i++];
          if (next === "n") res2 += "\n";
          else if (next === "t") res2 += "	";
          else if (next === '"') res2 += '"';
          else if (next === "'") res2 += "'";
          else if (next === "\\") res2 += "\\";
          else res2 += next;
        } else {
          res2 += char;
        }
      }
      throw new Error("Unterminated string");
    };
    const parseWord = () => {
      const start = i;
      let pDepth = 0;
      let bDepth = 0;
      let brDepth = 0;
      let quote = null;
      const startChar = input[start];
      const isExpression = startChar === "=" || startChar === "#";
      while (i < len2) {
        const char = input[i];
        if (quote) {
          if (char === quote && input[i - 1] !== "\\") quote = null;
          i++;
          continue;
        } else if (char === '"' || char === "'" || char === "`") {
          quote = char;
          i++;
          continue;
        }
        if (char === "(") {
          pDepth++;
          i++;
          continue;
        }
        if (char === "{") {
          bDepth++;
          i++;
          continue;
        }
        if (char === "[") {
          brDepth++;
          i++;
          continue;
        }
        if (char === ")") {
          if (pDepth > 0) {
            pDepth--;
            i++;
            continue;
          }
        }
        if (char === "}") {
          if (bDepth > 0) {
            bDepth--;
            i++;
            continue;
          }
        }
        if (char === "]") {
          if (brDepth > 0) {
            brDepth--;
            i++;
            continue;
          }
        }
        if (pDepth === 0 && bDepth === 0 && brDepth === 0) {
          if (isExpression) {
            if (/[{}[\]"'`()]/.test(char)) {
              break;
            }
            if (char === ",") {
              break;
            }
            if (/[\s:]/.test(char)) {
              let j = i + 1;
              while (j < len2 && /\s/.test(input[j])) j++;
              if (j < len2) {
                const nextChar = input[j];
                if (nextChar === "}" || nextChar === ",") {
                  break;
                }
                let wordStart = j;
                while (j < len2 && /[a-zA-Z0-9_$-]/.test(input[j])) j++;
                if (j > wordStart) {
                  while (j < len2 && /\s/.test(input[j])) j++;
                  if (j < len2 && input[j] === ":") {
                    break;
                  }
                }
              }
            }
          } else {
            if (/[:,{}[\]"'`()\s]/.test(char)) {
              break;
            }
          }
        }
        i++;
      }
      const word = input.slice(start, i);
      if (word.startsWith("=") || word.startsWith("#")) {
        return word;
      }
      if (word === "true") return true;
      if (word === "false") return false;
      if (word === "null") return null;
      if (word.trim() !== "" && !isNaN(Number(word))) return Number(word);
      return word;
    };
    const parseValue = () => {
      skipWhitespace();
      if (i >= len2) return void 0;
      const char = input[i];
      if (char === "{") return parseObject();
      if (char === "[") return parseArray();
      if (char === '"' || char === "'") return parseString();
      return parseWord();
    };
    const parseObject = () => {
      i++;
      const obj = {};
      skipWhitespace();
      if (i < len2 && input[i] === "}") {
        i++;
        return obj;
      }
      while (i < len2) {
        skipWhitespace();
        let key;
        if (input[i] === '"' || input[i] === "'") key = parseString();
        else key = parseWord();
        skipWhitespace();
        if (input[i] !== ":") throw new Error(`Expected ':' at position ${i}, found '${input[i]}'`);
        i++;
        const value = parseValue();
        obj[String(key)] = value;
        skipWhitespace();
        if (input[i] === "}") {
          i++;
          return obj;
        }
        if (input[i] === ",") {
          i++;
          skipWhitespace();
          if (input[i] === "}") {
            i++;
            return obj;
          }
          continue;
        }
        throw new Error(`Expected '}' or ',' at position ${i}, found '${input[i]}'`);
      }
    };
    const parseArray = () => {
      i++;
      const arr = [];
      skipWhitespace();
      if (i < len2 && input[i] === "]") {
        i++;
        return arr;
      }
      while (i < len2) {
        const val = parseValue();
        arr.push(val);
        skipWhitespace();
        if (input[i] === "]") {
          i++;
          return arr;
        }
        if (input[i] === ",") {
          i++;
          skipWhitespace();
          if (input[i] === "]") {
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
  const parseJPRX = (input) => {
    var _a, _b;
    if (typeof input !== "string") return input;
    let result = "";
    let i = 0;
    const len2 = input.length;
    while (i < len2) {
      const char = input[i];
      if (char === "/" && input[i + 1] === "/") {
        while (i < len2 && input[i] !== "\n") i++;
        continue;
      }
      if (char === "/" && input[i + 1] === "*") {
        i += 2;
        while (i < len2 && !(input[i] === "*" && input[i + 1] === "/")) i++;
        i += 2;
        continue;
      }
      if (char === '"' || char === "'") {
        const quote = char;
        result += '"';
        i++;
        while (i < len2 && input[i] !== quote) {
          const c = input[i];
          if (c === "\\") {
            result += "\\";
            i++;
            if (i < len2) {
              const next = input[i];
              if (next === '"') result += '\\"';
              else result += next;
              i++;
            }
          } else if (c === '"') {
            result += '\\"';
            i++;
          } else if (c === "\n") {
            result += "\\n";
            i++;
          } else if (c === "\r") {
            result += "\\r";
            i++;
          } else if (c === "	") {
            result += "\\t";
            i++;
          } else {
            result += c;
            i++;
          }
        }
        result += '"';
        i++;
        continue;
      }
      if (char === "=") {
        let expr = "";
        let parenDepth = 0;
        let braceDepth = 0;
        let bracketDepth = 0;
        let inExprQuote = null;
        while (i < len2) {
          const c = input[i];
          if (inExprQuote) {
            if (c === inExprQuote && input[i - 1] !== "\\") inExprQuote = null;
          } else if (c === '"' || c === "'") {
            inExprQuote = c;
          } else {
            if (parenDepth === 0 && braceDepth === 0 && bracketDepth === 0) {
              if (/[}[\]:]/.test(c) && expr.length > 1) break;
              if (c === ",") break;
              if (/\s/.test(c)) {
                let j = i + 1;
                while (j < len2 && /\s/.test(input[j])) j++;
                if (j < len2) {
                  const nextChar = input[j];
                  if (nextChar === "}" || nextChar === "," || nextChar === "]") {
                    break;
                  }
                  let wordStart = j;
                  while (j < len2 && /[a-zA-Z0-9_$-]/.test(input[j])) j++;
                  if (j > wordStart) {
                    while (j < len2 && /\s/.test(input[j])) j++;
                    if (j < len2 && input[j] === ":") {
                      break;
                    }
                  }
                }
              }
            }
            if (c === "(") parenDepth++;
            else if (c === ")") parenDepth--;
            else if (c === "{") braceDepth++;
            else if (c === "}") braceDepth--;
            else if (c === "[") bracketDepth++;
            else if (c === "]") bracketDepth--;
          }
          expr += c;
          i++;
        }
        result += JSON.stringify(expr);
        continue;
      }
      if (/[a-zA-Z_$\/.\/]/.test(char)) {
        let word = "";
        while (i < len2 && /[a-zA-Z0-9_$\/.-]/.test(input[i])) {
          word += input[i];
          i++;
        }
        let j = i;
        while (j < len2 && /\s/.test(input[j])) j++;
        if (input[j] === ":") {
          result += `"${word}"`;
        } else if (input[j] === "(") {
          let expr = word;
          i = j;
          let parenDepth = 0;
          let inQuote = null;
          while (i < len2) {
            const c = input[i];
            if (inQuote) {
              if (c === inQuote && input[i - 1] !== "\\") inQuote = null;
            } else if (c === '"' || c === "'") {
              inQuote = c;
            } else {
              if (c === "(") parenDepth++;
              else if (c === ")") {
                parenDepth--;
                if (parenDepth === 0) {
                  expr += c;
                  i++;
                  break;
                }
              }
            }
            expr += c;
            i++;
          }
          result += JSON.stringify("=" + expr);
        } else {
          if (word === "true" || word === "false" || word === "null") {
            result += word;
          } else if (!isNaN(Number(word))) {
            result += word;
          } else {
            result += `"${word}"`;
          }
        }
        continue;
      }
      if (/[\d]/.test(char) || char === "-" && /\d/.test(input[i + 1])) {
        let num = "";
        while (i < len2 && /[\d.\-eE]/.test(input[i])) {
          num += input[i];
          i++;
        }
        result += num;
        continue;
      }
      result += char;
      i++;
    }
    try {
      return JSON.parse(result);
    } catch (e) {
      (_a = globalThis.console) == null ? void 0 : _a.error("parseJPRX: JSON parse failed", e);
      (_b = globalThis.console) == null ? void 0 : _b.error("Transformed input:", result);
      throw e;
    }
  };
  const add$1 = (...args) => args.reduce((a, b) => Number(a) + Number(b), 0);
  const subtract = (a, b) => Number(a) - Number(b);
  const multiply = (...args) => args.reduce((a, b) => Number(a) * Number(b), 1);
  const divide = (a, b) => Number(a) / Number(b);
  const round = (val, decimals = 0) => Number(Math.round(val + "e" + decimals) + "e-" + decimals);
  const ceil = (val) => Math.ceil(val);
  const floor = (val) => Math.floor(val);
  const abs = (val) => Math.abs(val);
  const mod$1 = (a, b) => a % b;
  const pow = (a, b) => Math.pow(a, b);
  const sqrt = (val) => Math.sqrt(val);
  const negate = (val) => -Number(val);
  const toPercent = (val) => Number(val) / 100;
  const registerMathHelpers = (register) => {
    register("+", add$1);
    register("add", add$1);
    register("-", subtract);
    register("sub", subtract);
    register("*", multiply);
    register("mul", multiply);
    register("/", divide);
    register("div", divide);
    register("round", round);
    register("ceil", ceil);
    register("floor", floor);
    register("abs", abs);
    register("mod", mod$1);
    register("pow", pow);
    register("sqrt", sqrt);
    register("negate", negate);
    register("toPercent", toPercent);
  };
  const ifHelper = (condition2, thenVal, elseVal) => condition2 ? thenVal : elseVal;
  const andHelper = (...args) => args.every(Boolean);
  const orHelper = (...args) => args.some(Boolean);
  const notHelper = (val) => !val;
  const eqHelper = (a, b) => a == b;
  const strictEqHelper = (a, b) => a === b;
  const neqHelper = (a, b) => a != b;
  const strictNeqHelper = (a, b) => a !== b;
  const registerLogicHelpers = (register) => {
    register("if", ifHelper);
    register("and", andHelper);
    register("&&", andHelper);
    register("or", orHelper);
    register("||", orHelper);
    register("not", notHelper);
    register("!", notHelper);
    register("eq", eqHelper);
    register("strictEq", strictEqHelper);
    register("==", eqHelper);
    register("===", strictEqHelper);
    register("neq", neqHelper);
    register("strictNeq", strictNeqHelper);
    register("!=", neqHelper);
    register("!==", strictNeqHelper);
  };
  const join$1 = (...args) => {
    const separator = args[args.length - 1];
    const items = args.slice(0, -1);
    return items.join(separator);
  };
  const concat$1 = (...args) => args.join("");
  const upper = (s) => String(s).toUpperCase();
  const lower = (s) => String(s).toLowerCase();
  const trim = (s) => String(s).trim();
  const len = (s) => String(s).length;
  const replace = (s, search, replacement) => String(s).replace(search, replacement);
  const split = (s, separator) => String(s).split(separator);
  const capitalize = (s) => {
    const str = String(s);
    return str.charAt(0).toUpperCase() + str.slice(1);
  };
  const titleCase = (s) => {
    return String(s).toLowerCase().split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  };
  const contains$2 = (s, search) => String(s).includes(search);
  const startsWith = (s, prefix) => String(s).startsWith(prefix);
  const endsWith = (s, suffix) => String(s).endsWith(suffix);
  const defaultHelper = (val, fallback) => val !== void 0 && val !== null ? val : fallback;
  const registerStringHelpers = (register) => {
    register("join", join$1);
    register("concat", concat$1);
    register("upper", upper);
    register("lower", lower);
    register("trim", trim);
    register("len", len);
    register("replace", replace);
    register("split", split);
    register("capitalize", capitalize);
    register("titleCase", titleCase);
    register("contains", contains$2);
    register("startsWith", startsWith);
    register("endsWith", endsWith);
    register("default", defaultHelper);
  };
  const count = (...args) => args.length;
  const filter = (arr, predicate) => {
    if (!Array.isArray(arr)) return [];
    if (typeof predicate === "function" && predicate.isLazy) {
      return arr.filter((item) => predicate.resolve(item));
    }
    return arr.filter((item) => !!item);
  };
  const map = (arr, transform) => {
    if (!Array.isArray(arr)) return [];
    if (typeof transform === "string") {
      return arr.map((item) => item && typeof item === "object" ? item[transform] : item);
    }
    if (transform && transform.isLazy && typeof transform.resolve === "function") {
      return arr.map((item) => transform.resolve(item));
    }
    if (typeof transform === "function") {
      return arr.map(transform);
    }
    return arr;
  };
  const find = (arr, predicate) => {
    if (!Array.isArray(arr)) return void 0;
    if (predicate && predicate.isLazy) {
      return arr.find((item) => predicate.resolve(item));
    }
    return arr.find((item) => !!item);
  };
  const unique = (arr) => Array.isArray(arr) ? [...new Set(arr)] : [];
  const sort = (arr, order = "asc") => {
    if (!Array.isArray(arr)) return [];
    const sorted = [...arr];
    sorted.sort((a, b) => {
      if (a < b) return order === "asc" ? -1 : 1;
      if (a > b) return order === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  };
  const reverse = (arr) => Array.isArray(arr) ? [...arr].reverse() : [];
  const first = (arr) => Array.isArray(arr) ? arr[0] : void 0;
  const last = (arr) => Array.isArray(arr) ? arr[arr.length - 1] : void 0;
  const slice = (arr, start, end) => Array.isArray(arr) ? arr.slice(start, end) : [];
  const flatten = (arr) => Array.isArray(arr) ? arr.flat(Infinity) : [];
  const join = (arr, sep = ",") => Array.isArray(arr) ? arr.join(String(sep)) : "";
  const length = (arg) => Array.isArray(arg) ? arg.length : arg ? String(arg).length : 0;
  const registerArrayHelpers = (register) => {
    register("count", count);
    register("filter", filter, { lazyAware: true });
    register("map", map, { lazyAware: true });
    register("find", find, { lazyAware: true });
    register("unique", unique);
    register("sort", sort);
    register("reverse", reverse);
    register("first", first);
    register("last", last);
    register("slice", slice);
    register("flatten", flatten);
    register("join", join);
    register("len", length);
    register("length", length);
  };
  const gt = (a, b) => a > b;
  const lt = (a, b) => a < b;
  const gte = (a, b) => a >= b;
  const lte = (a, b) => a <= b;
  const neq = (a, b) => a !== b;
  const between = (val, min2, max2) => val >= min2 && val <= max2;
  const contains$1 = (arr, val) => Array.isArray(arr) && arr.includes(val);
  const registerCompareHelpers = (register) => {
    register("gt", gt);
    register(">", gt);
    register("lt", lt);
    register("<", lt);
    register("gte", gte);
    register(">=", gte);
    register("lte", lte);
    register("<=", lte);
    register("neq", neq);
    register("!=", neq);
    register("between", between);
    register("in", contains$1);
  };
  const sumIf = (arr, predicate) => {
    if (!Array.isArray(arr)) return 0;
    const filtered = predicate && predicate.isLazy ? arr.filter((item) => predicate.resolve(item)) : arr;
    return filtered.reduce((a, b) => a + (Number(b) || 0), 0);
  };
  const countIf = (arr, predicate) => {
    if (!Array.isArray(arr)) return 0;
    if (predicate && predicate.isLazy) {
      return arr.filter((item) => predicate.resolve(item)).length;
    }
    return arr.filter((item) => !!item).length;
  };
  const avgIf = (arr, predicate) => {
    if (!Array.isArray(arr)) return 0;
    const filtered = predicate && predicate.isLazy ? arr.filter((item) => predicate.resolve(item)) : arr;
    if (filtered.length === 0) return 0;
    return filtered.reduce((a, b) => a + (Number(b) || 0), 0) / filtered.length;
  };
  const registerConditionalHelpers = (register) => {
    register("sumIf", sumIf);
    register("countIf", countIf);
    register("avgIf", avgIf);
  };
  const now = () => (/* @__PURE__ */ new Date()).getTime();
  const today = () => {
    const d = /* @__PURE__ */ new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const date = (val) => new Date(val).getTime();
  const formatDate = (val, format) => {
    const d = new Date(val);
    if (isNaN(d.getTime())) return "";
    const options = { year: "numeric", month: "2-digit", day: "2-digit" };
    if (format === "long") options.month = "long";
    return d.toLocaleDateString(void 0, options);
  };
  const year = (val) => new Date(val).getFullYear();
  const month = (val) => new Date(val).getMonth() + 1;
  const day = (val) => new Date(val).getDate();
  const weekday = (val) => new Date(val).getDay();
  const addDays = (val, days) => {
    const d = new Date(val);
    d.setDate(d.getDate() + Number(days));
    return d.getTime();
  };
  const dateDiff = (d1, d2, unit = "days") => {
    const diff = Math.abs(new Date(d1) - new Date(d2));
    if (unit === "seconds") return diff / 1e3;
    if (unit === "minutes") return diff / (1e3 * 60);
    if (unit === "hours") return diff / (1e3 * 60 * 60);
    return diff / (1e3 * 60 * 60 * 24);
  };
  const registerDateTimeHelpers = (register) => {
    register("now", now);
    register("today", today);
    register("date", date);
    register("formatDate", formatDate);
    register("year", year);
    register("month", month);
    register("day", day);
    register("weekday", weekday);
    register("addDays", addDays);
    register("dateDiff", dateDiff);
  };
  const number = (val, decimals = 2) => Number(val).toFixed(decimals);
  const currency = (val, symbol = "$", decimals = 2) => {
    return symbol + Number(val).toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  const percent = (val, decimals = 0) => (Number(val) * 100).toFixed(decimals) + "%";
  const thousands = (val) => String(val).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const registerFormatHelpers = (register) => {
    register("number", number);
    register("currency", currency);
    register("percent", percent);
    register("thousands", thousands);
  };
  const lookup = (val, searchArr, resultArr) => {
    if (!Array.isArray(searchArr)) return void 0;
    const idx = searchArr.indexOf(val);
    return idx !== -1 && Array.isArray(resultArr) ? resultArr[idx] : void 0;
  };
  const vlookup = (val, table, colIdx) => {
    if (!Array.isArray(table)) return void 0;
    const row = table.find((r) => Array.isArray(r) && r[0] === val);
    return row ? row[colIdx - 1] : void 0;
  };
  const index = (arr, idx) => Array.isArray(arr) ? arr[idx] : void 0;
  const match = (val, arr) => Array.isArray(arr) ? arr.indexOf(val) : -1;
  const pathRef = (path, context) => {
    if (path && typeof path === "object" && "value" in path) {
      return unwrapSignal(path.value);
    }
    if (typeof path === "string") {
      const normalized = path.startsWith("=") ? path : "=" + path;
      const resolved = resolvePath(normalized, context);
      const value = unwrapSignal(resolved);
      if (typeof value === "number") return value;
      if (typeof value === "string" && value !== "" && !isNaN(parseFloat(value)) && isFinite(Number(value))) {
        return parseFloat(value);
      }
      return value;
    }
    return unwrapSignal(path);
  };
  const registerLookupHelpers = (register) => {
    register("lookup", lookup);
    register("vlookup", vlookup);
    register("index", index);
    register("match", match);
    register("$", pathRef, { pathAware: true });
    register("val", pathRef, { pathAware: true });
    register("indirect", pathRef, { pathAware: true });
  };
  const sum = (...args) => args.reduce((a, b) => a + (Number(b) || 0), 0);
  const avg = (...args) => args.length === 0 ? 0 : sum(...args) / args.length;
  const min$1 = (...args) => Math.min(...args);
  const max$1 = (...args) => Math.max(...args);
  const median = (...args) => {
    if (args.length === 0) return 0;
    const sorted = [...args].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };
  const stdev = (...args) => {
    if (args.length === 0) return 0;
    const mean = avg(...args);
    const squareDiffs = args.map((value) => Math.pow(value - mean, 2));
    return Math.sqrt(avg(...squareDiffs));
  };
  const variance = (...args) => {
    if (args.length === 0) return 0;
    const mean = avg(...args);
    const squareDiffs = args.map((value) => Math.pow(value - mean, 2));
    return avg(...squareDiffs);
  };
  const registerStatsHelpers = (register) => {
    register("sum", sum);
    register("avg", avg);
    register("min", min$1);
    register("max", max$1);
    register("median", median);
    register("stdev", stdev);
    register("var", variance);
  };
  const set = (target, val) => {
    if (target && typeof target === "object" && "value" in target) {
      target.value = val;
    } else if (target && typeof target === "function" && "value" in target) {
      target.value = val;
    } else if (target && typeof target === "object" && val && typeof val === "object") {
      Object.assign(target, val);
    }
    return val;
  };
  const increment = (target, by = 1) => {
    const hasValue = target && (typeof target === "object" || typeof target === "function") && "value" in target;
    const current = hasValue ? target.value : 0;
    const next = Number(current) + Number(by);
    return set(target, next);
  };
  const decrement = (target, by = 1) => {
    const hasValue = target && (typeof target === "object" || typeof target === "function") && "value" in target;
    const current = hasValue ? target.value : 0;
    const next = Number(current) - Number(by);
    return set(target, next);
  };
  const toggle = (target) => {
    const hasValue = target && (typeof target === "object" || typeof target === "function") && "value" in target;
    const current = hasValue ? target.value : false;
    return set(target, !current);
  };
  const push = (target, item) => {
    const current = target && typeof target === "object" && "value" in target ? target.value : [];
    if (Array.isArray(current)) {
      const next = [...current, item];
      return set(target, next);
    }
    return current;
  };
  const pop = (target) => {
    const current = target && typeof target === "object" && "value" in target ? target.value : [];
    if (Array.isArray(current) && current.length > 0) {
      const next = current.slice(0, -1);
      set(target, next);
    }
    return current;
  };
  const assign = (target, obj) => {
    const current = target && typeof target === "object" && "value" in target ? target.value : {};
    const next = { ...current, ...obj };
    return set(target, next);
  };
  const clear = (target) => {
    const current = target && typeof target === "object" && "value" in target ? target.value : null;
    if (Array.isArray(current)) return set(target, []);
    if (typeof current === "object" && current !== null) return set(target, {});
    return set(target, null);
  };
  function state(val, options) {
    if (globalThis.Lightview) {
      const finalOptions = typeof options === "string" ? { name: options } : options;
      return globalThis.Lightview.state(val, finalOptions);
    }
    throw new Error("JPRX: $state requires a UI library implementation.");
  }
  function signal(val, options) {
    if (globalThis.Lightview) {
      const finalOptions = typeof options === "string" ? { name: options } : options;
      return globalThis.Lightview.signal(val, finalOptions);
    }
    throw new Error("JPRX: $signal requires a UI library implementation.");
  }
  const bind = (path, options) => ({ __JPRX_BIND__: true, path, options });
  const registerStateHelpers = (register) => {
    const opts = { pathAware: true };
    register("set", set, opts);
    register("increment", increment, opts);
    register("++", increment, opts);
    register("decrement", decrement, opts);
    register("--", decrement, opts);
    register("toggle", toggle, opts);
    register("!!", toggle, opts);
    register("push", push, opts);
    register("pop", pop, opts);
    register("assign", assign, opts);
    register("clear", clear, opts);
    register("state", state);
    register("signal", signal);
    register("bind", bind);
  };
  const fetchHelper = (url, options = {}) => {
    const fetchOptions = { ...options };
    const headers = { ...fetchOptions.headers };
    let body = fetchOptions.body;
    if (body !== void 0) {
      if (body !== null && typeof body === "object") {
        body = JSON.stringify(body);
        if (!headers["Content-Type"]) {
          headers["Content-Type"] = "application/json";
        }
      } else {
        body = String(body);
        if (!headers["Content-Type"]) {
          headers["Content-Type"] = "text/plain";
        }
      }
    }
    fetchOptions.body = body;
    fetchOptions.headers = headers;
    return globalThis.fetch(url, fetchOptions);
  };
  const registerNetworkHelpers = (register) => {
    register("fetch", fetchHelper);
  };
  var INUMBER = "INUMBER";
  var IOP1 = "IOP1";
  var IOP2 = "IOP2";
  var IOP3 = "IOP3";
  var IVAR = "IVAR";
  var IVARNAME = "IVARNAME";
  var IFUNCALL = "IFUNCALL";
  var IFUNDEF = "IFUNDEF";
  var IEXPR = "IEXPR";
  var IEXPREVAL = "IEXPREVAL";
  var IMEMBER = "IMEMBER";
  var IENDSTATEMENT = "IENDSTATEMENT";
  var IARRAY = "IARRAY";
  function Instruction(type, value) {
    this.type = type;
    this.value = value !== void 0 && value !== null ? value : 0;
  }
  Instruction.prototype.toString = function() {
    switch (this.type) {
      case INUMBER:
      case IOP1:
      case IOP2:
      case IOP3:
      case IVAR:
      case IVARNAME:
      case IENDSTATEMENT:
        return this.value;
      case IFUNCALL:
        return "CALL " + this.value;
      case IFUNDEF:
        return "DEF " + this.value;
      case IARRAY:
        return "ARRAY " + this.value;
      case IMEMBER:
        return "." + this.value;
      default:
        return "Invalid Instruction";
    }
  };
  function unaryInstruction(value) {
    return new Instruction(IOP1, value);
  }
  function binaryInstruction(value) {
    return new Instruction(IOP2, value);
  }
  function ternaryInstruction(value) {
    return new Instruction(IOP3, value);
  }
  function simplify(tokens, unaryOps, binaryOps, ternaryOps, values) {
    var nstack = [];
    var newexpression = [];
    var n1, n2, n3;
    var f;
    for (var i = 0; i < tokens.length; i++) {
      var item = tokens[i];
      var type = item.type;
      if (type === INUMBER || type === IVARNAME) {
        if (Array.isArray(item.value)) {
          nstack.push.apply(nstack, simplify(item.value.map(function(x) {
            return new Instruction(INUMBER, x);
          }).concat(new Instruction(IARRAY, item.value.length)), unaryOps, binaryOps, ternaryOps, values));
        } else {
          nstack.push(item);
        }
      } else if (type === IVAR && values.hasOwnProperty(item.value)) {
        item = new Instruction(INUMBER, values[item.value]);
        nstack.push(item);
      } else if (type === IOP2 && nstack.length > 1) {
        n2 = nstack.pop();
        n1 = nstack.pop();
        f = binaryOps[item.value];
        item = new Instruction(INUMBER, f(n1.value, n2.value));
        nstack.push(item);
      } else if (type === IOP3 && nstack.length > 2) {
        n3 = nstack.pop();
        n2 = nstack.pop();
        n1 = nstack.pop();
        if (item.value === "?") {
          nstack.push(n1.value ? n2.value : n3.value);
        } else {
          f = ternaryOps[item.value];
          item = new Instruction(INUMBER, f(n1.value, n2.value, n3.value));
          nstack.push(item);
        }
      } else if (type === IOP1 && nstack.length > 0) {
        n1 = nstack.pop();
        f = unaryOps[item.value];
        item = new Instruction(INUMBER, f(n1.value));
        nstack.push(item);
      } else if (type === IEXPR) {
        while (nstack.length > 0) {
          newexpression.push(nstack.shift());
        }
        newexpression.push(new Instruction(IEXPR, simplify(item.value, unaryOps, binaryOps, ternaryOps, values)));
      } else if (type === IMEMBER && nstack.length > 0) {
        n1 = nstack.pop();
        nstack.push(new Instruction(INUMBER, n1.value[item.value]));
      } else {
        while (nstack.length > 0) {
          newexpression.push(nstack.shift());
        }
        newexpression.push(item);
      }
    }
    while (nstack.length > 0) {
      newexpression.push(nstack.shift());
    }
    return newexpression;
  }
  function substitute(tokens, variable, expr) {
    var newexpression = [];
    for (var i = 0; i < tokens.length; i++) {
      var item = tokens[i];
      var type = item.type;
      if (type === IVAR && item.value === variable) {
        for (var j = 0; j < expr.tokens.length; j++) {
          var expritem = expr.tokens[j];
          var replitem;
          if (expritem.type === IOP1) {
            replitem = unaryInstruction(expritem.value);
          } else if (expritem.type === IOP2) {
            replitem = binaryInstruction(expritem.value);
          } else if (expritem.type === IOP3) {
            replitem = ternaryInstruction(expritem.value);
          } else {
            replitem = new Instruction(expritem.type, expritem.value);
          }
          newexpression.push(replitem);
        }
      } else if (type === IEXPR) {
        newexpression.push(new Instruction(IEXPR, substitute(item.value, variable, expr)));
      } else {
        newexpression.push(item);
      }
    }
    return newexpression;
  }
  function evaluate(tokens, expr, values) {
    var nstack = [];
    var n1, n2, n3;
    var f, args, argCount;
    if (isExpressionEvaluator(tokens)) {
      return resolveExpression(tokens, values);
    }
    var numTokens = tokens.length;
    for (var i = 0; i < numTokens; i++) {
      var item = tokens[i];
      var type = item.type;
      if (type === INUMBER || type === IVARNAME) {
        nstack.push(item.value);
      } else if (type === IOP2) {
        n2 = nstack.pop();
        n1 = nstack.pop();
        if (item.value === "and") {
          nstack.push(n1 ? !!evaluate(n2, expr, values) : false);
        } else if (item.value === "or") {
          nstack.push(n1 ? true : !!evaluate(n2, expr, values));
        } else if (item.value === "=") {
          f = expr.binaryOps[item.value];
          nstack.push(f(n1, evaluate(n2, expr, values), values));
        } else {
          f = expr.binaryOps[item.value];
          nstack.push(f(resolveExpression(n1, values), resolveExpression(n2, values)));
        }
      } else if (type === IOP3) {
        n3 = nstack.pop();
        n2 = nstack.pop();
        n1 = nstack.pop();
        if (item.value === "?") {
          nstack.push(evaluate(n1 ? n2 : n3, expr, values));
        } else {
          f = expr.ternaryOps[item.value];
          nstack.push(f(resolveExpression(n1, values), resolveExpression(n2, values), resolveExpression(n3, values)));
        }
      } else if (type === IVAR) {
        if (item.value in expr.functions) {
          nstack.push(expr.functions[item.value]);
        } else if (item.value in expr.unaryOps && expr.parser.isOperatorEnabled(item.value)) {
          nstack.push(expr.unaryOps[item.value]);
        } else {
          var v = values[item.value];
          if (v !== void 0) {
            nstack.push(v);
          } else {
            throw new Error("undefined variable: " + item.value);
          }
        }
      } else if (type === IOP1) {
        n1 = nstack.pop();
        f = expr.unaryOps[item.value];
        nstack.push(f(resolveExpression(n1, values)));
      } else if (type === IFUNCALL) {
        argCount = item.value;
        args = [];
        while (argCount-- > 0) {
          args.unshift(resolveExpression(nstack.pop(), values));
        }
        f = nstack.pop();
        if (f.apply && f.call) {
          nstack.push(f.apply(void 0, args));
        } else {
          throw new Error(f + " is not a function");
        }
      } else if (type === IFUNDEF) {
        nstack.push(function() {
          var n22 = nstack.pop();
          var args2 = [];
          var argCount2 = item.value;
          while (argCount2-- > 0) {
            args2.unshift(nstack.pop());
          }
          var n12 = nstack.pop();
          var f2 = function() {
            var scope = Object.assign({}, values);
            for (var i2 = 0, len2 = args2.length; i2 < len2; i2++) {
              scope[args2[i2]] = arguments[i2];
            }
            return evaluate(n22, expr, scope);
          };
          Object.defineProperty(f2, "name", {
            value: n12,
            writable: false
          });
          values[n12] = f2;
          return f2;
        }());
      } else if (type === IEXPR) {
        nstack.push(createExpressionEvaluator(item, expr));
      } else if (type === IEXPREVAL) {
        nstack.push(item);
      } else if (type === IMEMBER) {
        n1 = nstack.pop();
        nstack.push(n1[item.value]);
      } else if (type === IENDSTATEMENT) {
        nstack.pop();
      } else if (type === IARRAY) {
        argCount = item.value;
        args = [];
        while (argCount-- > 0) {
          args.unshift(nstack.pop());
        }
        nstack.push(args);
      } else {
        throw new Error("invalid Expression");
      }
    }
    if (nstack.length > 1) {
      throw new Error("invalid Expression (parity)");
    }
    return nstack[0] === 0 ? 0 : resolveExpression(nstack[0], values);
  }
  function createExpressionEvaluator(token, expr, values) {
    if (isExpressionEvaluator(token)) return token;
    return {
      type: IEXPREVAL,
      value: function(scope) {
        return evaluate(token.value, expr, scope);
      }
    };
  }
  function isExpressionEvaluator(n) {
    return n && n.type === IEXPREVAL;
  }
  function resolveExpression(n, values) {
    return isExpressionEvaluator(n) ? n.value(values) : n;
  }
  function expressionToString(tokens, toJS) {
    var nstack = [];
    var n1, n2, n3;
    var f, args, argCount;
    for (var i = 0; i < tokens.length; i++) {
      var item = tokens[i];
      var type = item.type;
      if (type === INUMBER) {
        if (typeof item.value === "number" && item.value < 0) {
          nstack.push("(" + item.value + ")");
        } else if (Array.isArray(item.value)) {
          nstack.push("[" + item.value.map(escapeValue).join(", ") + "]");
        } else {
          nstack.push(escapeValue(item.value));
        }
      } else if (type === IOP2) {
        n2 = nstack.pop();
        n1 = nstack.pop();
        f = item.value;
        if (toJS) {
          if (f === "^") {
            nstack.push("Math.pow(" + n1 + ", " + n2 + ")");
          } else if (f === "and") {
            nstack.push("(!!" + n1 + " && !!" + n2 + ")");
          } else if (f === "or") {
            nstack.push("(!!" + n1 + " || !!" + n2 + ")");
          } else if (f === "||") {
            nstack.push("(function(a,b){ return Array.isArray(a) && Array.isArray(b) ? a.concat(b) : String(a) + String(b); }((" + n1 + "),(" + n2 + ")))");
          } else if (f === "==") {
            nstack.push("(" + n1 + " === " + n2 + ")");
          } else if (f === "!=") {
            nstack.push("(" + n1 + " !== " + n2 + ")");
          } else if (f === "[") {
            nstack.push(n1 + "[(" + n2 + ") | 0]");
          } else {
            nstack.push("(" + n1 + " " + f + " " + n2 + ")");
          }
        } else {
          if (f === "[") {
            nstack.push(n1 + "[" + n2 + "]");
          } else {
            nstack.push("(" + n1 + " " + f + " " + n2 + ")");
          }
        }
      } else if (type === IOP3) {
        n3 = nstack.pop();
        n2 = nstack.pop();
        n1 = nstack.pop();
        f = item.value;
        if (f === "?") {
          nstack.push("(" + n1 + " ? " + n2 + " : " + n3 + ")");
        } else {
          throw new Error("invalid Expression");
        }
      } else if (type === IVAR || type === IVARNAME) {
        nstack.push(item.value);
      } else if (type === IOP1) {
        n1 = nstack.pop();
        f = item.value;
        if (f === "-" || f === "+") {
          nstack.push("(" + f + n1 + ")");
        } else if (toJS) {
          if (f === "not") {
            nstack.push("(!" + n1 + ")");
          } else if (f === "!") {
            nstack.push("fac(" + n1 + ")");
          } else {
            nstack.push(f + "(" + n1 + ")");
          }
        } else if (f === "!") {
          nstack.push("(" + n1 + "!)");
        } else {
          nstack.push("(" + f + " " + n1 + ")");
        }
      } else if (type === IFUNCALL) {
        argCount = item.value;
        args = [];
        while (argCount-- > 0) {
          args.unshift(nstack.pop());
        }
        f = nstack.pop();
        nstack.push(f + "(" + args.join(", ") + ")");
      } else if (type === IFUNDEF) {
        n2 = nstack.pop();
        argCount = item.value;
        args = [];
        while (argCount-- > 0) {
          args.unshift(nstack.pop());
        }
        n1 = nstack.pop();
        if (toJS) {
          nstack.push("(" + n1 + " = function(" + args.join(", ") + ") { return " + n2 + " })");
        } else {
          nstack.push("(" + n1 + "(" + args.join(", ") + ") = " + n2 + ")");
        }
      } else if (type === IMEMBER) {
        n1 = nstack.pop();
        nstack.push(n1 + "." + item.value);
      } else if (type === IARRAY) {
        argCount = item.value;
        args = [];
        while (argCount-- > 0) {
          args.unshift(nstack.pop());
        }
        nstack.push("[" + args.join(", ") + "]");
      } else if (type === IEXPR) {
        nstack.push("(" + expressionToString(item.value, toJS) + ")");
      } else if (type === IENDSTATEMENT) ;
      else {
        throw new Error("invalid Expression");
      }
    }
    if (nstack.length > 1) {
      if (toJS) {
        nstack = [nstack.join(",")];
      } else {
        nstack = [nstack.join(";")];
      }
    }
    return String(nstack[0]);
  }
  function escapeValue(v) {
    if (typeof v === "string") {
      return JSON.stringify(v).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
    }
    return v;
  }
  function contains(array, obj) {
    for (var i = 0; i < array.length; i++) {
      if (array[i] === obj) {
        return true;
      }
    }
    return false;
  }
  function getSymbols(tokens, symbols, options) {
    options = options || {};
    var withMembers = !!options.withMembers;
    var prevVar = null;
    for (var i = 0; i < tokens.length; i++) {
      var item = tokens[i];
      if (item.type === IVAR || item.type === IVARNAME) {
        if (!withMembers && !contains(symbols, item.value)) {
          symbols.push(item.value);
        } else if (prevVar !== null) {
          if (!contains(symbols, prevVar)) {
            symbols.push(prevVar);
          }
          prevVar = item.value;
        } else {
          prevVar = item.value;
        }
      } else if (item.type === IMEMBER && withMembers && prevVar !== null) {
        prevVar += "." + item.value;
      } else if (item.type === IEXPR) {
        getSymbols(item.value, symbols, options);
      } else if (prevVar !== null) {
        if (!contains(symbols, prevVar)) {
          symbols.push(prevVar);
        }
        prevVar = null;
      }
    }
    if (prevVar !== null && !contains(symbols, prevVar)) {
      symbols.push(prevVar);
    }
  }
  function Expression(tokens, parser) {
    this.tokens = tokens;
    this.parser = parser;
    this.unaryOps = parser.unaryOps;
    this.binaryOps = parser.binaryOps;
    this.ternaryOps = parser.ternaryOps;
    this.functions = parser.functions;
  }
  Expression.prototype.simplify = function(values) {
    values = values || {};
    return new Expression(simplify(this.tokens, this.unaryOps, this.binaryOps, this.ternaryOps, values), this.parser);
  };
  Expression.prototype.substitute = function(variable, expr) {
    if (!(expr instanceof Expression)) {
      expr = this.parser.parse(String(expr));
    }
    return new Expression(substitute(this.tokens, variable, expr), this.parser);
  };
  Expression.prototype.evaluate = function(values) {
    values = values || {};
    return evaluate(this.tokens, this, values);
  };
  Expression.prototype.toString = function() {
    return expressionToString(this.tokens, false);
  };
  Expression.prototype.symbols = function(options) {
    options = options || {};
    var vars = [];
    getSymbols(this.tokens, vars, options);
    return vars;
  };
  Expression.prototype.variables = function(options) {
    options = options || {};
    var vars = [];
    getSymbols(this.tokens, vars, options);
    var functions = this.functions;
    return vars.filter(function(name) {
      return !(name in functions);
    });
  };
  Expression.prototype.toJSFunction = function(param, variables) {
    var expr = this;
    var f = new Function(param, "with(this.functions) with (this.ternaryOps) with (this.binaryOps) with (this.unaryOps) { return " + expressionToString(this.simplify(variables).tokens, true) + "; }");
    return function() {
      return f.apply(expr, arguments);
    };
  };
  var TEOF = "TEOF";
  var TOP = "TOP";
  var TNUMBER = "TNUMBER";
  var TSTRING = "TSTRING";
  var TPAREN = "TPAREN";
  var TBRACKET = "TBRACKET";
  var TCOMMA = "TCOMMA";
  var TNAME = "TNAME";
  var TSEMICOLON = "TSEMICOLON";
  function Token(type, value, index2) {
    this.type = type;
    this.value = value;
    this.index = index2;
  }
  Token.prototype.toString = function() {
    return this.type + ": " + this.value;
  };
  function TokenStream(parser, expression) {
    this.pos = 0;
    this.current = null;
    this.unaryOps = parser.unaryOps;
    this.binaryOps = parser.binaryOps;
    this.ternaryOps = parser.ternaryOps;
    this.consts = parser.consts;
    this.expression = expression;
    this.savedPosition = 0;
    this.savedCurrent = null;
    this.options = parser.options;
    this.parser = parser;
  }
  TokenStream.prototype.newToken = function(type, value, pos) {
    return new Token(type, value, pos != null ? pos : this.pos);
  };
  TokenStream.prototype.save = function() {
    this.savedPosition = this.pos;
    this.savedCurrent = this.current;
  };
  TokenStream.prototype.restore = function() {
    this.pos = this.savedPosition;
    this.current = this.savedCurrent;
  };
  TokenStream.prototype.next = function() {
    if (this.pos >= this.expression.length) {
      return this.newToken(TEOF, "EOF");
    }
    if (this.isWhitespace() || this.isComment()) {
      return this.next();
    } else if (this.isRadixInteger() || this.isNumber() || this.isOperator() || this.isString() || this.isParen() || this.isBracket() || this.isComma() || this.isSemicolon() || this.isNamedOp() || this.isConst() || this.isName()) {
      return this.current;
    } else {
      this.parseError('Unknown character "' + this.expression.charAt(this.pos) + '"');
    }
  };
  TokenStream.prototype.isString = function() {
    var r = false;
    var startPos = this.pos;
    var quote = this.expression.charAt(startPos);
    if (quote === "'" || quote === '"') {
      var index2 = this.expression.indexOf(quote, startPos + 1);
      while (index2 >= 0 && this.pos < this.expression.length) {
        this.pos = index2 + 1;
        if (this.expression.charAt(index2 - 1) !== "\\") {
          var rawString = this.expression.substring(startPos + 1, index2);
          this.current = this.newToken(TSTRING, this.unescape(rawString), startPos);
          r = true;
          break;
        }
        index2 = this.expression.indexOf(quote, index2 + 1);
      }
    }
    return r;
  };
  TokenStream.prototype.isParen = function() {
    var c = this.expression.charAt(this.pos);
    if (c === "(" || c === ")") {
      this.current = this.newToken(TPAREN, c);
      this.pos++;
      return true;
    }
    return false;
  };
  TokenStream.prototype.isBracket = function() {
    var c = this.expression.charAt(this.pos);
    if ((c === "[" || c === "]") && this.isOperatorEnabled("[")) {
      this.current = this.newToken(TBRACKET, c);
      this.pos++;
      return true;
    }
    return false;
  };
  TokenStream.prototype.isComma = function() {
    var c = this.expression.charAt(this.pos);
    if (c === ",") {
      this.current = this.newToken(TCOMMA, ",");
      this.pos++;
      return true;
    }
    return false;
  };
  TokenStream.prototype.isSemicolon = function() {
    var c = this.expression.charAt(this.pos);
    if (c === ";") {
      this.current = this.newToken(TSEMICOLON, ";");
      this.pos++;
      return true;
    }
    return false;
  };
  TokenStream.prototype.isConst = function() {
    var startPos = this.pos;
    var i = startPos;
    for (; i < this.expression.length; i++) {
      var c = this.expression.charAt(i);
      if (c.toUpperCase() === c.toLowerCase()) {
        if (i === this.pos || c !== "_" && c !== "." && (c < "0" || c > "9")) {
          break;
        }
      }
    }
    if (i > startPos) {
      var str = this.expression.substring(startPos, i);
      if (str in this.consts) {
        this.current = this.newToken(TNUMBER, this.consts[str]);
        this.pos += str.length;
        return true;
      }
    }
    return false;
  };
  TokenStream.prototype.isNamedOp = function() {
    var startPos = this.pos;
    var i = startPos;
    for (; i < this.expression.length; i++) {
      var c = this.expression.charAt(i);
      if (c.toUpperCase() === c.toLowerCase()) {
        if (i === this.pos || c !== "_" && (c < "0" || c > "9")) {
          break;
        }
      }
    }
    if (i > startPos) {
      var str = this.expression.substring(startPos, i);
      if (this.isOperatorEnabled(str) && (str in this.binaryOps || str in this.unaryOps || str in this.ternaryOps)) {
        this.current = this.newToken(TOP, str);
        this.pos += str.length;
        return true;
      }
    }
    return false;
  };
  TokenStream.prototype.isName = function() {
    var startPos = this.pos;
    var i = startPos;
    var hasLetter = false;
    for (; i < this.expression.length; i++) {
      var c = this.expression.charAt(i);
      if (c.toUpperCase() === c.toLowerCase()) {
        if (i === this.pos && (c === "$" || c === "_")) {
          if (c === "_") {
            hasLetter = true;
          }
          continue;
        } else if (i === this.pos || !hasLetter || c !== "_" && (c < "0" || c > "9")) {
          break;
        }
      } else {
        hasLetter = true;
      }
    }
    if (hasLetter) {
      var str = this.expression.substring(startPos, i);
      this.current = this.newToken(TNAME, str);
      this.pos += str.length;
      return true;
    }
    return false;
  };
  TokenStream.prototype.isWhitespace = function() {
    var r = false;
    var c = this.expression.charAt(this.pos);
    while (c === " " || c === "	" || c === "\n" || c === "\r") {
      r = true;
      this.pos++;
      if (this.pos >= this.expression.length) {
        break;
      }
      c = this.expression.charAt(this.pos);
    }
    return r;
  };
  var codePointPattern = /^[0-9a-f]{4}$/i;
  TokenStream.prototype.unescape = function(v) {
    var index2 = v.indexOf("\\");
    if (index2 < 0) {
      return v;
    }
    var buffer = v.substring(0, index2);
    while (index2 >= 0) {
      var c = v.charAt(++index2);
      switch (c) {
        case "'":
          buffer += "'";
          break;
        case '"':
          buffer += '"';
          break;
        case "\\":
          buffer += "\\";
          break;
        case "/":
          buffer += "/";
          break;
        case "b":
          buffer += "\b";
          break;
        case "f":
          buffer += "\f";
          break;
        case "n":
          buffer += "\n";
          break;
        case "r":
          buffer += "\r";
          break;
        case "t":
          buffer += "	";
          break;
        case "u":
          var codePoint = v.substring(index2 + 1, index2 + 5);
          if (!codePointPattern.test(codePoint)) {
            this.parseError("Illegal escape sequence: \\u" + codePoint);
          }
          buffer += String.fromCharCode(parseInt(codePoint, 16));
          index2 += 4;
          break;
        default:
          throw this.parseError('Illegal escape sequence: "\\' + c + '"');
      }
      ++index2;
      var backslash = v.indexOf("\\", index2);
      buffer += v.substring(index2, backslash < 0 ? v.length : backslash);
      index2 = backslash;
    }
    return buffer;
  };
  TokenStream.prototype.isComment = function() {
    var c = this.expression.charAt(this.pos);
    if (c === "/" && this.expression.charAt(this.pos + 1) === "*") {
      this.pos = this.expression.indexOf("*/", this.pos) + 2;
      if (this.pos === 1) {
        this.pos = this.expression.length;
      }
      return true;
    }
    return false;
  };
  TokenStream.prototype.isRadixInteger = function() {
    var pos = this.pos;
    if (pos >= this.expression.length - 2 || this.expression.charAt(pos) !== "0") {
      return false;
    }
    ++pos;
    var radix;
    var validDigit;
    if (this.expression.charAt(pos) === "x") {
      radix = 16;
      validDigit = /^[0-9a-f]$/i;
      ++pos;
    } else if (this.expression.charAt(pos) === "b") {
      radix = 2;
      validDigit = /^[01]$/i;
      ++pos;
    } else {
      return false;
    }
    var valid = false;
    var startPos = pos;
    while (pos < this.expression.length) {
      var c = this.expression.charAt(pos);
      if (validDigit.test(c)) {
        pos++;
        valid = true;
      } else {
        break;
      }
    }
    if (valid) {
      this.current = this.newToken(TNUMBER, parseInt(this.expression.substring(startPos, pos), radix));
      this.pos = pos;
    }
    return valid;
  };
  TokenStream.prototype.isNumber = function() {
    var valid = false;
    var pos = this.pos;
    var startPos = pos;
    var resetPos = pos;
    var foundDot = false;
    var foundDigits = false;
    var c;
    while (pos < this.expression.length) {
      c = this.expression.charAt(pos);
      if (c >= "0" && c <= "9" || !foundDot && c === ".") {
        if (c === ".") {
          foundDot = true;
        } else {
          foundDigits = true;
        }
        pos++;
        valid = foundDigits;
      } else {
        break;
      }
    }
    if (valid) {
      resetPos = pos;
    }
    if (c === "e" || c === "E") {
      pos++;
      var acceptSign = true;
      var validExponent = false;
      while (pos < this.expression.length) {
        c = this.expression.charAt(pos);
        if (acceptSign && (c === "+" || c === "-")) {
          acceptSign = false;
        } else if (c >= "0" && c <= "9") {
          validExponent = true;
          acceptSign = false;
        } else {
          break;
        }
        pos++;
      }
      if (!validExponent) {
        pos = resetPos;
      }
    }
    if (valid) {
      this.current = this.newToken(TNUMBER, parseFloat(this.expression.substring(startPos, pos)));
      this.pos = pos;
    } else {
      this.pos = resetPos;
    }
    return valid;
  };
  TokenStream.prototype.isOperator = function() {
    var startPos = this.pos;
    var c = this.expression.charAt(this.pos);
    if (c === "+" || c === "-" || c === "*" || c === "/" || c === "%" || c === "^" || c === "?" || c === ":" || c === ".") {
      this.current = this.newToken(TOP, c);
    } else if (c === "∙" || c === "•") {
      this.current = this.newToken(TOP, "*");
    } else if (c === ">") {
      if (this.expression.charAt(this.pos + 1) === "=") {
        this.current = this.newToken(TOP, ">=");
        this.pos++;
      } else {
        this.current = this.newToken(TOP, ">");
      }
    } else if (c === "<") {
      if (this.expression.charAt(this.pos + 1) === "=") {
        this.current = this.newToken(TOP, "<=");
        this.pos++;
      } else {
        this.current = this.newToken(TOP, "<");
      }
    } else if (c === "|") {
      if (this.expression.charAt(this.pos + 1) === "|") {
        this.current = this.newToken(TOP, "||");
        this.pos++;
      } else {
        return false;
      }
    } else if (c === "=") {
      if (this.expression.charAt(this.pos + 1) === "=") {
        this.current = this.newToken(TOP, "==");
        this.pos++;
      } else {
        this.current = this.newToken(TOP, c);
      }
    } else if (c === "!") {
      if (this.expression.charAt(this.pos + 1) === "=") {
        this.current = this.newToken(TOP, "!=");
        this.pos++;
      } else {
        this.current = this.newToken(TOP, c);
      }
    } else {
      return false;
    }
    this.pos++;
    if (this.isOperatorEnabled(this.current.value)) {
      return true;
    } else {
      this.pos = startPos;
      return false;
    }
  };
  TokenStream.prototype.isOperatorEnabled = function(op) {
    return this.parser.isOperatorEnabled(op);
  };
  TokenStream.prototype.getCoordinates = function() {
    var line = 0;
    var column;
    var newline = -1;
    do {
      line++;
      column = this.pos - newline;
      newline = this.expression.indexOf("\n", newline + 1);
    } while (newline >= 0 && newline < this.pos);
    return {
      line,
      column
    };
  };
  TokenStream.prototype.parseError = function(msg) {
    var coords = this.getCoordinates();
    throw new Error("parse error [" + coords.line + ":" + coords.column + "]: " + msg);
  };
  function ParserState(parser, tokenStream, options) {
    this.parser = parser;
    this.tokens = tokenStream;
    this.current = null;
    this.nextToken = null;
    this.next();
    this.savedCurrent = null;
    this.savedNextToken = null;
    this.allowMemberAccess = options.allowMemberAccess !== false;
  }
  ParserState.prototype.next = function() {
    this.current = this.nextToken;
    return this.nextToken = this.tokens.next();
  };
  ParserState.prototype.tokenMatches = function(token, value) {
    if (typeof value === "undefined") {
      return true;
    } else if (Array.isArray(value)) {
      return contains(value, token.value);
    } else if (typeof value === "function") {
      return value(token);
    } else {
      return token.value === value;
    }
  };
  ParserState.prototype.save = function() {
    this.savedCurrent = this.current;
    this.savedNextToken = this.nextToken;
    this.tokens.save();
  };
  ParserState.prototype.restore = function() {
    this.tokens.restore();
    this.current = this.savedCurrent;
    this.nextToken = this.savedNextToken;
  };
  ParserState.prototype.accept = function(type, value) {
    if (this.nextToken.type === type && this.tokenMatches(this.nextToken, value)) {
      this.next();
      return true;
    }
    return false;
  };
  ParserState.prototype.expect = function(type, value) {
    if (!this.accept(type, value)) {
      var coords = this.tokens.getCoordinates();
      throw new Error("parse error [" + coords.line + ":" + coords.column + "]: Expected " + (value || type));
    }
  };
  ParserState.prototype.parseAtom = function(instr) {
    var unaryOps = this.tokens.unaryOps;
    function isPrefixOperator(token) {
      return token.value in unaryOps;
    }
    if (this.accept(TNAME) || this.accept(TOP, isPrefixOperator)) {
      instr.push(new Instruction(IVAR, this.current.value));
    } else if (this.accept(TNUMBER)) {
      instr.push(new Instruction(INUMBER, this.current.value));
    } else if (this.accept(TSTRING)) {
      instr.push(new Instruction(INUMBER, this.current.value));
    } else if (this.accept(TPAREN, "(")) {
      this.parseExpression(instr);
      this.expect(TPAREN, ")");
    } else if (this.accept(TBRACKET, "[")) {
      if (this.accept(TBRACKET, "]")) {
        instr.push(new Instruction(IARRAY, 0));
      } else {
        var argCount = this.parseArrayList(instr);
        instr.push(new Instruction(IARRAY, argCount));
      }
    } else {
      throw new Error("unexpected " + this.nextToken);
    }
  };
  ParserState.prototype.parseExpression = function(instr) {
    var exprInstr = [];
    if (this.parseUntilEndStatement(instr, exprInstr)) {
      return;
    }
    this.parseVariableAssignmentExpression(exprInstr);
    if (this.parseUntilEndStatement(instr, exprInstr)) {
      return;
    }
    this.pushExpression(instr, exprInstr);
  };
  ParserState.prototype.pushExpression = function(instr, exprInstr) {
    for (var i = 0, len2 = exprInstr.length; i < len2; i++) {
      instr.push(exprInstr[i]);
    }
  };
  ParserState.prototype.parseUntilEndStatement = function(instr, exprInstr) {
    if (!this.accept(TSEMICOLON)) return false;
    if (this.nextToken && this.nextToken.type !== TEOF && !(this.nextToken.type === TPAREN && this.nextToken.value === ")")) {
      exprInstr.push(new Instruction(IENDSTATEMENT));
    }
    if (this.nextToken.type !== TEOF) {
      this.parseExpression(exprInstr);
    }
    instr.push(new Instruction(IEXPR, exprInstr));
    return true;
  };
  ParserState.prototype.parseArrayList = function(instr) {
    var argCount = 0;
    while (!this.accept(TBRACKET, "]")) {
      this.parseExpression(instr);
      ++argCount;
      while (this.accept(TCOMMA)) {
        this.parseExpression(instr);
        ++argCount;
      }
    }
    return argCount;
  };
  ParserState.prototype.parseVariableAssignmentExpression = function(instr) {
    this.parseConditionalExpression(instr);
    while (this.accept(TOP, "=")) {
      var varName = instr.pop();
      var varValue = [];
      var lastInstrIndex = instr.length - 1;
      if (varName.type === IFUNCALL) {
        if (!this.tokens.isOperatorEnabled("()=")) {
          throw new Error("function definition is not permitted");
        }
        for (var i = 0, len2 = varName.value + 1; i < len2; i++) {
          var index2 = lastInstrIndex - i;
          if (instr[index2].type === IVAR) {
            instr[index2] = new Instruction(IVARNAME, instr[index2].value);
          }
        }
        this.parseVariableAssignmentExpression(varValue);
        instr.push(new Instruction(IEXPR, varValue));
        instr.push(new Instruction(IFUNDEF, varName.value));
        continue;
      }
      if (varName.type !== IVAR && varName.type !== IMEMBER) {
        throw new Error("expected variable for assignment");
      }
      this.parseVariableAssignmentExpression(varValue);
      instr.push(new Instruction(IVARNAME, varName.value));
      instr.push(new Instruction(IEXPR, varValue));
      instr.push(binaryInstruction("="));
    }
  };
  ParserState.prototype.parseConditionalExpression = function(instr) {
    this.parseOrExpression(instr);
    while (this.accept(TOP, "?")) {
      var trueBranch = [];
      var falseBranch = [];
      this.parseConditionalExpression(trueBranch);
      this.expect(TOP, ":");
      this.parseConditionalExpression(falseBranch);
      instr.push(new Instruction(IEXPR, trueBranch));
      instr.push(new Instruction(IEXPR, falseBranch));
      instr.push(ternaryInstruction("?"));
    }
  };
  ParserState.prototype.parseOrExpression = function(instr) {
    this.parseAndExpression(instr);
    while (this.accept(TOP, "or")) {
      var falseBranch = [];
      this.parseAndExpression(falseBranch);
      instr.push(new Instruction(IEXPR, falseBranch));
      instr.push(binaryInstruction("or"));
    }
  };
  ParserState.prototype.parseAndExpression = function(instr) {
    this.parseComparison(instr);
    while (this.accept(TOP, "and")) {
      var trueBranch = [];
      this.parseComparison(trueBranch);
      instr.push(new Instruction(IEXPR, trueBranch));
      instr.push(binaryInstruction("and"));
    }
  };
  var COMPARISON_OPERATORS = ["==", "!=", "<", "<=", ">=", ">", "in"];
  ParserState.prototype.parseComparison = function(instr) {
    this.parseAddSub(instr);
    while (this.accept(TOP, COMPARISON_OPERATORS)) {
      var op = this.current;
      this.parseAddSub(instr);
      instr.push(binaryInstruction(op.value));
    }
  };
  var ADD_SUB_OPERATORS = ["+", "-", "||"];
  ParserState.prototype.parseAddSub = function(instr) {
    this.parseTerm(instr);
    while (this.accept(TOP, ADD_SUB_OPERATORS)) {
      var op = this.current;
      this.parseTerm(instr);
      instr.push(binaryInstruction(op.value));
    }
  };
  var TERM_OPERATORS = ["*", "/", "%"];
  ParserState.prototype.parseTerm = function(instr) {
    this.parseFactor(instr);
    while (this.accept(TOP, TERM_OPERATORS)) {
      var op = this.current;
      this.parseFactor(instr);
      instr.push(binaryInstruction(op.value));
    }
  };
  ParserState.prototype.parseFactor = function(instr) {
    var unaryOps = this.tokens.unaryOps;
    function isPrefixOperator(token) {
      return token.value in unaryOps;
    }
    this.save();
    if (this.accept(TOP, isPrefixOperator)) {
      if (this.current.value !== "-" && this.current.value !== "+") {
        if (this.nextToken.type === TPAREN && this.nextToken.value === "(") {
          this.restore();
          this.parseExponential(instr);
          return;
        } else if (this.nextToken.type === TSEMICOLON || this.nextToken.type === TCOMMA || this.nextToken.type === TEOF || this.nextToken.type === TPAREN && this.nextToken.value === ")") {
          this.restore();
          this.parseAtom(instr);
          return;
        }
      }
      var op = this.current;
      this.parseFactor(instr);
      instr.push(unaryInstruction(op.value));
    } else {
      this.parseExponential(instr);
    }
  };
  ParserState.prototype.parseExponential = function(instr) {
    this.parsePostfixExpression(instr);
    while (this.accept(TOP, "^")) {
      this.parseFactor(instr);
      instr.push(binaryInstruction("^"));
    }
  };
  ParserState.prototype.parsePostfixExpression = function(instr) {
    this.parseFunctionCall(instr);
    while (this.accept(TOP, "!")) {
      instr.push(unaryInstruction("!"));
    }
  };
  ParserState.prototype.parseFunctionCall = function(instr) {
    var unaryOps = this.tokens.unaryOps;
    function isPrefixOperator(token) {
      return token.value in unaryOps;
    }
    if (this.accept(TOP, isPrefixOperator)) {
      var op = this.current;
      this.parseAtom(instr);
      instr.push(unaryInstruction(op.value));
    } else {
      this.parseMemberExpression(instr);
      while (this.accept(TPAREN, "(")) {
        if (this.accept(TPAREN, ")")) {
          instr.push(new Instruction(IFUNCALL, 0));
        } else {
          var argCount = this.parseArgumentList(instr);
          instr.push(new Instruction(IFUNCALL, argCount));
        }
      }
    }
  };
  ParserState.prototype.parseArgumentList = function(instr) {
    var argCount = 0;
    while (!this.accept(TPAREN, ")")) {
      this.parseExpression(instr);
      ++argCount;
      while (this.accept(TCOMMA)) {
        this.parseExpression(instr);
        ++argCount;
      }
    }
    return argCount;
  };
  ParserState.prototype.parseMemberExpression = function(instr) {
    this.parseAtom(instr);
    while (this.accept(TOP, ".") || this.accept(TBRACKET, "[")) {
      var op = this.current;
      if (op.value === ".") {
        if (!this.allowMemberAccess) {
          throw new Error('unexpected ".", member access is not permitted');
        }
        this.expect(TNAME);
        instr.push(new Instruction(IMEMBER, this.current.value));
      } else if (op.value === "[") {
        if (!this.tokens.isOperatorEnabled("[")) {
          throw new Error('unexpected "[]", arrays are disabled');
        }
        this.parseExpression(instr);
        this.expect(TBRACKET, "]");
        instr.push(binaryInstruction("["));
      } else {
        throw new Error("unexpected symbol: " + op.value);
      }
    }
  };
  function add(a, b) {
    return Number(a) + Number(b);
  }
  function sub(a, b) {
    return a - b;
  }
  function mul(a, b) {
    return a * b;
  }
  function div(a, b) {
    return a / b;
  }
  function mod(a, b) {
    return a % b;
  }
  function concat(a, b) {
    if (Array.isArray(a) && Array.isArray(b)) {
      return a.concat(b);
    }
    return "" + a + b;
  }
  function equal(a, b) {
    return a === b;
  }
  function notEqual(a, b) {
    return a !== b;
  }
  function greaterThan(a, b) {
    return a > b;
  }
  function lessThan(a, b) {
    return a < b;
  }
  function greaterThanEqual(a, b) {
    return a >= b;
  }
  function lessThanEqual(a, b) {
    return a <= b;
  }
  function andOperator(a, b) {
    return Boolean(a && b);
  }
  function orOperator(a, b) {
    return Boolean(a || b);
  }
  function inOperator(a, b) {
    return contains(b, a);
  }
  function sinh(a) {
    return (Math.exp(a) - Math.exp(-a)) / 2;
  }
  function cosh(a) {
    return (Math.exp(a) + Math.exp(-a)) / 2;
  }
  function tanh(a) {
    if (a === Infinity) return 1;
    if (a === -Infinity) return -1;
    return (Math.exp(a) - Math.exp(-a)) / (Math.exp(a) + Math.exp(-a));
  }
  function asinh(a) {
    if (a === -Infinity) return a;
    return Math.log(a + Math.sqrt(a * a + 1));
  }
  function acosh(a) {
    return Math.log(a + Math.sqrt(a * a - 1));
  }
  function atanh(a) {
    return Math.log((1 + a) / (1 - a)) / 2;
  }
  function log10(a) {
    return Math.log(a) * Math.LOG10E;
  }
  function neg(a) {
    return -a;
  }
  function not(a) {
    return !a;
  }
  function trunc(a) {
    return a < 0 ? Math.ceil(a) : Math.floor(a);
  }
  function random(a) {
    return Math.random() * (a || 1);
  }
  function factorial(a) {
    return gamma(a + 1);
  }
  function isInteger(value) {
    return isFinite(value) && value === Math.round(value);
  }
  var GAMMA_G = 4.7421875;
  var GAMMA_P = [
    0.9999999999999971,
    57.15623566586292,
    -59.59796035547549,
    14.136097974741746,
    -0.4919138160976202,
    3399464998481189e-20,
    4652362892704858e-20,
    -9837447530487956e-20,
    1580887032249125e-19,
    -21026444172410488e-20,
    21743961811521265e-20,
    -1643181065367639e-19,
    8441822398385275e-20,
    -26190838401581408e-21,
    36899182659531625e-22
  ];
  function gamma(n) {
    var t, x;
    if (isInteger(n)) {
      if (n <= 0) {
        return isFinite(n) ? Infinity : NaN;
      }
      if (n > 171) {
        return Infinity;
      }
      var value = n - 2;
      var res = n - 1;
      while (value > 1) {
        res *= value;
        value--;
      }
      if (res === 0) {
        res = 1;
      }
      return res;
    }
    if (n < 0.5) {
      return Math.PI / (Math.sin(Math.PI * n) * gamma(1 - n));
    }
    if (n >= 171.35) {
      return Infinity;
    }
    if (n > 85) {
      var twoN = n * n;
      var threeN = twoN * n;
      var fourN = threeN * n;
      var fiveN = fourN * n;
      return Math.sqrt(2 * Math.PI / n) * Math.pow(n / Math.E, n) * (1 + 1 / (12 * n) + 1 / (288 * twoN) - 139 / (51840 * threeN) - 571 / (2488320 * fourN) + 163879 / (209018880 * fiveN) + 5246819 / (75246796800 * fiveN * n));
    }
    --n;
    x = GAMMA_P[0];
    for (var i = 1; i < GAMMA_P.length; ++i) {
      x += GAMMA_P[i] / (n + i);
    }
    t = n + GAMMA_G + 0.5;
    return Math.sqrt(2 * Math.PI) * Math.pow(t, n + 0.5) * Math.exp(-t) * x;
  }
  function stringOrArrayLength(s) {
    if (Array.isArray(s)) {
      return s.length;
    }
    return String(s).length;
  }
  function hypot() {
    var sum2 = 0;
    var larg = 0;
    for (var i = 0; i < arguments.length; i++) {
      var arg = Math.abs(arguments[i]);
      var div2;
      if (larg < arg) {
        div2 = larg / arg;
        sum2 = sum2 * div2 * div2 + 1;
        larg = arg;
      } else if (arg > 0) {
        div2 = arg / larg;
        sum2 += div2 * div2;
      } else {
        sum2 += arg;
      }
    }
    return larg === Infinity ? Infinity : larg * Math.sqrt(sum2);
  }
  function condition(cond, yep, nope) {
    return cond ? yep : nope;
  }
  function roundTo(value, exp) {
    if (typeof exp === "undefined" || +exp === 0) {
      return Math.round(value);
    }
    value = +value;
    exp = -+exp;
    if (isNaN(value) || !(typeof exp === "number" && exp % 1 === 0)) {
      return NaN;
    }
    value = value.toString().split("e");
    value = Math.round(+(value[0] + "e" + (value[1] ? +value[1] - exp : -exp)));
    value = value.toString().split("e");
    return +(value[0] + "e" + (value[1] ? +value[1] + exp : exp));
  }
  function setVar(name, value, variables) {
    if (variables) variables[name] = value;
    return value;
  }
  function arrayIndex(array, index2) {
    return array[index2 | 0];
  }
  function max(array) {
    if (arguments.length === 1 && Array.isArray(array)) {
      return Math.max.apply(Math, array);
    } else {
      return Math.max.apply(Math, arguments);
    }
  }
  function min(array) {
    if (arguments.length === 1 && Array.isArray(array)) {
      return Math.min.apply(Math, array);
    } else {
      return Math.min.apply(Math, arguments);
    }
  }
  function arrayMap(f, a) {
    if (typeof f !== "function") {
      throw new Error("First argument to map is not a function");
    }
    if (!Array.isArray(a)) {
      throw new Error("Second argument to map is not an array");
    }
    return a.map(function(x, i) {
      return f(x, i);
    });
  }
  function arrayFold(f, init, a) {
    if (typeof f !== "function") {
      throw new Error("First argument to fold is not a function");
    }
    if (!Array.isArray(a)) {
      throw new Error("Second argument to fold is not an array");
    }
    return a.reduce(function(acc, x, i) {
      return f(acc, x, i);
    }, init);
  }
  function arrayFilter(f, a) {
    if (typeof f !== "function") {
      throw new Error("First argument to filter is not a function");
    }
    if (!Array.isArray(a)) {
      throw new Error("Second argument to filter is not an array");
    }
    return a.filter(function(x, i) {
      return f(x, i);
    });
  }
  function stringOrArrayIndexOf(target, s) {
    if (!(Array.isArray(s) || typeof s === "string")) {
      throw new Error("Second argument to indexOf is not a string or array");
    }
    return s.indexOf(target);
  }
  function arrayJoin(sep, a) {
    if (!Array.isArray(a)) {
      throw new Error("Second argument to join is not an array");
    }
    return a.join(sep);
  }
  function sign(x) {
    return (x > 0) - (x < 0) || +x;
  }
  var ONE_THIRD = 1 / 3;
  function cbrt(x) {
    return x < 0 ? -Math.pow(-x, ONE_THIRD) : Math.pow(x, ONE_THIRD);
  }
  function expm1(x) {
    return Math.exp(x) - 1;
  }
  function log1p(x) {
    return Math.log(1 + x);
  }
  function log2(x) {
    return Math.log(x) / Math.LN2;
  }
  function Parser(options) {
    this.options = options || {};
    this.unaryOps = {
      sin: Math.sin,
      cos: Math.cos,
      tan: Math.tan,
      asin: Math.asin,
      acos: Math.acos,
      atan: Math.atan,
      sinh: Math.sinh || sinh,
      cosh: Math.cosh || cosh,
      tanh: Math.tanh || tanh,
      asinh: Math.asinh || asinh,
      acosh: Math.acosh || acosh,
      atanh: Math.atanh || atanh,
      sqrt: Math.sqrt,
      cbrt: Math.cbrt || cbrt,
      log: Math.log,
      log2: Math.log2 || log2,
      ln: Math.log,
      lg: Math.log10 || log10,
      log10: Math.log10 || log10,
      expm1: Math.expm1 || expm1,
      log1p: Math.log1p || log1p,
      abs: Math.abs,
      ceil: Math.ceil,
      floor: Math.floor,
      round: Math.round,
      trunc: Math.trunc || trunc,
      "-": neg,
      "+": Number,
      exp: Math.exp,
      not,
      length: stringOrArrayLength,
      "!": factorial,
      sign: Math.sign || sign
    };
    this.binaryOps = {
      "+": add,
      "-": sub,
      "*": mul,
      "/": div,
      "%": mod,
      "^": Math.pow,
      "||": concat,
      "==": equal,
      "!=": notEqual,
      ">": greaterThan,
      "<": lessThan,
      ">=": greaterThanEqual,
      "<=": lessThanEqual,
      and: andOperator,
      or: orOperator,
      "in": inOperator,
      "=": setVar,
      "[": arrayIndex
    };
    this.ternaryOps = {
      "?": condition
    };
    this.functions = {
      random,
      fac: factorial,
      min,
      max,
      hypot: Math.hypot || hypot,
      pyt: Math.hypot || hypot,
      // backward compat
      pow: Math.pow,
      atan2: Math.atan2,
      "if": condition,
      gamma,
      roundTo,
      map: arrayMap,
      fold: arrayFold,
      filter: arrayFilter,
      indexOf: stringOrArrayIndexOf,
      join: arrayJoin
    };
    this.consts = {
      E: Math.E,
      PI: Math.PI,
      "true": true,
      "false": false
    };
  }
  Parser.prototype.parse = function(expr) {
    var instr = [];
    var parserState = new ParserState(
      this,
      new TokenStream(this, expr),
      { allowMemberAccess: this.options.allowMemberAccess }
    );
    parserState.parseExpression(instr);
    parserState.expect(TEOF, "EOF");
    return new Expression(instr, this);
  };
  Parser.prototype.evaluate = function(expr, variables) {
    return this.parse(expr).evaluate(variables);
  };
  var sharedParser = new Parser();
  Parser.parse = function(expr) {
    return sharedParser.parse(expr);
  };
  Parser.evaluate = function(expr, variables) {
    return sharedParser.parse(expr).evaluate(variables);
  };
  var optionNameMap = {
    "+": "add",
    "-": "subtract",
    "*": "multiply",
    "/": "divide",
    "%": "remainder",
    "^": "power",
    "!": "factorial",
    "<": "comparison",
    ">": "comparison",
    "<=": "comparison",
    ">=": "comparison",
    "==": "comparison",
    "!=": "comparison",
    "||": "concatenate",
    "and": "logical",
    "or": "logical",
    "not": "logical",
    "?": "conditional",
    ":": "conditional",
    "=": "assignment",
    "[": "array",
    "()=": "fndef"
  };
  function getOptionName(op) {
    return optionNameMap.hasOwnProperty(op) ? optionNameMap[op] : op;
  }
  Parser.prototype.isOperatorEnabled = function(op) {
    var optionName = getOptionName(op);
    var operators2 = this.options.operators || {};
    return !(optionName in operators2) || !!operators2[optionName];
  };
  const calc = (expression, context) => {
    if (typeof expression !== "string") {
      return expression;
    }
    let processedExpression = expression;
    try {
      const pathResolver = (path) => {
        let currentPath = path;
        let value;
        let depth = 0;
        while (typeof currentPath === "string" && (currentPath.startsWith("/") || currentPath.startsWith("=/")) && depth < 5) {
          const normalizedPath = currentPath.startsWith("/") ? "=" + currentPath : currentPath;
          const resolved = resolvePath(normalizedPath, context);
          value = unwrapSignal(resolved);
          if (typeof value === "string" && (value.startsWith("/") || value.startsWith("=/")) && value !== currentPath) {
            currentPath = value;
            depth++;
          } else {
            break;
          }
        }
        if (typeof value === "number") return value;
        if (typeof value === "string") {
          const num = parseFloat(value);
          if (!isNaN(num) && isFinite(Number(value))) return num;
          return value === "" ? 0 : `"${value.replace(/"/g, '\\"')}"`;
        }
        return value === void 0 || value === null ? 0 : value;
      };
      const pathRegex = /\$\(\s*['"](.*?)['"]\s*\)/g;
      processedExpression = expression.replace(pathRegex, (match2, path) => {
        const val = pathResolver(path);
        return val;
      });
      const parser = new Parser();
      const parsed = parser.parse(processedExpression);
      return parsed.evaluate();
    } catch (error) {
      console.error("JPRX calc error:", error.message);
      console.error("Original expression:", expression);
      console.error("Processed expression:", processedExpression);
      return NaN;
    }
  };
  const registerCalcHelpers = (register) => {
    register("calc", calc, { pathAware: true });
  };
  const registerDOMHelpers = (registerHelper2) => {
    registerHelper2("xpath", function(expression) {
      const domNode = this;
      if (!domNode || !(domNode instanceof Element)) {
        console.warn("[Lightview-CDOM] xpath() called without valid DOM context");
        return "";
      }
      const forbiddenAxes = /\b(child|descendant|following|following-sibling)::/;
      if (forbiddenAxes.test(expression)) {
        console.error(`[Lightview-CDOM] xpath(): Forward-looking axes not allowed: ${expression}`);
        return "";
      }
      const hasShorthandChild = /\/[a-zA-Z]/.test(expression) && !expression.startsWith("/html");
      if (hasShorthandChild) {
        console.error(`[Lightview-CDOM] xpath(): Shorthand child axis (/) not allowed: ${expression}`);
        return "";
      }
      const LV = globalThis.Lightview;
      if (!LV || !LV.computed) {
        console.warn("[Lightview-CDOM] xpath(): Lightview not available");
        return "";
      }
      return LV.computed(() => {
        try {
          const result = document.evaluate(
            expression,
            domNode,
            null,
            XPathResult.STRING_TYPE,
            null
          );
          return result.stringValue;
        } catch (e) {
          console.error(`[Lightview-CDOM] xpath() evaluation failed:`, e.message);
          return "";
        }
      });
    }, { pathAware: false });
  };
  const _LV = globalThis.__LIGHTVIEW_INTERNALS__ || (globalThis.__LIGHTVIEW_INTERNALS__ = {
    currentEffect: null,
    registry: /* @__PURE__ */ new Map(),
    // Global name -> Signal/Proxy
    localRegistries: /* @__PURE__ */ new WeakMap(),
    // Object/Element -> Map(name -> Signal/Proxy)
    futureSignals: /* @__PURE__ */ new Map(),
    // name -> Set of (signal) => void
    schemas: /* @__PURE__ */ new Map(),
    // name -> Schema (Draft 7+ or Shorthand)
    parents: /* @__PURE__ */ new WeakMap(),
    // Proxy -> Parent (Proxy/Element)
    helpers: /* @__PURE__ */ new Map(),
    // name -> function (used for transforms and expressions)
    hooks: {
      validate: (value, schema) => true
      // Hook for extensions (like JPRX) to provide full validation
    }
  });
  const internals = _LV;
  const { parents, schemas, hooks } = internals;
  const protoMethods = (proto, test) => Object.getOwnPropertyNames(proto).filter((k) => typeof proto[k] === "function" && test(k));
  protoMethods(Date.prototype, (k) => /^(to|get|valueOf)/.test(k));
  protoMethods(Date.prototype, (k) => /^set/.test(k));
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
  registerHelper("move", (selector, location = "beforeend") => {
    return {
      isLazy: true,
      resolve: (eventOrNode) => {
        const isEvent = eventOrNode && typeof eventOrNode === "object" && "target" in eventOrNode;
        const node = isEvent ? eventOrNode.currentTarget || eventOrNode.target : eventOrNode;
        if (!(node instanceof Node) || !selector) return;
        const target = document.querySelector(selector);
        if (!target) {
          console.warn(`[Lightview-CDOM] move target not found: ${selector}`);
          return;
        }
        if (node.id) {
          const escapedId = CSS.escape(node.id);
          if (target.id === node.id && target !== node) {
            target.replaceWith(node);
            return;
          }
          const existing = target.querySelector(`#${escapedId}`);
          if (existing && existing !== node) {
            existing.replaceWith(node);
            return;
          }
        }
        globalThis.Lightview.$(target).content(node, location);
      }
    };
  }, { pathAware: true });
  registerHelper("mount", async (url, options = {}) => {
    const { target = "body", location = "beforeend" } = options;
    try {
      const fetchOptions = { ...options };
      delete fetchOptions.target;
      delete fetchOptions.location;
      const headers = { ...fetchOptions.headers };
      let body = fetchOptions.body;
      if (body !== void 0) {
        if (body !== null && typeof body === "object") {
          body = JSON.stringify(body);
          if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
        } else {
          body = String(body);
          if (!headers["Content-Type"]) headers["Content-Type"] = "text/plain";
        }
        fetchOptions.body = body;
        fetchOptions.headers = headers;
      }
      const response = await globalThis.fetch(url, fetchOptions);
      const contentType = response.headers.get("Content-Type") || "";
      const text = await response.text();
      let content = text;
      const isCDOM = contentType.includes("application/cdom") || contentType.includes("application/jprx") || contentType.includes("application/vdom") || contentType.includes("application/odom") || url.endsWith(".cdom") || url.endsWith(".jprx") || url.endsWith(".vdom") || url.endsWith(".odom");
      if (isCDOM || contentType.includes("application/json") && text.trim().startsWith("{")) {
        try {
          content = hydrate(parseCDOMC(text));
        } catch (e) {
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
  registerOperator("increment", "++", "prefix", 80);
  registerOperator("increment", "++", "postfix", 80);
  registerOperator("decrement", "--", "prefix", 80);
  registerOperator("decrement", "--", "postfix", 80);
  registerOperator("toggle", "!!", "prefix", 80);
  registerOperator("set", "=", "infix", 20);
  registerOperator("+", "+", "infix", 50);
  registerOperator("-", "-", "infix", 50, { requiresWhitespace: true });
  registerOperator("*", "*", "infix", 60, { requiresWhitespace: true });
  registerOperator("/", "/", "infix", 60, { requiresWhitespace: true });
  registerOperator("gt", ">", "infix", 40);
  registerOperator("lt", "<", "infix", 40);
  registerOperator("gte", ">=", "infix", 40);
  registerOperator("lte", "<=", "infix", 40);
  registerOperator("neq", "!=", "infix", 40);
  registerOperator("strictNeq", "!==", "infix", 40);
  registerOperator("eq", "==", "infix", 40);
  registerOperator("strictEq", "===", "infix", 40);
  const getContext = (node, event = null) => {
    return new Proxy({}, {
      get(_, prop) {
        if (prop === "$event" || prop === "event") return event;
        if (prop === "$this" || prop === "this" || prop === "__node__") return node;
        return unwrapSignal(globalThis.Lightview.getState(prop, { scope: node }));
      },
      set(_, prop, value) {
        const res = globalThis.Lightview.getState(prop, { scope: node });
        if (res && (typeof res === "object" || typeof res === "function") && "value" in res) {
          res.value = value;
          return true;
        }
        return false;
      }
    });
  };
  globalThis.Lightview.hooks.processAttribute = (domNode, key, value) => {
    if (value == null ? void 0 : value.__JPRX_BIND__) {
      const { path, options } = value;
      const type = domNode.type || "";
      const tagName = domNode.tagName.toLowerCase();
      let prop = "value";
      let event = "input";
      if (type === "checkbox" || type === "radio") {
        prop = "checked";
        event = "change";
      } else if (tagName === "select") {
        event = "change";
      }
      const res = globalThis.Lightview.get(path.replace(/^=/, ""), { scope: domNode });
      const runner = globalThis.Lightview.effect(() => {
        const val = unwrapSignal(res);
        if (domNode[prop] !== val) {
          domNode[prop] = val === void 0 ? "" : val;
        }
      });
      globalThis.Lightview.internals.trackEffect(domNode, runner);
      domNode.addEventListener(event, () => {
        if (res && "value" in res) res.value = domNode[prop];
      });
      return unwrapSignal(res) ?? domNode[prop];
    }
    return void 0;
  };
  const activate = (root = document.body) => {
  };
  const makeEventHandler = (expr) => (eventOrNode) => {
    const isEvent = eventOrNode && typeof eventOrNode === "object" && "target" in eventOrNode;
    const target = isEvent ? eventOrNode.currentTarget || eventOrNode.target : eventOrNode;
    const context = getContext(target, isEvent ? eventOrNode : null);
    const result = resolveExpression$1(expr, context);
    if (result && typeof result === "object" && result.isLazy) return result.resolve(context);
    return result;
  };
  const hydrate = (node, parent = null) => {
    var _a, _b, _c;
    if (!node) return node;
    if (typeof node === "string" && node.startsWith("'=")) {
      return node.slice(1);
    }
    if (typeof node === "string" && node.startsWith("'#")) {
      return node.slice(1);
    }
    if (typeof node === "string" && node.startsWith("#")) {
      return { __xpath__: node.slice(1), __static__: true };
    }
    if (typeof node === "string" && node.startsWith("=")) {
      return parseExpression(node, parent);
    }
    if (typeof node !== "object") return node;
    if (Array.isArray(node)) {
      return node.map((item) => hydrate(item, parent));
    }
    if (node instanceof String) return node.toString();
    if (parent && !("__parent__" in node)) {
      Object.defineProperty(node, "__parent__", { value: parent, enumerable: false, writable: true });
      (_c = (_b = (_a = globalThis.Lightview) == null ? void 0 : _a.internals) == null ? void 0 : _b.parents) == null ? void 0 : _c.set(node, parent);
    }
    if (!node.tag) {
      let potentialTag = null;
      const reserved = ["children", "attributes", "tag", "__parent__"];
      for (const key in node) {
        if (reserved.includes(key) || key.startsWith("on")) continue;
        potentialTag = key;
        break;
      }
      if (potentialTag) {
        const content = node[potentialTag];
        node.tag = potentialTag;
        if (Array.isArray(content)) {
          node.children = content;
        } else if (typeof content === "object") {
          node.attributes = node.attributes || {};
          for (const k in content) {
            if (k === "children") node.children = content[k];
            else node.attributes[k] = content[k];
          }
        } else node.children = [content];
        delete node[potentialTag];
      }
    }
    for (const key in node) {
      if (key === "tag" || key === "__parent__") continue;
      const value = node[key];
      if (key === "attributes" && typeof value === "object" && value !== null) {
        for (const attrKey in value) {
          const attrVal = value[attrKey];
          if (typeof attrVal === "string" && attrVal.startsWith("'=")) {
            value[attrKey] = attrVal.slice(1);
          } else if (typeof attrVal === "string" && attrVal.startsWith("'#")) {
            value[attrKey] = attrVal.slice(1);
          } else if (typeof attrVal === "string" && attrVal.startsWith("#")) {
            value[attrKey] = { __xpath__: attrVal.slice(1), __static__: true };
          } else if (typeof attrVal === "string" && attrVal.startsWith("=")) {
            if (attrKey.startsWith("on")) {
              value[attrKey] = makeEventHandler(attrVal);
            } else {
              value[attrKey] = parseExpression(attrVal, node);
            }
          } else if (typeof attrVal === "object" && attrVal !== null) {
            value[attrKey] = hydrate(attrVal, node);
          }
        }
        continue;
      }
      if (typeof value === "string" && value.startsWith("'=")) {
        node[key] = value.slice(1);
      } else if (typeof value === "string" && value.startsWith("'#")) {
        node[key] = value.slice(1);
      } else if (typeof value === "string" && value.startsWith("#")) {
        node[key] = { __xpath__: value.slice(1), __static__: true };
      } else if (typeof value === "string" && value.startsWith("=")) {
        if (key === "onmount" || key === "onunmount" || key.startsWith("on")) {
          node[key] = makeEventHandler(value);
        } else if (key === "children") {
          node[key] = [parseExpression(value, node)];
        } else {
          node[key] = parseExpression(value, node);
        }
      } else {
        node[key] = hydrate(value, node);
      }
    }
    if (!parent && node.tag) {
      node.attributes = node.attributes || {};
      const originalOnMount = node.attributes.onmount;
      node.attributes.onmount = (el) => {
        if (typeof originalOnMount === "function") originalOnMount(el);
        resolveStaticXPath(el);
      };
    }
    return node;
  };
  const validateXPath = (xpath) => {
    if (!xpath) return;
    const forbiddenAxes = /\b(child|descendant|following|following-sibling)::/;
    if (forbiddenAxes.test(xpath)) {
      throw new Error(`XPath: Forward-looking axes not allowed during DOM construction: ${xpath}`);
    }
    const hasShorthandChild = /\/(?![@.])(?![a-zA-Z0-9_-]+::)[a-zA-Z]/.test(xpath) && !xpath.startsWith("/html");
    if (hasShorthandChild) {
      throw new Error(`XPath: Shorthand child axis (/) not allowed during DOM construction: ${xpath}`);
    }
  };
  const resolveAttributeXPaths = (el) => {
    var _a;
    const attributes = [...el.attributes];
    for (const attr of attributes) {
      if (attr.name.startsWith("data-xpath-")) {
        const realAttr = attr.name.replace("data-xpath-", "");
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
          (_a = globalThis.console) == null ? void 0 : _a.error(`[Lightview-CDOM] XPath attribute error ("${realAttr}") at <${el.tagName.toLowerCase()} id="${el.id}">:`, e.message);
        }
      }
    }
  };
  const resolveTextNodeXPath = (node) => {
    var _a, _b, _c;
    if (!node.__xpathExpr) return;
    const xpath = node.__xpathExpr;
    try {
      validateXPath(xpath);
      const doc = globalThis.document || node.ownerDocument;
      const result = doc.evaluate(
        xpath,
        node,
        null,
        XPathResult.STRING_TYPE,
        null
      );
      node.textContent = result.stringValue;
    } catch (e) {
      (_c = globalThis.console) == null ? void 0 : _c.error(`[Lightview-CDOM] XPath text node error on <${(_a = node.parentNode) == null ? void 0 : _a.tagName.toLowerCase()} id="${(_b = node.parentNode) == null ? void 0 : _b.id}">:`, e.message);
    } finally {
      delete node.__xpathExpr;
    }
  };
  const resolveStaticXPath = (rootNode) => {
    const node = rootNode instanceof Node ? rootNode : (rootNode == null ? void 0 : rootNode.domEl) || rootNode;
    if (!node || !node.nodeType) return;
    if (node.nodeType === Node.ELEMENT_NODE) resolveAttributeXPaths(node);
    resolveTextNodeXPath(node);
    const doc = globalThis.document || node.ownerDocument;
    const walker = doc.createTreeWalker(node, NodeFilter.SHOW_ALL);
    let current = walker.nextNode();
    while (current) {
      if (current.nodeType === Node.ELEMENT_NODE) resolveAttributeXPaths(current);
      resolveTextNodeXPath(current);
      current = walker.nextNode();
    }
  };
  if (typeof parseCDOMC !== "function") throw new Error("parseCDOMC not found");
  if (typeof parseJPRX !== "function") throw new Error("oldParseJPRX not found");
  const LightviewCDOM2 = {
    registerHelper,
    registerOperator,
    parseExpression,
    resolvePath,
    resolvePathAsContext,
    resolveExpression: resolveExpression$1,
    parseCDOMC,
    parseJPRX: parseCDOMC,
    // Alias parseJPRX to the more robust parseCDOMC
    oldParseJPRX: parseJPRX,
    unwrapSignal,
    getContext,
    handleCDOMState: () => {
    },
    handleCDOMBind: () => {
    },
    activate,
    hydrate,
    resolveStaticXPath,
    version: "1.1.0"
  };
  if (typeof window !== "undefined") {
    globalThis.LightviewCDOM = {};
    Object.assign(globalThis.LightviewCDOM, LightviewCDOM2);
  }
  exports.BindingTarget = BindingTarget;
  exports.activate = activate;
  exports.default = LightviewCDOM2;
  exports.getContext = getContext;
  exports.hydrate = hydrate;
  exports.oldParseJPRX = parseJPRX;
  exports.parseCDOMC = parseCDOMC;
  exports.parseExpression = parseExpression;
  exports.parseJPRX = parseCDOMC;
  exports.registerHelper = registerHelper;
  exports.registerOperator = registerOperator;
  exports.resolveExpression = resolveExpression$1;
  exports.resolvePath = resolvePath;
  exports.resolvePathAsContext = resolvePathAsContext;
  exports.resolveStaticXPath = resolveStaticXPath;
  exports.unwrapSignal = unwrapSignal;
  Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });
  return exports;
}({});
