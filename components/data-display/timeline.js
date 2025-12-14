/**
 * Lightview Timeline Component (DaisyUI)
 * @see https://daisyui.com/components/timeline/
 */

import '../daisyui.js';

/**
 * Timeline Component
 * @param {Object} props
 * @param {boolean} props.snap - Snap to items
 * @param {boolean} props.vertical - Vertical layout
 * @param {boolean} props.compact - Compact mode
 */
const Timeline = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { ul } = tags;

    const {
        snap = false,
        vertical = true,
        compact = false,
        class: className = '',
        ...rest
    } = props;

    const classes = ['timeline'];
    if (snap) classes.push('timeline-snap-icon');
    if (vertical) classes.push('timeline-vertical');
    if (compact) classes.push('timeline-compact');
    if (className) classes.push(className);

    return ul({ class: classes.join(' '), ...rest }, ...children);
};

/**
 * Timeline Item
 */
Timeline.Item = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    return tags.li(props, ...children);
};

/**
 * Timeline Start
 */
Timeline.Start = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.div({
        class: `timeline-start ${className}`.trim(),
        ...rest
    }, ...children);
};

/**
 * Timeline Middle (icon)
 */
Timeline.Middle = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.div({
        class: `timeline-middle ${className}`.trim(),
        ...rest
    }, ...children);
};

/**
 * Timeline End
 */
Timeline.End = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { class: className = '', box = false, ...rest } = props;

    const classes = ['timeline-end'];
    if (box) classes.push('timeline-box');
    if (className) classes.push(className);

    return tags.div({ class: classes.join(' '), ...rest }, ...children);
};

/**
 * Timeline HR (connector line)
 */
Timeline.Hr = (props = {}) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { color, class: className = '', ...rest } = props;

    const classes = [];
    if (color) classes.push(`bg-${color}`);
    if (className) classes.push(className);

    return tags.hr({ class: classes.join(' ') || undefined, ...rest });
};

if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Timeline', Timeline);
}

export default Timeline;
