import { describe, it, expect, beforeEach } from 'vitest';
import Lightview from '../../src/lightview.js';
import LightviewX from '../../src/lightview-x.js';
import { resolvePath, parseExpression, registerHelper, parseCDOMC } from '../../jprx/parser.js';
import { registerMathHelpers } from '../../jprx/helpers/math.js';
import { registerLogicHelpers } from '../../jprx/helpers/logic.js';
import { registerStringHelpers } from '../../jprx/helpers/string.js';
import { registerArrayHelpers } from '../../jprx/helpers/array.js';
import { registerCompareHelpers } from '../../jprx/helpers/compare.js';
import { registerConditionalHelpers } from '../../jprx/helpers/conditional.js';
import { registerDateTimeHelpers } from '../../jprx/helpers/datetime.js';
import { registerFormatHelpers } from '../../jprx/helpers/format.js';
import { registerLookupHelpers } from '../../jprx/helpers/lookup.js';
import { registerStatsHelpers } from '../../jprx/helpers/stats.js';
import { registerStateHelpers } from '../../jprx/helpers/state.js';
import { hydrate } from '../../src/lightview-cdom.js';

describe('cdom Parser', () => {
    beforeEach(() => {
        // Clear registry before each test
        Lightview.registry.clear();
        // Register standard helpers
        registerMathHelpers(registerHelper);
        registerLogicHelpers(registerHelper);
        registerStringHelpers(registerHelper);
        registerArrayHelpers(registerHelper);
        registerCompareHelpers(registerHelper);
        registerConditionalHelpers(registerHelper);
        registerDateTimeHelpers(registerHelper);
        registerFormatHelpers(registerHelper);
        registerLookupHelpers(registerHelper);
        registerStatsHelpers(registerHelper);
        registerStateHelpers((name, fn) => registerHelper(name, fn, { pathAware: true }));

        // Attach to global for the parser to find it
        globalThis.Lightview = Lightview;
    });

    describe('Path Resolution', () => {
        it('resolves absolute global paths', () => {
            Lightview.signal('Alice', 'userName');
            expect(resolvePath('$/userName')).toBe('Alice');
        });

        it('resolves deep global paths in state', () => {
            LightviewX.state({ profile: { name: 'Bob' } }, 'user');
            expect(resolvePath('$/user/profile/name')).toBe('Bob');
        });

        it('resolves relative paths against context', () => {
            const context = { age: 30, city: 'London' };
            expect(resolvePath('./age', context)).toBe(30);
        });

        it('resolves array indices', () => {
            const context = { items: ['apple', 'banana'] };
            expect(resolvePath('./items/1', context)).toBe('banana');
        });
    });

    describe('Expression Parsing', () => {
        it('creates a computed signal for a path', () => {
            const sig = Lightview.signal(10, 'count');
            const expr = parseExpression('$/count');

            expect(expr.value).toBe(10);

            sig.value = 20;
            expect(expr.value).toBe(20);
        });

        it('supports math helpers', () => {
            Lightview.signal(5, 'a');
            Lightview.signal(10, 'b');
            const expr = parseExpression('$/+(a, b)');

            expect(expr.value).toBe(15);
        });

        it('supports logical helpers', () => {
            Lightview.signal(true, 'isVip');
            const expr = parseExpression('$/if(isVip, "Gold", "Silver")');

            expect(expr.value).toBe('Gold');

            Lightview.get('isVip').value = false;
            expect(expr.value).toBe('Silver');
        });

        it('supports the explosion operator (...)', () => {
            LightviewX.state({ scores: [10, 20, 30] }, 'game');
            const expr = parseExpression('$/sum(game/scores...)');

            expect(expr.value).toBe(60);

            const scores = Lightview.get('game').scores;
            scores.push(40);
            expect(expr.value).toBe(100);
        });

        it('handles nested navigation with helpers ($/user/upper(name))', () => {
            LightviewX.state({ user: { name: 'charlie' } }, 'app');
            // This tests: navigate to app/user, then call upper() on app/user.name
            const expr = parseExpression('$/app/user/upper(name)');

            expect(expr.value).toBe('CHARLIE');
        });
    });

    describe('CDOMC Parser', () => {
        it('parses unquoted $ expressions as strings', () => {
            const input = '{ button: { onclick: $increment($/count), children: "Click" } }';
            const result = parseCDOMC(input);

            expect(result).toEqual({
                button: {
                    onclick: '$increment($/count)',
                    children: 'Click'
                }
            });
        });

        it('parses unquoted cdom-state with object value', () => {
            const input = '{ div: { cdom-state: { count: 0 }, children: [] } }';
            const result = parseCDOMC(input);

            expect(result).toEqual({
                div: {
                    'cdom-state': { count: 0 },
                    children: []
                }
            });
        });

        it('preserves $ prefix in simple paths', () => {
            const input = '{ input: { cdom-bind: $/user/name } }';
            const result = parseCDOMC(input);

            expect(result).toEqual({
                input: {
                    'cdom-bind': '$/user/name'
                }
            });
        });
    });

    describe('Hydration', () => {
        it('converts event handler $ expressions to functions', () => {

            const input = {
                button: {
                    onclick: '$increment($/count)',
                    children: ['Click']
                }
            };

            const result = hydrate(input);

            // onclick should now be a function
            expect(typeof result.button.onclick).toBe('function');
            expect(result.button.children).toEqual(['Click']);
        });

        it('preserves non-$ event handlers as strings', () => {

            const input = {
                button: {
                    onclick: 'alert("hello")',
                    children: ['Click']
                }
            };

            const result = hydrate(input);

            // onclick should remain a string (non-$ expression)
            expect(result.button.onclick).toBe('alert("hello")');
        });
    });
});
