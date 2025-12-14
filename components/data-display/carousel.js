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
 */
const Carousel = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { div } = tags;

    const {
        snap = 'start',
        vertical = false,
        full = false,
        class: className = '',
        ...rest
    } = props;

    const classes = ['carousel'];

    if (snap === 'center') classes.push('carousel-center');
    else if (snap === 'end') classes.push('carousel-end');

    if (vertical) classes.push('carousel-vertical');
    if (full) classes.push('w-full');
    if (className) classes.push(className);

    return div({ class: classes.join(' '), ...rest }, ...children);
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
