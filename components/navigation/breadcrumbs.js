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
    const { tags } = globalThis.Lightview || {};
    const LVX = globalThis.LightviewX || {};

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

        const themeValue = LVX.themeSignal ? () => LVX.themeSignal.value : 'light';

        return div({ class: 'contents', style: 'display: inline-block' },
            shadowDOM({ mode: 'open', adoptedStyleSheets },
                div({ 'data-theme': themeValue },
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
    const { tags } = globalThis.Lightview || {};
    if (!tags) return null;

    const { href, class: className = '', ...rest } = props;
    const allChildren = children.flat(Infinity);

    if (href) {
        return tags.li({ class: className, ...rest },
            tags.a({ href }, ...allChildren)
        );
    }

    return tags.li({ class: className, ...rest }, ...allChildren);
};


const tags = globalThis.Lightview.tags;
tags.Breadcrumbs = Breadcrumbs;
tags['Breadcrumbs.Item'] = Breadcrumbs.Item;

// Register as custom elements
if (globalThis.LightviewX?.customElementWrapper) {
    const BreadcrumbsElement = globalThis.LightviewX.customElementWrapper(Breadcrumbs, {
        attributeMap: {
            items: Array,
            useShadow: Boolean,
            class: String
        },
        childElements: {
            'lv-breadcrumbs-item': {
                component: Breadcrumbs.Item,
                attributeMap: {
                    href: String,
                    class: String
                }
            }
        }
    });

    if (!customElements.get('lv-breadcrumbs')) {
        customElements.define('lv-breadcrumbs', BreadcrumbsElement);
    }

    const BreadcrumbsItemElement = globalThis.LightviewX.customElementWrapper(Breadcrumbs.Item, {
        attributeMap: {
            href: String,
            class: String
        }
    });

    if (!customElements.get('lv-breadcrumbs-item')) {
        customElements.define('lv-breadcrumbs-item', BreadcrumbsItemElement);
    }
} else if (globalThis.LightviewX?.createCustomElement) {
    globalThis.LightviewX.createCustomElement(Breadcrumbs, { tagName: 'lv-breadcrumbs' });
    globalThis.LightviewX.createCustomElement(Breadcrumbs.Item, { tagName: 'lv-breadcrumbs-item' });
}

export default Breadcrumbs;
