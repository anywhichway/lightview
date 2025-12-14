/**
 * Lightview Stat Component (DaisyUI)
 * @see https://daisyui.com/components/stat/
 */

import '../daisyui.js';

/**
 * Stats Container
 * @param {Object} props
 * @param {boolean} props.vertical - Vertical layout
 * @param {boolean} props.shadow - Add shadow
 */
const Stats = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { div } = tags;

    const {
        vertical = false,
        shadow = false,
        class: className = '',
        ...rest
    } = props;

    const classes = ['stats'];
    if (vertical) classes.push('stats-vertical');
    if (shadow) classes.push('shadow');
    if (className) classes.push(className);

    return div({ class: classes.join(' '), ...rest }, ...children);
};

/**
 * Stat Item
 */
Stats.Stat = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.div({ class: `stat ${className}`.trim(), ...rest }, ...children);
};

/**
 * Stat Figure (icon/image container)
 */
Stats.Figure = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.div({
        class: `stat-figure ${className}`.trim(),
        ...rest
    }, ...children);
};

/**
 * Stat Title
 */
Stats.Title = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.div({
        class: `stat-title ${className}`.trim(),
        ...rest
    }, ...children);
};

/**
 * Stat Value
 */
Stats.Value = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.div({
        class: `stat-value ${className}`.trim(),
        ...rest
    }, ...children);
};

/**
 * Stat Desc
 */
Stats.Desc = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.div({
        class: `stat-desc ${className}`.trim(),
        ...rest
    }, ...children);
};

/**
 * Stat Actions
 */
Stats.Actions = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.div({
        class: `stat-actions ${className}`.trim(),
        ...rest
    }, ...children);
};

if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Stats', Stats);
}

export default Stats;
