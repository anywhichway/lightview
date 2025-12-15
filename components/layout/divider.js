/**
 * Lightview Divider Component (DaisyUI)
 * @see https://daisyui.com/components/divider/
 */

import '../daisyui.js';

/**
 * Divider Component
 * @param {Object} props
 * @param {boolean} props.horizontal - Horizontal divider (default is vertical in flex row)
 * @param {boolean} props.vertical - Vertical divider (explicit)
 * @param {string} props.position - 'start' | 'end' for text position
 * @param {string} props.color - 'neutral' | 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'info' | 'error'
 * @param {boolean} props.useShadow - Render in Shadow DOM with isolated DaisyUI styles
 */
const Divider = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    const LVX = window.LightviewX || {};

    if (!tags) return null;

    const { div, shadowDOM } = tags;

    const {
        horizontal = false,
        vertical = false,
        position,
        color,
        useShadow,
        class: className = '',
        ...rest
    } = props;

    const classes = ['divider'];
    if (horizontal) classes.push('divider-horizontal');
    if (vertical) classes.push('divider-vertical');
    if (position === 'start') classes.push('divider-start');
    else if (position === 'end') classes.push('divider-end');
    if (color) classes.push(`divider-${color}`);
    if (className) classes.push(className);

    const dividerEl = div({ class: classes.join(' '), ...rest }, ...children);

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
            console.warn('Lightview Divider: Shadow DOM enabled but DaisyUI stylesheet not loaded. Call LightviewX.initComponents() at app startup.');
        }

        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';

        return div({ class: 'contents' },
            shadowDOM({ mode: 'open', adoptedStyleSheets },
                div({ 'data-theme': currentTheme },
                    dividerEl
                )
            )
        );
    }

    return dividerEl;
};

if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Divider', Divider);
}

export default Divider;
