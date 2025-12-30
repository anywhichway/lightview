(() => {
    /**
     * LIGHTVIEW ROUTER
     * A lightweight, pipeline-based History API router with middleware support.
     */
    // ============= LIGHTVIEW ROUTER =============
    // Pipeline-based History API router with middleware support

    /**
     * Shell-based routing helper. If the 'content' element is missing, 
     * redirects to a shell path with the current path in the 'load' query parameter.
     */
    const base = (shellPath) => {
        if (typeof window === 'undefined' || document.getElementById('content')) return;
        const url = new URL(shellPath, globalThis.location.href);
        url.searchParams.set('load', globalThis.location.pathname);
        globalThis.location.href = url.toString();
    };

    /**
     * Creates a new router instance.
     * @param {Object} options - Router configuration.
     */
    const router = (options = {}) => {
        const { base = '', contentEl, notFound, debug, onResponse, onStart } = options;
        const chains = [];

        /**
         * Normalizes paths by adding leading slash and removing trailing slash.
         */
        const normalizePath = (p) => {
            if (!p) return '/';
            try { if (p.startsWith('http') || p.startsWith('//')) p = new URL(p, globalThis.location.origin).pathname; } catch (e) { /* Invalid URL */ }
            if (base && p.startsWith(base)) p = p.slice(base.length);
            return p.replace(/\/+$/, '').replace(/^([^/])/, '/$1') || '/';
        };

        const createMatcher = (pattern) => {
            if (typeof pattern === 'function') return pattern;
            return (ctx) => {
                const { path } = ctx;
                if (pattern instanceof RegExp) {
                    const m = path.match(pattern);
                    return m ? { ...ctx, match: m } : null;
                }
                if (pattern === '*' || pattern === path) return { ...ctx, wildcard: path };

                const keys = [];
                const regexStr = '^' + pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                    .replace(/\\\*/g, '(.*)')
                    .replace(/:([^/]+)/g, (_, k) => (keys.push(k), '([^/]+)')) + '$';
                const m = path.match(new RegExp(regexStr));
                if (m) {
                    const params = {};
                    keys.forEach((k, i) => params[k] = m[i + 1]);
                    return { ...ctx, params, wildcard: m[1] };
                }
                return null;
            };
        };

        const createReplacer = (pat) => (ctx) => ({
            ...ctx,
            path: pat.replace(/\*|:([^/]+)/g, (m, k) => (k ? ctx.params?.[k] : ctx.wildcard) || m)
        });

        const fetchHandler = async (ctx) => {
            try {
                const res = await fetch(ctx.path);
                if (res.ok) return res;
            } catch (e) { if (debug) console.error('[Router] Fetch error:', e); }
            return null;
        };

        /**
         * Adds a route or middleware to the router's pipeline.
         */
        const use = (...args) => {
            const chain = args.map((arg, i) => (i === 0 && typeof arg !== 'function') ? createMatcher(arg) : (typeof arg === 'string' ? createReplacer(arg) : arg));
            if (contentEl && !chain.some(f => f.name === 'fetchHandler' || args.some(a => typeof a === 'function'))) chain.push(fetchHandler);
            chains.push(chain);
            return routerInstance;
        };

        /**
         * Processes a path through the registered chains.
         */
        const route = async (raw) => {
            let ctx = { path: normalizePath(raw), contentEl };
            if (debug) console.log(`[Router] Routing: ${ctx.path}`);

            for (const chain of chains) {
                let res = ctx, failed = false;
                for (const fn of chain) {
                    try {
                        res = await fn(res);
                        if (res instanceof Response) return res;
                        if (!res) { failed = true; break; }
                    } catch (e) { console.error('[Router] Chain error:', e); failed = true; break; }
                }
                if (!failed) ctx = typeof res === 'string' ? { ...ctx, path: res } : { ...ctx, ...res };
            }
            return notFound ? notFound(ctx) : null;
        };

        const handleRequest = async (path) => {
            if (onStart) onStart(path);
            const res = await route(path);
            if (!res) return console.warn(`[Router] No route: ${path}`);

            if (res.ok && contentEl) {
                contentEl.innerHTML = await res.text();
                contentEl.querySelectorAll('script').forEach(s => {
                    const n = document.createElement('script');
                    [...s.attributes].forEach(a => n.setAttribute(a.name, a.value));
                    n.textContent = s.textContent;
                    s.replaceWith(n);
                });
            }
            if (onResponse) await onResponse(res, path);
            return res;
        };

        /**
         * Navigates to a new path and updates the browser history.
         */
        const navigate = (path) => {
            const p = normalizePath(path);
            return handleRequest(base + p).then(r => {
                let dest = r?.url ? new URL(r.url, globalThis.location.origin).pathname : base + p;
                globalThis.history.pushState({ path: dest }, '', dest);
            }).catch(e => console.error('[Router] Nav error:', e));
        };

        /**
         * Starts the router by handling the initial path and setting up event listeners.
         */
        const start = async () => {
            const load = new URLSearchParams(globalThis.location.search).get('load');
            globalThis.onpopstate = (e) => handleRequest(e.state?.path || normalizePath(globalThis.location.pathname));
            document.onclick = (e) => {
                const a = e.target.closest('a[href]');
                if (!a || a.target === '_blank' || /^(http|#|mailto|tel)/.test(a.getAttribute('href'))) return;
                e.preventDefault();
                navigate(normalizePath(new URL(a.href, document.baseURI).pathname));
            };
            const init = load || normalizePath(globalThis.location.pathname);
            globalThis.history.replaceState({ path: init }, '', base + init);
            return handleRequest(init).then(() => routerInstance);
        };

        const routerInstance = { use, navigate, start };
        return routerInstance;
    };

    const LightviewRouter = { base, router };
    if (typeof module !== 'undefined' && module.exports) module.exports = LightviewRouter;
    else if (typeof window !== 'undefined') globalThis.LightviewRouter = LightviewRouter;
})();
