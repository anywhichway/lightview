/**
 * LIGHTVIEW-HDOM
 * The Reactive Path and Expression Engine for Lightview.
 */

import { registerHelper, parseExpression, resolvePath, parseHDOMC } from './hdom/parser.js';
import { registerMathHelpers } from './hdom/helpers/math.js';
import { registerLogicHelpers } from './hdom/helpers/logic.js';
import { registerStringHelpers } from './hdom/helpers/string.js';

// Initialize Standard Helpers
registerMathHelpers(registerHelper);
registerLogicHelpers(registerHelper);
registerStringHelpers(registerHelper);

const LightviewHDOM = {
    registerHelper,
    parseExpression,
    resolvePath,
    parseHDOMC,
    version: '1.0.0'
};

// Global export for non-module usage
if (typeof window !== 'undefined') {
    globalThis.LightviewHDOM = LightviewHDOM;
}

export default LightviewHDOM;
export { registerHelper, parseExpression, resolvePath, parseHDOMC };
