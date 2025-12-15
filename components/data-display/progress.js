/**
 * Lightview Progress Component (DaisyUI)
 * @see https://daisyui.com/components/progress/
 */

import '../daisyui.js';

/**
 * Progress Component
 * @param {Object} props
 * @param {number|function} props.value - Progress value (0-100)
 * @param {number} props.max - Maximum value (default: 100)
 * @param {string} props.color - 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error'
 * @param {boolean} props.useShadow - Render in Shadow DOM with isolated DaisyUI styles
 */
const Progress = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    const LVX = window.LightviewX || {};

    if (!tags) return null;

    const { progress, div, shadowDOM } = tags;

    const {
        value = 0,
        max = 100,
        color,
        useShadow,
        class: className = '',
        ...rest
    } = props;

    const classes = ['progress'];
    if (color) classes.push(`progress-${color}`);
    if (className) classes.push(className);

    const progressEl = progress({
        class: classes.join(' '),
        value: typeof value === 'function' ? value : value,
        max,
        ...rest
    });

    // Check if we should use shadow DOM
    let usesShadow = false;
    if (LVX.shouldUseShadow) {
        usesShadow = LVX.shouldUseShadow(useShadow);
    } else {
        usesShadow = useShadow === true;
    }

    if (usesShadow) {
        const adoptedStyleSheets = LVX.getAdoptedStyleSheets ? LVX.getAdoptedStyleSheets() : [];

        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';

        return div({ class: 'contents' },
            shadowDOM({ mode: 'open', adoptedStyleSheets },
                div({ 'data-theme': currentTheme },
                    progressEl
                )
            )
        );
    }

    return progressEl;
};

if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Progress', Progress);
}

export default Progress;
