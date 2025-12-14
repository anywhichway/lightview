/**
 * Lightview Steps Component (DaisyUI)
 * @see https://daisyui.com/components/steps/
 */

import '../daisyui.js';

/**
 * Steps Component
 * @param {Object} props
 * @param {boolean} props.vertical - Vertical layout
 */
const Steps = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { ul } = tags;

    const {
        vertical = false,
        class: className = '',
        ...rest
    } = props;

    const classes = ['steps'];
    if (vertical) classes.push('steps-vertical');
    if (className) classes.push(className);

    return ul({ class: classes.join(' '), ...rest }, ...children);
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

if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Steps', Steps);
}

export default Steps;
