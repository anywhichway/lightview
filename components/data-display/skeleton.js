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
 * @param {boolean} props.useShadow - Render in Shadow DOM with isolated DaisyUI styles
 */
const Skeleton = (props = {}, ...children) => {
    const { tags } = globalThis.Lightview || {};
    const LVX = globalThis.LightviewX || {};

    if (!tags) return null;

    const { div, shadowDOM } = tags;

    const {
        shape,
        width = 'w-full',
        height = 'h-4',
        useShadow,
        class: className = '',
        ...rest
    } = props;

    const classes = ['skeleton', width, height];
    if (shape === 'circle') classes.push('rounded-full');
    if (className) classes.push(className);

    const skeletonEl = div({ class: classes.join(' '), ...rest }, ...children);

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
                    skeletonEl
                )
            )
        );
    }

    return skeletonEl;
};

globalThis.Lightview.tags.Skeleton = Skeleton;

export default Skeleton;
