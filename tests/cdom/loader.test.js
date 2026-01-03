import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Lightview from '../../lightview.js';
import LightviewX from '../../lightview-x.js';
import LightviewCDOM from '../../lightview-cdom.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('cdom Full Loader Tests', () => {
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
        LightviewX.state({
            user: {
                name: 'Alice',
                age: 30,
                role: 'Admin',
                status: 'Available',
                score: 100,
                level: 5,
                points: [10, 20, 30],
                isVip: true,
                account: { type: 'Premium' },
                details: { city: 'NYC', zip: '10001' },
                discount: 10,
                activity: {
                    purchases: [5, 10, 15]
                }
            }
        }, 'app');

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

    const cleanHTML = (html) => html.replace(/<!--lv:[se]-->/g, '').replace(/\s+/g, ' ').trim();

    it('should load and parse user.vdom with cdom expressions', async () => {
        const container = Lightview.tags.div({ src: '/user.vdom' });
        await handleSrc(container, '/user.vdom', 'div', {
            element: Lightview.element,
            setupChildren: Lightview.internals.setupChildren
        });

        const html = cleanHTML(container.domEl.innerHTML);
        expect(html).toContain('Alice');
        expect(html).toContain('Age: 30');
        expect(html).toContain('Account: Premium');
        expect(html).toContain('VIP Status: Yes');
        expect(html).toContain('Location: NYC');
    });

    it('should load and parse user.odom with cdom expressions', async () => {
        const container = Lightview.tags.div({ src: '/user.odom' });
        await handleSrc(container, '/user.odom', 'div', {
            element: Lightview.element,
            setupChildren: Lightview.internals.setupChildren
        });

        const html = cleanHTML(container.domEl.innerHTML);
        expect(html).toContain('Alice');
        expect(html).toContain('Score: 100');
        expect(html).toContain('Level: 5');
        // Activity: purchases [5, 10, 15] -> sum = 30
        expect(html).toContain('Activity Total: 30');
        // Relative path: ../discount (10) * sum(purchases...) (30) = 300
        expect(html).toContain('With Discount: 300');
    });

    it('should load and parse user.cdom (JSON ODOM file)', async () => {
        const container = Lightview.tags.div({ src: '/user.cdom' });
        await handleSrc(container, '/user.cdom', 'div', {
            element: Lightview.element,
            setupChildren: Lightview.internals.setupChildren
        });

        const html = cleanHTML(container.domEl.innerHTML);
        expect(html).toContain('cdom-card');
        expect(html).toContain('Welcome, Alice');
        expect(html).toContain('(VIP)');
        expect(html).toContain('Discount: 20%');
    });

    it('should load and parse user.cdomc (Unquoted Properties/Expressions)', async () => {
        const container = Lightview.tags.div({ src: '/user.cdomc' });
        await handleSrc(container, '/user.cdomc', 'div', {
            element: Lightview.element,
            setupChildren: Lightview.internals.setupChildren
        });

        const html = cleanHTML(container.domEl.innerHTML);
        if (__DEBUG__) console.log('ACTUAL HTML:', html);
        expect(html).toContain('profile-compiled');
        expect(html).toContain('Alice');
        expect(html).toContain('Available');
        expect(html).toContain('Tier: Platinum');
    });
});
