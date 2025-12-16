/**
 * Markdown Handler
 * Intercepts .md requests, loads marked.js on demand, and renders HTML
 */
let marked = null;

export const markdownHandler = async (ctx) => {
    const path = typeof ctx === 'string' ? ctx : ctx.path;

    // Only process .md files
    if (!path.endsWith('.md')) return ctx;

    try {
        // 1. Load marked if needed
        if (!marked) {
            console.log('[Markdown] Loading processor...');
            const module = await import('https://cdn.jsdelivr.net/npm/marked/+esm');
            marked = module.marked;
        }

        // 2. Fetch the raw markdown content
        const response = await fetch(path);
        if (!response.ok) return null; // Let other handlers try or 404

        const text = await response.text();

        // 3. Convert to HTML
        // marked.parse can be synchronous or async depending on extensions, 
        // but usually synchronous for standard usage.
        const html = marked.parse(text);

        // 4. Wrap the HTML in a container if needed, or just return it.
        // For Lightview docs, we might want a wrapper, but raw HTML is fine for now.
        // We'll return a Response object which the router understands as a final result.
        return new Response(html, {
            status: 200,
            headers: { 'Content-Type': 'text/html' }
        });

    } catch (err) {
        console.error('[Markdown] Error processing file:', err);
        return null; // Fallthrough
    }
};
