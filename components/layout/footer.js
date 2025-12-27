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

        const themeValue = LVX.themeSignal ? () => LVX.themeSignal.value : 'light';

        return div({ class: 'contents' },
            shadowDOM({ mode: 'open', adoptedStyleSheets },
                div({ 'data-theme': themeValue },
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

/**
 * Footer Nav - Navigation section within footer
 */
Footer.Nav = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { class: className = '', style = '', ...rest } = props;

    // Use border radius variable for consistent padding
    const defaultStyle = 'padding: var(--rounded-box, 1rem);';
    const combinedStyle = style ? `${defaultStyle} ${style}` : defaultStyle;

    return tags.nav({
        class: className || undefined,
        style: combinedStyle,
        ...rest
    }, ...children);
};

const tags = window.Lightview.tags;
tags.Footer = Footer;
tags['Footer.Title'] = Footer.Title;
tags['Footer.Nav'] = Footer.Nav;

export default Footer;
