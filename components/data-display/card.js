/**
 * Lightview Card Component (DaisyUI)
 * @see https://daisyui.com/components/card/
 */

import '../daisyui.js';

/**
 * Card Component
 * @param {Object} props
 * @param {string} props.variant - 'bordered' | 'dash' | 'side' | 'compact'
 * @param {string} props.imageFull - Image fills width
 * @param {string} props.bg - Background class (e.g., 'bg-base-100')
 * @param {string} props.shadow - Shadow class (e.g., 'shadow-sm', 'shadow-xl')
 */
const Card = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { div } = tags;

    const {
        variant,
        imageFull = false,
        bg = 'bg-base-100',
        shadow = 'shadow-sm',
        class: className = '',
        ...rest
    } = props;

    const classes = ['card', bg, shadow];

    if (variant === 'bordered') classes.push('card-bordered');
    else if (variant === 'dash') classes.push('card-dash');
    else if (variant === 'side') classes.push('card-side');
    else if (variant === 'compact') classes.push('card-compact');

    if (imageFull) classes.push('image-full');
    if (className) classes.push(className);

    return div({ class: classes.join(' '), ...rest }, ...children);
};

/**
 * Card Body
 */
Card.Body = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.div({
        class: `card-body ${className}`.trim(),
        ...rest
    }, ...children);
};

/**
 * Card Title
 */
Card.Title = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.h2({
        class: `card-title ${className}`.trim(),
        ...rest
    }, ...children);
};

/**
 * Card Actions
 */
Card.Actions = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const {
        justify = 'end',
        class: className = '',
        ...rest
    } = props;

    return tags.div({
        class: `card-actions justify-${justify} ${className}`.trim(),
        ...rest
    }, ...children);
};

/**
 * Card Figure (for images)
 */
Card.Figure = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { src, alt = '', class: className = '', ...rest } = props;

    if (src) {
        return tags.figure({ class: className, ...rest },
            tags.img({ src, alt })
        );
    }

    return tags.figure({ class: className, ...rest }, ...children);
};

if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Card', Card);
}

export default Card;
