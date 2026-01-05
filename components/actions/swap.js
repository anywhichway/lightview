/**
 * Lightview Swap Component (DaisyUI)
 * @see https://daisyui.com/components/swap/
 */

import '../daisyui.js';

/**
 * Swap Component - toggle between two elements
 * @param {Object} props
 * @param {boolean|function} props.active - Control swap state
 * @param {string} props.effect - 'rotate' | 'flip'
 * @param {boolean} props.useShadow - Render in Shadow DOM with isolated DaisyUI styles
 */
const Swap = (props = {}, ...children) => {
    const { tags, signal } = globalThis.Lightview || {};
    const LVX = globalThis.LightviewX || {};

    if (!tags) return null;

    const { label, input, div, shadowDOM } = tags;

    const {
        active = false,
        effect,
        useShadow,
        class: className = '',
        onChange,
        ...rest
    } = props;

    const classes = ['swap'];
    if (effect === 'rotate') classes.push('swap-rotate');
    else if (effect === 'flip') classes.push('swap-flip');
    if (className) classes.push(className);

    // Handle internal state for non-reactive/uncontrolled usage
    const internalActive = signal(active);
    const isActive = typeof active === 'function' ? active : () => internalActive.value;

    const swapEl = label({
        class: () => {
            const base = [...classes];
            if (isActive()) base.push('swap-active');
            return base.join(' ');
        },
        ...rest
    },
        input({
            type: 'checkbox',
            checked: isActive,
            onchange: (e) => {
                const checked = e.target.checked;
                if (typeof active !== 'function') {
                    internalActive.value = checked;
                }
                if (onChange) onChange(checked);
            }
        }),
        ...children
    );

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
                    swapEl
                )
            )
        );
    }

    return swapEl;
};

/**
 * Swap On - visible when active
 */
Swap.On = (props = {}, ...children) => {
    const { tags } = globalThis.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.div({
        class: `swap-on ${className}`.trim(),
        ...rest
    }, ...children);
};

/**
 * Swap Off - visible when inactive
 */
Swap.Off = (props = {}, ...children) => {
    const { tags } = globalThis.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.div({
        class: `swap-off ${className}`.trim(),
        ...rest
    }, ...children);
};

const tags = globalThis.Lightview.tags;
tags.Swap = Swap;
tags['Swap.On'] = Swap.On;
tags['Swap.Off'] = Swap.Off;

// Register as Custom Element using customElementWrapper
if (globalThis.LightviewX && typeof customElements !== 'undefined') {
    const SwapElement = globalThis.LightviewX.customElementWrapper(Swap, {
        attributeMap: {
            active: Boolean,
            effect: String
        },
        childElements: {
            'on': Swap.On,
            'off': Swap.Off
        }
    });

    if (!customElements.get('lv-swap')) {
        customElements.define('lv-swap', SwapElement);
    }
}

export default Swap;
