(function() {
  "use strict";
  var _a, _b;
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
  const lookup = (name, scope) => {
    let current = scope;
    while (current && typeof current === "object") {
      const registry = _LV.localRegistries.get(current);
      if (registry && registry.has(name)) return registry.get(name);
      current = current.parentElement || _LV.parents.get(current);
    }
    return _LV.registry.get(name);
  };
  const signal = (initialValue, optionsOrName) => {
    const name = typeof optionsOrName === "string" ? optionsOrName : optionsOrName == null ? void 0 : optionsOrName.name;
    const storage = optionsOrName == null ? void 0 : optionsOrName.storage;
    const scope = optionsOrName == null ? void 0 : optionsOrName.scope;
    if (name && storage) {
      try {
        const stored = storage.getItem(name);
        if (stored !== null) initialValue = JSON.parse(stored);
      } catch (e) {
      }
    }
    let value = initialValue;
    const subscribers = /* @__PURE__ */ new Set();
    const f = (...args) => args.length === 0 ? f.value : f.value = args[0];
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
      const registry = scope && typeof scope === "object" ? _LV.localRegistries.get(scope) || _LV.localRegistries.set(scope, /* @__PURE__ */ new Map()).get(scope) : _LV.registry;
      if (registry && registry.has(name) && registry.get(name) !== f) {
        throw new Error(`Lightview: A signal or state with the name "${name}" is already registered.`);
      }
      if (registry) registry.set(name, f);
      const futures = _LV.futureSignals.get(name);
      if (futures) {
        futures.forEach((resolve) => resolve(f));
      }
    }
    return f;
  };
  const getSignal = (name, defaultValueOrOptions) => {
    const options = typeof defaultValueOrOptions === "object" && defaultValueOrOptions !== null ? defaultValueOrOptions : { defaultValue: defaultValueOrOptions };
    const { scope, defaultValue } = options;
    const existing = lookup(name, scope);
    if (existing) return existing;
    if (defaultValue !== void 0) return signal(defaultValue, { name, scope });
    const future = signal(void 0);
    const handler = (realSignal) => {
      future.value = realSignal.value;
      effect(() => {
        future.value = realSignal.value;
      });
    };
    if (!_LV.futureSignals.has(name)) _LV.futureSignals.set(name, /* @__PURE__ */ new Set());
    _LV.futureSignals.get(name).add(handler);
    return future;
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
  const internals = _LV;
  const stateCache = /* @__PURE__ */ new WeakMap();
  const stateSignals = /* @__PURE__ */ new WeakMap();
  const stateSchemas = /* @__PURE__ */ new WeakMap();
  const { parents, schemas, hooks } = internals;
  const validate = (target, prop, value, schema) => {
    var _a2, _b2;
    const current = target[prop];
    const type = typeof current;
    const isNew = !(prop in target);
    let behavior = schema;
    if (typeof schema === "object" && schema !== null) behavior = schema.type;
    if (behavior === "auto" && isNew) throw new Error(`Lightview: Cannot add new property "${prop}" to fixed 'auto' state.`);
    if (behavior === "polymorphic" || typeof behavior === "object" && (behavior == null ? void 0 : behavior.coerce)) {
      if (type === "number") return Number(value);
      if (type === "boolean") return Boolean(value);
      if (type === "string") return String(value);
    } else if (behavior === "auto" || behavior === "dynamic") {
      if (!isNew && typeof value !== type) {
        throw new Error(`Lightview: Type mismatch for "${prop}". Expected ${type}, got ${typeof value}.`);
      }
    }
    if (typeof schema === "object" && schema !== null && schema.transform) {
      const trans = schema.transform;
      const transformFn = typeof trans === "function" ? trans : internals.helpers.get(trans) || ((_b2 = (_a2 = globalThis.Lightview) == null ? void 0 : _a2.helpers) == null ? void 0 : _b2[trans]);
      if (transformFn) value = transformFn(value);
    }
    if (hooks.validate(value, schema) === false) {
      throw new Error(`Lightview: Validation failed for "${prop}".`);
    }
    return value;
  };
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
  const getOrSet = (map, key, factory) => {
    let v = map.get(key);
    if (!v) {
      v = factory();
      map.set(key, v);
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
    const schema = stateSchemas.get(receiver);
    const validatedValue = schema ? validate(target, prop, value, schema) : value;
    if (!signals.has(prop)) {
      signals.set(prop, signal(Reflect.get(target, prop, receiver)));
    }
    const success = Reflect.set(target, prop, validatedValue, receiver);
    const signal$1 = signals.get(prop);
    if (success && signal$1) signal$1.value = validatedValue;
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
              args[0] = function(element, index, array) {
                const wrappedElement = typeof element === "object" && element !== null ? state(element) : element;
                if (wrappedElement && typeof wrappedElement === "object") {
                  parents.set(wrappedElement, receiver);
                }
                return originalCallback.call(this, wrappedElement, index, array);
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
    const scope = optionsOrName == null ? void 0 : optionsOrName.scope;
    const schema = optionsOrName == null ? void 0 : optionsOrName.schema;
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
    if (schema) stateSchemas.set(proxy, schema);
    if (name && storage) {
      effect(() => {
        try {
          storage.setItem(name, JSON.stringify(proxy));
        } catch (e) {
        }
      });
    }
    if (name) {
      const registry = scope && typeof scope === "object" ? internals.localRegistries.get(scope) || internals.localRegistries.set(scope, /* @__PURE__ */ new Map()).get(scope) : getRegistry();
      if (registry && registry.has(name) && registry.get(name) !== proxy) {
        throw new Error(`Lightview: A signal or state with the name "${name}" is already registered.`);
      }
      if (registry) registry.set(name, proxy);
      const futures = internals.futureSignals.get(name);
      if (futures) {
        futures.forEach((resolve) => resolve(proxy));
      }
    }
    return proxy;
  };
  const getState = (name, defaultValueOrOptions) => {
    const options = typeof defaultValueOrOptions === "object" && defaultValueOrOptions !== null ? defaultValueOrOptions : { defaultValue: defaultValueOrOptions };
    const { scope, defaultValue } = options;
    const existing = lookup(name, scope);
    if (existing) return existing;
    if (defaultValue !== void 0) return state(defaultValue, { name, scope });
    const future = signal(void 0);
    const handler = (realState) => {
      future.value = realState;
    };
    if (!internals.futureSignals.has(name)) internals.futureSignals.set(name, /* @__PURE__ */ new Set());
    internals.futureSignals.get(name).add(handler);
    return future;
  };
  state.get = getState;
  const STANDARD_SRC_TAGS = ["img", "script", "iframe", "video", "audio", "source", "track", "embed", "input"];
  const isStandardSrcTag = (tagName) => STANDARD_SRC_TAGS.includes(tagName) || tagName.startsWith("lv-");
  const STANDARD_HREF_TAGS = ["a", "area", "base", "link"];
  const isValidTagName = (name) => typeof name === "string" && name.length > 0 && name !== "children";
  const isDangerousProtocol = (url) => {
    if (!url || typeof url !== "string") return false;
    const normalized = url.trim().toLowerCase();
    return normalized.startsWith("javascript:") || normalized.startsWith("vbscript:") || normalized.startsWith("data:text/html") || normalized.startsWith("data:application/javascript");
  };
  const validateUrl = (url) => {
    if (!url) return false;
    if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) return true;
    try {
      const base = typeof document !== "undefined" ? document.baseURI : globalThis.location.origin;
      const target = new URL(url, base === "null" ? void 0 : base);
      const current = globalThis.location;
      if (target.origin === current.origin && target.origin !== "null") return true;
      if (target.hostname && target.hostname === current.hostname) return true;
      if (target.hostname && current.hostname && target.hostname.endsWith("." + current.hostname)) return true;
      if (current.protocol === "file:" && target.protocol === "file:") return true;
      return false;
    } catch (e) {
      return false;
    }
  };
  const isObjectDOM = (obj) => {
    if (typeof obj !== "object" || obj === null || Array.isArray(obj) || obj.tag || obj.domEl) return false;
    const keys = Object.keys(obj);
    return keys.length === 1 && isValidTagName(keys[0]) && typeof obj[keys[0]] === "object";
  };
  const convertObjectDOM = (obj) => {
    var _a2, _b2;
    if (typeof obj !== "object" || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(convertObjectDOM);
    if (obj.tag) return { ...obj, children: obj.children ? convertObjectDOM(obj.children) : [] };
    if (obj.domEl || !isObjectDOM(obj)) return obj;
    const tagKey = Object.keys(obj)[0];
    const content = obj[tagKey];
    const LV = typeof window !== "undefined" ? globalThis.Lightview : typeof globalThis !== "undefined" ? globalThis.Lightview : null;
    const tag = ((_b2 = (_a2 = LV == null ? void 0 : LV.tags) == null ? void 0 : _a2._customTags) == null ? void 0 : _b2[tagKey]) || tagKey;
    const { children, ...attributes } = content;
    return { tag, attributes, children: children ? convertObjectDOM(children) : [] };
  };
  const DAISYUI_CDN = "https://cdn.jsdelivr.net/npm/daisyui@4.12.23/dist/full.min.css";
  const componentConfig = {
    initialized: false,
    shadowDefault: true,
    // Default: components use shadow DOM
    daisyStyleSheet: null,
    themeStyleSheet: null,
    // Global theme stylesheet
    componentStyleSheets: /* @__PURE__ */ new Map(),
    customStyleSheets: /* @__PURE__ */ new Map(),
    // Registry for named custom stylesheets
    customStyleSheetPromises: /* @__PURE__ */ new Map()
    // Cache for pending stylesheet fetches
  };
  const registerStyleSheet = async (nameOrIdOrUrl, cssText) => {
    if (componentConfig.customStyleSheets.has(nameOrIdOrUrl)) return componentConfig.customStyleSheets.get(nameOrIdOrUrl);
    if (componentConfig.customStyleSheetPromises.has(nameOrIdOrUrl)) return componentConfig.customStyleSheetPromises.get(nameOrIdOrUrl);
    const promise = (async () => {
      try {
        let finalCss = cssText;
        if (finalCss === void 0) {
          if (nameOrIdOrUrl.startsWith("#")) {
            const el = document.querySelector(nameOrIdOrUrl);
            if (el) {
              finalCss = el.textContent;
            } else {
              throw new Error(`Style block '${nameOrIdOrUrl}' not found`);
            }
          } else {
            const response = await fetch(nameOrIdOrUrl);
            if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
            finalCss = await response.text();
          }
        }
        if (finalCss !== void 0) {
          const sheet = new CSSStyleSheet();
          sheet.replaceSync(finalCss);
          componentConfig.customStyleSheets.set(nameOrIdOrUrl, sheet);
          return sheet;
        }
      } catch (e) {
        console.error(`LightviewX: Failed to register stylesheet '${nameOrIdOrUrl}':`, e);
      } finally {
        componentConfig.customStyleSheetPromises.delete(nameOrIdOrUrl);
      }
    })();
    componentConfig.customStyleSheetPromises.set(nameOrIdOrUrl, promise);
    return promise;
  };
  const getSavedTheme = () => {
    try {
      if (typeof localStorage !== "undefined") {
        return localStorage.getItem("lightview-theme");
      }
    } catch (e) {
      return null;
    }
  };
  const themeSignal = signal(
    typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") || getSavedTheme() || "light"
  );
  const setTheme = (themeName) => {
    if (!themeName) return;
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", themeName);
    }
    if (themeSignal && themeSignal.value !== themeName) {
      themeSignal.value = themeName;
    }
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("lightview-theme", themeName);
      }
    } catch (e) {
    }
  };
  const registerThemeSheet = async (url) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch theme CSS: ${response.status}`);
      const cssText = await response.text();
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(cssText);
      componentConfig.themeStyleSheet = sheet;
    } catch (e) {
      console.error(`LightviewX: Failed to register theme stylesheet '${url}':`, e);
    }
  };
  const initComponents = async (options = {}) => {
    const { shadowDefault = true } = options;
    componentConfig.shadowDefault = shadowDefault;
    if (shadowDefault) {
      try {
        const response = await fetch(DAISYUI_CDN);
        if (!response.ok) {
          throw new Error(`Failed to fetch DaisyUI CSS: ${response.status}`);
        }
        const cssText = await response.text();
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(cssText);
        componentConfig.daisyStyleSheet = sheet;
      } catch (e) {
        console.error("LightviewX: Failed to preload DaisyUI stylesheet:", e);
      }
    }
    componentConfig.initialized = true;
  };
  (async () => await initComponents())();
  const getComponentStyleSheet = async (cssUrl) => {
    if (componentConfig.componentStyleSheets.has(cssUrl)) {
      return componentConfig.componentStyleSheets.get(cssUrl);
    }
    try {
      const response = await fetch(cssUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch component CSS: ${response.status}`);
      }
      const cssText = await response.text();
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(cssText);
      componentConfig.componentStyleSheets.set(cssUrl, sheet);
      return sheet;
    } catch (e) {
      console.error(`LightviewX: Failed to create stylesheet for ${cssUrl}:`, e);
      return null;
    }
  };
  const shouldUseShadow = (useShadowProp) => {
    if (useShadowProp !== void 0) {
      return useShadowProp;
    }
    return componentConfig.shadowDefault;
  };
  const getAdoptedStyleSheets = (componentCssUrl, requestedSheets = []) => {
    const result = [];
    if (componentConfig.daisyStyleSheet) {
      result.push(componentConfig.daisyStyleSheet);
    } else {
      result.push(DAISYUI_CDN);
    }
    if (componentConfig.themeStyleSheet) {
      result.push(componentConfig.themeStyleSheet);
    }
    if (componentCssUrl) {
      const componentSheet = componentConfig.componentStyleSheets.get(componentCssUrl);
      if (componentSheet) {
        result.push(componentSheet);
      }
    }
    if (Array.isArray(requestedSheets)) {
      requestedSheets.forEach((url) => {
        const sheet = componentConfig.customStyleSheets.get(url);
        if (sheet) {
          result.push(sheet);
        } else {
          registerStyleSheet(url);
          result.push(url);
        }
      });
    }
    return result;
  };
  const preloadComponentCSS = async (cssUrl) => {
    if (!componentConfig.componentStyleSheets.has(cssUrl)) {
      await getComponentStyleSheet(cssUrl);
    }
  };
  const compileTemplate = (code) => {
    try {
      const isSingle = code.trim().startsWith("${") && code.trim().endsWith("}") && !code.trim().includes("${", 2);
      const body = isSingle ? "return " + code.trim().slice(2, -1) : "return `" + code.replace(/\\/g, "\\\\").replace(/`/g, "\\`") + "`";
      return new Function("state", "signal", body);
    } catch (e) {
      return () => "";
    }
  };
  const processTemplateChild = (child, LV) => {
    if (typeof child === "string" && child.includes("${")) {
      const fn = compileTemplate(child);
      return () => fn(LV.state, LV.signal);
    }
    return child;
  };
  const transformTextNode = (node, isRaw, LV) => {
    const text = node.textContent;
    if (isRaw) return text;
    if (!text.trim() && !text.includes("${")) return null;
    if (text.includes("${")) {
      const fn = compileTemplate(text);
      return () => fn(LV.state, LV.signal);
    }
    return text;
  };
  const transformElementNode = (node, element, domToElements2) => {
    const tagName = node.tagName.toLowerCase();
    const attributes = {};
    const skip = tagName === "script" || tagName === "style";
    const LV = typeof window !== "undefined" ? globalThis.Lightview : typeof globalThis !== "undefined" ? globalThis.Lightview : null;
    for (let attr of node.attributes) {
      const val = attr.value;
      attributes[attr.name] = !skip && val.includes("${") ? (() => {
        const fn = compileTemplate(val);
        return () => fn(LV.state, LV.signal);
      })() : val;
    }
    return element(tagName, attributes, domToElements2(Array.from(node.childNodes), element, tagName));
  };
  const domToElements = (domNodes, element, parentTagName = null) => {
    const isRaw = parentTagName === "script" || parentTagName === "style";
    const LV = globalThis.Lightview;
    return domNodes.map((node) => {
      if (node.nodeType === Node.TEXT_NODE) return transformTextNode(node, isRaw, LV);
      if (node.nodeType === Node.ELEMENT_NODE) return transformElementNode(node, element, domToElements);
      return null;
    }).filter((n) => n !== null);
  };
  const insertedContentMap = /* @__PURE__ */ new WeakMap();
  const hashContent = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  };
  const createMarker = (id, isEnd = false) => {
    return document.createComment(`lv-src-${isEnd ? "end" : "start"}:${id}`);
  };
  const executeScripts = (container) => {
    if (!container) return;
    const scripts = container.querySelectorAll("script");
    scripts.forEach((oldScript) => {
      const newScript = document.createElement("script");
      Array.from(oldScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });
      if (oldScript.src) {
        newScript.src = oldScript.src;
      } else {
        newScript.textContent = oldScript.textContent;
      }
      oldScript.parentNode.replaceChild(newScript, oldScript);
    });
  };
  const removeInsertedContent = (parentEl, markerId) => {
    const startMarker = `lv-src-start:${markerId}`;
    const endMarker = `lv-src-end:${markerId}`;
    let inRange = false;
    const nodesToRemove = [];
    const walker = document.createTreeWalker(
      parentEl.parentElement || parentEl,
      NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      null,
      false
    );
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.nodeType === Node.COMMENT_NODE) {
        if (node.textContent === startMarker) {
          inRange = true;
          nodesToRemove.push(node);
          continue;
        }
        if (node.textContent === endMarker) {
          nodesToRemove.push(node);
          break;
        }
      }
      if (inRange) {
        nodesToRemove.push(node);
      }
    }
    nodesToRemove.forEach((node) => node.remove());
    return nodesToRemove.length > 0;
  };
  const insert = (elements, parent, location, markerId, { element, setupChildren }) => {
    const isSibling = location === "beforebegin" || location === "afterend";
    const isOuter = location === "outerhtml";
    const target = isSibling || isOuter ? parent.parentElement : parent;
    if (!target) return console.warn(`LightviewX: No parent for ${location}`);
    const frag = document.createDocumentFragment();
    frag.appendChild(createMarker(markerId, false));
    elements.forEach((c) => {
      var _a2, _b2, _c;
      if (typeof c === "string") frag.appendChild(document.createTextNode(c));
      else if (c.domEl) frag.appendChild(c.domEl);
      else if (c instanceof Node) frag.appendChild(c);
      else {
        const v = ((_c = (_a2 = globalThis.Lightview) == null ? void 0 : (_b2 = _a2.hooks).processChild) == null ? void 0 : _c.call(_b2, c)) || c;
        if (v.tag) {
          const n = element(v.tag, v.attributes || {}, v.children || []);
          if (n == null ? void 0 : n.domEl) frag.appendChild(n.domEl);
        }
      }
    });
    frag.appendChild(createMarker(markerId, true));
    if (isOuter) target.replaceChild(frag, parent);
    else if (location === "beforebegin") target.insertBefore(frag, parent);
    else if (location === "afterend") target.insertBefore(frag, parent.nextSibling);
    else if (location === "afterbegin") parent.insertBefore(frag, parent.firstChild);
    else if (location === "beforeend") parent.appendChild(frag);
    executeScripts(target);
  };
  const isPath = (s) => typeof s === "string" && !isDangerousProtocol(s) && /^(https?:|\.|\/|[\w])|(\.(html|json|[vo]dom|cdomc?))$/i.test(s);
  const fetchContent = async (src) => {
    var _a2;
    try {
      const LV = globalThis.Lightview;
      if (((_a2 = LV == null ? void 0 : LV.hooks) == null ? void 0 : _a2.validateUrl) && !LV.hooks.validateUrl(src)) {
        console.warn(`[LightviewX] Fetch blocked by validateUrl hook: ${src}`);
        return null;
      }
      const url = new URL(src, document.baseURI);
      const res = await fetch(url);
      if (!res.ok) return null;
      const ext = url.pathname.split(".").pop().toLowerCase();
      const isJson = ext === "vdom" || ext === "odom" || ext === "cdom";
      const isHtml = ext === "html";
      const isCdom = ext === "cdom" || ext === "cdomc";
      const content = isJson ? await res.json() : await res.text();
      return {
        content,
        isJson,
        isHtml,
        isCdom,
        ext,
        raw: isJson ? JSON.stringify(content) : content
      };
    } catch (e) {
      return null;
    }
  };
  const parseElements = (content, isJson, isHtml, el, element, isCdom = false, ext = "") => {
    var _a2;
    if (isJson) return Array.isArray(content) ? content : [content];
    if (isCdom && ext === "cdomc") {
      const parser = (_a2 = globalThis.LightviewCDOM) == null ? void 0 : _a2.parseCDOMC;
      if (parser) {
        try {
          const obj = parser(content);
          return Array.isArray(obj) ? obj : [obj];
        } catch (e) {
          console.warn("LightviewX: Failed to parse .cdomc:", e);
          return [];
        }
      } else {
        console.warn("LightviewX: CDOMC parser not found. Ensure lightview-cdom.js is loaded.");
        return [];
      }
    }
    if (isHtml) {
      if (el.domEl.getAttribute("escape") === "true") return [content];
      const doc = new DOMParser().parseFromString(content.replace(/<head[^>]*>[\s\S]*?<\/head>/i, ""), "text/html");
      return domToElements([...Array.from(doc.head.childNodes), ...Array.from(doc.body.childNodes)], element);
    }
    return [content];
  };
  const elementsFromSelector = (selector, element) => {
    try {
      const sel = document.querySelectorAll(selector);
      if (!sel.length) return null;
      return {
        elements: domToElements(Array.from(sel), element),
        raw: Array.from(sel).map((n) => n.outerHTML || n.textContent).join("")
      };
    } catch (e) {
      return null;
    }
  };
  const updateTargetContent = (el, elements, raw, loc, contentHash, { element, setupChildren }, targetHash = null) => {
    const markerId = `${loc}-${contentHash.slice(0, 8)}`;
    let track = getOrSet(insertedContentMap, el.domEl, () => ({}));
    if (track[loc]) removeInsertedContent(el.domEl, `${loc}-${track[loc].slice(0, 8)}`);
    track[loc] = contentHash;
    const performScroll = (root) => {
      if (!targetHash) return;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const id = targetHash.startsWith("#") ? targetHash.slice(1) : targetHash;
          const target = root.getElementById ? root.getElementById(id) : root.querySelector(`#${id}`);
          if (target) {
            target.style.scrollMarginTop = "calc(var(--site-nav-height, 0px) + 2rem)";
            target.scrollIntoView({ behavior: "smooth", block: "start", inline: "start" });
          }
        });
      });
    };
    if (loc === "shadow") {
      if (!el.domEl.shadowRoot) el.domEl.attachShadow({ mode: "open" });
      setupChildren(elements, el.domEl.shadowRoot);
      executeScripts(el.domEl.shadowRoot);
      performScroll(el.domEl.shadowRoot);
    } else if (loc === "innerhtml") {
      el.children = elements;
      executeScripts(el.domEl);
      performScroll(document);
    } else {
      insert(elements, el.domEl, loc, markerId, { element, setupChildren });
      performScroll(document);
    }
  };
  const handleSrcAttribute = async (el, src, tagName, { element, setupChildren }) => {
    if (STANDARD_SRC_TAGS.includes(tagName)) return;
    let elements = [], raw = "", targetHash = null;
    if (isPath(src)) {
      if (src.includes("#")) {
        [src, targetHash] = src.split("#");
      }
      const result = await fetchContent(src);
      if (result) {
        elements = parseElements(result.content, result.isJson, result.isHtml, el, element, result.isCdom, result.ext);
        raw = result.raw;
      }
    }
    if (!elements.length) {
      const result = elementsFromSelector(src, element);
      if (result) {
        elements = result.elements;
        raw = result.raw;
      }
    }
    if (!elements.length) return;
    const loc = (el.domEl.getAttribute("location") || "innerhtml").toLowerCase();
    const contentHash = hashContent(raw);
    const track = getOrSet(insertedContentMap, el.domEl, () => ({}));
    if (track[loc] === contentHash) {
      if (targetHash) {
        const root = loc === "shadow" ? el.domEl.shadowRoot : document;
        if (root) {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              var _a2;
              const id = targetHash.startsWith("#") ? targetHash.slice(1) : targetHash;
              const target = root.getElementById ? root.getElementById(id) : (_a2 = root.querySelector) == null ? void 0 : _a2.call(root, `#${id}`);
              if (target) {
                target.style.scrollMarginTop = "calc(var(--site-nav-height, 0px) + 2rem)";
                target.scrollIntoView({ behavior: "smooth", block: "start", inline: "start" });
              }
            });
          });
        }
      }
      return;
    }
    updateTargetContent(el, elements, raw, loc, contentHash, { element, setupChildren }, targetHash);
  };
  const VALID_LOCATIONS = ["beforebegin", "afterbegin", "beforeend", "afterend", "innerhtml", "outerhtml", "shadow"];
  const parseTargetWithLocation = (targetStr) => {
    for (const loc of VALID_LOCATIONS) {
      const suffix = ":" + loc;
      if (targetStr.toLowerCase().endsWith(suffix)) {
        return {
          selector: targetStr.slice(0, -suffix.length),
          location: loc
        };
      }
    }
    return { selector: targetStr, location: null };
  };
  const handleNonStandardHref = (e, { domToElement, wrapDomElement }) => {
    var _a2;
    const clickedEl = e.target.closest("[href]");
    if (!clickedEl) return;
    const tagName = clickedEl.tagName.toLowerCase();
    if (STANDARD_HREF_TAGS.includes(tagName)) return;
    e.preventDefault();
    const href = clickedEl.getAttribute("href");
    const LV = globalThis.Lightview;
    if (href && (isDangerousProtocol(href) || ((_a2 = LV == null ? void 0 : LV.hooks) == null ? void 0 : _a2.validateUrl) && !LV.hooks.validateUrl(href))) {
      console.warn(`[LightviewX] Navigation or fetch blocked by security policy: ${href}`);
      return;
    }
    const targetAttr = clickedEl.getAttribute("target");
    if (!targetAttr) {
      let el = domToElement.get(clickedEl);
      if (!el) {
        const attrs = {};
        for (let attr of clickedEl.attributes) attrs[attr.name] = attr.value;
        el = wrapDomElement(clickedEl, tagName, attrs);
      }
      const newAttrs = { ...el.attributes, src: href };
      el.attributes = newAttrs;
      return;
    }
    if (targetAttr.startsWith("_")) {
      switch (targetAttr) {
        case "_self":
          globalThis.location.href = href;
          break;
        case "_parent":
          globalThis.parent.location.href = href;
          break;
        case "_top":
          globalThis.top.location.href = href;
          break;
        case "_blank":
        default:
          globalThis.open(href, targetAttr);
          break;
      }
      return;
    }
    const { selector, location } = parseTargetWithLocation(targetAttr);
    try {
      const targetElements = document.querySelectorAll(selector);
      targetElements.forEach((targetEl) => {
        let el = domToElement.get(targetEl);
        if (!el) {
          const attrs = {};
          for (let attr of targetEl.attributes) attrs[attr.name] = attr.value;
          el = wrapDomElement(targetEl, targetEl.tagName.toLowerCase(), attrs);
        }
        const newAttrs = { ...el.attributes, src: href };
        if (location) {
          newAttrs.location = location;
        }
        el.attributes = newAttrs;
      });
    } catch (err) {
      console.warn("Invalid target selector:", selector, err);
    }
  };
  const gateStates = /* @__PURE__ */ new WeakMap();
  const BYPASS_FLAG = "__lv_passed";
  const RESUME_FLAG = "__lv_resume";
  const SENSIBLE_EVENTS = [
    "click",
    "dblclick",
    "mousedown",
    "mouseup",
    "contextmenu",
    "submit",
    "reset",
    "change",
    "input",
    "invalid",
    "keydown",
    "keyup",
    "keypress",
    "touchstart",
    "touchend"
  ];
  const CAPTURE_EVENTS = ["focus", "blur"];
  const getGateState = (el, key) => {
    let elState = gateStates.get(el);
    if (!elState) {
      elState = /* @__PURE__ */ new Map();
      gateStates.set(el, elState);
    }
    let state2 = elState.get(key);
    if (!state2) {
      state2 = {};
      elState.set(key, state2);
    }
    return state2;
  };
  const gateThrottle = function(ms) {
    const event = arguments[arguments.length - 1];
    if (event == null ? void 0 : event[RESUME_FLAG]) return true;
    const key = `throttle-${(event == null ? void 0 : event.type) || "all"}-${ms}`;
    const state2 = getGateState(this, key);
    const now = Date.now();
    if (now - (state2.last || 0) >= ms) {
      state2.last = now;
      return true;
    }
    return false;
  };
  const gateDebounce = function(ms) {
    const event = arguments[arguments.length - 1];
    const key = `debounce-${(event == null ? void 0 : event.type) || "all"}-${ms}`;
    const state2 = getGateState(this, key);
    if (state2.timer) clearTimeout(state2.timer);
    if ((event == null ? void 0 : event[RESUME_FLAG]) && state2.passed) {
      state2.passed = false;
      return true;
    }
    state2.timer = setTimeout(() => {
      state2.passed = true;
      const newEvent = new event.constructor(event.type, event);
      newEvent[RESUME_FLAG] = true;
      this.dispatchEvent(newEvent);
    }, ms);
    return false;
  };
  const parseBeforeAttribute = (attrValue) => {
    const tokens = [];
    let current = "", depth = 0, inQuote = null;
    for (let i2 = 0; i2 < attrValue.length; i2++) {
      const char = attrValue[i2];
      if (inQuote) {
        current += char;
        if (char === inQuote && attrValue[i2 - 1] !== "\\") inQuote = null;
      } else if (char === "'" || char === '"') {
        inQuote = char;
        current += char;
      } else if (char === "(") {
        depth++;
        current += char;
      } else if (char === ")") {
        depth--;
        current += char;
      } else if (/\s/.test(char) && depth === 0) {
        if (current) tokens.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    if (current) tokens.push(current);
    const events = [];
    const exclusions = [];
    const calls = [];
    let i = 0;
    while (i < tokens.length) {
      const token = tokens[i];
      if (!token || token.includes("(")) break;
      if (token.startsWith("!")) exclusions.push(token.slice(1));
      else events.push(token);
      i++;
    }
    while (i < tokens.length) {
      if (tokens[i]) calls.push(tokens[i]);
      i++;
    }
    return { events, exclusions, calls };
  };
  const globalBeforeInterceptor = async (e) => {
    var _a2, _b2;
    if (e[BYPASS_FLAG]) return;
    const target = (_b2 = (_a2 = e.target).closest) == null ? void 0 : _b2.call(_a2, "[lv-before]");
    if (!target) return;
    const { events, exclusions, calls } = parseBeforeAttribute(target.getAttribute("lv-before"));
    const isExcluded = exclusions.includes(e.type);
    const isIncluded = events.includes("*") || events.includes(e.type);
    if (isExcluded || !isIncluded) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    for (const callStr of calls) {
      try {
        const match = callStr.match(/^([\w\.]+)\((.*)\)$/);
        if (!match) continue;
        const funcName = match[1];
        const argsStr = match[2];
        const LV = globalThis.Lightview;
        const LVX = globalThis.LightviewX;
        let fn = funcName.split(".").reduce((obj, key) => obj == null ? void 0 : obj[key], globalThis);
        if (!fn && funcName === "throttle") fn = gateThrottle;
        if (!fn && funcName === "debounce") fn = gateDebounce;
        if (!fn && LVX && LVX[funcName]) fn = LVX[funcName];
        if (typeof fn !== "function") {
          console.warn(`LightviewX: lv-before function '${funcName}' not found`);
          continue;
        }
        const evalArgs = new Function("event", "state", "signal", `return [${argsStr}]`);
        const args = evalArgs.call(target, e, (LV == null ? void 0 : LV.state) || {}, (LV == null ? void 0 : LV.signal) || {});
        args.push(e);
        let result = fn.apply(target, args);
        if (result instanceof Promise) result = await result;
        if (result === false || result === null || result === void 0) return;
      } catch (err) {
        console.error(`LightviewX: Error executing lv-before gate '${callStr}':`, err);
        return;
      }
    }
    const finalEvent = new e.constructor(e.type, e);
    finalEvent[BYPASS_FLAG] = true;
    target.dispatchEvent(finalEvent);
  };
  const processSrcOnNode = (node, LV) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tagName = node.tagName.toLowerCase();
    if (isStandardSrcTag(tagName)) return;
    const src = node.getAttribute("src");
    if (!src) return;
    let el = LV.internals.domToElement.get(node);
    if (!el) {
      const attrs = {};
      for (let attr of node.attributes) attrs[attr.name] = attr.value;
      el = LV.internals.wrapDomElement(node, tagName, attrs, []);
    }
    handleSrcAttribute(el, src, tagName, {
      element: LV.element,
      setupChildren: LV.internals.setupChildren
    });
  };
  const processedNodes = /* @__PURE__ */ new WeakSet();
  const activateReactiveSyntax = (root, LV) => {
    if (!root || !LV) return;
    const bindEffect = (node, codeStr, isAttr = false, attrName = null) => {
      if (processedNodes.has(node) && !isAttr) return;
      if (!isAttr) processedNodes.add(node);
      const fn = compileTemplate(codeStr);
      LV.effect(() => {
        try {
          const val = fn(LV.state, LV.signal);
          if (isAttr) {
            if (attrName.startsWith("cdom-")) {
              node[attrName] = val;
            } else {
              val === null || val === void 0 || val === false ? node.removeAttribute(attrName) : node.setAttribute(attrName, val);
            }
          } else node.textContent = val !== void 0 ? val : "";
        } catch (e) {
        }
      });
    };
    const textXPath = ".//text()[contains(., '${')]";
    const textResult = document.evaluate(
      textXPath,
      root,
      null,
      XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
      null
    );
    for (let i = 0; i < textResult.snapshotLength; i++) {
      const node = textResult.snapshotItem(i);
      if (node.parentElement && node.parentElement.closest("SCRIPT, STYLE, CODE, PRE, TEMPLATE, NOSCRIPT")) continue;
      bindEffect(node, node.textContent);
    }
    const attrXPath = ".//*[@*[contains(., '${')]]";
    const attrResult = document.evaluate(
      attrXPath,
      root,
      null,
      XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
      null
    );
    for (let i = 0; i < attrResult.snapshotLength; i++) {
      const element = attrResult.snapshotItem(i);
      if (["SCRIPT", "STYLE", "CODE", "PRE", "TEMPLATE", "NOSCRIPT"].includes(element.tagName)) continue;
      Array.from(element.attributes).forEach((attr) => {
        if (attr.value.includes("${")) {
          bindEffect(element, attr.value, true, attr.name);
        }
      });
    }
    if (root.nodeType === Node.ELEMENT_NODE && !["SCRIPT", "STYLE", "CODE", "PRE", "TEMPLATE", "NOSCRIPT"].includes(root.tagName)) {
      Array.from(root.attributes).forEach((attr) => {
        if (attr.value.includes("${")) {
          bindEffect(root, attr.value, true, attr.name);
        }
      });
    }
  };
  const processAddedNode = (node, nodesToProcess, nodesToActivate) => {
    if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
      nodesToActivate.push(node);
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    nodesToProcess.push(node);
    const selector = "[src]:not(" + STANDARD_SRC_TAGS.join("):not(") + ")";
    const descendants = node.querySelectorAll(selector);
    for (const desc of descendants) {
      if (!desc.tagName.toLowerCase().startsWith("lv-")) {
        nodesToProcess.push(desc);
      }
    }
  };
  const collectNodesFromMutations = (mutations) => {
    const nodesToProcess = [];
    const nodesToActivate = [];
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => processAddedNode(node, nodesToProcess, nodesToActivate));
      } else if (mutation.type === "attributes" && mutation.attributeName === "src") {
        nodesToProcess.push(mutation.target);
      }
    }
    return { nodesToProcess, nodesToActivate };
  };
  const setupSrcObserver = (LV) => {
    const observer = new MutationObserver((mutations) => {
      const { nodesToProcess, nodesToActivate } = collectNodesFromMutations(mutations);
      if (nodesToProcess.length > 0 || nodesToActivate.length > 0) {
        requestAnimationFrame(() => {
          nodesToActivate.forEach((node) => activateReactiveSyntax(node, LV));
          nodesToProcess.forEach((node) => processSrcOnNode(node, LV));
        });
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src"]
    });
    return observer;
  };
  if (typeof window !== "undefined" && globalThis.Lightview) {
    const LV = globalThis.Lightview;
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => setupSrcObserver(LV));
    } else {
      setupSrcObserver(LV);
    }
    const initialScan = () => {
      requestAnimationFrame(() => {
        activateReactiveSyntax(document.body, LV);
        const selector = "[src]:not(" + STANDARD_SRC_TAGS.join("):not(") + ")";
        const nodes = document.querySelectorAll(selector);
        nodes.forEach((node) => {
          if (node.tagName.toLowerCase().startsWith("lv-")) return;
          processSrcOnNode(node, LV);
        });
      });
    };
    if (document.body) {
      initialScan();
    } else {
      document.addEventListener("DOMContentLoaded", initialScan);
    }
    LV.hooks.onNonStandardHref = (e) => {
      handleNonStandardHref(e, {
        domToElement: LV.internals.domToElement,
        wrapDomElement: LV.internals.wrapDomElement
      });
    };
    SENSIBLE_EVENTS.forEach((ev) => window.addEventListener(ev, globalBeforeInterceptor, true));
    CAPTURE_EVENTS.forEach((ev) => window.addEventListener(ev, globalBeforeInterceptor, true));
    LV.hooks.processChild = (child) => {
      if (!child) return child;
      if (typeof child === "object" && !Array.isArray(child) && !child.tag && !child.domEl) {
        child = convertObjectDOM(child);
      }
      if (typeof child === "string" && child.startsWith("$") && isNaN(parseInt(child[1]))) {
        const CDOM = globalThis.LightviewCDOM;
        if (CDOM) return CDOM.parseExpression(child);
      }
      if (typeof child === "string" && (child.trim().startsWith("{") || child.trim().startsWith("["))) {
        try {
          const parsed = new Function("return (" + child + ")")();
          if (typeof parsed === "object" && parsed !== null) {
            if (Array.isArray(parsed)) {
              return parsed;
            }
            if (parsed.tag || parsed.domEl) {
              return parsed;
            }
            return convertObjectDOM(parsed);
          }
        } catch (e) {
        }
      }
      return processTemplateChild(child, {
        state,
        signal: LV.signal
      });
    };
  }
  const createCustomElement = (Component, options = {}) => {
    return class extends HTMLElement {
      constructor() {
        super();
        this.attachShadow({ mode: "open" });
      }
      async connectedCallback() {
        const { cssUrl, styles } = options;
        this.themeWrapper = document.createElement("div");
        this.themeWrapper.style.display = "contents";
        const syncTheme = () => {
          const theme = document.documentElement.getAttribute("data-theme") || "light";
          this.themeWrapper.setAttribute("data-theme", theme);
        };
        syncTheme();
        this.themeObserver = new MutationObserver(syncTheme);
        this.themeObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["data-theme"]
        });
        this.shadowRoot.appendChild(this.themeWrapper);
        const adoptedStyleSheets = getAdoptedStyleSheets(cssUrl, styles);
        try {
          const sheets = adoptedStyleSheets.filter((s) => s instanceof CSSStyleSheet);
          this.shadowRoot.adoptedStyleSheets = sheets;
        } catch (e) {
        }
        if (!componentConfig.daisyStyleSheet) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = DAISYUI_CDN;
          this.shadowRoot.appendChild(link);
        }
        adoptedStyleSheets.forEach((s) => {
          if (typeof s === "string") {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = s;
            this.shadowRoot.appendChild(link);
          }
        });
        this.render = () => {
          const props = {};
          for (const attr of this.attributes) {
            const name = attr.name.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
            if (attr.value === "") {
              props[name] = true;
            } else {
              props[name] = attr.value;
            }
          }
          props.useShadow = false;
          const slot = globalThis.Lightview.tags.slot();
          const result = Component(props, slot);
          globalThis.Lightview.internals.setupChildren([result], this.themeWrapper);
        };
        if (typeof MutationObserver !== "undefined" && typeof HTMLElement !== "undefined") {
          this.attrObserver = new MutationObserver((mutations) => {
            this.render();
          });
          this.attrObserver.observe(this, {
            attributes: true
          });
        }
        this.render();
      }
      disconnectedCallback() {
        if (this.themeObserver) {
          this.themeObserver.disconnect();
        }
        if (this.attrObserver) {
          this.attrObserver.disconnect();
        }
      }
    };
  };
  const customElementWrapper = (Component, config = {}) => {
    const {
      attributeMap = {},
      childElements = {}
    } = config;
    return class extends HTMLElement {
      constructor() {
        super();
        this.attachShadow({ mode: "open" });
      }
      connectedCallback() {
        let adopted = false;
        if (componentConfig.daisyStyleSheet) {
          try {
            const sheets = [componentConfig.daisyStyleSheet];
            if (componentConfig.themeStyleSheet) {
              sheets.push(componentConfig.themeStyleSheet);
            }
            this.shadowRoot.adoptedStyleSheets = sheets;
            adopted = true;
          } catch (e) {
          }
        }
        if (!adopted) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = DAISYUI_CDN;
          this.shadowRoot.appendChild(link);
        }
        const themeWrapper = document.createElement("div");
        themeWrapper.setAttribute("data-theme", document.documentElement.getAttribute("data-theme") || "light");
        themeWrapper.style.display = "contents";
        this.shadowRoot.appendChild(themeWrapper);
        this.themeWrapper = themeWrapper;
        this.themeObserver = new MutationObserver(() => {
          const theme = document.documentElement.getAttribute("data-theme") || "light";
          this.themeWrapper.setAttribute("data-theme", theme);
        });
        this.themeObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["data-theme"]
        });
        this.render();
        const attrs = Object.keys(attributeMap);
        if (attrs.length > 0) {
          this.attrObserver = new MutationObserver(() => this.render());
          this.attrObserver.observe(this, {
            attributes: true,
            attributeFilter: attrs
          });
        }
        if (Object.keys(childElements).length > 0) {
          this.childObserver = new MutationObserver(() => this.render());
          this.childObserver.observe(this, {
            childList: true,
            subtree: true,
            attributes: true
          });
        }
      }
      disconnectedCallback() {
        if (this.themeObserver) this.themeObserver.disconnect();
        if (this.attrObserver) this.attrObserver.disconnect();
        if (this.childObserver) this.childObserver.disconnect();
      }
      parseChildrenToVDOM() {
        return Array.from(this.children).map((child) => {
          const tagName = child.tagName.toLowerCase();
          const componentInfo = childElements[tagName];
          if (!componentInfo) return null;
          const { component, attributeMap: attributeMap2 = {} } = componentInfo;
          const attributes = {};
          for (const attr of child.attributes) {
            const name = attr.name.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
            const type = attributeMap2[name];
            const value = attr.value;
            if (type === Boolean) {
              attributes[name] = value === "true" || value === "";
            } else if (type === Number) {
              attributes[name] = Number(value);
            } else if (type === Array || type === Object) {
              try {
                attributes[name] = JSON.parse(value);
              } catch (e) {
                console.warn(`[Lightview] Failed to parse child attribute ${name} as JSON:`, value);
                attributes[name] = value;
              }
            } else {
              attributes[name] = value;
            }
          }
          if (child.onclick) attributes.onclick = child.onclick.bind(child);
          return {
            tag: component,
            attributes,
            children: Array.from(child.childNodes)
          };
        }).filter(Boolean);
      }
      render() {
        var _a2, _b2;
        const props = { useShadow: false };
        for (const attr of this.attributes) {
          const name = attr.name.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
          const type = attributeMap[name];
          const value = attr.value;
          if (type === Boolean) {
            props[name] = value === "true" || value === "";
          } else if (type === Number) {
            props[name] = Number(value);
          } else if (type === Array || type === Object) {
            try {
              props[name] = JSON.parse(value);
            } catch (e) {
              console.warn(`[Lightview] Failed to parse ${name} as JSON:`, value);
              props[name] = value;
            }
          } else {
            props[name] = value;
          }
        }
        const vdomChildren = this.parseChildrenToVDOM();
        const children = Object.keys(childElements).length > 0 ? vdomChildren : [{ tag: globalThis.Lightview.tags.slot }];
        const result = Component(props, ...children);
        if (((_b2 = (_a2 = globalThis.Lightview) == null ? void 0 : _a2.internals) == null ? void 0 : _b2.setupChildren) && this.themeWrapper) {
          this.themeWrapper.innerHTML = "";
          globalThis.Lightview.internals.setupChildren([result], this.themeWrapper);
        }
      }
      static get observedAttributes() {
        return Object.keys(attributeMap);
      }
      attributeChangedCallback() {
        this.render();
      }
    };
  };
  const validateJSONSchema = (value, schema) => {
    var _a2;
    if (!schema) return true;
    const errors = [];
    const internals2 = (_a2 = globalThis.Lightview) == null ? void 0 : _a2.internals;
    const check = (val, sch, path = "") => {
      var _a3;
      if (!sch) return true;
      if (typeof sch === "string") {
        const registered = (_a3 = internals2 == null ? void 0 : internals2.schemas) == null ? void 0 : _a3.get(sch);
        if (registered) return check(val, registered, path);
        return true;
      }
      const type = sch.type;
      const getType = (v) => {
        if (v === null) return "null";
        if (Array.isArray(v)) return "array";
        return typeof v;
      };
      const currentType = getType(val);
      if (type && type !== currentType) {
        if (type === "integer" && Number.isInteger(val)) ;
        else if (!(type === "number" && typeof val === "number")) {
          errors.push({ path, message: `Expected type ${type}, got ${currentType}`, keyword: "type" });
          return false;
        }
      }
      if (currentType === "string") {
        if (sch.minLength !== void 0 && val.length < sch.minLength) errors.push({ path, keyword: "minLength" });
        if (sch.maxLength !== void 0 && val.length > sch.maxLength) errors.push({ path, keyword: "maxLength" });
        if (sch.pattern !== void 0 && !new RegExp(sch.pattern).test(val)) errors.push({ path, keyword: "pattern" });
        if (sch.format === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) errors.push({ path, keyword: "format" });
      }
      if (currentType === "number") {
        if (sch.minimum !== void 0 && val < sch.minimum) errors.push({ path, keyword: "minimum" });
        if (sch.maximum !== void 0 && val > sch.maximum) errors.push({ path, keyword: "maximum" });
        if (sch.multipleOf !== void 0 && val % sch.multipleOf !== 0) errors.push({ path, keyword: "multipleOf" });
      }
      if (currentType === "object") {
        if (sch.required && Array.isArray(sch.required)) {
          for (const key of sch.required) {
            if (!(key in val)) errors.push({ path: path ? `${path}.${key}` : key, keyword: "required" });
          }
        }
        if (sch.properties) {
          for (const key in sch.properties) {
            if (key in val) check(val[key], sch.properties[key], path ? `${path}.${key}` : key);
          }
        }
        if (sch.additionalProperties === false) {
          for (const key in val) {
            if (!sch.properties || !(key in sch.properties)) errors.push({ path: path ? `${path}.${key}` : key, keyword: "additionalProperties" });
          }
        }
      }
      if (currentType === "array") {
        if (sch.minItems !== void 0 && val.length < sch.minItems) errors.push({ path, keyword: "minItems" });
        if (sch.maxItems !== void 0 && val.length > sch.maxItems) errors.push({ path, keyword: "maxItems" });
        if (sch.uniqueItems && new Set(val).size !== val.length) errors.push({ path, keyword: "uniqueItems" });
        if (sch.items) {
          val.forEach((item, i) => check(item, sch.items, `${path}[${i}]`));
        }
      }
      if (sch.const !== void 0 && val !== sch.const) errors.push({ path, keyword: "const" });
      if (sch.enum && !sch.enum.includes(val)) errors.push({ path, keyword: "enum" });
      return errors.length === 0;
    };
    const valid = check(value, schema);
    return valid || errors;
  };
  const lvInternals = globalThis.__LIGHTVIEW_INTERNALS__ || ((_a = globalThis.Lightview) == null ? void 0 : _a.internals);
  if (lvInternals) {
    const hooks2 = lvInternals.hooks || ((_b = globalThis.Lightview) == null ? void 0 : _b.hooks);
    if (hooks2) {
      hooks2.validate = (value, schema) => {
        const result = validateJSONSchema(value, schema);
        if (result === true) return true;
        const msg = result.map((e) => `${e.path || "root"}: failed ${e.keyword}${e.message ? " (" + e.message + ")" : ""}`).join(", ");
        throw new Error(`Lightview Validation Error: ${msg}`);
      };
    }
    if (globalThis.Lightview) globalThis.Lightview.validate = validateJSONSchema;
  }
  const LightviewX = {
    state,
    themeSignal,
    setTheme,
    registerStyleSheet,
    registerThemeSheet,
    // Gate modifiers
    throttle: gateThrottle,
    debounce: gateDebounce,
    // Component initialization
    initComponents,
    componentConfig,
    shouldUseShadow,
    getAdoptedStyleSheets,
    preloadComponentCSS,
    createCustomElement,
    customElementWrapper,
    validate: validateJSONSchema,
    internals: {
      handleSrcAttribute,
      parseElements
    }
  };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = LightviewX;
  }
  if (typeof window !== "undefined") {
    globalThis.LightviewX = LightviewX;
  }
  if (typeof window !== "undefined") {
    try {
      const savedTheme = getSavedTheme();
      if (savedTheme) {
        setTheme(savedTheme);
      }
    } catch (e) {
    }
    if (typeof window !== "undefined" && globalThis.Lightview) {
      if (!globalThis.Lightview.hooks.validateUrl) {
        globalThis.Lightview.hooks.validateUrl = validateUrl;
      }
    }
  }
  if (typeof globalThis !== "undefined" && globalThis.Lightview) {
    if (!globalThis.Lightview.hooks.validateUrl) {
      globalThis.Lightview.hooks.validateUrl = validateUrl;
    }
  }
})();
