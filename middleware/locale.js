/**
 * Locale Prefix Handler
 * Extracts locale from path (e.g. /en/about -> /about with locale='en')
 */
export const localeHandler = (ctx) => {
    const path = typeof ctx === 'string' ? ctx : ctx.path;

    // Match /en/ or /en at start of path
    const match = path.match(/^\/([a-z]{2})($|\/)/);

    if (match) {
        const locale = match[1];
        // Remove locale prefix
        let newPath = path.substring(3);
        if (!newPath.startsWith('/')) newPath = '/' + newPath;

        return {
            ...ctx,
            path: newPath,
            locale: locale
        };
    }

    return ctx;
};
