import { marked } from 'marked';
import { processServerScripts } from './processServerScripts.js';

export const onRequest = async (context) => {
    const url = new URL(context.request.url);
    const isMd = url.pathname.endsWith('.md');
    const isHtml = url.pathname.endsWith('.html') || (url.pathname.endsWith('/') && !url.pathname.includes('.'));

    // Intercept requests for .md and .html files
    if (isMd || isHtml) {
        console.log(`[Middleware] Processing: ${url.pathname}`);

        // Fetch the asset (the actual file)
        const response = await context.next();
        // If the file exists and was retrieved successfully
        if (response.ok) {
            let html = await response.text();

            // 1. Convert markdown to HTML if needed
            let processedHtml = html;
            if (isMd) {
                processedHtml = await marked.parse(html);
            }

            // 2. Process Server-Side Scripts (runat="server")
            processedHtml = await processServerScripts(processedHtml, context.request);

            return new Response(processedHtml, {
                status: 200,
                headers: {
                    'content-type': 'text/html;charset=UTF-8',
                }
            });
        }
    }

    // Pass through for all other requests
    return context.next();
};
