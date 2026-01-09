(function() {
  "use strict";
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
  const computed = (fn) => {
    const sig = signal(void 0);
    effect(() => {
      sig.value = fn();
    });
    return sig;
  };
  const getRegistry$1 = () => _LV.registry;
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
              args[0] = function(element2, index2, array) {
                const wrappedElement = typeof element2 === "object" && element2 !== null ? state(element2) : element2;
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
      const registry2 = getRegistry$1();
      if (registry2.has(name)) {
        if (registry2.get(name) !== proxy) {
          throw new Error(`Lightview: A signal or state with the name "${name}" is already registered.`);
        }
      } else {
        registry2.set(name, proxy);
      }
    }
    return proxy;
  };
  const getState = (name, defaultValue) => {
    const registry2 = getRegistry$1();
    if (!registry2.has(name) && defaultValue !== void 0) {
      return state(defaultValue, name);
    }
    return registry2.get(name);
  };
  state.get = getState;
  const core = {
    get currentEffect() {
      return (globalThis.__LIGHTVIEW_INTERNALS__ || (globalThis.__LIGHTVIEW_INTERNALS__ = {})).currentEffect;
    }
  };
  const nodeState = /* @__PURE__ */ new WeakMap();
  const nodeStateFactory = () => ({ effects: [], onmount: null, onunmount: null });
  const registry = getRegistry$1();
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
      } else if (key === "style" && typeof value === "object") {
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
      validateUrl: null
    },
    // Internals exposed for extensions
    internals: {
      core,
      domToElement,
      wrapDomElement,
      setupChildren
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
    var _a, _b;
    if (typeof obj !== "object" || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(convertObjectDOM);
    if (obj.tag) return { ...obj, children: obj.children ? convertObjectDOM(obj.children) : [] };
    if (obj.domEl || !isObjectDOM(obj)) return obj;
    const tagKey = Object.keys(obj)[0];
    const content = obj[tagKey];
    const LV = typeof window !== "undefined" ? globalThis.Lightview : typeof globalThis !== "undefined" ? globalThis.Lightview : null;
    const tag = ((_b = (_a = LV == null ? void 0 : LV.tags) == null ? void 0 : _a._customTags) == null ? void 0 : _b[tagKey]) || tagKey;
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
  const transformElementNode = (node, element2, domToElements2) => {
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
    return element2(tagName, attributes, domToElements2(Array.from(node.childNodes), element2, tagName));
  };
  const domToElements = (domNodes, element2, parentTagName = null) => {
    const isRaw = parentTagName === "script" || parentTagName === "style";
    const LV = globalThis.Lightview;
    return domNodes.map((node) => {
      if (node.nodeType === Node.TEXT_NODE) return transformTextNode(node, isRaw, LV);
      if (node.nodeType === Node.ELEMENT_NODE) return transformElementNode(node, element2, domToElements);
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
  const insert = (elements, parent, location, markerId, { element: element2, setupChildren: setupChildren2 }) => {
    const isSibling = location === "beforebegin" || location === "afterend";
    const isOuter = location === "outerhtml";
    const target = isSibling || isOuter ? parent.parentElement : parent;
    if (!target) return console.warn(`LightviewX: No parent for ${location}`);
    const frag = document.createDocumentFragment();
    frag.appendChild(createMarker(markerId, false));
    elements.forEach((c) => {
      var _a, _b, _c;
      if (typeof c === "string") frag.appendChild(document.createTextNode(c));
      else if (c.domEl) frag.appendChild(c.domEl);
      else if (c instanceof Node) frag.appendChild(c);
      else {
        const v = ((_c = (_a = globalThis.Lightview) == null ? void 0 : (_b = _a.hooks).processChild) == null ? void 0 : _c.call(_b, c)) || c;
        if (v.tag) {
          const n = element2(v.tag, v.attributes || {}, v.children || []);
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
    var _a;
    try {
      const LV = globalThis.Lightview;
      if (((_a = LV == null ? void 0 : LV.hooks) == null ? void 0 : _a.validateUrl) && !LV.hooks.validateUrl(src)) {
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
  const parseElements = (content, isJson, isHtml, el, element2, isCdom = false, ext = "") => {
    var _a;
    if (isJson) return Array.isArray(content) ? content : [content];
    if (isCdom && ext === "cdomc") {
      const parser = (_a = globalThis.LightviewCDOM) == null ? void 0 : _a.parseCDOMC;
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
      return domToElements([...Array.from(doc.head.childNodes), ...Array.from(doc.body.childNodes)], element2);
    }
    return [content];
  };
  const elementsFromSelector = (selector, element2) => {
    try {
      const sel = document.querySelectorAll(selector);
      if (!sel.length) return null;
      return {
        elements: domToElements(Array.from(sel), element2),
        raw: Array.from(sel).map((n) => n.outerHTML || n.textContent).join("")
      };
    } catch (e) {
      return null;
    }
  };
  const updateTargetContent = (el, elements, raw, loc, contentHash, { element: element2, setupChildren: setupChildren2 }, targetHash = null) => {
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
      setupChildren2(elements, el.domEl.shadowRoot);
      executeScripts(el.domEl.shadowRoot);
      performScroll(el.domEl.shadowRoot);
    } else if (loc === "innerhtml") {
      el.children = elements;
      executeScripts(el.domEl);
      performScroll(document);
    } else {
      insert(elements, el.domEl, loc, markerId, { element: element2, setupChildren: setupChildren2 });
      performScroll(document);
    }
  };
  const handleSrcAttribute = async (el, src, tagName, { element: element2, setupChildren: setupChildren2 }) => {
    if (STANDARD_SRC_TAGS.includes(tagName)) return;
    let elements = [], raw = "", targetHash = null;
    if (isPath(src)) {
      if (src.includes("#")) {
        [src, targetHash] = src.split("#");
      }
      const result = await fetchContent(src);
      if (result) {
        elements = parseElements(result.content, result.isJson, result.isHtml, el, element2, result.isCdom, result.ext);
        raw = result.raw;
      }
    }
    if (!elements.length) {
      const result = elementsFromSelector(src, element2);
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
              var _a;
              const id = targetHash.startsWith("#") ? targetHash.slice(1) : targetHash;
              const target = root.getElementById ? root.getElementById(id) : (_a = root.querySelector) == null ? void 0 : _a.call(root, `#${id}`);
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
    updateTargetContent(el, elements, raw, loc, contentHash, { element: element2, setupChildren: setupChildren2 }, targetHash);
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
  const handleNonStandardHref = (e, { domToElement: domToElement2, wrapDomElement: wrapDomElement2 }) => {
    var _a;
    const clickedEl = e.target.closest("[href]");
    if (!clickedEl) return;
    const tagName = clickedEl.tagName.toLowerCase();
    if (STANDARD_HREF_TAGS.includes(tagName)) return;
    e.preventDefault();
    const href = clickedEl.getAttribute("href");
    const LV = globalThis.Lightview;
    if (href && (isDangerousProtocol(href) || ((_a = LV == null ? void 0 : LV.hooks) == null ? void 0 : _a.validateUrl) && !LV.hooks.validateUrl(href))) {
      console.warn(`[LightviewX] Navigation or fetch blocked by security policy: ${href}`);
      return;
    }
    const targetAttr = clickedEl.getAttribute("target");
    if (!targetAttr) {
      let el = domToElement2.get(clickedEl);
      if (!el) {
        const attrs = {};
        for (let attr of clickedEl.attributes) attrs[attr.name] = attr.value;
        el = wrapDomElement2(clickedEl, tagName, attrs);
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
        let el = domToElement2.get(targetEl);
        if (!el) {
          const attrs = {};
          for (let attr of targetEl.attributes) attrs[attr.name] = attr.value;
          el = wrapDomElement2(targetEl, targetEl.tagName.toLowerCase(), attrs);
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
    const now2 = Date.now();
    if (now2 - (state2.last || 0) >= ms) {
      state2.last = now2;
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
    var _a, _b;
    if (e[BYPASS_FLAG]) return;
    const target = (_b = (_a = e.target).closest) == null ? void 0 : _b.call(_a, "[lv-before]");
    if (!target) return;
    const { events, exclusions, calls } = parseBeforeAttribute(target.getAttribute("lv-before"));
    const isExcluded = exclusions.includes(e.type);
    const isIncluded = events.includes("*") || events.includes(e.type);
    if (isExcluded || !isIncluded) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    for (const callStr of calls) {
      try {
        const match2 = callStr.match(/^([\w\.]+)\((.*)\)$/);
        if (!match2) continue;
        const funcName = match2[1];
        const argsStr = match2[2];
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
      const element2 = attrResult.snapshotItem(i);
      if (["SCRIPT", "STYLE", "CODE", "PRE", "TEMPLATE", "NOSCRIPT"].includes(element2.tagName)) continue;
      Array.from(element2.attributes).forEach((attr) => {
        if (attr.value.includes("${")) {
          bindEffect(element2, attr.value, true, attr.name);
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
        var _a, _b;
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
        if (((_b = (_a = globalThis.Lightview) == null ? void 0 : _a.internals) == null ? void 0 : _b.setupChildren) && this.themeWrapper) {
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
    const registry2 = getRegistry();
    if (path === ".") return unwrapSignal(context);
    if (path.startsWith("$/")) {
      const [rootName, ...rest] = path.slice(2).split("/");
      let cur = context;
      while (cur) {
        const localState = cur.__state__;
        if (localState && rootName in localState) {
          return traverse(localState[rootName], rest);
        }
        cur = cur.__parent__;
      }
      const rootSignal = registry2 == null ? void 0 : registry2.get(rootName);
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
    const registry2 = getRegistry();
    if (path === ".") return context;
    if (path.startsWith("$/")) {
      const segments = path.slice(2).split(/[/.]/);
      const rootName = segments.shift();
      let cur = context;
      while (cur) {
        const localState = cur.__state__;
        if (localState && rootName in localState) {
          return traverseAsContext(localState[rootName], segments);
        }
        cur = cur.__parent__;
      }
      const rootSignal = registry2 == null ? void 0 : registry2.get(rootName);
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
        let isOpAfter = false;
        for (const op of opSymbols) {
          if (expr.slice(i + 1, i + 1 + op.length) === op) {
            isOpAfter = true;
            break;
          }
        }
        if (isOpAfter) {
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
      case "Event": {
        return new LazyValue((event) => {
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
        return helper(unwrapSignal(left), unwrapSignal(right));
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
  const localStates = /* @__PURE__ */ new WeakMap();
  const getContext = (node, event = null) => {
    const chain = [];
    let cur = node;
    const ShadowRoot2 = globalThis.ShadowRoot;
    while (cur) {
      const local = localStates.get(cur) || (cur && typeof cur === "object" ? cur.__state__ : null);
      if (local) chain.unshift(local);
      cur = cur.parentElement || (cur && typeof cur === "object" ? cur.__parent__ : null) || (ShadowRoot2 && cur.parentNode instanceof ShadowRoot2 ? cur.parentNode.host : null);
    }
    const globalRegistry = getRegistry$1();
    const handler = {
      get(target, prop, receiver) {
        var _a;
        if (prop === "$event" || prop === "event") return event;
        if (prop === "__parent__") return void 0;
        for (let i = chain.length - 1; i >= 0; i--) {
          const s = chain[i];
          if (prop in s) return s[prop];
        }
        if (globalRegistry && globalRegistry.has(prop)) return unwrapSignal(globalRegistry.get(prop));
        const globalState = (_a = globalThis.Lightview) == null ? void 0 : _a.state;
        if (globalState && prop in globalState) return unwrapSignal(globalState[prop]);
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
        if (globalState && prop in globalState) {
          globalState[prop] = value;
          return true;
        }
        if (globalRegistry && globalRegistry.has(prop)) {
          const s = globalRegistry.get(prop);
          if (s && (typeof s === "object" || typeof s === "function") && "value" in s) {
            s.value = value;
            return true;
          }
        }
        return false;
      },
      has(target, prop) {
        var _a;
        const exists = prop === "$event" || prop === "event" || !!chain.find((s) => prop in s);
        const inGlobal = ((_a = globalThis.Lightview) == null ? void 0 : _a.state) && prop in globalThis.Lightview.state || globalRegistry && globalRegistry.has(prop);
        return exists || inGlobal;
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
    const attr = node["cdom-state"] || node.getAttribute && node.getAttribute("cdom-state");
    if (!attr || localStates.has(node)) return;
    try {
      const data = typeof attr === "object" ? attr : JSON.parse(attr);
      const s = state(data);
      localStates.set(node, s);
      if (node && typeof node === "object") {
        node.__state__ = s;
      }
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
      if (node["cdom-state"]) {
        handleCDOMState(node);
      }
      for (const key in node) {
        const value = node[key];
        if (key === "cdom-state") {
          continue;
        }
        if (typeof value === "string" && value.startsWith("$")) {
          if (key.startsWith("on")) {
            node[key] = (event) => {
              const element2 = event.currentTarget;
              const context = getContext(element2, event);
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
                  const element2 = event.currentTarget;
                  const context = getContext(element2, event);
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
  const LightviewCDOM = {
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
    handleCDOMState,
    handleCDOMBind,
    activate,
    hydrate,
    version: "1.0.0"
  };
  if (typeof window !== "undefined") {
    globalThis.LightviewCDOM = LightviewCDOM;
  }
  console.log("Lightview Full Bundle Loaded");
})();
