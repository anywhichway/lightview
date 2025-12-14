/**
 * Lightview Join Component (DaisyUI)
 * @see https://daisyui.com/components/join/
 */

import '../daisyui.js';

/**
 * Join Component - groups items with shared borders
 * @param {Object} props
 * @param {boolean} props.vertical - Vertical layout
 */
const Join = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { div } = tags;

    const {
        vertical = false,
        class: className = '',
        ...rest
    } = props;

    const classes = ['join'];
    if (vertical) classes.push('join-vertical');
    if (className) classes.push(className);

    return div({ class: classes.join(' '), ...rest }, ...children);
};

/**
 * Join Item - each joined element should have this class
 */
Join.Item = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { as = 'button', class: className = '', ...rest } = props;
    const el = tags[as] || tags.div;

    return el({
        class: `join-item ${className}`.trim(),
        ...rest
    }, ...children);
};

if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Join', Join);
}

export default Join;
