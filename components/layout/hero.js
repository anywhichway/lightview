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
 */
const Hero = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { div } = tags;

    const {
        bgImage,
        overlay = false,
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

    return div({
        class: classes.join(' '),
        style: styleStr || undefined,
        ...rest
    }, ...heroContent);
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

if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Hero', Hero);
}

export default Hero;
