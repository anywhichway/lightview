/**
 * Lightview Toast Component (DaisyUI)
 * @see https://daisyui.com/components/toast/
 */

import '../daisyui.js';

/**
 * Toast Component - positioned container for alerts
 * @param {Object} props
 * @param {string} props.position - 'start' | 'center' | 'end'
 * @param {string} props.vertical - 'top' | 'middle' | 'bottom'
 */
const Toast = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { div } = tags;

    const {
        position = 'end',
        vertical = 'bottom',
        class: className = '',
        ...rest
    } = props;

    const classes = ['toast'];

    if (position === 'start') classes.push('toast-start');
    else if (position === 'center') classes.push('toast-center');
    else if (position === 'end') classes.push('toast-end');

    if (vertical === 'top') classes.push('toast-top');
    else if (vertical === 'middle') classes.push('toast-middle');
    else if (vertical === 'bottom') classes.push('toast-bottom');

    if (className) classes.push(className);

    return div({ class: classes.join(' '), ...rest }, ...children);
};

if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Toast', Toast);
}

export default Toast;
