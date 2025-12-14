/**
 * Lightview Divider Component (DaisyUI)
 * @see https://daisyui.com/components/divider/
 */

import '../daisyui.js';

/**
 * Divider Component
 * @param {Object} props
 * @param {boolean} props.horizontal - Horizontal divider (default is vertical in flex row)
 * @param {boolean} props.vertical - Vertical divider (explicit)
 * @param {string} props.position - 'start' | 'end' for text position
 * @param {string} props.color - 'neutral' | 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'info' | 'error'
 */
const Divider = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { div } = tags;

    const {
        horizontal = false,
        vertical = false,
        position,
        color,
        class: className = '',
        ...rest
    } = props;

    const classes = ['divider'];
    if (horizontal) classes.push('divider-horizontal');
    if (vertical) classes.push('divider-vertical');
    if (position === 'start') classes.push('divider-start');
    else if (position === 'end') classes.push('divider-end');
    if (color) classes.push(`divider-${color}`);
    if (className) classes.push(className);

    return div({ class: classes.join(' '), ...rest }, ...children);
};

if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Divider', Divider);
}

export default Divider;
