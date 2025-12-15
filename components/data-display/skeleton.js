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
    const { tags } = window.Lightview || {};
    const LVX = window.LightviewX || {};

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

        if (adoptedStyleSheets.length === 0) {
            console.warn('Lightview Skeleton: Shadow DOM enabled but DaisyUI stylesheet not loaded. Call LightviewX.initComponents() at app startup.');
        }

        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';

        return div({ class: 'contents' },
            shadowDOM({ mode: 'open', adoptedStyleSheets },
                div({ 'data-theme': currentTheme },
                    skeletonEl
                )
            )
        );
    }

    return skeletonEl;
};

if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Skeleton', Skeleton);
}

export default Skeleton;
