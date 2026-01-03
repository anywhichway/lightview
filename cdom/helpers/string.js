/**
 * cdom STRING HELPERS
 */

export const join = (...args) => {
    const separator = args[args.length - 1];
    const items = args.slice(0, -1);
    return items.join(separator);
};

export const concat = (...args) => args.join('');
export const upper = (s) => String(s).toUpperCase();
export const lower = (s) => String(s).toLowerCase();
export const trim = (s) => String(s).trim();
export const len = (s) => String(s).length;
export const replace = (s, search, replacement) => String(s).replace(search, replacement);
export const split = (s, separator) => String(s).split(separator);

export const capitalize = (s) => {
    const str = String(s);
    return str.charAt(0).toUpperCase() + str.slice(1);
};

export const titleCase = (s) => {
    return String(s).toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export const contains = (s, search) => String(s).includes(search);
export const startsWith = (s, prefix) => String(s).startsWith(prefix);
export const endsWith = (s, suffix) => String(s).endsWith(suffix);

export const defaultHelper = (val, fallback) => (val !== undefined && val !== null) ? val : fallback;

export const registerStringHelpers = (register) => {
    register('join', join);
    register('concat', concat);
    register('upper', upper);
    register('lower', lower);
    register('trim', trim);
    register('len', len);
    register('replace', replace);
    register('split', split);
    register('capitalize', capitalize);
    register('titleCase', titleCase);
    register('contains', contains);
    register('startsWith', startsWith);
    register('endsWith', endsWith);
    register('default', defaultHelper);
};
