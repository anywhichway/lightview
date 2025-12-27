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

        const themeValue = LVX.themeSignal ? () => LVX.themeSignal.value : 'light';

        return span({ style: 'margin-right: 0.5rem' },
            shadowDOM({ mode: 'open', adoptedStyleSheets },
                div({ 'data-theme': themeValue, style: 'display: inline-block' },
                    loadingEl
                )
            )
        );
    }

    return loadingEl;
};

window.Lightview.tags.Loading = Loading;

// Register as Custom Element
if (window.LightviewX?.createCustomElement) {
    const LoadingElement = window.LightviewX.createCustomElement(Loading);
    if (!customElements.get('lv-loading')) {
        customElements.define('lv-loading', LoadingElement);
    }
}

export default Loading;
