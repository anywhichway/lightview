/**
 * Lightview Menu Component (DaisyUI)
 * @see https://daisyui.com/components/menu/
 */

import '../daisyui.js';

/**
 * Menu Component
 * @param {Object} props
 * @param {boolean} props.horizontal - Horizontal layout
 * @param {string} props.size - 'xs' | 'sm' | 'md' | 'lg'
 * @param {string} props.bg - Background class
 * @param {boolean} props.useShadow - Render in Shadow DOM with isolated DaisyUI styles
 */
const Menu = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    const LVX = window.LightviewX || {};

    if (!tags) return null;

    const { ul, div, shadowDOM } = tags;

    const {
        horizontal = false,
        size,
        bg = 'bg-base-200',
        useShadow,
        class: className = '',
        ...rest
    } = props;

    const classes = ['menu', bg, 'rounded-box'];
    if (horizontal) classes.push('menu-horizontal');
    if (size) classes.push(`menu-${size}`);
    if (className) classes.push(className);

    const menuEl = ul({ class: classes.join(' '), ...rest }, ...children);

    // Check if we should use shadow DOM
    let usesShadow = false;
    if (LVX.shouldUseShadow) {
        usesShadow = LVX.shouldUseShadow(useShadow);
    } else {
        usesShadow = useShadow === true;
    }

    if (usesShadow) {
        const adoptedStyleSheets = LVX.getAdoptedStyleSheets ? LVX.getAdoptedStyleSheets() : [];

        if (adoptedStyleSheets.length === 0) {
            console.warn('Lightview Menu: Shadow DOM enabled but DaisyUI stylesheet not loaded. Call LightviewX.initComponents() at app startup.');
        }

        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';

        return div({ class: 'contents' },
            shadowDOM({ mode: 'open', adoptedStyleSheets },
                div({ 'data-theme': currentTheme },
                    menuEl
                )
            )
        );
    }

    return menuEl;
};

/**
 * Menu Item
 */
Menu.Item = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const {
        disabled = false,
        active = false,
        class: className = '',
        ...rest
    } = props;

    const classes = [];
    if (disabled) classes.push('disabled');
    if (className) classes.push(className);

    const innerClasses = [];
    if (active) innerClasses.push('active');

    return tags.li({ class: classes.join(' ') || undefined, ...rest },
        tags.a({ class: innerClasses.join(' ') || undefined }, ...children)
    );
};

/**
 * Menu Title
 */
Menu.Title = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.li({ class: `menu-title ${className}`.trim(), ...rest }, ...children);
};

/**
 * Menu Dropdown (submenu)
 */
Menu.Dropdown = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { label, open = false, class: className = '', ...rest } = props;

    const details = tags.details({ open, ...rest },
        tags.summary({}, label),
        tags.ul({}, ...children)
    );

    return tags.li({}, details);
};

if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Menu', Menu);
}

export default Menu;
