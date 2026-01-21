/**
 * cdom LOOKUP HELPERS
 */

import { resolvePath, unwrapSignal } from '../parser.js';

export const lookup = (val, searchArr, resultArr) => {
    if (!Array.isArray(searchArr)) return undefined;
    const idx = searchArr.indexOf(val);
    return idx !== -1 && Array.isArray(resultArr) ? resultArr[idx] : undefined;
};

export const vlookup = (val, table, colIdx) => {
    if (!Array.isArray(table)) return undefined;
    const row = table.find(r => Array.isArray(r) && r[0] === val);
    return row ? row[colIdx - 1] : undefined;
};

export const index = (arr, idx) => Array.isArray(arr) ? arr[idx] : undefined;
export const match = (val, arr) => Array.isArray(arr) ? arr.indexOf(val) : -1;

/**
 * $ - Reactive path lookup helper.
 * Resolves a JPRX path string and returns the unwrapped value.
 * 
 * @param {string} path - The path to resolve (e.g., '/state/count')
 * @param {object} context - The JPRX context (automatically provided by pathAware)
 * @returns {any} - The resolved and unwrapped value
 * 
 * @example
 * =calc("$('/price') * 1.08")
 * =$('/user/name')
 */
export const pathRef = (path, context) => {
    // If path is already a BindingTarget or has a .value property, use it directly
    if (path && typeof path === 'object' && 'value' in path) {
        return unwrapSignal(path.value);
    }

    // Fallback for string paths
    if (typeof path === 'string') {
        const normalized = path.startsWith('=') ? path : '=' + path;
        const resolved = resolvePath(normalized, context);
        const value = unwrapSignal(resolved);
        // Convert to number if it looks like a number for calc compatibility
        if (typeof value === 'number') return value;
        if (typeof value === 'string' && value !== '' && !isNaN(parseFloat(value)) && isFinite(Number(value))) {
            return parseFloat(value);
        }
        return value;
    }

    return unwrapSignal(path);
};

export const registerLookupHelpers = (register) => {
    register('lookup', lookup);
    register('vlookup', vlookup);
    register('index', index);
    register('match', match);
    register('$', pathRef, { pathAware: true });
    register('val', pathRef, { pathAware: true });
    register('indirect', pathRef, { pathAware: true });
};
