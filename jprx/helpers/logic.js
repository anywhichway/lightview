/**
 * cdom LOGIC HELPERS
 */

export const ifHelper = (condition, thenVal, elseVal) => condition ? thenVal : elseVal;
export const andHelper = (...args) => args.every(Boolean);
export const orHelper = (...args) => args.some(Boolean);
export const notHelper = (val) => !val;
export const eqHelper = (a, b) => a == b;
export const strictEqHelper = (a, b) => a === b;
export const neqHelper = (a, b) => a != b;
export const strictNeqHelper = (a, b) => a !== b;

export const registerLogicHelpers = (register) => {
    register('if', ifHelper);
    register('and', andHelper);
    register('&&', andHelper);
    register('or', orHelper);
    register('||', orHelper);
    register('not', notHelper);
    register('!', notHelper);
    register('eq', eqHelper);
    register('strictEq', strictEqHelper);
    register('==', eqHelper);
    register('===', strictEqHelper);
    register('neq', neqHelper);
    register('strictNeq', strictNeqHelper);
    register('!=', neqHelper);
    register('!==', strictNeqHelper);
};
