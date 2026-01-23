import { describe, it, expect, beforeEach } from 'vitest';
import Lightview from '../../src/lightview.js';
import LightviewX from '../../src/lightview-x.js';
import LightviewCDOM from '../../src/lightview-cdom.js';
import { resolveExpression, unwrapSignal } from '../../jprx/parser.js';

/**
 * Operator Tests
 * 
 * Tests all registered operators using property-based context.
 */
describe('JPRX Operators', () => {
    beforeEach(() => {
        globalThis.window = globalThis;
        globalThis.Lightview = Lightview;
        globalThis.LightviewX = LightviewX;
        globalThis.LightviewCDOM = LightviewCDOM;
        Lightview.registry.clear();
    });

    describe('Context-based Evaluation', () => {
        it('resolves simple properties from context', () => {
            const context = { a: 10, b: 20 };
            expect(resolveExpression('a', context)).toBe(10);
            expect(resolveExpression('b', context)).toBe(20);
        });

        it('performs math with context variables', () => {
            const context = { a: 10, b: 5 };
            expect(resolveExpression('a + b', context)).toBe(15);
            expect(resolveExpression('a - b', context)).toBe(5);
            expect(resolveExpression('a * b', context)).toBe(50);
            expect(resolveExpression('a / b', context)).toBe(2);
        });

        it('handles comparison operators', () => {
            const context = { a: 10, b: 5, c: 10 };
            expect(resolveExpression('a > b', context)).toBe(true);
            expect(resolveExpression('b > a', context)).toBe(false);
            expect(resolveExpression('a < b', context)).toBe(false);
            expect(resolveExpression('b < a', context)).toBe(true);
            expect(resolveExpression('a >= c', context)).toBe(true);
            expect(resolveExpression('a <= c', context)).toBe(true);
            expect(resolveExpression('a == c', context)).toBe(true);
            expect(resolveExpression('a === c', context)).toBe(true);
            expect(resolveExpression('a != b', context)).toBe(true);
            expect(resolveExpression('a == b', context)).toBe(false);
            expect(resolveExpression('a === b', context)).toBe(false);
        });

        it('handles equality with different types', () => {
            const context = { a: 5, b: '5' };
            expect(resolveExpression('a == b', context)).toBe(true);
            expect(resolveExpression('a === b', context)).toBe(false);
        });
    });

    describe('Mutation Operators (Context-based)', () => {
        it('increments a property: ++count', () => {
            const context = { count: 5 };
            const result = resolveExpression('++count', context);
            expect(result).toBe(6);
            expect(context.count).toBe(6);
        });

        it('decrements a property: count--', () => {
            const context = { count: 10 };
            const result = resolveExpression('count--', context);
            expect(result).toBe(9);
            expect(context.count).toBe(9);
        });

        it('toggles a property: !!flag', () => {
            const context = { flag: false };
            const result = resolveExpression('!!flag', context);
            expect(result).toBe(true);
            expect(context.flag).toBe(true);
        });
    });

    describe('Assignment Operator', () => {
        it('assigns value to context property: x = 42', () => {
            const context = { x: 0 };
            const result = resolveExpression('x = 42', context);
            expect(result).toBe(42);
            expect(context.x).toBe(42);
        });

        it('assigns complex values: x = a + b', () => {
            const context = { x: 0, a: 10, b: 20 };
            // Note: complex right-hand side currently requires helper syntax or better Pratt integration
            // But with current parser, it should work if we use precedence correctly
            const result = resolveExpression('x = a + b', context);
            expect(result).toBe(30);
            expect(context.x).toBe(30);
        });

        it('assigns object literals: user = { name: "Alice" }', () => {
            const context = { user: null };
            resolveExpression('user = { name: "Alice" }', context);
            expect(context.user).toEqual({ name: 'Alice' });
        });
    });

    describe('Whitespace and Ambiguity', () => {
        it('handles packed assignment: count=0', () => {
            const context = { count: 5 };
            resolveExpression('count=0', context);
            expect(context.count).toBe(0);
        });

        it('handles packed addition: a+b', () => {
            const context = { a: 1, b: 2 };
            expect(resolveExpression('a+b', context)).toBe(3);
        });

        it('requires whitespace for division: a / b', () => {
            const context = { a: 10, b: 2, 'a/b': 99 };
            // Correct division
            expect(resolveExpression('a / b', context)).toBe(5);
            // Path resolution (no spaces)
            expect(resolveExpression('a/b', context)).toBe(99);
        });

        it('requires whitespace for subtraction: a - b', () => {
            const context = { a: 10, b: 2, 'a-b': 42 };
            // Subtraction
            expect(resolveExpression('a - b', context)).toBe(8);
            // Kebab-case path
            expect(resolveExpression('a-b', context)).toBe(42);
        });
    });

    describe('Registry Integration (Global Paths)', () => {
        it('works with global paths: =/global/x + y', () => {
            LightviewX.state({ x: 100 }, 'global');
            const context = { y: 50 };
            expect(resolveExpression('=/global/x + y', context)).toBe(150);
        });
    });
});
