/**
 * cdom LOGIC HELPERS
 */

export const ifHelper = (condition, thenVal, elseVal) => condition ? thenVal : elseVal;
export const andHelper = (...args) => args.every(Boolean);
export const orHelper = (...args) => args.some(Boolean);
export const notHelper = (val) => !val;
export const eqHelper = (a, b) => a === b;
export const neqHelper = (a, b) => a !== b;

export const registerLogicHelpers = (register) => {
    register('if', ifHelper);
    register('and', andHelper);
    register('&&', andHelper);
    register('or', orHelper);
    register('||', orHelper);
    register('not', notHelper);
    register('!', notHelper);
    register('eq', eqHelper);
    register('==', eqHelper);
    register('===', eqHelper);
    register('neq', neqHelper);
};
