/**
 * Lightview Footer Component (DaisyUI)
 * @see https://daisyui.com/components/footer/
 */

import '../daisyui.js';

/**
 * Footer Component
 * @param {Object} props
 * @param {boolean} props.center - Center content
 * @param {boolean} props.useShadow - Render in Shadow DOM with isolated DaisyUI styles
 */
const Footer = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    const LVX = window.LightviewX || {};

    if (!tags) return null;

    const { footer, div, shadowDOM } = tags;

    const {
        center = false,
        useShadow,
        class: className = '',
        ...rest
    } = props;

    const classes = ['footer', 'bg-neutral', 'text-neutral-content', 'p-10'];
    if (center) classes.push('footer-center');
    if (className) classes.push(className);

    const footerEl = footer({ class: classes.join(' '), ...rest }, ...children);

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
                    footerEl
                )
            )
        );
    }

    return footerEl;
};

/**
 * Footer Title
 */
Footer.Title = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.h6({
        class: `footer-title ${className}`.trim(),
        ...rest
    }, ...children);
};

window.Lightview.tags.Footer = Footer;

export default Footer;
