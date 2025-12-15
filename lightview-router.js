(() => {
    // ============= LIGHTVIEW ROUTER =============
    // Pipeline-based History API router with middleware support

    /**
     * Shim function for individual pages
     * Redirects direct page access to the shell with a load parameter
     * @param {string} shellPath - Relative path to the shell (e.g., '../../index.html')
     */
    const base = (shellPath) => {
        if (typeof window === 'undefined') return;

        // Check if we're in the shell or loaded directly
        const inShell = document.getElementById('content') !== null;
        document.baseURI = shellPath;
        if (inShell) return;

        // Get current path relative to domain root
        const currentPath = window.location.pathname;

        // Build shell URL with load parameter
        const shellUrl = new URL(shellPath, window.location.href);
        shellUrl.searchParams.set('load', currentPath);

        // Redirect to shell
        window.location.href = shellUrl.toString();
    };

    /**
     * Create a new Router instance
     */
    const router = (options = {}) => {
        const {
            base = '',
            notFound = null,
            debug = false,
            onResponse = null,
            onStart = null
        } = options;

        const chains = [];

        /**
         * Normalize a path by removing base and trailing slashes
         */
        const normalizePath = (path) => {
            if (!path) return '/';

            // Handle full URLs
            if (path.startsWith('http') || path.startsWith('//')) {
                try {
                    const url = new URL(path, window.location.origin);
                    path = url.pathname;
                } catch (e) {
                    // Invalid URL, treat as path
                }
            }

            if (base && path.startsWith(base)) {
                path = path.slice(base.length);
            }
            if (!path.startsWith('/')) {
                path = '/' + path;
            }
            if (path.length > 1 && path.endsWith('/')) {
                path = path.slice(0, -1);
            }
            return path;
        };

        /**
         * Convert a matcher (string/regexp) into a function
         * Returns: (input) => params OR null (if no match)
         */
        const createMatcher = (pattern) => {
            if (pattern instanceof RegExp) {
                return (ctx) => {
                    const path = typeof ctx === 'string' ? ctx : ctx.path;
                    const match = path.match(pattern);
                    return match ? { match, ...ctx } : null;
                };
            }

            if (typeof pattern === 'string') {
                return (ctx) => {
                    const path = typeof ctx === 'string' ? ctx : ctx.path;

                    // Specific check: if pattern is exactly '*', match everything
                    if (pattern === '*') return { path, wildcard: path, ...ctx };

                    // Exact match
                    if (pattern === path) return { path, ...ctx };

                    // Wildcard /api/*
                    if (pattern.includes('*')) {
                        const regexStr = '^' + pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '(.*)') + '$';
                        const regex = new RegExp(regexStr);
                        const match = path.match(regex);
                        if (match) {
                            return { path, wildcard: match[1], ...ctx };
                        }
                    }

                    // Named params /user/:id
                    if (pattern.includes(':')) {
                        const keys = [];
                        const regexStr = '^' + pattern.replace(/:([^/]+)/g, (_, key) => {
                            keys.push(key);
                            return '([^/]+)';
                        }) + '$';
                        const match = path.match(new RegExp(regexStr));

                        if (match) {
                            const params = {};
                            keys.forEach((key, i) => {
                                params[key] = match[i + 1];
                            });
                            return { path, params, ...ctx };
                        }
                    }

                    return null;
                };
            }

            return pattern; // Already a function
        };

        /**
         * Convert a replacement string into a function
         * Returns: (ctx) => newPathString
         */
        const createReplacer = (pattern) => {
            return (ctx) => {
                let newPath = pattern;
                if (ctx.wildcard && newPath.includes('*')) {
                    newPath = newPath.replace('*', ctx.wildcard);
                }
                if (ctx.params) {
                    Object.entries(ctx.params).forEach(([key, val]) => {
                        newPath = newPath.replace(':' + key, val);
                    });
                }
                return newPath;
            };
        };

        /**
         * Register a route chain
         * usage: router.use(pattern, replacement, handler, ...)
         */
        const use = (...args) => {
            if (args.length === 0) return;
            const chain = [];
            const firstArg = args[0];

            if (typeof firstArg !== 'function') {
                chain.push(createMatcher(firstArg));
            } else {
                chain.push(firstArg);
            }

            for (let i = 1; i < args.length; i++) {
                const arg = args[i];
                if (typeof arg === 'string') {
                    chain.push(createReplacer(arg));
                } else {
                    chain.push(arg);
                }
            }
            chains.push(chain);
            return routerInstance;
        };

        /**
         * Execute routing for a given path
         */
        const route = async (rawPath) => {
            let currentPath = normalizePath(rawPath);
            let context = { path: currentPath };

            if (debug) console.log(`[Router] Routing: ${currentPath}`);

            for (const chain of chains) {
                let chainResult = context;
                let chainFailed = false;

                for (const fn of chain) {
                    try {
                        const result = await fn(chainResult);

                        if (result instanceof Response) return result;
                        if (!result) {
                            chainFailed = true;
                            break;
                        }

                        chainResult = result;
                    } catch (err) {
                        console.error('[Router] Error in route chain:', err);
                        chainFailed = true;
                        break;
                    }
                }

                if (!chainFailed) {
                    // Fallthrough with updated context
                    if (typeof chainResult === 'string') {
                        context = { path: chainResult };
                        if (debug) console.log(`[Router] Path updated to: ${chainResult}`);
                    } else if (chainResult && chainResult.path) {
                        context = chainResult;
                    }
                }
            }

            if (notFound) return notFound(currentPath);
            return null;
        };

        const handleRequest = async (path) => {
            if (onStart) onStart(path);

            const response = await route(path);
            if (response && onResponse) {
                await onResponse(response, path);
            } else if (!response) {
                console.warn(`[Router] No route handled path: ${path}`);
            }
            if (response.ok) {
                document.baseURI = response.url;
            }
            return response;
        };

        const navigate = (path) => {
            path = normalizePath(path);
            let fullPath = base + path;
            const oldBase = document.baseURI;
            document.baseURI = fullPath;
            return handleRequest(fullPath).then((response) => {
                let dest = response?.url;
                if (dest && (dest.startsWith('http') || dest.startsWith('//'))) {
                    try {
                        const u = new URL(dest, window.location.origin);
                        dest = u.pathname + u.search + u.hash;
                    } catch (e) { }
                }
                // Fallback to intent if response has no URL
                if (!dest) dest = fullPath;
                window.history.pushState({ path: dest }, '', dest);
            }).catch((err) => {
                console.error('[Router] Error handling request:', err);
                document.baseURI = oldBase;
            })
        };

        const start = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const loadPath = urlParams.get('load');

            window.addEventListener('popstate', (e) => {
                const path = e.state?.path || normalizePath(window.location.pathname);
                handleRequest(path);
            });

            document.addEventListener('click', (e) => {
                const link = e.target.closest('a[href]');
                if (!link) return;
                const href = link.getAttribute('href');
                if (
                    !href || href.startsWith('http') || href.startsWith('//') ||
                    href.startsWith('#') || href.startsWith('mailto:') ||
                    link.target === '_blank'
                ) return;

                e.preventDefault();
                const url = new URL(href, document.baseURI);
                const path = normalizePath(url.pathname);
                navigate(path);
            });

            if (loadPath) {
                window.history.replaceState({ path: loadPath }, '', loadPath);
                handleRequest(loadPath);
            } else {
                const initialPath = normalizePath(window.location.pathname);
                window.history.replaceState({ path: initialPath }, '', base + initialPath);
                handleRequest(initialPath);
            }

            return routerInstance;
        };

        const routerInstance = {
            use,
            navigate,
            start
        };

        return routerInstance;
    };

    const LightviewRouter = {
        base,
        router
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = LightviewRouter;
    }
    if (typeof window !== 'undefined') {
        window.LightviewRouter = LightviewRouter;
    }
})();
