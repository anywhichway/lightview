/**
 * Lightview Accordion Component (DaisyUI)
 * @see https://daisyui.com/components/accordion/
 */

import '../daisyui.js';

/**
 * Accordion - show/hide content, one item at a time
 * @param {Object} props
 * @param {boolean} props.join - Use join style (connected items)
 * @param {string} props.icon - 'arrow' | 'plus'
 */
const Accordion = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { div } = tags;

    const {
        join = false,
        class: className = '',
        ...rest
    } = props;

    const classes = join ? ['join join-vertical w-full'] : ['space-y-2'];
    if (className) classes.push(className);

    return div({ class: classes.join(' '), ...rest }, ...children);
};

/**
 * Accordion Item
 */
Accordion.Item = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { div, input } = tags;

    const {
        name = 'accordion',
        icon = 'arrow',
        join = false,
        checked = false,
        class: className = '',
        ...rest
    } = props;

    const classes = ['collapse'];
    if (icon === 'arrow') classes.push('collapse-arrow');
    else if (icon === 'plus') classes.push('collapse-plus');
    classes.push('bg-base-100');
    if (join) classes.push('join-item border-base-300 border');
    else classes.push('border border-base-300 rounded-box');
    if (className) classes.push(className);

    return div({ class: classes.join(' '), ...rest },
        input({ type: 'radio', name, checked }),
        ...children
    );
};

/**
 * Accordion Title
 */
Accordion.Title = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.div({
        class: `collapse-title font-semibold ${className}`.trim(),
        ...rest
    }, ...children);
};

/**
 * Accordion Content
 */
Accordion.Content = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.div({
        class: `collapse-content text-sm ${className}`.trim(),
        ...rest
    }, ...children);
};

if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Accordion', Accordion);
}

export default Accordion;
