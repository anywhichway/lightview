/**
 * Lightview Collapse Component (DaisyUI)
 * @see https://daisyui.com/components/collapse/
 */

import '../daisyui.js';

/**
 * Collapse Component
 * @param {Object} props
 * @param {string} props.icon - 'arrow' | 'plus'
 * @param {boolean} props.open - Initially open
 * @param {boolean} props.focus - Open on focus
 */
const Collapse = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { div, input } = tags;

    const {
        icon = 'arrow',
        open = false,
        focus = false,
        class: className = '',
        ...rest
    } = props;

    const classes = ['collapse', 'bg-base-100', 'border', 'border-base-300', 'rounded-box'];
    if (icon === 'arrow') classes.push('collapse-arrow');
    else if (icon === 'plus') classes.push('collapse-plus');
    if (className) classes.push(className);

    return div({ class: classes.join(' '), ...rest },
        input({ type: 'checkbox', checked: open }),
        ...children
    );
};

/**
 * Collapse Title
 */
Collapse.Title = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.div({
        class: `collapse-title font-semibold ${className}`.trim(),
        ...rest
    }, ...children);
};

/**
 * Collapse Content
 */
Collapse.Content = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.div({
        class: `collapse-content text-sm ${className}`.trim(),
        ...rest
    }, ...children);
};

if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Collapse', Collapse);
}

export default Collapse;
