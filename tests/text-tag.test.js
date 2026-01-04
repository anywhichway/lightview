
import { describe, it, expect, beforeEach } from 'vitest';
import { parseHTML } from 'linkedom';
import Lightview from '../src/lightview.js';

describe('text tag', () => {
    let document;

    beforeEach(() => {
        const dom = parseHTML('<!DOCTYPE html><html><body></body></html>');
        document = dom.document;
        globalThis.document = document;
        globalThis.Text = dom.Text;
        globalThis.HTMLElement = dom.HTMLElement;
        globalThis.ShadowRoot = dom.ShadowRoot;
        globalThis.MutationObserver = class { observe() { } disconnect() { } };
        globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0);
        globalThis.CSSStyleSheet = class { };

        Lightview.registry.clear();
    });

    it('should create a single text node with space-separated children', () => {
        const el = Lightview.tags.text('Hello', 'World');
        expect(el.domEl).toBeInstanceOf(globalThis.Text);
        expect(el.domEl.textContent).toBe('Hello World');
    });

    it('should handle reactive children', async () => {
        const name = Lightview.signal('Alice');
        const el = Lightview.tags.text('Hello', () => name.value);

        expect(el.domEl.textContent).toBe('Hello Alice');

        name.value = 'Bob';
        // Lightview effects run in a microtask or immediately depending on configuration
        // Usually, Lightview signals in this project run synchronously if triggered? 
        // Let's check reactivity.

        expect(el.domEl.textContent).toBe('Hello Bob');
    });

    it('should handle nested arrays and other types', () => {
        const el = Lightview.tags.text('Count:', [1, 2, 3], true);
        expect(el.domEl.textContent).toBe('Count: 1 2 3 true');
    });

    it('should ignore null and undefined values but keep the space', () => {
        // Based on my implementation: .map(c => ... return val === null ? '' : String(val)).join(' ')
        const el = Lightview.tags.text('a', null, 'b');
        expect(el.domEl.textContent).toBe('a  b');
    });

    it('should work with Lightview.tags.text(...) as a child of another element', () => {
        const div = Lightview.tags.div(
            Lightview.tags.text('Part', '1'),
            ' ',
            Lightview.tags.text('Part', '2')
        );

        expect(div.domEl.childNodes.length).toBe(3);
        expect(div.domEl.childNodes[0]).toBeInstanceOf(globalThis.Text);
        expect(div.domEl.childNodes[2]).toBeInstanceOf(globalThis.Text);
        expect(div.domEl.textContent).toBe('Part 1 Part 2');
    });

    it('should use standard SVG text element when in SVG context', () => {
        const svg = Lightview.element('svg', {}, [
            { tag: 'text', children: ['Hello SVG'] }
        ]);

        const textElement = svg.domEl.firstChild;
        expect(textElement.tagName.toLowerCase()).toBe('text');
        expect(textElement.namespaceURI).toBe('http://www.w3.org/2000/svg');
        expect(textElement).not.toBeInstanceOf(globalThis.Text);
    });
});
