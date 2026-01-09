/**
 * cdom MATH HELPERS
 */

export const add = (...args) => args.reduce((a, b) => Number(a) + Number(b), 0);
export const subtract = (a, b) => Number(a) - Number(b);
export const multiply = (...args) => args.reduce((a, b) => Number(a) * Number(b), 1);
export const divide = (a, b) => Number(a) / Number(b);

export const round = (val, decimals = 0) => Number(Math.round(val + 'e' + decimals) + 'e-' + decimals);
export const ceil = (val) => Math.ceil(val);
export const floor = (val) => Math.floor(val);
export const abs = (val) => Math.abs(val);
export const mod = (a, b) => a % b;
export const pow = (a, b) => Math.pow(a, b);
export const sqrt = (val) => Math.sqrt(val);

export const registerMathHelpers = (register) => {
    register('+', add);
    register('add', add);
    register('-', subtract);
    register('sub', subtract);
    register('*', multiply);
    register('mul', multiply);
    register('/', divide);
    register('div', divide);
    register('round', round);
    register('ceil', ceil);
    register('floor', floor);
    register('abs', abs);
    register('mod', mod);
    register('pow', pow);
    register('sqrt', sqrt);
};
