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
    const { tags } = globalThis.Lightview || {};
    const LVX = globalThis.LightviewX || {};

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

        const themeValue = LVX.themeSignal ? () => LVX.themeSignal.value : 'light';

        return div({ class: 'contents' },
            shadowDOM({ mode: 'open', adoptedStyleSheets },
                div({ 'data-theme': themeValue },
                    kbdEl
                )
            )
        );
    }

    return kbdEl;
};

globalThis.Lightview.tags.Kbd = Kbd;

// Register as Custom Element
if (globalThis.LightviewX?.createCustomElement) {
    const KbdElement = globalThis.LightviewX.createCustomElement(Kbd);
    if (!customElements.get('lv-kbd')) {
        customElements.define('lv-kbd', KbdElement);
    }
}

export default Kbd;
