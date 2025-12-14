/**
 * Lightview Footer Component (DaisyUI)
 * @see https://daisyui.com/components/footer/
 */

import '../daisyui.js';

/**
 * Footer Component
 * @param {Object} props
 * @param {boolean} props.center - Center content
 */
const Footer = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { footer } = tags;

    const {
        center = false,
        class: className = '',
        ...rest
    } = props;

    const classes = ['footer', 'bg-neutral', 'text-neutral-content', 'p-10'];
    if (center) classes.push('footer-center');
    if (className) classes.push(className);

    return footer({ class: classes.join(' '), ...rest }, ...children);
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

if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Footer', Footer);
}

export default Footer;
