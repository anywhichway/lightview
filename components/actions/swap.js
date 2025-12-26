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
    const { tags, signal } = window.Lightview || {};
    const LVX = window.LightviewX || {};

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

    // Handle reactive active state
    const isActive = typeof active === 'function' ? active : () => active;

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
                if (onChange) onChange(e.target.checked);
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

        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';

        return div({ class: 'contents' },
            shadowDOM({ mode: 'open', adoptedStyleSheets },
                div({ 'data-theme': currentTheme },
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
    const { tags } = window.Lightview || {};
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
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.div({
        class: `swap-off ${className}`.trim(),
        ...rest
    }, ...children);
};

const tags = window.Lightview.tags;
tags.Swap = Swap;
tags['Swap.On'] = Swap.On;
tags['Swap.Off'] = Swap.Off;

export default Swap;
