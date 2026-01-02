/**
 * HDOM LOGIC HELPERS
 */

export const ifHelper = (condition, thenVal, elseVal) => condition ? thenVal : elseVal;
export const andHelper = (...args) => args.every(Boolean);
export const orHelper = (...args) => args.some(Boolean);
export const notHelper = (val) => !val;
export const eqHelper = (a, b) => a === b;

export const registerLogicHelpers = (register) => {
    register('if', ifHelper);
    register('and', andHelper);
    register('or', orHelper);
    register('not', notHelper);
    register('eq', eqHelper);
};
