/**
 * Lightview Dock Component (DaisyUI)
 * @see https://daisyui.com/components/dock/
 */

import '../daisyui.js';

/**
 * Dock Component - bottom navigation bar
 * @param {Object} props
 * @param {string} props.size - 'xs' | 'sm' | 'md' | 'lg'
 * @param {boolean} props.useShadow - Render in Shadow DOM with isolated DaisyUI styles
 */
const Dock = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    const LVX = window.LightviewX || {};

    if (!tags) return null;

    const { div, shadowDOM } = tags;

    const {
        size,
        useShadow,
        class: className = '',
        ...rest
    } = props;

    const classes = ['dock'];
    if (size) classes.push(`dock-${size}`);
    if (className) classes.push(className);

    const dockEl = div({ class: classes.join(' '), ...rest }, ...children);

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
                    dockEl
                )
            )
        );
    }

    return dockEl;
};

/**
 * Dock Item
 */
Dock.Item = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const {
        active = false,
        class: className = '',
        ...rest
    } = props;

    const classes = [];
    if (active) classes.push('dock-active');
    if (className) classes.push(className);

    return tags.button({
        class: classes.join(' ') || undefined,
        ...rest
    }, ...children);
};

/**
 * Dock Label
 */
Dock.Label = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.span({
        class: `dock-label ${className}`.trim(),
        ...rest
    }, ...children);
};

const tags = window.Lightview.tags;
tags.Dock = Dock;
tags['Dock.Item'] = Dock.Item;
tags['Dock.Label'] = Dock.Label;

export default Dock;
