/**
 * Process Server Scripts (runat="server" and runat="server/client")
 * This allows pre-processing of HTML/Markdown on the server (Cloudflare Worker).
 * 
 * Note: Cloudflare Workers have CSP restrictions that disallow eval() and new Function().
 * SSR script execution will only work when deployed with unsafe-eval enabled, or in
 * environments that support dynamic code evaluation.
 */

import { parseHTML } from 'linkedom';

// Check if we can use dynamic code evaluation
let canEval = false;
try {
    new Function('return true')();
    canEval = true;
} catch (e) {
    console.warn('[ServerScript] Dynamic code evaluation is disabled in this environment. SSR scripts will be passed through to client.');
}

export const processServerScripts = async (html, request) => {
    // If we can't eval, just return HTML as-is (scripts will run on client)
    if (!canEval) {
        return html;
    }

    let document;
    try {
        const dom = parseHTML(html);
        document = dom.document;
        const { window, customElements, HTMLElement, Node, NodeList, HTMLCollection, MutationObserver } = dom;

        // 1. Setup Server Sandbox
        globalThis.window = window;
        globalThis.document = document;
        globalThis.customElements = customElements;
        globalThis.HTMLElement = HTMLElement;
        globalThis.Node = Node;
        globalThis.NodeList = NodeList;
        globalThis.HTMLCollection = HTMLCollection;
        globalThis.MutationObserver = MutationObserver;
        globalThis.isServer = true;
        globalThis.request = request;
        globalThis.addEventListener = () => { };

        // Mock localStorage/sessionStorage
        const mockStorage = {
            getItem: () => null,
            setItem: () => { },
            removeItem: () => { },
            clear: () => { },
            length: 0
        };
        globalThis.localStorage = mockStorage;
        globalThis.sessionStorage = mockStorage;

        // 2. Load Lightview Core & X via dynamic import
        // They are IIFEs that attach to globalThis, so importing them as side-effects works
        try {
            await import('../lightview.js');
            await import('../lightview-x.js');

            // Sync $ helper
            if (globalThis.Lightview) {
                globalThis.$ = globalThis.Lightview.$;
            }

        } catch (loadErr) {
            console.warn('[ServerScript] Could not load Lightview core libraries. DOM manipulation may be limited.', loadErr);
        }

        // 3. Find and Process Scripts with runat attribute
        const scripts = Array.from(document.querySelectorAll('script[runat]'));
        console.log(scripts);
        for (const script of scripts) {
            const runat = (script.getAttribute('runat') || '').toLowerCase();

            if (runat === 'server' || runat === 'server/client') {
                try {
                    const code = script.textContent;
                    if (code && globalThis.Lightview) {
                        // Execute the server script in context
                        const serverFn = new Function('isServer', 'request', 'Lightview', 'LightviewX', '$', `
                            return (async () => {
                                ${code}
                            })();
                        `);
                        await serverFn(true, request, globalThis.Lightview, globalThis.LightviewX, globalThis.$);
                    }
                } catch (err) {
                    console.error('[ServerScript] Execution error:', err);
                    const comment = document.createComment(` ServerScript Error: ${err.message} `);
                    script.parentNode.insertBefore(comment, script);
                }

                // Remove server-only scripts from output, keep server/client scripts (without runat attr)
                if (runat === 'server') {
                    script.remove();
                } else {
                    script.removeAttribute('runat');
                }
            } else if (runat === 'client') {
                // Just remove the runat attribute, script will run on client
                script.removeAttribute('runat');
            }
        }

        return document.toString();

    } catch (err) {
        console.error('[ServerScript] Critical Error:', err);
        // If we managed to parse the document, return what we have
        if (document) return document.toString();
        return html;
    } finally {
        // Cleanup global sandbox
        delete globalThis.window;
        delete globalThis.document;
        delete globalThis.isServer;
        delete globalThis.request;
        delete globalThis.Lightview;
        delete globalThis.LightviewX;
        delete globalThis.$;
        delete globalThis.localStorage;
        delete globalThis.sessionStorage;
    }
};
