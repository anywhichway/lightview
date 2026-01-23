(function() {
  "use strict";
  (() => {
    const base = (shellPath) => {
      if (typeof window === "undefined" || document.getElementById("content")) return;
      const url = new URL(shellPath, globalThis.location.href);
      url.searchParams.set("load", globalThis.location.pathname);
      globalThis.location.href = url.toString();
    };
    const router = (options = {}) => {
      const { base: base2 = "", contentEl, notFound, debug, onResponse, onStart } = options;
      const chains = [];
      const normalizePath = (p) => {
        if (!p) return "/";
        let hash = "";
        if (p.includes("#")) {
          [p, hash] = p.split("#");
          hash = "#" + hash;
        }
        try {
          if (p.startsWith("http") || p.startsWith("//")) p = new URL(p, globalThis.location.origin).pathname;
        } catch (e) {
        }
        if (base2 && p.startsWith(base2)) p = p.slice(base2.length);
        return (p.replace(/\/+$/, "").replace(/^([^/])/, "/$1") || "/") + hash;
      };
      const createMatcher = (pattern) => {
        if (typeof pattern === "function") return pattern;
        return (ctx) => {
          const { path } = ctx;
          const pathOnly = path.split("#")[0];
          if (pattern instanceof RegExp) {
            const m2 = pathOnly.match(pattern);
            return m2 ? { ...ctx, match: m2 } : null;
          }
          if (pattern === "*" || pattern === pathOnly) return { ...ctx, wildcard: pathOnly };
          const keys = [];
          const regexStr = "^" + pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\*/g, "(.*)").replace(/:([^/]+)/g, (_, k) => (keys.push(k), "([^/]+)")) + "$";
          const m = pathOnly.match(new RegExp(regexStr));
          if (m) {
            const params = {};
            keys.forEach((k, i) => params[k] = m[i + 1]);
            return { ...ctx, params, wildcard: m[1] };
          }
          return null;
        };
      };
      const createReplacer = (pat) => (ctx) => {
        const [path, hash] = ctx.path.split("#");
        return {
          ...ctx,
          path: pat.replace(/\*|:([^/]+)/g, (m, k) => {
            var _a;
            return (k ? (_a = ctx.params) == null ? void 0 : _a[k] : ctx.wildcard) || m;
          }) + (hash ? "#" + hash : "")
        };
      };
      const fetchHandler = async (ctx) => {
        try {
          const pathOnly = ctx.path.split("#")[0];
          const res = await fetch(pathOnly);
          if (res.ok) return res;
        } catch (e) {
          if (debug) console.error("[Router] Fetch error:", e);
        }
        return null;
      };
      const use = (...args) => {
        const chain = args.map((arg, i) => i === 0 && typeof arg !== "function" ? createMatcher(arg) : typeof arg === "string" ? createReplacer(arg) : arg);
        if (contentEl && !chain.some((f) => f.name === "fetchHandler" || args.some((a) => typeof a === "function"))) chain.push(fetchHandler);
        chains.push(chain);
        return routerInstance;
      };
      const route = async (raw) => {
        let ctx = { path: normalizePath(raw), contentEl };
        if (debug) console.log(`[Router] Routing: ${ctx.path}`);
        for (const chain of chains) {
          let res = ctx, failed = false;
          for (const fn of chain) {
            try {
              res = await fn(res);
              if (res instanceof Response) return res;
              if (!res) {
                failed = true;
                break;
              }
            } catch (e) {
              console.error("[Router] Chain error:", e);
              failed = true;
              break;
            }
          }
          if (!failed) ctx = typeof res === "string" ? { ...ctx, path: res } : { ...ctx, ...res };
        }
        return notFound ? notFound(ctx) : null;
      };
      const handleRequest = async (path) => {
        var _a, _b;
        if (onStart) onStart(path);
        const internals = (_a = globalThis.Lightview) == null ? void 0 : _a.internals;
        const scrollMap = (_b = internals == null ? void 0 : internals.saveScrolls) == null ? void 0 : _b.call(internals);
        const res = await route(path);
        if (!res) return console.warn(`[Router] No route: ${path}`);
        if (res.ok && contentEl) {
          contentEl.innerHTML = await res.text();
          contentEl.querySelectorAll("script").forEach((s) => {
            const n = document.createElement("script");
            [...s.attributes].forEach((a) => n.setAttribute(a.name, a.value));
            n.textContent = s.textContent;
            s.replaceWith(n);
          });
          if ((internals == null ? void 0 : internals.restoreScrolls) && scrollMap) {
            internals.restoreScrolls(scrollMap);
          }
          const urlParts = path.split("#");
          const hash = urlParts.length > 1 ? "#" + urlParts[1] : "";
          if (hash) {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                const id = hash.slice(1);
                const target = document.getElementById(id);
                if (target) {
                  target.style.scrollMarginTop = "calc(var(--site-nav-height, 0px) + 2rem)";
                  target.scrollIntoView({ behavior: "smooth", block: "start", inline: "start" });
                }
              });
            });
          }
        }
        if (onResponse) await onResponse(res, path);
        return res;
      };
      const navigate = (path) => {
        const p = normalizePath(path);
        return handleRequest(base2 + p).then((r) => {
          let dest = (r == null ? void 0 : r.url) ? new URL(r.url, globalThis.location.origin).pathname : base2 + p;
          if (p.includes("#") && !dest.includes("#")) {
            dest += "#" + p.split("#")[1];
          }
          globalThis.history.pushState({ path: dest }, "", dest);
        }).catch((e) => console.error("[Router] Nav error:", e));
      };
      const start = async () => {
        const load = new URLSearchParams(globalThis.location.search).get("load");
        globalThis.onpopstate = (e) => {
          var _a;
          return handleRequest(((_a = e.state) == null ? void 0 : _a.path) || normalizePath(globalThis.location.pathname + globalThis.location.hash));
        };
        document.onclick = (e) => {
          const path = e.composedPath();
          const a = path.find((el) => {
            var _a;
            return el.tagName === "A" && ((_a = el.hasAttribute) == null ? void 0 : _a.call(el, "href"));
          });
          if (!a || a.target === "_blank" || /^(http|#|mailto|tel)/.test(a.getAttribute("href"))) return;
          const url = new URL(a.href, document.baseURI);
          if (url.origin === globalThis.location.origin) {
            e.preventDefault();
            const fullPath = url.pathname + url.search + url.hash;
            navigate(normalizePath(fullPath));
          }
        };
        const init = load || normalizePath(globalThis.location.pathname + globalThis.location.hash);
        globalThis.history.replaceState({ path: init }, "", base2 + init);
        return handleRequest(init).then(() => routerInstance);
      };
      const routerInstance = { use, navigate, start };
      return routerInstance;
    };
    const LightviewRouter = { base, router };
    if (typeof module !== "undefined" && module.exports) module.exports = LightviewRouter;
    else if (typeof window !== "undefined") {
      globalThis.LightviewRouter = LightviewRouter;
      try {
        const script = document.currentScript;
        if (script && script.src.includes("?")) {
          const params = new URL(script.src).searchParams;
          const b = params.get("base");
          if (b) LightviewRouter.base(b);
        }
      } catch (e) {
      }
    }
  })();
})();
