/**
 * Lightview Progress Component (DaisyUI)
 * @see https://daisyui.com/components/progress/
 */

import '../daisyui.js';

/**
 * Progress Component
 * @param {Object} props
 * @param {number|function} props.value - Progress value (0-100)
 * @param {number} props.max - Maximum value (default: 100)
 * @param {string} props.color - 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error'
 */
const Progress = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { progress } = tags;

    const {
        value = 0,
        max = 100,
        color,
        class: className = '',
        ...rest
    } = props;

    const classes = ['progress'];
    if (color) classes.push(`progress-${color}`);
    if (className) classes.push(className);

    return progress({
        class: classes.join(' '),
        value: typeof value === 'function' ? value : value,
        max,
        ...rest
    });
};

if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Progress', Progress);
}

export default Progress;
