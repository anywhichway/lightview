/**
 * JPRX CALC HELPER
 * Safe expression evaluation using expr-eval.
 * Uses the global $ helper for reactive path lookups.
 */

import { Parser } from 'expr-eval';
import { resolvePath, unwrapSignal } from '../parser.js';

/**
 * Evaluates a mathematical expression string.
 * Supports $() for reactive path lookups within the expression.
 * 
 * @param {string} expression - The expression to evaluate (e.g., "$('/price') * 1.08")
 * @param {object} context - The JPRX context for path resolution
 * @returns {number|string} - The result of the evaluation
 * 
 * @example
 * =calc("$('/width') * $('/height')")
 * =calc("5 + 3 * 2")
 * =calc("($('/subtotal') + $('/tax')) * 0.9")
 */
export const calc = (expression, context) => {
    if (typeof expression !== 'string') {
        return expression;
    }

    let processedExpression = expression;
    try {
        const pathResolver = (path) => {
            let currentPath = path;
            let value;
            let depth = 0;

            // Recursively resolve if the value is another path string (e.g., "/c/display")
            while (typeof currentPath === 'string' && (currentPath.startsWith('/') || currentPath.startsWith('=/')) && depth < 5) {
                const normalizedPath = currentPath.startsWith('/') ? '=' + currentPath : currentPath;
                const resolved = resolvePath(normalizedPath, context);
                value = unwrapSignal(resolved);

                // If the new value is a different path string, keep going
                if (typeof value === 'string' && (value.startsWith('/') || value.startsWith('=/')) && value !== currentPath) {
                    currentPath = value;
                    depth++;
                } else {
                    break;
                }
            }

            if (typeof value === 'number') return value;
            if (typeof value === 'string') {
                const num = parseFloat(value);
                if (!isNaN(num) && isFinite(Number(value))) return num;
                return value === '' ? 0 : `"${value.replace(/"/g, '\\"')}"`;
            }
            return value === undefined || value === null ? 0 : value;
        };

        const pathRegex = /\$\(\s*['"](.*?)['"]\s*\)/g;
        processedExpression = expression.replace(pathRegex, (match, path) => {
            const val = pathResolver(path);
            return val;
        });

        const parser = new Parser();
        const parsed = parser.parse(processedExpression);
        return parsed.evaluate();

    } catch (error) {
        console.error('JPRX calc error:', error.message);
        console.error('Original expression:', expression);
        console.error('Processed expression:', processedExpression);
        return NaN;
    }
};

/**
 * Register the calc helper.
 */
export const registerCalcHelpers = (register) => {
    register('calc', calc, { pathAware: true });
};
