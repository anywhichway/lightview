/**
 * HDOM MATH HELPERS
 */

export const add = (...args) => args.reduce((a, b) => Number(a) + Number(b), 0);
export const subtract = (a, b) => Number(a) - Number(b);
export const multiply = (...args) => args.reduce((a, b) => Number(a) * Number(b), 1);
export const divide = (a, b) => Number(a) / Number(b);

export const sum = (...args) => args.reduce((a, b) => a + (Number(b) || 0), 0);
export const avg = (...args) => args.length === 0 ? 0 : sum(...args) / args.length;
export const min = (...args) => Math.min(...args);
export const max = (...args) => Math.max(...args);

export const registerMathHelpers = (register) => {
    register('+', add);
    register('-', subtract);
    register('*', multiply);
    register('/', divide);
    register('sum', sum);
    register('avg', avg);
    register('min', min);
    register('max', max);
};
