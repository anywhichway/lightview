import { describe, it, expect, beforeEach } from 'vitest';
import Lightview from '../../src/lightview.js';
import LightviewX from '../../src/lightview-x.js';
import LightviewCDOM from '../../src/lightview-cdom.js';

describe('cdom Reactivity', () => {
    beforeEach(() => {
        Lightview.registry.clear();
        globalThis.Lightview = Lightview;
        globalThis.LightviewCDOM = LightviewCDOM;
    });

    it('should update DOM-like values when signals change', () => {
        const title = Lightview.signal('Hello', 'pageTitle');
        const expr = LightviewCDOM.parseExpression('$/pageTitle');

        expect(expr.value).toBe('Hello');

        title.value = 'World';
        expect(expr.value).toBe('World');
    });

    it('should handle deep state reactivity within a collection', () => {
        const bills = LightviewX.state([
            { id: 1, amount: 100 },
            { id: 2, amount: 200 }
        ], 'bills');

        const totalExpr = LightviewCDOM.parseExpression('$/sum(bills...amount)');
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
        const greeting = LightviewCDOM.parseExpression('$/user/if(loggedIn, concat("Welcome, ", ./name), "Please Login")');

        expect(greeting.value).toBe('Please Login');

        user.loggedIn = true;
        user.name = 'Alice';
        expect(greeting.value).toBe('Welcome, Alice');
    });
    it('should handle reactivity on multi-level nested objects', () => {
        const settings = LightviewX.state({
            theme: {
                colors: {
                    primary: 'blue',
                    secondary: 'gray'
                },
                font: {
                    size: '16px'
                }
            },
            notifications: {
                email: true
            }
        }, 'settings');

        const colorExpr = LightviewCDOM.parseExpression('$/settings/theme/colors/primary');
        const sizeExpr = LightviewCDOM.parseExpression('$/settings/theme/font/size');
        const deepExpr = LightviewCDOM.parseExpression('$/concat(settings/theme/colors/primary, "-", settings/theme/font/size)');

        expect(colorExpr.value).toBe('blue');
        expect(sizeExpr.value).toBe('16px');
        expect(deepExpr.value).toBe('blue-16px');

        // Update deep property
        settings.theme.colors.primary = 'red';
        expect(colorExpr.value).toBe('red');
        expect(deepExpr.value).toBe('red-16px');

        // Update another deep branch
        settings.theme.font.size = '18px';
        expect(sizeExpr.value).toBe('18px');
        expect(deepExpr.value).toBe('red-18px');

        // Update via swapping nested object
        settings.theme.colors = { primary: 'green', secondary: 'white' };
        expect(colorExpr.value).toBe('green');
        expect(deepExpr.value).toBe('green-18px');
    });

    it('should handle reactivity in a multi-level cdomC structure', () => {
        // 1. Setup Multi-level State
        const profile = LightviewX.state({
            user: {
                details: {
                    name: 'Bob',
                    avatar: { src: 'img.png', alt: 'Profile' }
                },
                stats: {
                    posts: 10,
                    followers: 50
                }
            },
            ui: {
                theme: 'dark'
            }
        }, 'profile');

        // 2. Define Multi-level cdomC Structure using expressions
        // This simulates parsing a nested .cdomc file
        const cdomcStructure = {
            div: {
                id: 'profile-card',
                class: '$/profile/ui/theme', // Bound to ui.theme
                children: [
                    {
                        div: {
                            class: 'header',
                            children: [
                                { h1: { children: ['$/profile/user/details/name'] } }, // Bound to user.details.name
                                { img: { src: '$/profile/user/details/avatar/src', alt: '$/profile/user/details/avatar/alt' } }
                            ]
                        }
                    },
                    {
                        div: {
                            class: 'stats',
                            children: [
                                { span: { children: ["Posts: ", '$/profile/user/stats/posts'] } }, // Bound to user.stats.posts
                                { span: { children: ["Followers: ", '$/profile/user/stats/followers'] } }
                            ]
                        }
                    },
                    // New section with reactive helpers
                    {
                        div: {
                            class: 'helpers-test',
                            children: [
                                // Logic + String helpers: "HELLO BOB" or "HELLO USER"
                                { p: { children: ['$/upper(if(profile/user/details/name, profile/user/details/name, "User"))'] } },
                                // Math + Stats helpers: Sum of posts and followers
                                { p: { children: ['Total interactions: ', '$/sum(profile/user/stats/posts, profile/user/stats/followers)'] } }
                            ]
                        }
                    }
                ]
            }
        };

        // 3. Hydrate the structure
        const hydrated = LightviewCDOM.hydrate(cdomcStructure);

        // 4. Inspect & Assert Initial State
        const root = hydrated;
        const header = root.children[0];
        const stats = root.children[1];
        const helpers = root.children[2];

        expect(root.attributes.class.value).toBe('dark');
        expect(header.children[0].children[0].value).toBe('Bob');
        expect(header.children[1].attributes.src.value).toBe('img.png');
        expect(stats.children[0].children[1].value).toBe(10);

        // Assert Helpers Initial State
        expect(helpers.children[0].children[0].value).toBe('BOB'); // upper('Bob')
        expect(helpers.children[1].children[1].value).toBe(60); // sum(10, 50)

        // 5. Trigger Deep Updates
        profile.user.details.name = 'Robert';
        profile.ui.theme = 'light';
        profile.user.stats.posts = 20;

        // 6. Assert Updates Propagated to cdomC Structure
        expect(root.attributes.class.value).toBe('light'); // Top-level attr
        expect(header.children[0].children[0].value).toBe('Robert'); // Deep nested text
        expect(stats.children[0].children[1].value).toBe(20); // Deep nested sibling

        // Assert Helpers Updated State
        expect(helpers.children[0].children[0].value).toBe('ROBERT'); // upper('Robert')
        expect(helpers.children[1].children[1].value).toBe(70); // sum(20, 50)
    });
});
