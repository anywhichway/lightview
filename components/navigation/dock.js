/**
 * Lightview Dock Component (DaisyUI)
 * @see https://daisyui.com/components/dock/
 */

import '../daisyui.js';

/**
 * Dock Component - bottom navigation bar
 * @param {Object} props
 * @param {string} props.size - 'xs' | 'sm' | 'md' | 'lg'
 */
const Dock = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { div } = tags;

    const {
        size,
        class: className = '',
        ...rest
    } = props;

    const classes = ['dock'];
    if (size) classes.push(`dock-${size}`);
    if (className) classes.push(className);

    return div({ class: classes.join(' '), ...rest }, ...children);
};

/**
 * Dock Item
 */
Dock.Item = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const {
        active = false,
        class: className = '',
        ...rest
    } = props;

    const classes = [];
    if (active) classes.push('dock-active');
    if (className) classes.push(className);

    return tags.button({
        class: classes.join(' ') || undefined,
        ...rest
    }, ...children);
};

if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Dock', Dock);
}

export default Dock;
