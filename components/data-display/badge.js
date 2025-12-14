/**
 * Lightview Badge Component (DaisyUI)
 * @see https://daisyui.com/components/badge/
 */

import '../daisyui.js';

/**
 * Badge Component
 * @param {Object} props
 * @param {string} props.color - 'primary' | 'secondary' | 'accent' | 'neutral' | 'info' | 'success' | 'warning' | 'error' | 'ghost'
 * @param {string} props.size - 'xs' | 'sm' | 'md' | 'lg'
 * @param {string} props.variant - 'outline' | 'soft' | 'dash'
 */
const Badge = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { span } = tags;

    const {
        color,
        size,
        variant,
        class: className = '',
        ...rest
    } = props;

    const classes = ['badge'];

    if (color) classes.push(`badge-${color}`);
    if (size) classes.push(`badge-${size}`);
    if (variant === 'outline') classes.push('badge-outline');
    else if (variant === 'soft') classes.push('badge-soft');
    else if (variant === 'dash') classes.push('badge-dash');

    if (className) classes.push(className);

    return span({ class: classes.join(' '), ...rest }, ...children);
};

if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Badge', Badge);
}

export default Badge;
