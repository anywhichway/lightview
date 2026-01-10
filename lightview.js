(function() {
  "use strict";
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
      const registry2 = _LV.localRegistries.get(current);
      if (registry2 && registry2.has(name)) return registry2.get(name);
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
      const registry2 = scope && typeof scope === "object" ? _LV.localRegistries.get(scope) || _LV.localRegistries.set(scope, /* @__PURE__ */ new Map()).get(scope) : _LV.registry;
      if (registry2 && registry2.has(name) && registry2.get(name) !== f) {
        throw new Error(`Lightview: A signal or state with the name "${name}" is already registered.`);
      }
      if (registry2) registry2.set(name, f);
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
  const computed = (fn) => {
    const sig = signal(void 0);
    effect(() => {
      sig.value = fn();
    });
    return sig;
  };
  const getRegistry = () => _LV.registry;
  const internals = _LV;
  const stateCache = /* @__PURE__ */ new WeakMap();
  const stateSignals = /* @__PURE__ */ new WeakMap();
  const stateSchemas = /* @__PURE__ */ new WeakMap();
  const { parents, schemas, hooks } = internals;
  const validate = (target, prop, value, schema) => {
    var _a, _b;
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
      const transformFn = typeof trans === "function" ? trans : internals.helpers.get(trans) || ((_b = (_a = globalThis.Lightview) == null ? void 0 : _a.helpers) == null ? void 0 : _b[trans]);
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
              args[0] = function(element2, index, array) {
                const wrappedElement = typeof element2 === "object" && element2 !== null ? state(element2) : element2;
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
      const registry2 = scope && typeof scope === "object" ? internals.localRegistries.get(scope) || internals.localRegistries.set(scope, /* @__PURE__ */ new Map()).get(scope) : getRegistry();
      if (registry2 && registry2.has(name) && registry2.get(name) !== proxy) {
        throw new Error(`Lightview: A signal or state with the name "${name}" is already registered.`);
      }
      if (registry2) registry2.set(name, proxy);
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
  const core = {
    get currentEffect() {
      return (globalThis.__LIGHTVIEW_INTERNALS__ || (globalThis.__LIGHTVIEW_INTERNALS__ = {})).currentEffect;
    }
  };
  const nodeState = /* @__PURE__ */ new WeakMap();
  const nodeStateFactory = () => ({ effects: [], onmount: null, onunmount: null });
  const registry = getRegistry();
  const trackEffect = (node, effectFn) => {
    const state2 = getOrSet(nodeState, node, nodeStateFactory);
    if (!state2.effects) state2.effects = [];
    state2.effects.push(effectFn);
  };
  const SHADOW_DOM_MARKER = Symbol("lightview.shadowDOM");
  const createShadowDOMMarker = (attributes, children) => ({
    [SHADOW_DOM_MARKER]: true,
    mode: attributes.mode || "open",
    styles: attributes.styles || [],
    adoptedStyleSheets: attributes.adoptedStyleSheets || [],
    children
  });
  const isShadowDOMMarker = (obj) => obj && typeof obj === "object" && obj[SHADOW_DOM_MARKER] === true;
  const processShadowDOM = (marker, parentNode) => {
    if (parentNode.shadowRoot) {
      console.warn("Lightview: Element already has a shadowRoot, skipping shadowDOM directive");
      return;
    }
    const shadowRoot = parentNode.attachShadow({ mode: marker.mode });
    const sheets = [];
    const linkUrls = [...marker.styles || []];
    if (marker.adoptedStyleSheets && marker.adoptedStyleSheets.length > 0) {
      marker.adoptedStyleSheets.forEach((item) => {
        if (item instanceof CSSStyleSheet) {
          sheets.push(item);
        } else if (typeof item === "string") {
          linkUrls.push(item);
        }
      });
    }
    if (sheets.length > 0) {
      try {
        shadowRoot.adoptedStyleSheets = sheets;
      } catch (e) {
        console.warn("Lightview: adoptedStyleSheets not supported");
      }
    }
    for (const styleUrl of linkUrls) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = styleUrl;
      shadowRoot.appendChild(link);
    }
    if (marker.children && marker.children.length > 0) {
      setupChildrenInTarget(marker.children, shadowRoot);
    }
  };
  let inSVG = false;
  const domToElement = /* @__PURE__ */ new WeakMap();
  const wrapDomElement = (domNode, tag, attributes = {}, children = []) => {
    const el = {
      tag,
      attributes,
      children,
      get domEl() {
        return domNode;
      }
    };
    const proxy = makeReactive(el);
    domToElement.set(domNode, proxy);
    return proxy;
  };
  const element = (tag, attributes = {}, children = []) => {
    if (customTags[tag]) tag = customTags[tag];
    if (typeof tag === "function") {
      const result = tag({ ...attributes }, children);
      return processComponentResult(result);
    }
    if (tag === "shadowDOM") {
      return createShadowDOMMarker(attributes, children);
    }
    if (tag === "text" && !inSVG) {
      const domNode2 = document.createTextNode("");
      const el = {
        tag,
        attributes,
        children,
        get domEl() {
          return domNode2;
        }
      };
      const update = () => {
        const flat = (Array.isArray(el.children) ? el.children : [el.children]).flat(Infinity);
        const bits = flat.map((c) => {
          const val = typeof c === "function" ? c() : c;
          if (val && typeof val === "object" && val.domEl) return val.domEl.textContent;
          return val === null || val === void 0 ? "" : String(val);
        });
        domNode2.textContent = bits.join(" ");
      };
      const proxy2 = new Proxy(el, {
        set(target, prop, value) {
          target[prop] = value;
          if (prop === "children") update();
          return true;
        }
      });
      const hasReactive = children.flat(Infinity).some((c) => typeof c === "function");
      if (hasReactive) {
        const runner = effect(update);
        trackEffect(domNode2, runner);
      }
      update();
      return proxy2;
    }
    const isSVG = tag.toLowerCase() === "svg";
    const wasInSVG = inSVG;
    if (isSVG) inSVG = true;
    const domNode = inSVG ? document.createElementNS("http://www.w3.org/2000/svg", tag) : document.createElement(tag);
    const proxy = wrapDomElement(domNode, tag, attributes, children);
    proxy.attributes = attributes;
    proxy.children = children;
    if (isSVG) inSVG = wasInSVG;
    return proxy;
  };
  const processComponentResult = (result) => {
    if (!result) return null;
    if (Lightview.hooks.processChild) {
      result = Lightview.hooks.processChild(result) ?? result;
    }
    if (result.domEl) return result;
    const type = typeof result;
    if (type === "object" && result instanceof HTMLElement) {
      return wrapDomElement(result, result.tagName.toLowerCase(), {}, []);
    }
    if (type === "object" && result instanceof String) {
      const span = document.createElement("span");
      span.textContent = result.toString();
      return wrapDomElement(span, "span", {}, []);
    }
    if (type === "string") {
      const template = document.createElement("template");
      template.innerHTML = result.trim();
      const content = template.content;
      if (content.childNodes.length === 1 && content.firstChild instanceof HTMLElement) {
        const el = content.firstChild;
        return wrapDomElement(el, el.tagName.toLowerCase(), {}, []);
      } else {
        const wrapper = document.createElement("span");
        wrapper.style.display = "contents";
        wrapper.appendChild(content);
        return wrapDomElement(wrapper, "span", {}, []);
      }
    }
    if (typeof result === "object" && result.tag) {
      return element(result.tag, result.attributes || {}, result.children || []);
    }
    return null;
  };
  const makeReactive = (el) => {
    const domNode = el.domEl;
    return new Proxy(el, {
      set(target, prop, value) {
        if (prop === "attributes") {
          target[prop] = makeReactiveAttributes(value, domNode);
        } else if (prop === "children") {
          target[prop] = setupChildren(value, domNode);
        } else {
          target[prop] = value;
        }
        return true;
      }
    });
  };
  const NODE_PROPERTIES = /* @__PURE__ */ new Set(["value", "checked", "selected", "selectedIndex", "className", "innerHTML", "innerText"]);
  const setAttributeValue = (domNode, key, value) => {
    const isBool = typeof domNode[key] === "boolean";
    if ((key === "href" || key === "src") && typeof value === "string" && /^(javascript|vbscript|data:text\/html|data:application\/javascript)/i.test(value)) {
      console.warn(`[Lightview] Blocked dangerous protocol in ${key}: ${value}`);
      value = "javascript:void(0)";
    }
    if (NODE_PROPERTIES.has(key) || isBool || key.startsWith("cdom-")) {
      domNode[key] = isBool ? value !== null && value !== void 0 && value !== false && value !== "false" : value;
    } else if (value === null || value === void 0) {
      domNode.removeAttribute(key);
    } else {
      domNode.setAttribute(key, value);
    }
  };
  const makeReactiveAttributes = (attributes, domNode) => {
    const reactiveAttrs = {};
    for (let [key, value] of Object.entries(attributes)) {
      if (key === "onmount" || key === "onunmount") {
        const state2 = getOrSet(nodeState, domNode, nodeStateFactory);
        state2[key] = value;
        if (key === "onmount" && domNode.isConnected) {
          value(domNode);
        }
      } else if (key.startsWith("on")) {
        if (typeof value === "function") {
          const eventName = key.slice(2).toLowerCase();
          domNode.addEventListener(eventName, value);
        } else if (typeof value === "string") {
          domNode.setAttribute(key, value);
        }
        reactiveAttrs[key] = value;
      } else if (typeof value === "object" && value !== null && Lightview.hooks.processAttribute) {
        const processed = Lightview.hooks.processAttribute(domNode, key, value);
        if (processed !== void 0) {
          reactiveAttrs[key] = processed;
        } else if (key === "style") {
          Object.entries(value).forEach(([styleKey, styleValue]) => {
            if (typeof styleValue === "function") {
              const runner = effect(() => {
                domNode.style[styleKey] = styleValue();
              });
              trackEffect(domNode, runner);
            } else {
              domNode.style[styleKey] = styleValue;
            }
          });
          reactiveAttrs[key] = value;
        } else {
          setAttributeValue(domNode, key, value);
          reactiveAttrs[key] = value;
        }
      } else if (typeof value === "function") {
        const runner = effect(() => {
          const result = value();
          if (key === "style" && typeof result === "object") {
            Object.assign(domNode.style, result);
          } else {
            setAttributeValue(domNode, key, result);
          }
        });
        trackEffect(domNode, runner);
        reactiveAttrs[key] = value;
      } else {
        setAttributeValue(domNode, key, value);
        reactiveAttrs[key] = value;
      }
    }
    return reactiveAttrs;
  };
  const processChildren = (children, targetNode, clearExisting = true) => {
    if (clearExisting && targetNode.innerHTML !== void 0) {
      targetNode.innerHTML = "";
    }
    const childElements = [];
    const isSpecialElement = targetNode.tagName && (targetNode.tagName.toLowerCase() === "script" || targetNode.tagName.toLowerCase() === "style");
    const flatChildren = children.flat(Infinity);
    for (let child of flatChildren) {
      if (Lightview.hooks.processChild && !isSpecialElement) {
        child = Lightview.hooks.processChild(child) ?? child;
      }
      if (isShadowDOMMarker(child)) {
        if (targetNode instanceof ShadowRoot) {
          console.warn("Lightview: Cannot nest shadowDOM inside another shadowDOM");
          continue;
        }
        processShadowDOM(child, targetNode);
        continue;
      }
      const type = typeof child;
      if (type === "function") {
        const startMarker = document.createComment("lv:s");
        const endMarker = document.createComment("lv:e");
        targetNode.appendChild(startMarker);
        targetNode.appendChild(endMarker);
        let runner;
        const update = () => {
          while (startMarker.nextSibling && startMarker.nextSibling !== endMarker) {
            startMarker.nextSibling.remove();
          }
          const val = child();
          if (val === void 0 || val === null) return;
          if (runner && !startMarker.isConnected) {
            runner.stop();
            return;
          }
          if (typeof val === "object" && val instanceof String) {
            const textNode = document.createTextNode(val);
            endMarker.parentNode.insertBefore(textNode, endMarker);
          } else {
            const fragment = document.createDocumentFragment();
            const childrenToProcess = Array.isArray(val) ? val : [val];
            processChildren(childrenToProcess, fragment, false);
            endMarker.parentNode.insertBefore(fragment, endMarker);
          }
        };
        runner = effect(update);
        trackEffect(startMarker, runner);
        childElements.push(child);
      } else if (["string", "number", "boolean", "symbol"].includes(type) || child && type === "object" && child instanceof String) {
        targetNode.appendChild(document.createTextNode(child));
        childElements.push(child);
      } else if (child instanceof Node) {
        const node = child.domEl || child;
        if (node instanceof HTMLElement || node instanceof SVGElement) {
          const wrapped = wrapDomElement(node, node.tagName.toLowerCase());
          targetNode.appendChild(node);
          childElements.push(wrapped);
        } else {
          targetNode.appendChild(node);
          childElements.push(child);
        }
      } else if (child && type === "object" && child.tag) {
        const childEl = child.domEl ? child : element(child.tag, child.attributes || {}, child.children || []);
        targetNode.appendChild(childEl.domEl);
        childElements.push(childEl);
      }
    }
    return childElements;
  };
  const setupChildrenInTarget = (children, targetNode) => {
    return processChildren(children, targetNode, false);
  };
  const setupChildren = (children, domNode) => {
    return processChildren(children, domNode, true);
  };
  const enhance = (selectorOrNode, options = {}) => {
    const domNode = typeof selectorOrNode === "string" ? document.querySelector(selectorOrNode) : selectorOrNode;
    const node = domNode.domEl || domNode;
    if (!(node instanceof HTMLElement)) return null;
    const tagName = node.tagName.toLowerCase();
    let el = domToElement.get(node);
    if (!el) {
      el = wrapDomElement(node, tagName);
    }
    const { innerText, innerHTML, ...attrs } = options;
    if (innerText !== void 0) {
      if (typeof innerText === "function") {
        effect(() => {
          node.innerText = innerText();
        });
      } else {
        node.innerText = innerText;
      }
    }
    if (innerHTML !== void 0) {
      if (typeof innerHTML === "function") {
        effect(() => {
          node.innerHTML = innerHTML();
        });
      } else {
        node.innerHTML = innerHTML;
      }
    }
    if (Object.keys(attrs).length > 0) {
      el.attributes = attrs;
    }
    return el;
  };
  const $ = (cssSelectorOrElement, startingDomEl = document.body) => {
    const el = typeof cssSelectorOrElement === "string" ? startingDomEl.querySelector(cssSelectorOrElement) : cssSelectorOrElement;
    if (!el) return null;
    Object.defineProperty(el, "content", {
      value(child, location = "inner") {
        location = location.toLowerCase();
        Lightview.tags;
        const isSpecialElement = el.tagName && (el.tagName.toLowerCase() === "script" || el.tagName.toLowerCase() === "style");
        const array = (Array.isArray(child) ? child : [child]).map((item) => {
          if (Lightview.hooks.processChild && !isSpecialElement) {
            item = Lightview.hooks.processChild(item) ?? item;
          }
          if (item.tag && !item.domEl) {
            return element(item.tag, item.attributes || {}, item.children || []).domEl;
          } else {
            return item.domEl || item;
          }
        });
        const target = location === "shadow" ? el.shadowRoot || el.attachShadow({ mode: "open" }) : el;
        if (location === "inner" || location === "shadow") {
          target.replaceChildren(...array);
        } else if (location === "outer") {
          target.replaceWith(...array);
        } else if (location === "afterbegin") {
          target.prepend(...array);
        } else if (location === "beforeend") {
          target.append(...array);
        } else {
          array.forEach((item) => el.insertAdjacentElement(location, item));
        }
        return el;
      },
      configurable: true,
      writable: true
    });
    return el;
  };
  const customTags = {};
  const tags = new Proxy({}, {
    get(_, tag) {
      if (tag === "_customTags") return { ...customTags };
      const wrapper = (...args) => {
        let attributes = {};
        let children = args;
        const arg0 = args[0];
        if (args.length > 0 && arg0 && typeof arg0 === "object" && !arg0.tag && !arg0.domEl && !Array.isArray(arg0)) {
          attributes = arg0;
          children = args.slice(1);
        }
        return element(customTags[tag] || tag, attributes, children);
      };
      if (customTags[tag]) {
        Object.assign(wrapper, customTags[tag]);
      }
      return wrapper;
    },
    set(_, tag, value) {
      customTags[tag] = value;
      return true;
    }
  });
  const Lightview = {
    state,
    getState,
    registerSchema: (name, definition) => internals.schemas.set(name, definition),
    signal,
    get: signal.get,
    computed,
    effect,
    registry,
    element,
    // do not document this
    enhance,
    tags,
    $,
    // Extension hooks
    hooks: {
      onNonStandardHref: null,
      processChild: null,
      processAttribute: null,
      validateUrl: null,
      validate: (value, schema) => internals.hooks.validate(value, schema)
    },
    // Internals exposed for extensions
    internals: {
      core,
      domToElement,
      wrapDomElement,
      setupChildren,
      trackEffect,
      localRegistries: internals.localRegistries,
      futureSignals: internals.futureSignals,
      schemas: internals.schemas,
      parents: internals.parents,
      hooks: internals.hooks
    }
  };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = Lightview;
  }
  if (typeof window !== "undefined") {
    globalThis.Lightview = Lightview;
    globalThis.addEventListener("click", (e) => {
      const path = e.composedPath();
      const link = path.find((el) => {
        var _a, _b;
        return el.tagName === "A" && ((_b = (_a = el.getAttribute) == null ? void 0 : _a.call(el, "href")) == null ? void 0 : _b.startsWith("#"));
      });
      if (link && !e.defaultPrevented) {
        const href = link.getAttribute("href");
        if (href.length > 1) {
          const id = href.slice(1);
          const root = link.getRootNode();
          const target = (root.getElementById ? root.getElementById(id) : null) || (root.querySelector ? root.querySelector(`#${id}`) : null);
          if (target) {
            e.preventDefault();
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                target.style.scrollMarginTop = "calc(var(--site-nav-height, 0px) + 2rem)";
                target.scrollIntoView({ behavior: "smooth", block: "start", inline: "start" });
              });
            });
          }
        }
      }
      if (Lightview.hooks.onNonStandardHref) {
        Lightview.hooks.onNonStandardHref(e);
      }
    });
    if (typeof MutationObserver !== "undefined") {
      const walkNodes = (node, fn) => {
        var _a;
        fn(node);
        (_a = node.childNodes) == null ? void 0 : _a.forEach((n) => walkNodes(n, fn));
        if (node.shadowRoot) walkNodes(node.shadowRoot, fn);
      };
      const cleanupNode = (node) => walkNodes(node, (n) => {
        var _a, _b;
        const s = nodeState.get(n);
        if (s) {
          (_a = s.effects) == null ? void 0 : _a.forEach((e) => e.stop());
          (_b = s.onunmount) == null ? void 0 : _b.call(s, n);
          nodeState.delete(n);
        }
      });
      const mountNode = (node) => walkNodes(node, (n) => {
        var _a, _b;
        (_b = (_a = nodeState.get(n)) == null ? void 0 : _a.onmount) == null ? void 0 : _b.call(_a, n);
      });
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.removedNodes.forEach(cleanupNode);
          mutation.addedNodes.forEach(mountNode);
        });
      });
      const startObserving = () => {
        if (document.body) {
          observer.observe(document.body, {
            childList: true,
            subtree: true
          });
        }
      };
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", startObserving);
      } else {
        startObserving();
      }
    }
  }
})();
