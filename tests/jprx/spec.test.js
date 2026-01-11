import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import Lightview from '../../src/lightview.js';
import LightviewX from '../../src/lightview-x.js';
import { resolveExpression, registerHelper, registerOperator } from '../../jprx/parser.js';
import { registerMathHelpers } from '../../jprx/helpers/math.js';
import { registerLogicHelpers } from '../../jprx/helpers/logic.js';
import { registerStatsHelpers } from '../../jprx/helpers/stats.js';
import { registerCompareHelpers } from '../../jprx/helpers/compare.js';
import { registerStringHelpers } from '../../jprx/helpers/string.js';
import { registerArrayHelpers } from '../../jprx/helpers/array.js';
import { registerConditionalHelpers } from '../../jprx/helpers/conditional.js';
import { registerDateTimeHelpers } from '../../jprx/helpers/datetime.js';
import { registerFormatHelpers } from '../../jprx/helpers/format.js';
import { registerLookupHelpers } from '../../jprx/helpers/lookup.js';
import { registerStateHelpers } from '../../jprx/helpers/state.js';
import { registerNetworkHelpers } from '../../jprx/helpers/network.js';

// Register standard operators
const registerStandardOperators = () => {
    registerOperator('increment', '++', 'prefix', 80);
    registerOperator('increment', '++', 'postfix', 80);
    registerOperator('decrement', '--', 'prefix', 80);
    registerOperator('decrement', '--', 'postfix', 80);
    registerOperator('toggle', '!!', 'prefix', 80);
    registerOperator('+', '+', 'infix', 50);
    registerOperator('-', '-', 'infix', 50);
    registerOperator('*', '*', 'infix', 60);
    registerOperator('/', '/', 'infix', 60);
    registerOperator('gt', '>', 'infix', 40);
    registerOperator('lt', '<', 'infix', 40);
    registerOperator('gte', '>=', 'infix', 40);
    registerOperator('lte', '<=', 'infix', 40);
    registerOperator('neq', '!=', 'infix', 40);
};

// Helper to load and run specs
const runSpec = (specPath) => {
    const specs = JSON.parse(fs.readFileSync(specPath, 'utf8'));

    describe(path.basename(specPath), () => {
        beforeEach(() => {
            // Clear all global reactive state
            Lightview.registry.clear();
            Lightview.internals.futureSignals.clear();

            registerMathHelpers(registerHelper);
            registerLogicHelpers(registerHelper);
            registerStatsHelpers(registerHelper);
            registerCompareHelpers(registerHelper);
            registerStringHelpers(registerHelper);
            registerArrayHelpers(registerHelper);
            registerConditionalHelpers(registerHelper);
            registerDateTimeHelpers(registerHelper);
            registerFormatHelpers(registerHelper);
            registerLookupHelpers(registerHelper);
            registerStateHelpers((name, fn) => registerHelper(name, fn, { pathAware: true }));
            registerNetworkHelpers(registerHelper);

            registerStandardOperators();
            globalThis.Lightview = Lightview;
        });

        specs.forEach((spec) => {
            it(spec.name || spec.expression, () => {
                // 1. Setup State
                if (spec.state) {
                    Object.entries(spec.state).forEach(([key, value]) => {
                        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                            LightviewX.state(value, key);
                        } else {
                            Lightview.signal(value, key);
                        }
                    });
                }

                // 2. Evaluate Expression
                const result = resolveExpression(spec.expression, spec.context);

                // 3. Unwrap if it's a signal
                const finalValue = (result && typeof result === 'function' && 'value' in result)
                    ? result.value
                    : result;

                expect(finalValue).toEqual(spec.expected);
            });
        });
    });
};

describe('JPRX Shared Specs', () => {
    const specsDir = path.resolve(__dirname, '../../jprx/specs');
    const files = fs.readdirSync(specsDir).filter(f => f.endsWith('.json'));

    files.forEach(file => {
        runSpec(path.join(specsDir, file));
    });
});
