/**
 * Lightview Tooltip Component (DaisyUI)
 * @see https://daisyui.com/components/tooltip/
 */

import '../daisyui.js';

/**
 * Tooltip Component
 * @param {Object} props
 * @param {string} props.tip - Tooltip text
 * @param {string} props.position - 'top' | 'bottom' | 'left' | 'right'
 * @param {string} props.color - 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error'
 * @param {boolean} props.open - Force open state
 */
const Tooltip = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { div } = tags;

    const {
        tip,
        position,
        color,
        open = false,
        class: className = '',
        ...rest
    } = props;

    const classes = ['tooltip'];
    if (position) classes.push(`tooltip-${position}`);
    if (color) classes.push(`tooltip-${color}`);
    if (open) classes.push('tooltip-open');
    if (className) classes.push(className);

    return div({
        class: classes.join(' '),
        'data-tip': tip,
        ...rest
    }, ...children);
};

if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Tooltip', Tooltip);
}

export default Tooltip;
