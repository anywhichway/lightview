/**
 * Lightview Steps Component (DaisyUI)
 * @see https://daisyui.com/components/steps/
 */

import '../daisyui.js';

/**
 * Steps Component
 * @param {Object} props
 * @param {boolean} props.vertical - Vertical layout
 * @param {boolean} props.useShadow - Render in Shadow DOM with isolated DaisyUI styles
 */
const Steps = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    const LVX = window.LightviewX || {};

    if (!tags) return null;

    const { ul, div, shadowDOM } = tags;

    const {
        vertical = false,
        useShadow,
        class: className = '',
        ...rest
    } = props;

    const classes = ['steps'];
    if (vertical) classes.push('steps-vertical');
    if (className) classes.push(className);

    const stepsEl = ul({ class: classes.join(' '), ...rest }, ...children);

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
                    stepsEl
                )
            )
        );
    }

    return stepsEl;
};

/**
 * Steps Item
 */
Steps.Item = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const {
        color,
        content,
        class: className = '',
        ...rest
    } = props;

    const classes = ['step'];
    if (color) classes.push(`step-${color}`);
    if (className) classes.push(className);

    return tags.li({
        class: classes.join(' '),
        'data-content': content,
        ...rest
    }, ...children);
};

const tags = window.Lightview.tags;
tags.Steps = Steps;
tags['Steps.Item'] = Steps.Item;

export default Steps;
