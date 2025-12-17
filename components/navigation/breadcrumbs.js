/**
 * Lightview Breadcrumbs Component (DaisyUI)
 * @see https://daisyui.com/components/breadcrumbs/
 */

import '../daisyui.js';

/**
 * Breadcrumbs Component
 * @param {Object} props
 * @param {Array} props.items - Array of {label, href} objects
 * @param {boolean} props.useShadow - Render in Shadow DOM with isolated DaisyUI styles
 */
const Breadcrumbs = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    const LVX = window.LightviewX || {};

    if (!tags) return null;

    const { div, ul, li, a, shadowDOM } = tags;

    const {
        items = [],
        useShadow,
        class: className = '',
        ...rest
    } = props;

    const breadcrumbItems = items.map((item, index) => {
        if (index === items.length - 1) {
            // Last item - no link
            return li({}, item.label);
        }
        return li({}, a({ href: item.href }, item.label));
    });

    const breadcrumbsEl = div({
        class: `breadcrumbs text-sm ${className}`.trim(),
        ...rest
    },
        ul({}, ...breadcrumbItems, ...children)
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

        return div({ class: 'contents', style: 'display: inline-block' },
            shadowDOM({ mode: 'open', adoptedStyleSheets },
                div({ 'data-theme': currentTheme },
                    breadcrumbsEl
                )
            )
        );
    }

    return breadcrumbsEl;
};

/**
 * Breadcrumbs Item
 */
Breadcrumbs.Item = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { href, class: className = '', ...rest } = props;

    if (href) {
        return tags.li({ class: className, ...rest },
            tags.a({ href }, ...children)
        );
    }

    return tags.li({ class: className, ...rest }, ...children);
};

if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Breadcrumbs', Breadcrumbs);
}

export default Breadcrumbs;
