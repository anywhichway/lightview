import { describe, it, expect, beforeEach } from 'vitest';
import Lightview from '../../lightview.js';
import LightviewX from '../../lightview-x.js';
import { resolvePath, parseExpression, registerHelper } from '../../cdom/parser.js';
import { registerMathHelpers } from '../../cdom/helpers/math.js';
import { registerLogicHelpers } from '../../cdom/helpers/logic.js';
import { registerStringHelpers } from '../../cdom/helpers/string.js';
import { registerArrayHelpers } from '../../cdom/helpers/array.js';
import { registerCompareHelpers } from '../../cdom/helpers/compare.js';
import { registerConditionalHelpers } from '../../cdom/helpers/conditional.js';
import { registerDateTimeHelpers } from '../../cdom/helpers/datetime.js';
import { registerFormatHelpers } from '../../cdom/helpers/format.js';
import { registerLookupHelpers } from '../../cdom/helpers/lookup.js';
import { registerStatsHelpers } from '../../cdom/helpers/stats.js';
import { registerStateHelpers } from '../../cdom/helpers/state.js';

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
});
