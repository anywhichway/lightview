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
 */
const Menu = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { ul } = tags;

    const {
        horizontal = false,
        size,
        bg = 'bg-base-200',
        class: className = '',
        ...rest
    } = props;

    const classes = ['menu', bg, 'rounded-box'];
    if (horizontal) classes.push('menu-horizontal');
    if (size) classes.push(`menu-${size}`);
    if (className) classes.push(className);

    return ul({ class: classes.join(' '), ...rest }, ...children);
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
