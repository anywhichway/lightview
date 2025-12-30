/**
 * Lightview Tooltip Component (DaisyUI)
 * @see https://daisyui.com/components/tooltip/
 */

import '../daisyui.js';

/**
 * Tooltip Component
 * @param {Object} props
 * @param {string} props.tip - Tooltip text
 * @param {string} props.position - 'top' | 'bottom' | 'left' | 'right'
 * @param {string} props.color - 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error'
 * @param {boolean} props.open - Force open state
 * @param {boolean} props.useShadow - Render in Shadow DOM with isolated DaisyUI styles
 */
const Tooltip = (props = {}, ...children) => {
    const { tags } = globalThis.Lightview || {};
    const LVX = globalThis.LightviewX || {};

    if (!tags) return null;

    const { div, shadowDOM } = tags;

    const {
        tip,
        position,
        color,
        open = false,
        useShadow,
        class: className = '',
        ...rest
    } = props;

    const classes = ['tooltip'];
    if (position) classes.push(`tooltip-${position}`);
    if (color) classes.push(`tooltip-${color}`);
    if (open) classes.push('tooltip-open');
    if (className) classes.push(className);

    const tooltipEl = div({
        class: classes.join(' '),
        'data-tip': tip,
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
                    tooltipEl
                )
            )
        );
    }

    return tooltipEl;
};

globalThis.Lightview.tags.Tooltip = Tooltip;

export default Tooltip;
