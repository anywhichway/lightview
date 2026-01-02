/**
 * HDOM STRING HELPERS
 */

export const join = (...args) => {
    const separator = args[args.length - 1];
    const items = args.slice(0, -1);
    return items.join(separator);
};

export const concat = (...args) => args.join('');
export const upper = (s) => String(s).toUpperCase();
export const lower = (s) => String(s).toLowerCase();
export const defaultHelper = (val, fallback) => (val !== undefined && val !== null) ? val : fallback;

export const registerStringHelpers = (register) => {
    register('join', join);
    register('concat', concat);
    register('upper', upper);
    register('lower', lower);
    register('default', defaultHelper);
};
