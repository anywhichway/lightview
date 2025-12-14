/**
 * Lightview Skeleton Component (DaisyUI)
 * @see https://daisyui.com/components/skeleton/
 */

import '../daisyui.js';

/**
 * Skeleton Component - loading placeholder
 * @param {Object} props
 * @param {string} props.shape - 'circle' | 'rect'
 * @param {string} props.width - Width class or value
 * @param {string} props.height - Height class or value
 */
const Skeleton = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { div } = tags;

    const {
        shape,
        width = 'w-full',
        height = 'h-4',
        class: className = '',
        ...rest
    } = props;

    const classes = ['skeleton', width, height];
    if (shape === 'circle') classes.push('rounded-full');
    if (className) classes.push(className);

    return div({ class: classes.join(' '), ...rest }, ...children);
};

if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Skeleton', Skeleton);
}

export default Skeleton;
