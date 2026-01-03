// KILL SWITCH: Force exit if stuck for more than 5 seconds
if (typeof process !== 'undefined') {
    setTimeout(() => {
        console.error('CRITICAL TIMEOUT: Test process killed after 5s');
        process.exit(1);
    }, 5000).unref?.();
}

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import Lightview from '../../lightview.js';
import LightviewX from '../../lightview-x.js';
import LightviewCDOM from '../../lightview-cdom.js';

// Mock requestAnimationFrame to prevent hangs in JSDOM
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

// Helper to wait for the next frame
const nextTick = () => new Promise(r => setTimeout(r, 50));

describe('cdom Directives', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        Lightview.registry.clear();
        globalThis.Lightview = Lightview;
        globalThis.LightviewCDOM = LightviewCDOM;
        globalThis.LightviewX = LightviewX;
    });

    describe('cdom-state', () => {
        it('should initialize local state and allow expression access', async () => {
            const container = document.createElement('div');
            container.id = 'container';
            container.setAttribute('cdom-state', '{"count": 10}');
            const span = document.createElement('span');
            span.id = 'output';
            container.appendChild(span);
            document.body.appendChild(container);

            LightviewCDOM.activate(container);

            const context = LightviewCDOM.getContext(span);
            Lightview.effect(() => {
                span.textContent = String(context.count);
            });

            await nextTick();

            expect(document.getElementById('output').textContent).toBe('10');
        });

        it('should support nested scopes (lexical inheritance)', async () => {
            const outer = document.createElement('div');
            outer.setAttribute('cdom-state', '{"title": "Parent", "val": 1}');
            const inner = document.createElement('div');
            inner.id = 'inner';
            inner.setAttribute('cdom-state', '{"val": 2}');
            const titleOut = document.createElement('span');
            titleOut.id = 'title-out';
            const valOut = document.createElement('span');
            valOut.id = 'val-out';

            inner.appendChild(titleOut);
            inner.appendChild(valOut);
            outer.appendChild(inner);
            document.body.appendChild(outer);

            LightviewCDOM.activate(outer);

            const titleContext = LightviewCDOM.getContext(titleOut);
            const valContext = LightviewCDOM.getContext(valOut);

            Lightview.effect(() => { titleOut.textContent = titleContext.title; });
            Lightview.effect(() => { valOut.textContent = String(valContext.val); });

            await nextTick();

            expect(document.getElementById('title-out').textContent).toBe('Parent');
            expect(document.getElementById('val-out').textContent).toBe('2');
        });
    });

    /*
        describe('cdom-bind', () => {
            it('should perform two-way binding on text inputs', async () => {
                const container = document.createElement('div');
                container.setAttribute('cdom-state', '{"name": "Initial"}');
                const input = document.createElement('input');
                input.id = 'input';
                input.setAttribute('cdom-bind', 'name');
                const output = document.createElement('span');
                output.id = 'output';
    
                container.appendChild(input);
                container.appendChild(output);
                document.body.appendChild(container);
    
                LightviewCDOM.activate(container);
    
                const context = LightviewCDOM.getContext(output);
                Lightview.effect(() => { output.textContent = context.name; });
    
                await nextTick();
    
                expect(input.value).toBe('Initial');
                expect(output.textContent).toBe('Initial');
    
                // Change input -> check state/output
                input.value = 'New Value';
                input.dispatchEvent(new globalThis.Event('input'));
                await nextTick();
                expect(output.textContent).toBe('New Value');
    
                // Change state -> check input
                context.name = 'Updated State';
                await nextTick();
                expect(input.value).toBe('Updated State');
                expect(output.textContent).toBe('Updated State');
            });
    
            it('should handle smart initialization (DOM -> State)', async () => {
                const container = document.createElement('div');
                container.setAttribute('cdom-state', '{}');
                const input = document.createElement('input');
                input.id = 'input';
                input.setAttribute('cdom-bind', 'tag');
                input.value = 'Fast';
    
                container.appendChild(input);
                document.body.appendChild(container);
    
                LightviewCDOM.activate(container);
                await nextTick();
    
                const context = LightviewCDOM.getContext(input);
                expect(context.tag).toBe('Fast');
            });
    
            it('should handle checkboxes', async () => {
                const container = document.createElement('div');
                container.setAttribute('cdom-state', '{"active": false}');
                const check = document.createElement('input');
                check.type = 'checkbox';
                check.id = 'check';
                check.setAttribute('cdom-bind', 'active');
    
                container.appendChild(check);
                document.body.appendChild(container);
    
                LightviewCDOM.activate(container);
                await nextTick();
    
                const context = LightviewCDOM.getContext(check);
                expect(check.checked).toBe(false);
    
                check.checked = true;
                check.dispatchEvent(new globalThis.Event('change'));
                await nextTick();
                expect(context.active).toBe(true);
    
                context.active = false;
                await nextTick();
                expect(check.checked).toBe(false);
            });
        });
    */

    describe('cdom-on:', () => {
        it('should execute expressions on events', async () => {
            const container = document.createElement('div');
            container.setAttribute('cdom-state', '{"count": 0}');
            const btn = document.createElement('button');
            btn.id = 'btn';
            btn.setAttribute('cdom-on:click', 'set(count, 5)');
            btn.textContent = 'Set to 5';
            const output = document.createElement('span');
            output.id = 'output';

            container.appendChild(btn);
            container.appendChild(output);
            document.body.appendChild(container);

            LightviewCDOM.activate(container);

            const context = LightviewCDOM.getContext(output);
            Lightview.effect(() => { output.textContent = String(context.count); });

            await nextTick();
            expect(output.textContent).toBe('0');

            btn.click();
            await nextTick();
            expect(output.textContent).toBe('5');
        });

        it('should support $event object', async () => {
            const container = document.createElement('div');
            container.setAttribute('cdom-state', '{"val": ""}');
            const input = document.createElement('input');
            input.id = 'input-event';
            input.setAttribute('cdom-on:input', 'set(val, $event.target.value)');
            const output = document.createElement('span');
            output.id = 'output-event';

            container.appendChild(input);
            container.appendChild(output);
            document.body.appendChild(container);

            LightviewCDOM.activate(container);

            const context = LightviewCDOM.getContext(output);
            Lightview.effect(() => { output.textContent = context.val; });

            await nextTick();

            input.value = 'typed';
            input.dispatchEvent(new globalThis.Event('input'));
            await nextTick();

            expect(output.textContent).toBe('typed');
        });
    });

    describe('cdom Path Resolution', () => {
        it('should resolve local context properties as BindingTarget', () => {
            const state = { name: 'test' };
            const target = LightviewCDOM.resolvePathAsContext('name', state);
            expect(target).toBeDefined();
            expect(target.isBindingTarget).toBe(true);
            expect(target.value).toBe('test');
        });

        it('should support dot notation for nested properties', () => {
            const state = { user: { profile: { name: 'nested' } } };
            const target = LightviewCDOM.resolvePathAsContext('user.profile.name', state);
            expect(target).toBeDefined();
            expect(target.isBindingTarget).toBe(true);
            expect(target.value).toBe('nested');
        });
    });

    describe('Global Registry cdom', () => {
        it('should resolve global signal paths', async () => {
            Lightview.signal('TestValue', 'testSignal');

            const value = LightviewCDOM.resolvePath('$/testSignal', {});

            expect(value).toBe('TestValue');
        });
    });

    describe('cdomC Parsing', () => {
        it('should parse cdomC format', () => {
            const cdomc = `{
                div: {
                    id: test-div,
                    class: my-class,
                    children: [Hello]
                }
            }`;

            const odom = LightviewCDOM.parseCDOMC(cdomc);

            expect(odom.div).toBeDefined();
            expect(odom.div.id).toBe('test-div');
            expect(odom.div.class).toBe('my-class');
            expect(odom.div.children).toContain('Hello');
        });
    });
});
