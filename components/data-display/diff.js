/**
 * Lightview Diff Component (DaisyUI)
 * @see https://daisyui.com/components/diff/
 */

import '../daisyui.js';

/**
 * Diff Component - side-by-side comparison
 * @param {Object} props
 * @param {string} props.aspectRatio - Aspect ratio class (e.g., 'aspect-16/9')
 */
const Diff = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { div } = tags;

    const {
        aspectRatio = 'aspect-16/9',
        class: className = '',
        ...rest
    } = props;

    return div({
        class: `diff ${aspectRatio} ${className}`.trim(),
        ...rest
    }, ...children);
};

/**
 * Diff Item 1
 */
Diff.Item1 = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { src, alt = '', class: className = '', ...rest } = props;

    if (src) {
        return tags.div({ class: `diff-item-1 ${className}`.trim(), role: 'img', ...rest },
            tags.img({ src, alt })
        );
    }

    return tags.div({ class: `diff-item-1 ${className}`.trim(), ...rest }, ...children);
};

/**
 * Diff Item 2
 */
Diff.Item2 = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { src, alt = '', class: className = '', ...rest } = props;

    if (src) {
        return tags.div({ class: `diff-item-2 ${className}`.trim(), role: 'img', tabindex: '0', ...rest },
            tags.img({ src, alt })
        );
    }

    return tags.div({ class: `diff-item-2 ${className}`.trim(), tabindex: '0', ...rest }, ...children);
};

/**
 * Diff Resizer
 */
Diff.Resizer = (props = {}) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    return tags.div({ class: 'diff-resizer', ...props });
};

if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Diff', Diff);
}

export default Diff;
