/**
 * Lightview Hero Component (DaisyUI)
 * @see https://daisyui.com/components/hero/
 */

import '../daisyui.js';

/**
 * Hero Component
 * @param {Object} props
 * @param {string} props.bgImage - Background image URL
 * @param {boolean} props.overlay - Add overlay on background
 * @param {boolean} props.useShadow - Render in Shadow DOM with isolated DaisyUI styles
 */
const Hero = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    const LVX = window.LightviewX || {};

    if (!tags) return null;

    const { div, shadowDOM } = tags;

    const {
        bgImage,
        overlay = false,
        useShadow,
        class: className = '',
        style = '',
        ...rest
    } = props;

    const classes = ['hero', 'min-h-96'];
    if (className) classes.push(className);

    let styleStr = style;
    if (bgImage) {
        styleStr = `background-image: url("${bgImage}"); ${style}`;
    }

    const heroContent = [
        overlay ? div({ class: 'hero-overlay bg-opacity-60' }) : null,
        ...children
    ].filter(Boolean);

    const heroEl = div({
        class: classes.join(' '),
        style: styleStr || undefined,
        ...rest
    }, ...heroContent);

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
                    heroEl
                )
            )
        );
    }

    return heroEl;
};

/**
 * Hero Content
 */
Hero.Content = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { position = 'center', class: className = '', ...rest } = props;

    const classes = ['hero-content'];
    if (position === 'center') classes.push('text-center');
    else if (position === 'start') classes.push('text-start');
    if (className) classes.push(className);

    return tags.div({ class: classes.join(' '), ...rest }, ...children);
};

window.Lightview.tags.Hero = Hero;

export default Hero;
