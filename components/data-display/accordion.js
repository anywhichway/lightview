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
 * @param {boolean} props.useShadow - Render in Shadow DOM with isolated DaisyUI styles
 */
const Accordion = (props = {}, ...children) => {
    const { tags } = globalThis.Lightview || {};
    const LVX = globalThis.LightviewX || {};

    if (!tags) return null;

    const { div, shadowDOM } = tags;

    const {
        join = false,
        useShadow,
        class: className = '',
        ...rest
    } = props;

    const classes = join ? ['join join-vertical w-full'] : ['space-y-2'];
    if (className) classes.push(className);

    const accordionEl = div({ class: classes.join(' '), ...rest }, ...children);

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
                    accordionEl
                )
            )
        );
    }

    return accordionEl;
};

/**
 * Accordion Item
 */
Accordion.Item = (props = {}, ...children) => {
    const { tags } = globalThis.Lightview || {};
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
    const { tags } = globalThis.Lightview || {};
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
    const { tags } = globalThis.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.div({
        class: `collapse-content text-sm ${className}`.trim(),
        ...rest
    }, ...children);
};

const tags = globalThis.Lightview.tags;
tags.Accordion = Accordion;
tags['Accordion.Item'] = Accordion.Item;
tags['Accordion.Title'] = Accordion.Title;
tags['Accordion.Content'] = Accordion.Content;

export default Accordion;
