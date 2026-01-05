/**
 * cdom NETWORK HELPERS
 */

/**
 * A wrapper around the native fetch API that handles body serialization and 
 * Content-Type headers based on the body type.
 * 
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options (method, headers, body)
 */
export const fetchHelper = (url, options = {}) => {
    const fetchOptions = { ...options };
    const headers = { ...fetchOptions.headers };

    let body = fetchOptions.body;
    if (body !== undefined) {
        if (body !== null && typeof body === 'object') {
            // Automatically stringify objects
            body = JSON.stringify(body);
            if (!headers['Content-Type']) {
                headers['Content-Type'] = 'application/json';
            }
        } else {
            // Convert everything else to string
            body = String(body);
            if (!headers['Content-Type']) {
                headers['Content-Type'] = 'text/plain';
            }
        }
    }

    fetchOptions.body = body;
    fetchOptions.headers = headers;

    return globalThis.fetch(url, fetchOptions);
};

export const registerNetworkHelpers = (register) => {
    register('fetch', fetchHelper);
};
