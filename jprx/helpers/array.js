/**
 * cdom ARRAY HELPERS
 */

export const count = (...args) => args.length;

export const filter = (arr, predicate) => {
    if (!Array.isArray(arr)) return [];
    if (typeof predicate === 'function' && predicate.isLazy) {
        return arr.filter(item => predicate.resolve(item));
    }
    return arr.filter(item => !!item);
};

export const map = (arr, transform) => {
    if (!Array.isArray(arr)) return [];
    if (typeof transform === 'string') {
        return arr.map(item => (item && typeof item === 'object') ? item[transform] : item);
    }
    // Check for LazyValue (has isLazy property and resolve method)
    if (transform && transform.isLazy && typeof transform.resolve === 'function') {
        return arr.map(item => transform.resolve(item));
    }
    // If it's a plain function
    if (typeof transform === 'function') {
        return arr.map(transform);
    }
    return arr;
};

export const find = (arr, predicate) => {
    if (!Array.isArray(arr)) return undefined;
    if (predicate && predicate.isLazy) {
        return arr.find(item => predicate.resolve(item));
    }
    return arr.find(item => !!item);
};

export const unique = (arr) => Array.isArray(arr) ? [...new Set(arr)] : [];

export const sort = (arr, order = 'asc') => {
    if (!Array.isArray(arr)) return [];
    const sorted = [...arr];
    sorted.sort((a, b) => {
        if (a < b) return order === 'asc' ? -1 : 1;
        if (a > b) return order === 'asc' ? 1 : -1;
        return 0;
    });
    return sorted;
};

export const reverse = (arr) => Array.isArray(arr) ? [...arr].reverse() : [];
export const first = (arr) => Array.isArray(arr) ? arr[0] : undefined;
export const last = (arr) => Array.isArray(arr) ? arr[arr.length - 1] : undefined;
export const slice = (arr, start, end) => Array.isArray(arr) ? arr.slice(start, end) : [];
export const flatten = (arr) => Array.isArray(arr) ? arr.flat(Infinity) : [];
export const join = (arr, sep = ',') => Array.isArray(arr) ? arr.join(String(sep)) : '';
export const length = (arg) => Array.isArray(arg) ? arg.length : (arg ? String(arg).length : 0);

export const registerArrayHelpers = (register) => {
    register('count', count);
    register('filter', filter, { lazyAware: true });
    register('map', map, { lazyAware: true });
    register('find', find, { lazyAware: true });
    register('unique', unique);
    register('sort', sort);
    register('reverse', reverse);
    register('first', first);
    register('last', last);
    register('slice', slice);
    register('flatten', flatten);
    register('join', join);
    register('len', length);
    register('length', length);
};
