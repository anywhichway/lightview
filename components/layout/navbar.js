/**
 * Lightview Navbar Component (DaisyUI)
 * @see https://daisyui.com/components/navbar/
 */

import '../daisyui.js';

/**
 * Navbar Component
 * @param {Object} props
 * @param {string} props.bg - Background class (e.g., 'bg-base-100')
 */
const Navbar = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { div } = tags;

    const {
        bg = 'bg-base-100',
        class: className = '',
        ...rest
    } = props;

    const classes = ['navbar', bg];
    if (className) classes.push(className);

    return div({ class: classes.join(' '), ...rest }, ...children);
};

/**
 * Navbar Start
 */
Navbar.Start = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.div({
        class: `navbar-start ${className}`.trim(),
        ...rest
    }, ...children);
};

/**
 * Navbar Center
 */
Navbar.Center = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.div({
        class: `navbar-center ${className}`.trim(),
        ...rest
    }, ...children);
};

/**
 * Navbar End
 */
Navbar.End = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.div({
        class: `navbar-end ${className}`.trim(),
        ...rest
    }, ...children);
};

if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Navbar', Navbar);
}

export default Navbar;
