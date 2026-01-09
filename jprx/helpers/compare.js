/**
 * cdom COMPARISON HELPERS
 */

export const gt = (a, b) => a > b;
export const lt = (a, b) => a < b;
export const gte = (a, b) => a >= b;
export const lte = (a, b) => a <= b;
export const neq = (a, b) => a !== b;
export const between = (val, min, max) => val >= min && val <= max;
export const contains = (arr, val) => Array.isArray(arr) && arr.includes(val);

export const registerCompareHelpers = (register) => {
    register('gt', gt);
    register('>', gt);
    register('lt', lt);
    register('<', lt);
    register('gte', gte);
    register('>=', gte);
    register('lte', lte);
    register('<=', lte);
    register('neq', neq);
    register('!=', neq);
    register('between', between);
    register('in', contains);
};
