/**
 * Lightview Drawer Component (DaisyUI)
 * @see https://daisyui.com/components/drawer/
 */

import '../daisyui.js';

/**
 * Drawer Component
 * @param {Object} props
 * @param {string} props.id - Unique ID for the drawer
 * @param {boolean|function} props.open - Control open state
 * @param {boolean} props.end - Drawer on right side
 * @param {boolean} props.useShadow - Render in Shadow DOM with isolated DaisyUI styles
 */
const Drawer = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    const LVX = window.LightviewX || {};

    if (!tags) return null;

    const { div, input, label, shadowDOM } = tags;

    const {
        id = 'drawer-' + Math.random().toString(36).slice(2),
        open = false,
        end = false,
        useShadow,
        class: className = '',
        ...rest
    } = props;

    const classes = ['drawer'];
    if (end) classes.push('drawer-end');
    if (className) classes.push(className);

    const drawerEl = div({ class: classes.join(' '), ...rest },
        input({
            id,
            type: 'checkbox',
            class: 'drawer-toggle',
            checked: typeof open === 'function' ? open : open
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
                    drawerEl
                )
            )
        );
    }

    return drawerEl;
};

/**
 * Drawer Content - main content area
 */
Drawer.Content = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.div({
        class: `drawer-content ${className}`.trim(),
        ...rest
    }, ...children);
};

/**
 * Drawer Side - sidebar content
 */
Drawer.Side = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.div({
        class: `drawer-side ${className}`.trim(),
        ...rest
    }, ...children);
};

/**
 * Drawer Overlay - click to close
 */
Drawer.Overlay = (props = {}) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { for: forId, class: className = '', ...rest } = props;

    return tags.label({
        for: forId,
        'aria-label': 'close sidebar',
        class: `drawer-overlay ${className}`.trim(),
        ...rest
    });
};

/**
 * Drawer Button - toggle button
 */
Drawer.Button = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { for: forId, class: className = '', ...rest } = props;

    return tags.label({
        for: forId,
        class: `btn btn-primary drawer-button ${className}`.trim(),
        ...rest
    }, ...children);
};

const tags = window.Lightview.tags;
tags.Drawer = Drawer;
tags['Drawer.Content'] = Drawer.Content;
tags['Drawer.Side'] = Drawer.Side;
tags['Drawer.Overlay'] = Drawer.Overlay;
tags['Drawer.Button'] = Drawer.Button;

export default Drawer;
