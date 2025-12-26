/**
 * Lightview Collapse Component (DaisyUI)
 * @see https://daisyui.com/components/collapse/
 */

import '../daisyui.js';

/**
 * Collapse Component
 * @param {Object} props
 * @param {string} props.icon - 'arrow' | 'plus'
 * @param {boolean} props.open - Initially open
 * @param {boolean} props.focus - Open on focus
 * @param {boolean} props.useShadow - Render in Shadow DOM with isolated DaisyUI styles
 */
const Collapse = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    const LVX = window.LightviewX || {};

    if (!tags) return null;

    const { div, input, shadowDOM } = tags;

    const {
        icon = 'arrow',
        open = false,
        focus = false,
        useShadow,
        class: className = '',
        ...rest
    } = props;

    const classes = ['collapse', 'bg-base-100', 'border', 'border-base-300', 'rounded-box'];
    if (icon === 'arrow') classes.push('collapse-arrow');
    else if (icon === 'plus') classes.push('collapse-plus');
    if (className) classes.push(className);

    const collapseEl = div({ class: classes.join(' '), ...rest },
        input({ type: 'checkbox', checked: open }),
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
                    collapseEl
                )
            )
        );
    }

    return collapseEl;
};

/**
 * Collapse Title
 */
Collapse.Title = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.div({
        class: `collapse-title font-semibold ${className}`.trim(),
        ...rest
    }, ...children);
};

/**
 * Collapse Content
 */
Collapse.Content = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.div({
        class: `collapse-content text-sm ${className}`.trim(),
        ...rest
    }, ...children);
};

const tags = window.Lightview.tags;
tags.Collapse = Collapse;
tags['Collapse.Title'] = Collapse.Title;
tags['Collapse.Content'] = Collapse.Content;

export default Collapse;
