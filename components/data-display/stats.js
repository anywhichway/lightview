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
 * @param {boolean} props.useShadow - Render in Shadow DOM with isolated DaisyUI styles
 */
const Stats = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    const LVX = window.LightviewX || {};

    if (!tags) return null;

    const { div, shadowDOM } = tags;

    const {
        vertical = false,
        shadow = false,
        useShadow,
        class: className = '',
        ...rest
    } = props;

    const classes = ['stats'];
    if (vertical) classes.push('stats-vertical');
    if (shadow) classes.push('shadow');
    if (className) classes.push(className);

    const statsEl = div({ class: classes.join(' '), ...rest }, ...children);

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
                    statsEl
                )
            )
        );
    }

    return statsEl;
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

const tags = window.Lightview.tags;
tags.Stats = Stats;
tags['Stats.Stat'] = Stats.Stat;
tags['Stats.Figure'] = Stats.Figure;
tags['Stats.Title'] = Stats.Title;
tags['Stats.Value'] = Stats.Value;
tags['Stats.Desc'] = Stats.Desc;
tags['Stats.Actions'] = Stats.Actions;

export default Stats;
