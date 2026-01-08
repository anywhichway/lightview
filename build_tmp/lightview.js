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
  const getRegistry = () => _LV.registry;
  const protoMethods = (proto, test) => Object.getOwnPropertyNames(proto).filter((k) => typeof proto[k] === "function" && test(k));
  protoMethods(Date.prototype, (k) => /^(to|get|valueOf)/.test(k));
  protoMethods(Date.prototype, (k) => /^set/.test(k));
  const getOrSet = (map, key, factory) => {
    let v = map.get(key);
    if (!v) {
      v = factory();
      map.set(key, v);
    }
    return v;
  };
  const core = {
    get currentEffect() {
      return (globalThis.__LIGHTVIEW_INTERNALS__ || (globalThis.__LIGHTVIEW_INTERNALS__ = {})).currentEffect;
    }
  };
  const nodeState = /* @__PURE__ */ new WeakMap();
  const nodeStateFactory = () => ({ effects: [], onmount: null, onunmount: null });
  const registry = getRegistry();
  const trackEffect = (node, effectFn) => {
    const state = getOrSet(nodeState, node, nodeStateFactory);
    if (!state.effects) state.effects = [];
    state.effects.push(effectFn);
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
        const state = getOrSet(nodeState, domNode, nodeStateFactory);
        state[key] = value;
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
})();
