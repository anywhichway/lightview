/**
 * Lightview Radial Progress Component (DaisyUI)
 * @see https://daisyui.com/components/radial-progress/
 */

import '../daisyui.js';

/**
 * Radial Progress Component
 * @param {Object} props
 * @param {number|function} props.value - Progress value (0-100)
 * @param {string} props.size - Size in CSS units (e.g., '4rem')
 * @param {string} props.thickness - Border thickness (e.g., '2px')
 * @param {string} props.color - Color class (e.g., 'text-primary')
 * @param {boolean} props.useShadow - Render in Shadow DOM with isolated DaisyUI styles
 */
const RadialProgress = (props = {}, ...children) => {
    const { tags } = globalThis.Lightview || {};
    const LVX = globalThis.LightviewX || {};

    if (!tags) return null;

    const { div, span, shadowDOM } = tags;

    const {
        value = 0,
        size = '4rem',
        thickness = '4px',
        color,
        useShadow,
        class: className = '',
        ...rest
    } = props;

    const classes = ['radial-progress'];
    if (color) classes.push(color);
    if (className) classes.push(className);

    const getValue = () => typeof value === 'function' ? value() : value;

    const radialEl = div({
        class: classes.join(' '),
        style: typeof value === 'function'
            ? () => `--value:${getValue()}; --size:${size}; --thickness:${thickness};`
            : `--value:${value}; --size:${size}; --thickness:${thickness};`,
        role: 'progressbar',
        'aria-valuenow': typeof value === 'function' ? value : value,
        'aria-valuemin': '0',
        'aria-valuemax': '100',
        ...rest
    }, children.length ? children : [() => getValue() + '%']);

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

        return div({ class: 'contents', style: 'display: inline-block' },
            shadowDOM({ mode: 'open', adoptedStyleSheets },
                div({ 'data-theme': themeValue },
                    radialEl
                )
            )
        );
    }

    return radialEl;
};

globalThis.Lightview.tags.RadialProgress = RadialProgress;

// Register as Custom Element using customElementWrapper
if (globalThis.LightviewX && typeof customElements !== 'undefined') {
    const RadialProgressElement = globalThis.LightviewX.customElementWrapper(RadialProgress, {
        attributeMap: {
            value: Number,
            size: String,
            thickness: String,
            color: String
        },
        childElements: {} // No child components, uses slot for percentage display
    });

    if (!customElements.get('lv-radial-progress')) {
        customElements.define('lv-radial-progress', RadialProgressElement);
    }
}

export default RadialProgress;
