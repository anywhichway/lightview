/**
 * Lightview Carousel Component (DaisyUI)
 * @see https://daisyui.com/components/carousel/
 */

import '../daisyui.js';

/**
 * Carousel Component
 * @param {Object} props
 * @param {string} props.snap - 'start' | 'center' | 'end'
 * @param {boolean} props.vertical - Vertical carousel
 * @param {boolean} props.full - Full width items
 * @param {boolean} props.useShadow - Render in Shadow DOM with isolated DaisyUI styles
 */
const Carousel = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    const LVX = window.LightviewX || {};

    if (!tags) return null;

    const { div, shadowDOM } = tags;

    const {
        snap = 'start',
        vertical = false,
        full = false,
        useShadow,
        class: className = '',
        ...rest
    } = props;

    const classes = ['carousel'];

    if (snap === 'center') classes.push('carousel-center');
    else if (snap === 'end') classes.push('carousel-end');

    if (vertical) classes.push('carousel-vertical');
    if (full) classes.push('w-full');
    if (className) classes.push(className);

    const carouselEl = div({ class: classes.join(' '), ...rest }, ...children);

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
                    carouselEl
                )
            )
        );
    }

    return carouselEl;
};

/**
 * Carousel Item
 */
Carousel.Item = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { id, src, alt = '', class: className = '', ...rest } = props;

    const classes = ['carousel-item'];
    if (className) classes.push(className);

    if (src) {
        return tags.div({ id, class: classes.join(' '), ...rest },
            tags.img({ src, alt })
        );
    }

    return tags.div({ id, class: classes.join(' '), ...rest }, ...children);
};

if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Carousel', Carousel);
}

export default Carousel;
