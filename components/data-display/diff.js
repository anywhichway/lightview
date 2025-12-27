/**
 * Lightview Diff Component (DaisyUI)
 * @see https://daisyui.com/components/diff/
 */

import '../daisyui.js';

/**
 * Diff Component - side-by-side comparison
 * @param {Object} props
 * @param {string} props.aspectRatio - Aspect ratio class (e.g., 'aspect-16/9')
 * @param {boolean} props.useShadow - Render in Shadow DOM with isolated DaisyUI styles
 */
const Diff = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    const LVX = window.LightviewX || {};

    if (!tags) return null;

    const { div, shadowDOM } = tags;

    const {
        aspectRatio = 'aspect-16/9',
        useShadow,
        class: className = '',
        ...rest
    } = props;

    const diffEl = div({
        class: `diff ${aspectRatio} ${className}`.trim(),
        ...rest
    }, ...children);

    // Check if we should use shadow DOM
    let usesShadow = false;
    if (LVX.shouldUseShadow) {
        usesShadow = LVX.shouldUseShadow(useShadow);
    } else {
        usesShadow = useShadow === true;
    }

    if (usesShadow) {
        const adoptedStyleSheets = LVX.getAdoptedStyleSheets ? LVX.getAdoptedStyleSheets() : [];

        const themeValue = LVX.themeSignal ? () => LVX.themeSignal.value : 'light';

        return div({ class: 'contents' },
            shadowDOM({ mode: 'open', adoptedStyleSheets },
                div({ 'data-theme': themeValue },
                    diffEl
                )
            )
        );
    }

    return diffEl;
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

const tags = window.Lightview.tags;
tags.Diff = Diff;
tags['Diff.Item1'] = Diff.Item1;
tags['Diff.Item2'] = Diff.Item2;
tags['Diff.Resizer'] = Diff.Resizer;

export default Diff;
