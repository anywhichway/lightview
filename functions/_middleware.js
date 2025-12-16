
import { marked } from 'marked';

export const onRequest = async (context) => {
    const url = new URL(context.request.url);

    // Intercept requests for .md files
    if (url.pathname.endsWith('.md')) {

        // Fetch the asset (the actual markdown file)
        const response = await context.next();

        // If the file exists and was retrieved successfully
        if (response.ok) {
            const text = await response.text();

            // Convert markdown to HTML
            // marked.parse is synchronous by default but can be async
            const html = await marked.parse(text);

            return new Response(html, {
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
