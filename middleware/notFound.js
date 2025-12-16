/**
 * 404 Not Found Middleware
 * 
 * Returns a configured Not Found handler that renders a 404 page
 * into a target element or returns a 404 response.
 * 
 * Usage:
 * appRouter.use(notFound({ 
 *   contentEl: document.getElementById('content'),
 *   html: '<h1>404 Not Found</h1>' // Optional custom HTML
 * }));
 */
export const notFound = (options = {}) => {
    const {
        contentEl = null,
        html = `
            <div class="error-page" style="text-align: center; padding: 4rem 1rem;">
                <h1 style="font-size: 3rem; margin-bottom: 1rem;">404</h1>
                <p style="font-size: 1.25rem; margin-bottom: 2rem;">Page not found</p>
                <a href="/" class="btn btn-primary">Go Home</a>
            </div>
        `
    } = options;

    return async (ctx) => {
        const targetEl = contentEl || ctx.contentEl;

        // If contentEl is provided (either via options or context), render directly
        if (targetEl) {
            targetEl.innerHTML = html;
            return new Response(html, { status: 404, statusText: 'Not Found' });
        }

        // Otherwise return a response and let the caller handle it
        return new Response(html, { status: 404, statusText: 'Not Found' });
    };
};
