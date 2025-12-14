/**
 * Lightview Loading Component (DaisyUI)
 * @see https://daisyui.com/components/loading/
 */

import '../daisyui.js';

/**
 * Loading Component
 * @param {Object} props
 * @param {string} props.type - 'spinner' | 'dots' | 'ring' | 'ball' | 'bars' | 'infinity'
 * @param {string} props.size - 'xs' | 'sm' | 'md' | 'lg'
 * @param {string} props.color - Color class (e.g., 'text-primary')
 */
const Loading = (props = {}) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { span } = tags;

    const {
        type = 'spinner',
        size,
        color,
        class: className = '',
        ...rest
    } = props;

    const classes = ['loading', `loading-${type}`];
    if (size) classes.push(`loading-${size}`);
    if (color) classes.push(color);
    if (className) classes.push(className);

    return span({ class: classes.join(' '), ...rest });
};

if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Loading', Loading);
}

export default Loading;
