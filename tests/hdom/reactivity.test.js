import { describe, it, expect, beforeEach } from 'vitest';
import Lightview from '../../lightview.js';
import LightviewX from '../../lightview-x.js';
import LightviewHDOM from '../../lightview-hdom.js';

describe('HDOM Reactivity', () => {
    beforeEach(() => {
        Lightview.registry.clear();
        globalThis.Lightview = Lightview;
        globalThis.LightviewHDOM = LightviewHDOM;
    });

    it('should update DOM-like values when signals change', () => {
        const title = Lightview.signal('Hello', 'pageTitle');
        const expr = LightviewHDOM.parseExpression('$/pageTitle');

        expect(expr.value).toBe('Hello');

        title.value = 'World';
        expect(expr.value).toBe('World');
    });

    it('should handle deep state reactivity within a collection', () => {
        const bills = LightviewX.state([
            { id: 1, amount: 100 },
            { id: 2, amount: 200 }
        ], 'bills');

        const totalExpr = LightviewHDOM.parseExpression('$/sum(bills/amount...)');
        expect(totalExpr.value).toBe(300);

        // Update an existing item
        bills[0].amount = 150;
        expect(totalExpr.value).toBe(350);

        // Add a new item
        bills.push({ id: 3, amount: 50 });
        expect(totalExpr.value).toBe(400);

        // Remove an item
        bills.pop();
        expect(totalExpr.value).toBe(350);
    });

    it('should handle conditional logic reactively', () => {
        const user = LightviewX.state({ loggedIn: false, name: 'Guest' }, 'user');
        const greeting = LightviewHDOM.parseExpression('$/user/if(loggedIn, concat("Welcome, ", ./name), "Please Login")');

        expect(greeting.value).toBe('Please Login');

        user.loggedIn = true;
        user.name = 'Alice';
        expect(greeting.value).toBe('Welcome, Alice');
    });
});
