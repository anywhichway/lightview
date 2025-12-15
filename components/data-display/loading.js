/**
 * Lightview Loading Component (DaisyUI)
 * @see https://daisyui.com/components/loading/
 */

import '../daisyui.js';

/**
 * Loading Component
 * @param {Object} props
 * @param {string} props.type - 'spinner' | 'dots' | 'ring' | 'ball' | 'bars' | 'infinity'
 * @param {string} props.size - 'xs' | 'sm' | 'md' | 'lg'
 * @param {string} props.color - Color class (e.g., 'text-primary')
 * @param {boolean} props.useShadow - Render in Shadow DOM with isolated DaisyUI styles
 */
const Loading = (props = {}) => {
    const { tags } = window.Lightview || {};
    const LVX = window.LightviewX || {};

    if (!tags) return null;

    const { span, div, shadowDOM } = tags;

    const {
        type = 'spinner',
        size,
        color,
        useShadow,
        class: className = '',
        ...rest
    } = props;

    const classes = ['loading', `loading-${type}`];
    if (size) classes.push(`loading-${size}`);
    if (color) classes.push(color);
    if (className) classes.push(className);

    const loadingEl = span({ class: classes.join(' '), ...rest });

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
                    loadingEl
                )
            )
        );
    }

    return loadingEl;
};

if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Loading', Loading);
}

export default Loading;
