/**
 * Lightview Kbd Component (DaisyUI)
 * @see https://daisyui.com/components/kbd/
 */

import '../daisyui.js';

/**
 * Kbd Component - keyboard key indicator
 * @param {Object} props
 * @param {string} props.size - 'xs' | 'sm' | 'md' | 'lg'
 * @param {boolean} props.useShadow - Render in Shadow DOM with isolated DaisyUI styles
 */
const Kbd = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    const LVX = window.LightviewX || {};

    if (!tags) return null;

    const { kbd, div, shadowDOM } = tags;

    const { size, useShadow, class: className = '', ...rest } = props;

    const classes = ['kbd'];
    if (size) classes.push(`kbd-${size}`);
    if (className) classes.push(className);

    const kbdEl = kbd({ class: classes.join(' '), ...rest }, ...children);

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
                    kbdEl
                )
            )
        );
    }

    return kbdEl;
};

if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Kbd', Kbd);
}

export default Kbd;
