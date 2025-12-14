/**
 * Lightview Swap Component (DaisyUI)
 * @see https://daisyui.com/components/swap/
 */

import '../daisyui.js';

/**
 * Swap Component - toggle between two elements
 * @param {Object} props
 * @param {boolean|function} props.active - Control swap state
 * @param {string} props.effect - 'rotate' | 'flip'
 */
const Swap = (props = {}, ...children) => {
    const { tags, signal } = window.Lightview || {};
    if (!tags) return null;

    const { label, input } = tags;

    const {
        active = false,
        effect,
        class: className = '',
        onChange,
        ...rest
    } = props;

    const classes = ['swap'];
    if (effect === 'rotate') classes.push('swap-rotate');
    else if (effect === 'flip') classes.push('swap-flip');
    if (className) classes.push(className);

    // Handle reactive active state
    const isActive = typeof active === 'function' ? active : () => active;

    return label({
        class: () => {
            const base = [...classes];
            if (isActive()) base.push('swap-active');
            return base.join(' ');
        },
        ...rest
    },
        input({
            type: 'checkbox',
            checked: isActive,
            onchange: (e) => {
                if (onChange) onChange(e.target.checked);
            }
        }),
        ...children
    );
};

/**
 * Swap On - visible when active
 */
Swap.On = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.div({
        class: `swap-on ${className}`.trim(),
        ...rest
    }, ...children);
};

/**
 * Swap Off - visible when inactive
 */
Swap.Off = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.div({
        class: `swap-off ${className}`.trim(),
        ...rest
    }, ...children);
};

if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Swap', Swap);
}

export default Swap;
