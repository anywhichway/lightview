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
 * @param {boolean} props.useShadow - Render in Shadow DOM with isolated DaisyUI styles
 */
const Timeline = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    const LVX = window.LightviewX || {};

    if (!tags) return null;

    const { ul, div, shadowDOM } = tags;

    const {
        snap = false,
        vertical = true,
        compact = false,
        useShadow,
        class: className = '',
        ...rest
    } = props;

    const classes = ['timeline'];
    if (snap) classes.push('timeline-snap-icon');
    if (vertical) classes.push('timeline-vertical');
    if (compact) classes.push('timeline-compact');
    if (className) classes.push(className);

    const timelineEl = ul({ class: classes.join(' '), ...rest }, ...children);

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
                    timelineEl
                )
            )
        );
    }

    return timelineEl;
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

const tags = window.Lightview.tags;
tags.Timeline = Timeline;
tags['Timeline.Item'] = Timeline.Item;
tags['Timeline.Start'] = Timeline.Start;
tags['Timeline.Middle'] = Timeline.Middle;
tags['Timeline.End'] = Timeline.End;
tags['Timeline.Hr'] = Timeline.Hr;

export default Timeline;
