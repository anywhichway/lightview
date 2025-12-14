/**
 * Lightview Radial Progress Component (DaisyUI)
 * @see https://daisyui.com/components/radial-progress/
 */

import '../daisyui.js';

/**
 * Radial Progress Component
 * @param {Object} props
 * @param {number|function} props.value - Progress value (0-100)
 * @param {string} props.size - Size in CSS units (e.g., '4rem')
 * @param {string} props.thickness - Border thickness (e.g., '2px')
 * @param {string} props.color - Color class (e.g., 'text-primary')
 */
const RadialProgress = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { div } = tags;

    const {
        value = 0,
        size = '4rem',
        thickness = '4px',
        color,
        class: className = '',
        ...rest
    } = props;

    const classes = ['radial-progress'];
    if (color) classes.push(color);
    if (className) classes.push(className);

    const getValue = () => typeof value === 'function' ? value() : value;

    return div({
        class: classes.join(' '),
        style: typeof value === 'function'
            ? () => `--value:${getValue()}; --size:${size}; --thickness:${thickness};`
            : `--value:${value}; --size:${size}; --thickness:${thickness};`,
        role: 'progressbar',
        'aria-valuenow': typeof value === 'function' ? value : value,
        'aria-valuemin': '0',
        'aria-valuemax': '100',
        ...rest
    }, children.length ? children : [() => getValue() + '%']);
};

if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('RadialProgress', RadialProgress);
}

export default RadialProgress;
