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
    const { tags } = globalThis.Lightview || {};
    const LVX = globalThis.LightviewX || {};

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

        const themeValue = LVX.themeSignal ? () => LVX.themeSignal.value : 'light';

        return div({ class: 'contents' },
            shadowDOM({ mode: 'open', adoptedStyleSheets },
                div({ 'data-theme': themeValue },
                    progressEl
                )
            )
        );
    }

    return progressEl;
};

globalThis.Lightview.tags.Progress = Progress;

// Register as Custom Element using customElementWrapper
if (globalThis.LightviewX && typeof customElements !== 'undefined') {
    const ProgressElement = globalThis.LightviewX.customElementWrapper(Progress, {
        attributeMap: {
            value: Number,
            max: Number,
            color: String
        },
        childElements: {} // No child components
    });

    if (!customElements.get('lv-progress')) {
        customElements.define('lv-progress', ProgressElement);
    }
}

export default Progress;
