/**
 * Lightview Breadcrumbs Component (DaisyUI)
 * @see https://daisyui.com/components/breadcrumbs/
 */

import '../daisyui.js';

/**
 * Breadcrumbs Component
 * @param {Object} props
 * @param {Array} props.items - Array of {label, href} objects
 */
const Breadcrumbs = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { div, ul, li, a } = tags;

    const {
        items = [],
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

    return div({
        class: `breadcrumbs text-sm ${className}`.trim(),
        ...rest
    },
        ul({}, ...breadcrumbItems, ...children)
    );
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
