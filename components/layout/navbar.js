/**
 * Lightview Navbar Component (DaisyUI)
 * @see https://daisyui.com/components/navbar/
 */

import '../daisyui.js';

/**
 * Navbar Component
 * @param {Object} props
 * @param {string} props.bg - Background class (e.g., 'bg-base-100')
 * @param {boolean} props.useShadow - Render in Shadow DOM with isolated DaisyUI styles
 */
const Navbar = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    const LVX = window.LightviewX || {};

    if (!tags) return null;

    const { div, shadowDOM } = tags;

    const {
        bg = 'bg-base-100',
        useShadow,
        class: className = '',
        ...rest
    } = props;

    const classes = ['navbar', bg];
    if (className) classes.push(className);

    const navbarEl = div({ class: classes.join(' '), ...rest }, ...children);

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
                    navbarEl
                )
            )
        );
    }

    return navbarEl;
};

/**
 * Navbar Start
 */
Navbar.Start = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.div({
        class: `navbar-start ${className}`.trim(),
        ...rest
    }, ...children);
};

/**
 * Navbar Center
 */
Navbar.Center = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.div({
        class: `navbar-center ${className}`.trim(),
        ...rest
    }, ...children);
};

/**
 * Navbar End
 */
Navbar.End = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.div({
        class: `navbar-end ${className}`.trim(),
        ...rest
    }, ...children);
};

const tags = window.Lightview.tags;
tags.Navbar = Navbar;
tags['Navbar.Start'] = Navbar.Start;
tags['Navbar.Center'] = Navbar.Center;
tags['Navbar.End'] = Navbar.End;

export default Navbar;
