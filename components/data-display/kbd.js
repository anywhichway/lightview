/**
 * Lightview Kbd Component (DaisyUI)
 * @see https://daisyui.com/components/kbd/
 */

import '../daisyui.js';

/**
 * Kbd Component - keyboard key indicator
 * @param {Object} props
 * @param {string} props.size - 'xs' | 'sm' | 'md' | 'lg'
 */
const Kbd = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { kbd } = tags;

    const { size, class: className = '', ...rest } = props;

    const classes = ['kbd'];
    if (size) classes.push(`kbd-${size}`);
    if (className) classes.push(className);

    return kbd({ class: classes.join(' '), ...rest }, ...children);
};

if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Kbd', Kbd);
}

export default Kbd;
