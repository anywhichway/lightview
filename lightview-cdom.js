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
  const registerOperator = (helperName, symbol, position, precedence) => {
    var _a;
    if (!["prefix", "postfix", "infix"].includes(position)) {
      throw new Error(`Invalid operator position: ${position}. Must be 'prefix', 'postfix', or 'infix'.`);
    }
    if (!helpers.has(helperName)) {
      (_a = globalThis.console) == null ? void 0 : _a.warn(`LightviewCDOM: Operator "${symbol}" registered for helper "${helperName}" which is not yet registered.`);
    }
    const prec = precedence ?? DEFAULT_PRECEDENCE[position];
    operators[position].set(symbol, { helper: helperName, precedence: prec });
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
    if (path.startsWith("$/")) {
      const [rootName, ...rest] = path.slice(2).split("/");
      const LV = getLV();
      const root = LV ? LV.get(rootName, { scope: (context == null ? void 0 : context.__node__) || context }) : registry == null ? void 0 : registry.get(rootName);
      if (!root) return void 0;
      return traverse(root, rest);
    }
    if (path.startsWith("./")) {
      return traverse(context, path.slice(2).split("/"));
    }
    if (path.startsWith("../")) {
      return traverse(context == null ? void 0 : context.__parent__, path.slice(3).split("/"));
    }
    if (path.includes("/") || path.includes(".")) {
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
    if (path.startsWith("$/")) {
      const segments = path.slice(2).split(/[/.]/);
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
            if (node.startsWith("$")) {
              const res = resolveExpression(node, context2);
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
            return obj.startsWith("$") || obj.startsWith("_") || obj.startsWith("../");
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
        nestedExpr = "$" + arg;
      } else if (globalMode && !arg.startsWith("$") && !arg.startsWith("./")) {
        nestedExpr = `$/${arg}`;
      }
      const val = resolveExpression(nestedExpr, context);
      if (val instanceof LazyValue) {
        return { value: val, isLazy: true };
      }
      return { value: val, isSignal: false };
    }
    let normalizedPath;
    if (arg.startsWith("/")) {
      normalizedPath = "$" + arg;
    } else if (arg.startsWith("$") || arg.startsWith("./") || arg.startsWith("../")) {
      normalizedPath = arg;
    } else if (globalMode) {
      normalizedPath = `$/${arg}`;
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
    const tokens = [];
    let i = 0;
    const len2 = expr.length;
    const opSymbols = getOperatorSymbols();
    while (i < len2) {
      if (/\s/.test(expr[i])) {
        i++;
        continue;
      }
      if (expr[i] === "$" && i + 1 < len2) {
        const prefixOps = [...operators.prefix.keys()].sort((a, b) => b.length - a.length);
        let isPrefixOp = false;
        for (const op of prefixOps) {
          if (expr.slice(i + 1, i + 1 + op.length) === op) {
            isPrefixOp = true;
            break;
          }
        }
        if (isPrefixOp) {
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
      let matchedOp = null;
      for (const op of opSymbols) {
        if (expr.slice(i, i + op.length) === op) {
          const before = i > 0 ? expr[i - 1] : " ";
          const after = i + op.length < len2 ? expr[i + op.length] : " ";
          const isInfix = operators.infix.has(op);
          const isPrefix = operators.prefix.has(op);
          const isPostfix = operators.postfix.has(op);
          if (isInfix && !isPrefix && !isPostfix) {
            if (/\s/.test(before) && /\s/.test(after)) {
              matchedOp = op;
              break;
            }
            continue;
          }
          const validBefore = /[\s)]/.test(before) || i === 0 || tokens.length === 0 || tokens[tokens.length - 1].type === TokenType.LPAREN || tokens[tokens.length - 1].type === TokenType.COMMA || tokens[tokens.length - 1].type === TokenType.OPERATOR;
          const validAfter = /[\s($./'"0-9_]/.test(after) || i + op.length >= len2 || opSymbols.some((o) => expr.slice(i + op.length).startsWith(o));
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
      if (expr[i] === "$" || expr[i] === "." || expr[i] === "/") {
        let path = "";
        while (i < len2) {
          let isOp = false;
          for (const op of opSymbols) {
            if (expr.slice(i, i + op.length) === op) {
              const isInfix = operators.infix.has(op);
              const isPrefix = operators.prefix.has(op);
              const isPostfix = operators.postfix.has(op);
              if (isInfix && !isPrefix && !isPostfix) {
                const after = i + op.length < len2 ? expr[i + op.length] : " ";
                if (/\s/.test(expr[i - 1]) && /\s/.test(after)) {
                  isOp = true;
                  break;
                }
                continue;
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
    if (expr.includes("(")) return false;
    if (/^\$(\+\+|--|!!)\/?/.test(expr)) {
      return true;
    }
    if (/(\+\+|--)$/.test(expr)) {
      return true;
    }
    if (/\s+([+\-*/]|>|<|>=|<=|!=)\s+/.test(expr)) {
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
        return { type: "Path", value: tok.value };
      }
      if (tok.type === TokenType.EOF) {
        return { type: "Literal", value: void 0 };
      }
      throw new Error(`JPRX: Unexpected token ${tok.type}: ${tok.value}`);
    }
  }
  const evaluateAST = (ast, context, forMutation = false) => {
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
      case "Explosion": {
        const result = resolveArgument(ast.path + "...", context, false);
        return result.value;
      }
      case "Prefix": {
        const opInfo = operators.prefix.get(ast.operator);
        if (!opInfo) {
          throw new Error(`JPRX: Unknown prefix operator: ${ast.operator}`);
        }
        const helper = helpers.get(opInfo.helper);
        if (!helper) {
          throw new Error(`JPRX: Helper "${opInfo.helper}" for operator "${ast.operator}" not found.`);
        }
        const opts = helperOptions.get(opInfo.helper) || {};
        const operand = evaluateAST(ast.operand, context, opts.pathAware);
        return helper(operand);
      }
      case "Postfix": {
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
      case "Infix": {
        const opInfo = operators.infix.get(ast.operator);
        if (!opInfo) {
          throw new Error(`JPRX: Unknown infix operator: ${ast.operator}`);
        }
        const helper = helpers.get(opInfo.helper);
        if (!helper) {
          throw new Error(`JPRX: Helper "${opInfo.helper}" for operator "${ast.operator}" not found.`);
        }
        const opts = helperOptions.get(opInfo.helper) || {};
        const left = evaluateAST(ast.left, context, opts.pathAware);
        const right = evaluateAST(ast.right, context, false);
        const finalArgs = [];
        if (Array.isArray(left) && ast.left.type === "Explosion") finalArgs.push(...left);
        else finalArgs.push(unwrapSignal(left));
        if (Array.isArray(right) && ast.right.type === "Explosion") finalArgs.push(...right);
        else finalArgs.push(unwrapSignal(right));
        return helper(...finalArgs);
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
  const resolveExpression = (expr, context) => {
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
      let funcName = segments.pop().replace(/^\$/, "");
      if (funcName === "" && (segments.length > 0 || fullPath === "/")) {
        funcName = "/";
      }
      const navPath = segments.join("/");
      const isGlobalExpr = expr.startsWith("$/") || expr.startsWith("$");
      let baseContext = context;
      if (navPath && navPath !== "$") {
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
        const useGlobalMode = isGlobalExpr && (navPath === "$" || !navPath);
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
    return LV.computed(() => resolveExpression(expr, context));
  };
  const parseCDOMC = (input) => {
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
      while (i < len2) {
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
          if (/[\s:,{}\[\]"'`()]/.test(char)) {
            break;
          }
        }
        i++;
      }
      const word = input.slice(start, i);
      if (word.startsWith("$")) {
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
      if (char === "$") {
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
              if (/[\s,}\]:]/.test(c) && expr.length > 1) break;
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
      if (/[a-zA-Z_./]/.test(char)) {
        let word = "";
        while (i < len2 && /[a-zA-Z0-9_$/.-]/.test(input[i])) {
          word += input[i];
          i++;
        }
        let j = i;
        while (j < len2 && /\s/.test(input[j])) j++;
        if (input[j] === ":") {
          result += `"${word}"`;
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
  const add = (...args) => args.reduce((a, b) => Number(a) + Number(b), 0);
  const subtract = (a, b) => Number(a) - Number(b);
  const multiply = (...args) => args.reduce((a, b) => Number(a) * Number(b), 1);
  const divide = (a, b) => Number(a) / Number(b);
  const round = (val, decimals = 0) => Number(Math.round(val + "e" + decimals) + "e-" + decimals);
  const ceil = (val) => Math.ceil(val);
  const floor = (val) => Math.floor(val);
  const abs = (val) => Math.abs(val);
  const mod = (a, b) => a % b;
  const pow = (a, b) => Math.pow(a, b);
  const sqrt = (val) => Math.sqrt(val);
  const registerMathHelpers = (register) => {
    register("+", add);
    register("add", add);
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
    register("mod", mod);
    register("pow", pow);
    register("sqrt", sqrt);
  };
  const ifHelper = (condition, thenVal, elseVal) => condition ? thenVal : elseVal;
  const andHelper = (...args) => args.every(Boolean);
  const orHelper = (...args) => args.some(Boolean);
  const notHelper = (val) => !val;
  const eqHelper = (a, b) => a === b;
  const neqHelper = (a, b) => a !== b;
  const registerLogicHelpers = (register) => {
    register("if", ifHelper);
    register("and", andHelper);
    register("&&", andHelper);
    register("or", orHelper);
    register("||", orHelper);
    register("not", notHelper);
    register("!", notHelper);
    register("eq", eqHelper);
    register("==", eqHelper);
    register("===", eqHelper);
    register("neq", neqHelper);
  };
  const join$1 = (...args) => {
    const separator = args[args.length - 1];
    const items = args.slice(0, -1);
    return items.join(separator);
  };
  const concat = (...args) => args.join("");
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
  const contains$1 = (s, search) => String(s).includes(search);
  const startsWith = (s, prefix) => String(s).startsWith(prefix);
  const endsWith = (s, suffix) => String(s).endsWith(suffix);
  const defaultHelper = (val, fallback) => val !== void 0 && val !== null ? val : fallback;
  const registerStringHelpers = (register) => {
    register("join", join$1);
    register("concat", concat);
    register("upper", upper);
    register("lower", lower);
    register("trim", trim);
    register("len", len);
    register("replace", replace);
    register("split", split);
    register("capitalize", capitalize);
    register("titleCase", titleCase);
    register("contains", contains$1);
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
  const contains = (arr, val) => Array.isArray(arr) && arr.includes(val);
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
    register("in", contains);
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
  const registerLookupHelpers = (register) => {
    register("lookup", lookup);
    register("vlookup", vlookup);
    register("index", index);
    register("match", match);
  };
  const sum = (...args) => args.reduce((a, b) => a + (Number(b) || 0), 0);
  const avg = (...args) => args.length === 0 ? 0 : sum(...args) / args.length;
  const min = (...args) => Math.min(...args);
  const max = (...args) => Math.max(...args);
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
    register("min", min);
    register("max", max);
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
  function $state(val, options) {
    if (globalThis.Lightview) {
      const finalOptions = typeof options === "string" ? { name: options } : options;
      return globalThis.Lightview.state(val, finalOptions);
    }
    throw new Error("JPRX: $state requires a UI library implementation.");
  }
  function $signal(val, options) {
    if (globalThis.Lightview) {
      const finalOptions = typeof options === "string" ? { name: options } : options;
      return globalThis.Lightview.signal(val, finalOptions);
    }
    throw new Error("JPRX: $signal requires a UI library implementation.");
  }
  const $bind = (path, options) => ({ __JPRX_BIND__: true, path, options });
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
    register("state", $state);
    register("signal", $signal);
    register("bind", $bind);
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
  registerOperator("increment", "++", "prefix", 80);
  registerOperator("increment", "++", "postfix", 80);
  registerOperator("decrement", "--", "prefix", 80);
  registerOperator("decrement", "--", "postfix", 80);
  registerOperator("toggle", "!!", "prefix", 80);
  registerOperator("+", "+", "infix", 50);
  registerOperator("-", "-", "infix", 50);
  registerOperator("*", "*", "infix", 60);
  registerOperator("/", "/", "infix", 60);
  registerOperator("gt", ">", "infix", 40);
  registerOperator("lt", "<", "infix", 40);
  registerOperator("gte", ">=", "infix", 40);
  registerOperator("lte", "<=", "infix", 40);
  registerOperator("neq", "!=", "infix", 40);
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
      const res = globalThis.Lightview.get(path.replace(/^\$/, ""), { scope: domNode });
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
    const result = resolveExpression(expr, context);
    if (result && typeof result === "object" && result.isLazy) return result.resolve(eventOrNode);
    return result;
  };
  const hydrate = (node, parent = null) => {
    var _a, _b, _c;
    if (!node) return node;
    if (typeof node === "string" && node.startsWith("$")) {
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
          if (typeof attrVal === "string" && attrVal.startsWith("$") && attrKey.startsWith("on")) {
            value[attrKey] = makeEventHandler(attrVal);
          } else if (typeof attrVal === "string" && attrVal.startsWith("$")) {
            value[attrKey] = parseExpression(attrVal, node);
          } else if (typeof attrVal === "object" && attrVal !== null) {
            value[attrKey] = hydrate(attrVal, node);
          }
        }
        continue;
      }
      if (typeof value === "string" && value.startsWith("$")) {
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
    return node;
  };
  const LightviewCDOM2 = {
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
    handleCDOMState: () => {
    },
    handleCDOMBind: () => {
    },
    activate,
    hydrate,
    version: "1.0.0"
  };
  if (typeof window !== "undefined") {
    globalThis.LightviewCDOM = LightviewCDOM2;
  }
  exports.activate = activate;
  exports.default = LightviewCDOM2;
  exports.getContext = getContext;
  exports.hydrate = hydrate;
  Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });
  return exports;
}({});
