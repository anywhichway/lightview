/**
 * cdom CONDITIONAL AGGREGATE HELPERS
 */

export const sumIf = (arr, predicate) => {
    if (!Array.isArray(arr)) return 0;
    const filtered = (predicate && predicate.isLazy)
        ? arr.filter(item => predicate.resolve(item))
        : arr;
    return filtered.reduce((a, b) => a + (Number(b) || 0), 0);
};

export const countIf = (arr, predicate) => {
    if (!Array.isArray(arr)) return 0;
    if (predicate && predicate.isLazy) {
        return arr.filter(item => predicate.resolve(item)).length;
    }
    return arr.filter(item => !!item).length;
};

export const avgIf = (arr, predicate) => {
    if (!Array.isArray(arr)) return 0;
    const filtered = (predicate && predicate.isLazy)
        ? arr.filter(item => predicate.resolve(item))
        : arr;
    if (filtered.length === 0) return 0;
    return filtered.reduce((a, b) => a + (Number(b) || 0), 0) / filtered.length;
};

export const registerConditionalHelpers = (register) => {
    register('sumIf', sumIf);
    register('countIf', countIf);
    register('avgIf', avgIf);
};
