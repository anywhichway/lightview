/**
 * Lightview Join Component (DaisyUI)
 * @see https://daisyui.com/components/join/
 */

import '../daisyui.js';

/**
 * Join Component - groups items with shared borders
 * @param {Object} props
 * @param {boolean} props.vertical - Vertical layout
 * @param {boolean} props.useShadow - Render in Shadow DOM with isolated DaisyUI styles
 */
const Join = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    const LVX = window.LightviewX || {};

    if (!tags) return null;

    const { div, shadowDOM } = tags;

    const {
        vertical = false,
        useShadow,
        class: className = '',
        ...rest
    } = props;

    const classes = ['join'];
    if (vertical) classes.push('join-vertical');
    if (className) classes.push(className);

    const joinEl = div({ class: classes.join(' '), ...rest }, ...children);

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
                    joinEl
                )
            )
        );
    }

    return joinEl;
};

/**
 * Join Item - each joined element should have this class
 */
Join.Item = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { as = 'button', class: className = '', ...rest } = props;
    const el = tags[as] || tags.div;

    return el({
        class: `join-item ${className}`.trim(),
        ...rest
    }, ...children);
};

window.Lightview.tags.Join = Join;

export default Join;
