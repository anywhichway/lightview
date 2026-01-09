/**
 * JPRX - JSON Reactive Path eXpressions
 * A reactive expression language for JSON data.
 * 
 * JPRX extends JSON Pointer syntax with:
 * - Reactive path resolution ($/path/to/value)
 * - Helper functions (sum, map, filter, etc.)
 * - Operators (++, --, +, -, *, /, etc.)
 * - Explosion operator for array spreading (...prop)
 * - Relative paths (../, ./)
 */

// Core parser and expression resolution
export {
    registerHelper,
    registerOperator,
    parseExpression,
    resolvePath,
    resolvePathAsContext,
    resolveExpression,
    parseCDOMC,
    parseJPRX,
    unwrapSignal,
    getRegistry,
    BindingTarget
} from './parser.js';

// Helper modules - these export registration functions
export { registerMathHelpers } from './helpers/math.js';
export { registerLogicHelpers } from './helpers/logic.js';
export { registerStringHelpers } from './helpers/string.js';
export { registerArrayHelpers } from './helpers/array.js';
export { registerCompareHelpers } from './helpers/compare.js';
export { registerConditionalHelpers } from './helpers/conditional.js';
export { registerDateTimeHelpers } from './helpers/datetime.js';
export { registerFormatHelpers } from './helpers/format.js';
export { registerLookupHelpers } from './helpers/lookup.js';
export { registerStatsHelpers } from './helpers/stats.js';
export { registerStateHelpers, set } from './helpers/state.js';
export { registerNetworkHelpers } from './helpers/network.js';

// Convenience function to register all standard helpers
export const registerAllHelpers = (registerFn) => {
    const { registerMathHelpers } = require('./helpers/math.js');
    const { registerLogicHelpers } = require('./helpers/logic.js');
    const { registerStringHelpers } = require('./helpers/string.js');
    const { registerArrayHelpers } = require('./helpers/array.js');
    const { registerCompareHelpers } = require('./helpers/compare.js');
    const { registerConditionalHelpers } = require('./helpers/conditional.js');
    const { registerDateTimeHelpers } = require('./helpers/datetime.js');
    const { registerFormatHelpers } = require('./helpers/format.js');
    const { registerLookupHelpers } = require('./helpers/lookup.js');
    const { registerStatsHelpers } = require('./helpers/stats.js');
    const { registerStateHelpers } = require('./helpers/state.js');
    const { registerNetworkHelpers } = require('./helpers/network.js');

    registerMathHelpers(registerFn);
    registerLogicHelpers(registerFn);
    registerStringHelpers(registerFn);
    registerArrayHelpers(registerFn);
    registerCompareHelpers(registerFn);
    registerConditionalHelpers(registerFn);
    registerDateTimeHelpers(registerFn);
    registerFormatHelpers(registerFn);
    registerLookupHelpers(registerFn);
    registerStatsHelpers(registerFn);
    registerStateHelpers((name, fn) => registerFn(name, fn, { pathAware: true }));
    registerNetworkHelpers(registerFn);
};
