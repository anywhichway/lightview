var LightviewCDOM = function(exports) {
  "use strict";
  const helpers = /* @__PURE__ */ new Map();
  const helperOptions = /* @__PURE__ */ new Map();
  const registerHelper = (name, fn, options = {}) => {
    helpers.set(name, fn);
    if (options) helperOptions.set(name, options);
  };
  const getLV = () => globalThis.Lightview || null;
  const getRegistry$1 = () => {
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
    const registry = getRegistry$1();
    if (path === ".") return unwrapSignal(context);
    if (path.startsWith("$/")) {
      const [rootName, ...rest] = path.slice(2).split("/");
      const rootSignal = registry == null ? void 0 : registry.get(rootName);
      if (!rootSignal) return void 0;
      return traverse(rootSignal, rest);
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
    const registry = getRegistry$1();
    if (path === ".") return context;
    if (path.startsWith("$/")) {
      const segments = path.slice(2).split(/[\/.]/);
      const rootName = segments.shift();
      const rootSignal = registry == null ? void 0 : registry.get(rootName);
      if (!rootSignal) return void 0;
      return traverseAsContext(rootSignal, segments);
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
    if (arg === "$event" || arg.startsWith("$event/") || arg.startsWith("$event.")) {
      return {
        value: new LazyValue((event) => {
          if (arg === "$event") return event;
          const path = arg.startsWith("$event.") ? arg.slice(7) : arg.slice(7);
          return resolvePath(path, event);
        }),
        isLazy: true
      };
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
    const isExplosion = arg.endsWith("...");
    const pathStr = isExplosion ? arg.slice(0, -3) : arg;
    let normalizedPath;
    if (pathStr.startsWith("/")) {
      normalizedPath = "$" + pathStr;
    } else if (pathStr.startsWith("$") || pathStr.startsWith("./") || pathStr.startsWith("../")) {
      normalizedPath = pathStr;
    } else if (globalMode) {
      normalizedPath = `$/${pathStr}`;
    } else {
      normalizedPath = `./${pathStr}`;
    }
    if (isExplosion) {
      const pathParts = normalizedPath.split("/");
      const propName = pathParts.pop();
      const parentPath = pathParts.join("/");
      const parent = parentPath ? resolvePath(parentPath, context) : context;
      const unwrappedParent = unwrapSignal(parent);
      if (Array.isArray(unwrappedParent)) {
        const values = unwrappedParent.map((item) => {
          const unwrappedItem = unwrapSignal(item);
          return unwrappedItem && unwrappedItem[propName];
        });
        return { value: values, isExplosion: true };
      } else if (unwrappedParent && typeof unwrappedParent === "object") {
        const val = unwrappedParent[propName];
        return { value: unwrapSignal(val), isExplosion: true };
      }
      return { value: void 0, isExplosion: true };
    }
    const value = resolvePathAsContext(normalizedPath, context);
    return { value, isExplosion: false };
  };
  const resolveExpression = (expr, context) => {
    var _a;
    if (typeof expr !== "string") return expr;
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
        (_a = globalThis.console) == null ? void 0 : _a.warn(`LightviewCDOM: Helper "${funcName}" not found.`);
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
        let val = shouldUnwrap ? unwrapSignal(res.value) : res.value;
        if (res.isExplosion && Array.isArray(val)) {
          resolvedArgs.push(...val.map((v) => shouldUnwrap ? unwrapSignal(v) : v));
        } else {
          resolvedArgs.push(val);
        }
      }
      if (hasLazy) {
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
    if (transform && transform.isLazy) {
      return arr.map((item) => transform.resolve(item));
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
    register("filter", filter);
    register("map", map);
    register("find", find);
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
    dependencyMap: /* @__PURE__ */ new WeakMap()
    // Tracking signals -> subscribers
  });
  const signal = (initialValue, optionsOrName) => {
    let name = typeof optionsOrName === "string" ? optionsOrName : optionsOrName == null ? void 0 : optionsOrName.name;
    const storage = optionsOrName == null ? void 0 : optionsOrName.storage;
    if (name && storage) {
      try {
        const stored = storage.getItem(name);
        if (stored !== null) {
          initialValue = JSON.parse(stored);
        }
      } catch (e) {
      }
    }
    let value = initialValue;
    const subscribers = /* @__PURE__ */ new Set();
    const f = (...args) => {
      if (args.length === 0) return f.value;
      f.value = args[0];
    };
    Object.defineProperty(f, "value", {
      get() {
        if (_LV.currentEffect) {
          subscribers.add(_LV.currentEffect);
          _LV.currentEffect.dependencies.add(subscribers);
        }
        return value;
      },
      set(newValue) {
        if (value !== newValue) {
          value = newValue;
          if (name && storage) {
            try {
              storage.setItem(name, JSON.stringify(value));
            } catch (e) {
            }
          }
          [...subscribers].forEach((effect2) => effect2());
        }
      }
    });
    if (name) {
      if (_LV.registry.has(name)) {
        if (_LV.registry.get(name) !== f) {
          throw new Error(`Lightview: A signal or state with the name "${name}" is already registered.`);
        }
      } else {
        _LV.registry.set(name, f);
      }
    }
    return f;
  };
  const getSignal = (name, defaultValue) => {
    if (!_LV.registry.has(name) && defaultValue !== void 0) {
      return signal(defaultValue, name);
    }
    return _LV.registry.get(name);
  };
  signal.get = getSignal;
  const effect = (fn) => {
    const execute = () => {
      if (!execute.active || execute.running) return;
      execute.dependencies.forEach((dep) => dep.delete(execute));
      execute.dependencies.clear();
      execute.running = true;
      _LV.currentEffect = execute;
      try {
        fn();
      } finally {
        _LV.currentEffect = null;
        execute.running = false;
      }
    };
    execute.active = true;
    execute.running = false;
    execute.dependencies = /* @__PURE__ */ new Set();
    execute.stop = () => {
      execute.dependencies.forEach((dep) => dep.delete(execute));
      execute.dependencies.clear();
      execute.active = false;
    };
    execute();
    return execute;
  };
  const getRegistry = () => _LV.registry;
  const stateCache = /* @__PURE__ */ new WeakMap();
  const stateSignals = /* @__PURE__ */ new WeakMap();
  const parents = /* @__PURE__ */ new WeakMap();
  const protoMethods = (proto, test) => Object.getOwnPropertyNames(proto).filter((k) => typeof proto[k] === "function" && test(k));
  const DATE_TRACKING = protoMethods(Date.prototype, (k) => /^(to|get|valueOf)/.test(k));
  const DATE_MUTATING = protoMethods(Date.prototype, (k) => /^set/.test(k));
  const ARRAY_TRACKING = [
    "map",
    "forEach",
    "filter",
    "find",
    "findIndex",
    "some",
    "every",
    "reduce",
    "reduceRight",
    "includes",
    "indexOf",
    "lastIndexOf",
    "join",
    "slice",
    "concat",
    "flat",
    "flatMap",
    "at",
    "entries",
    "keys",
    "values"
  ];
  const ARRAY_MUTATING = ["push", "pop", "shift", "unshift", "splice", "sort", "reverse", "fill", "copyWithin"];
  const ARRAY_ITERATION = ["map", "forEach", "filter", "find", "findIndex", "some", "every", "flatMap"];
  const getOrSet = (map2, key, factory) => {
    let v = map2.get(key);
    if (!v) {
      v = factory();
      map2.set(key, v);
    }
    return v;
  };
  const proxyGet = (target, prop, receiver, signals) => {
    if (prop === "__parent__") return parents.get(receiver);
    if (!signals.has(prop)) {
      signals.set(prop, signal(Reflect.get(target, prop, receiver)));
    }
    const signal$1 = signals.get(prop);
    const val = signal$1.value;
    if (typeof val === "object" && val !== null) {
      const childProxy = state(val);
      parents.set(childProxy, receiver);
      return childProxy;
    }
    return val;
  };
  const proxySet = (target, prop, value, receiver, signals) => {
    if (!signals.has(prop)) {
      signals.set(prop, signal(Reflect.get(target, prop, receiver)));
    }
    const success = Reflect.set(target, prop, value, receiver);
    const signal$1 = signals.get(prop);
    if (success && signal$1) signal$1.value = value;
    return success;
  };
  const createSpecialProxy = (obj, monitor, trackingProps = []) => {
    const signals = getOrSet(stateSignals, obj, () => /* @__PURE__ */ new Map());
    if (!signals.has(monitor)) {
      const initialValue = typeof obj[monitor] === "function" ? obj[monitor].call(obj) : obj[monitor];
      signals.set(monitor, signal(initialValue));
    }
    const isDate = obj instanceof Date;
    const isArray = Array.isArray(obj);
    const trackingMethods = isDate ? DATE_TRACKING : isArray ? ARRAY_TRACKING : trackingProps;
    const mutatingMethods = isDate ? DATE_MUTATING : isArray ? ARRAY_MUTATING : [];
    return new Proxy(obj, {
      get(target, prop, receiver) {
        if (prop === "__parent__") return parents.get(receiver);
        const value = target[prop];
        if (typeof value === "function") {
          const isTracking = trackingMethods.includes(prop);
          const isMutating = mutatingMethods.includes(prop);
          return function(...args) {
            if (isTracking) {
              const sig = signals.get(monitor);
              if (sig) void sig.value;
            }
            const startValue = typeof target[monitor] === "function" ? target[monitor].call(target) : target[monitor];
            if (isArray && ARRAY_ITERATION.includes(prop) && typeof args[0] === "function") {
              const originalCallback = args[0];
              args[0] = function(element, index2, array) {
                const wrappedElement = typeof element === "object" && element !== null ? state(element) : element;
                if (wrappedElement && typeof wrappedElement === "object") {
                  parents.set(wrappedElement, receiver);
                }
                return originalCallback.call(this, wrappedElement, index2, array);
              };
            }
            const result = value.apply(target, args);
            const endValue = typeof target[monitor] === "function" ? target[monitor].call(target) : target[monitor];
            if (startValue !== endValue || isMutating) {
              const sig = signals.get(monitor);
              if (sig && sig.value !== endValue) {
                sig.value = endValue;
              }
            }
            return result;
          };
        }
        if (prop === monitor) {
          const sig = signals.get(monitor);
          return sig ? sig.value : Reflect.get(target, prop, receiver);
        }
        if (isArray && !isNaN(parseInt(prop))) {
          const monitorSig = signals.get(monitor);
          if (monitorSig) void monitorSig.value;
        }
        return proxyGet(target, prop, receiver, signals);
      },
      set(target, prop, value, receiver) {
        if (prop === monitor) {
          const success = Reflect.set(target, prop, value, receiver);
          if (success) {
            const sig = signals.get(monitor);
            if (sig) sig.value = value;
          }
          return success;
        }
        return proxySet(target, prop, value, receiver, signals);
      }
    });
  };
  const state = (obj, optionsOrName) => {
    if (typeof obj !== "object" || obj === null) return obj;
    const name = typeof optionsOrName === "string" ? optionsOrName : optionsOrName == null ? void 0 : optionsOrName.name;
    const storage = optionsOrName == null ? void 0 : optionsOrName.storage;
    if (name && storage) {
      try {
        const item = storage.getItem(name);
        if (item) {
          const loaded = JSON.parse(item);
          Array.isArray(obj) && Array.isArray(loaded) ? (obj.length = 0, obj.push(...loaded)) : Object.assign(obj, loaded);
        }
      } catch (e) {
      }
    }
    let proxy = stateCache.get(obj);
    if (!proxy) {
      const isArray = Array.isArray(obj), isDate = obj instanceof Date;
      const isSpecial = isArray || isDate;
      const monitor = isArray ? "length" : isDate ? "getTime" : null;
      if (isSpecial || !(obj instanceof RegExp || obj instanceof Map || obj instanceof Set || obj instanceof WeakMap || obj instanceof WeakSet)) {
        proxy = isSpecial ? createSpecialProxy(obj, monitor) : new Proxy(obj, {
          get(t, p, r) {
            if (p === "__parent__") return parents.get(r);
            return proxyGet(t, p, r, getOrSet(stateSignals, t, () => /* @__PURE__ */ new Map()));
          },
          set(t, p, v, r) {
            return proxySet(t, p, v, r, getOrSet(stateSignals, t, () => /* @__PURE__ */ new Map()));
          }
        });
        stateCache.set(obj, proxy);
      } else return obj;
    }
    if (name && storage) {
      effect(() => {
        try {
          storage.setItem(name, JSON.stringify(proxy));
        } catch (e) {
        }
      });
    }
    if (name) {
      const registry = getRegistry();
      if (registry.has(name)) {
        if (registry.get(name) !== proxy) {
          throw new Error(`Lightview: A signal or state with the name "${name}" is already registered.`);
        }
      } else {
        registry.set(name, proxy);
      }
    }
    return proxy;
  };
  const getState = (name, defaultValue) => {
    const registry = getRegistry();
    if (!registry.has(name) && defaultValue !== void 0) {
      return state(defaultValue, name);
    }
    return registry.get(name);
  };
  state.get = getState;
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
  const localStates = /* @__PURE__ */ new WeakMap();
  const getContext = (node, event = null) => {
    const chain = [];
    let cur = node;
    const ShadowRoot = globalThis.ShadowRoot;
    while (cur) {
      const local = localStates.get(cur);
      if (local) chain.unshift(local);
      cur = cur.parentElement || (ShadowRoot && cur.parentNode instanceof ShadowRoot ? cur.parentNode.host : null);
    }
    const globalRegistry = getRegistry();
    const handler = {
      get(target, prop, receiver) {
        var _a;
        if (prop === "$event" || prop === "event") return event;
        if (prop === "__parent__") return void 0;
        for (let i = chain.length - 1; i >= 0; i--) {
          const s = chain[i];
          if (prop in s) return s[prop];
        }
        if (globalRegistry && globalRegistry.has(prop)) return globalRegistry.get(prop);
        const globalState = (_a = globalThis.Lightview) == null ? void 0 : _a.state;
        if (globalState && prop in globalState) return globalState[prop];
        return void 0;
      },
      set(target, prop, value, receiver) {
        var _a;
        for (let i = chain.length - 1; i >= 0; i--) {
          const s = chain[i];
          if (prop in s) {
            s[prop] = value;
            return true;
          }
        }
        if (chain.length > 0) {
          chain[chain.length - 1][prop] = value;
          return true;
        }
        const globalState = (_a = globalThis.Lightview) == null ? void 0 : _a.state;
        if (globalState) {
          globalState[prop] = value;
          return true;
        }
        return false;
      },
      has(target, prop) {
        var _a;
        if (prop === "$event" || prop === "event") return !!event;
        for (const s of chain) if (prop in s) return true;
        const globalState = (_a = globalThis.Lightview) == null ? void 0 : _a.state;
        if (globalState && prop in globalState) return true;
        return false;
      },
      ownKeys(target) {
        var _a;
        const keys = /* @__PURE__ */ new Set();
        if (event) {
          keys.add("$event");
          keys.add("event");
        }
        for (const s of chain) {
          for (const key in s) keys.add(key);
        }
        const globalState = (_a = globalThis.Lightview) == null ? void 0 : _a.state;
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
  const handleCDOMState = (node) => {
    var _a;
    const attr = node["cdom-state"] || node.getAttribute("cdom-state");
    if (!attr || localStates.has(node)) return;
    try {
      const data = typeof attr === "object" ? attr : JSON.parse(attr);
      const s = state(data);
      localStates.set(node, s);
    } catch (e) {
      (_a = globalThis.console) == null ? void 0 : _a.error("LightviewCDOM: Failed to parse cdom-state", e);
    }
  };
  const handleCDOMBind = (node) => {
    const path = node["cdom-bind"] || node.getAttribute("cdom-bind");
    if (!path) return;
    const type = node.type || "";
    const tagName = node.tagName.toLowerCase();
    let prop = "value";
    let event = "input";
    if (type === "checkbox" || type === "radio") {
      prop = "checked";
      event = "change";
    } else if (tagName === "select") {
      event = "change";
    }
    const context = getContext(node);
    let target = resolvePathAsContext(path, context);
    if (target && target.isBindingTarget && target.value === void 0) {
      const val = node[prop];
      if (val !== void 0 && val !== "") {
        set(context, { [target.key]: val });
        target = resolvePathAsContext(path, context);
      }
    }
    effect(() => {
      const val = unwrapSignal(target);
      if (node[prop] !== val) {
        node[prop] = val === void 0 ? "" : val;
      }
    });
    node.addEventListener(event, () => {
      const val = node[prop];
      if (target && target.isBindingTarget) {
        target.value = val;
      } else {
        set(context, { [path]: val });
      }
    });
  };
  const activate = (root = document.body) => {
    const walk = (node) => {
      if (node.nodeType === 1) {
        if (node.hasAttribute("cdom-state")) handleCDOMState(node);
        if (node.hasAttribute("cdom-bind")) handleCDOMBind(node);
      }
      let child = node.firstChild;
      while (child) {
        walk(child);
        child = child.nextSibling;
      }
    };
    walk(root);
  };
  const hydrate = (node, parent = null) => {
    if (!node) return node;
    if (typeof node === "string" && node.startsWith("$")) {
      return parseExpression(node, parent);
    }
    if (Array.isArray(node)) {
      return node.map((item) => hydrate(item, parent));
    }
    if (node instanceof String) {
      return node.toString();
    }
    if (typeof node === "object" && node !== null) {
      if (parent && !("__parent__" in node)) {
        Object.defineProperty(node, "__parent__", {
          value: parent,
          enumerable: false,
          writable: true,
          configurable: true
        });
      }
      if (!node.tag) {
        let potentialTag = null;
        for (const key in node) {
          if (key === "children" || key === "attributes" || key === "tag" || key.startsWith("cdom-") || key.startsWith("on") || key === "__parent__") {
            continue;
          }
          const attrNames = [
            // Form/input attributes
            "type",
            "name",
            "value",
            "placeholder",
            "step",
            "min",
            "max",
            "pattern",
            "disabled",
            "checked",
            "selected",
            "readonly",
            "required",
            "multiple",
            "rows",
            "cols",
            "size",
            "maxlength",
            "minlength",
            "autocomplete",
            // Common element attributes
            "id",
            "class",
            "className",
            "style",
            "title",
            "tabindex",
            "role",
            "href",
            "src",
            "alt",
            "width",
            "height",
            "target",
            "rel",
            // Data attributes
            "data",
            "label",
            "text",
            "description",
            "content",
            // Common data property names
            "price",
            "qty",
            "items",
            "count",
            "total",
            "amount",
            "url"
          ];
          if (attrNames.includes(key)) {
            continue;
          }
          potentialTag = key;
          break;
        }
        if (potentialTag) {
          const content = node[potentialTag];
          if (content !== void 0 && content !== null) {
            node.tag = potentialTag;
            if (Array.isArray(content)) {
              node.children = content;
            } else if (typeof content === "object") {
              node.attributes = node.attributes || {};
              for (const k in content) {
                if (k === "children") {
                  node.children = content[k];
                } else if (k.startsWith("cdom-")) {
                  node[k] = content[k];
                } else {
                  node.attributes[k] = content[k];
                }
              }
            } else {
              node.children = [content];
            }
            delete node[potentialTag];
          }
        }
      }
      for (const key in node) {
        const value = node[key];
        if (key === "cdom-state") {
          continue;
        }
        if (typeof value === "string" && value.startsWith("$")) {
          if (key.startsWith("on")) {
            node[key] = (event) => {
              const element = event.currentTarget;
              const context = getContext(element, event);
              const result = resolveExpression(value, context);
              if (result && typeof result === "object" && result.isLazy && typeof result.resolve === "function") {
                return result.resolve(event);
              }
              return result;
            };
          } else if (key === "children") {
            node[key] = [parseExpression(value, node)];
          } else {
            node[key] = parseExpression(value, node);
          }
        } else if (key === "attributes" && typeof value === "object" && value !== null) {
          for (const attrKey in value) {
            const attrValue = value[attrKey];
            if (typeof attrValue === "string" && attrValue.startsWith("$")) {
              if (attrKey.startsWith("on")) {
                value[attrKey] = (event) => {
                  const element = event.currentTarget;
                  const context = getContext(element, event);
                  const result = resolveExpression(attrValue, context);
                  if (result && typeof result === "object" && result.isLazy && typeof result.resolve === "function") {
                    return result.resolve(event);
                  }
                  return result;
                };
              } else {
                value[attrKey] = parseExpression(attrValue, node);
              }
            }
          }
          node[key] = value;
        } else {
          node[key] = hydrate(value, node);
        }
      }
      return node;
    }
    return node;
  };
  const LightviewCDOM2 = {
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
    version: "1.0.0"
  };
  if (typeof window !== "undefined") {
    globalThis.LightviewCDOM = LightviewCDOM2;
  }
  exports.activate = activate;
  exports.default = LightviewCDOM2;
  exports.getContext = getContext;
  exports.handleCDOMBind = handleCDOMBind;
  exports.handleCDOMState = handleCDOMState;
  exports.hydrate = hydrate;
  Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });
  return exports;
}({});
