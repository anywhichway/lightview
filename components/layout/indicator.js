/**
 * Lightview Indicator Component (DaisyUI)
 * @see https://daisyui.com/components/indicator/
 */

import '../daisyui.js';

/**
 * Indicator Component - positions a badge/element on corner of another element
 * @param {Object} props
 * @param {string} props.position - Combination of 'top'|'middle'|'bottom' and 'start'|'center'|'end'
 * @param {boolean} props.useShadow - Render in Shadow DOM with isolated DaisyUI styles
 */
const Indicator = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    const LVX = window.LightviewX || {};

    if (!tags) return null;

    const { div, shadowDOM } = tags;

    const { useShadow, class: className = '', ...rest } = props;

    const indicatorEl = div({
        class: `indicator ${className}`.trim(),
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

        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';

        return div({ class: 'contents' },
            shadowDOM({ mode: 'open', adoptedStyleSheets },
                div({ 'data-theme': currentTheme },
                    indicatorEl
                )
            )
        );
    }

    return indicatorEl;
};

/**
 * Indicator Item - the positioned element
 */
Indicator.Item = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const {
        position,
        class: className = '',
        ...rest
    } = props;

    const classes = ['indicator-item'];

    // Position classes
    if (position) {
        const [v, h] = position.split('-');
        if (v === 'top') classes.push('indicator-top');
        else if (v === 'middle') classes.push('indicator-middle');
        else if (v === 'bottom') classes.push('indicator-bottom');

        if (h === 'start') classes.push('indicator-start');
        else if (h === 'center') classes.push('indicator-center');
        else if (h === 'end') classes.push('indicator-end');
    }

    if (className) classes.push(className);

    return tags.span({ class: classes.join(' '), ...rest }, ...children);
};

if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Indicator', Indicator);
}

export default Indicator;
