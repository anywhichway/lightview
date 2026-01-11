import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Lightview from '../../src/lightview.js';
import LightviewX from '../../src/lightview-x.js';
import LightviewCDOM from '../../src/lightview-cdom.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('cdom Helpers Integration', () => {
    let handleSrc;

    beforeEach(() => {
        globalThis.window = globalThis;
        globalThis.__DEBUG__ = true;
        globalThis.Lightview = Lightview;
        globalThis.LightviewX = LightviewX;
        globalThis.LightviewCDOM = LightviewCDOM;

        if (typeof document !== 'undefined') {
            document.body.innerHTML = '';
        }

        Lightview.registry.clear();

        // Setup state for Array/Stats tests
        LightviewX.state({
            list: ['a', 'b', 'c'],
            numbers: [10, 20, 30, 40]
        }, 'data');

        if (globalThis.LightviewX?.internals?.handleSrcAttribute) {
            handleSrc = globalThis.LightviewX.internals.handleSrcAttribute;
        }

        globalThis.fetch = vi.fn().mockImplementation((url) => {
            const fileName = url.toString().split('/').pop();
            const filePath = path.join(__dirname, 'fixtures', fileName);
            if (!fs.existsSync(filePath)) return Promise.resolve({ ok: false, status: 404 });
            const content = fs.readFileSync(filePath, 'utf8');
            return Promise.resolve({
                ok: true,
                text: () => Promise.resolve(content),
                json: () => Promise.resolve(JSON.parse(content)),
                url: url.toString()
            });
        });
    });

    const clean = (html) => html.replace(/<!--lv:[se]-->/g, '').replace(/\s+/g, ' ').trim();

    it('should hydrate cdomc object and evaluate expressions correctly', async () => {
        // 1. Fetch
        const response = await fetch('http://localhost:3000/helpers.cdomc');
        const text = await response.text();

        // 2. Parse (Simulated - in real app handleSrc uses LightviewCDOM.parseCDOMC)
        const parsed = LightviewCDOM.parseCDOMC(text);

        // 3. Hydrate
        const hydrated = LightviewCDOM.hydrate(parsed);

        // Helper to dive into the structure:
        // { tag: 'div', children: [ { tag: 'div', attributes: { id: 'math' }, children: [...] } ] }
        const root = hydrated;
        const findSection = (id) => {
            const section = root.children.find(child => child.attributes?.id === id);
            return section.children;
        };

        // Math
        const math = findSection('math');
        // add: $+(10, 5) -> "add: " + 15
        expect(math[0].children[1].value).toBe(15);
        expect(math[1].children[1].value).toBe(5);
        expect(math[2].children[1].value).toBe(50);
        expect(math[3].children[1].value).toBe(2);

        // Logic
        const logic = findSection('logic');
        expect(logic[0].children[1].value).toBe(true);
        expect(logic[1].children[1].value).toBe(true);
        expect(logic[2].children[1].value).toBe(true);

        // String
        const str = findSection('string');
        expect(str[0].children[1].value).toBe('HELLO');
        expect(str[1].children[1].value).toBe('hello');
        expect(str[2].children[1].value).toBe('Hello World');

        // Compare
        const compare = findSection('compare');
        expect(compare[0].children[1].value).toBe(true);
        expect(compare[1].children[1].value).toBe(true);
        expect(compare[2].children[1].value).toBe(true);

        // Conditional
        const conditional = findSection('conditional');
        expect(conditional[0].children[1].value).toBe('Yes');
        expect(conditional[1].children[1].value).toBe('No');

        // Array
        const array = findSection('array');
        expect(array[0].children[1].value).toBe('a-b-c');
        expect(array[1].children[1].value).toBe(3);
        expect(array[2].children[1].value).toBe('a');

        // Stats
        const stats = findSection('stats');
        expect(stats[0].children[1].value).toBe(100);
        expect(stats[1].children[1].value).toBe(25);
        expect(stats[2].children[1].value).toBe(40);
        expect(stats[3].children[1].value).toBe(10);

        // Format
        const format = findSection('format');
        expect(format[0].children[1].value).toBe('USD1,234.56');
        expect(format[1].children[1].value).toBe('13%');
    });
});
