import { describe, it, expect, beforeEach } from 'vitest';
import Lightview from '../../src/lightview.js';
import LightviewX from '../../src/lightview-x.js';
import { parseCDOMC } from '../../jprx/parser.js';
import { hydrate } from '../../src/lightview-cdom.js';

/**
 * cdom Integration Tests
 * 
 * These tests focus on Lightview-specific functionality:
 * - CDOMC parsing (concise syntax)
 * - Hydration (converting static objects to reactive structures)
 * - Event handler conversion
 * 
 * Pure JPRX expression tests are in tests/jprx/spec.test.js
 */
describe('cdom Integration', () => {
    beforeEach(() => {
        Lightview.registry.clear();
        globalThis.Lightview = Lightview;
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
            expect(typeof result.attributes.onclick).toBe('function');
            expect(result.children).toEqual(['Click']);
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
            expect(result.attributes.onclick).toBe('alert("hello")');
        });
    });
});
