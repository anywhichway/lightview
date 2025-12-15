/**
 * Lightview Chart Component
 * Powered by charts.css
 * @see https://chartscss.org/
 */

import '../daisyui.js';

/**
 * Chart Component
 * @param {Object} props
 * @param {string} props.type - 'bar' | 'column' | 'line' | 'area' | 'pie'
 * @param {string} props.heading - Table caption / Chart heading
 * @param {boolean} props.labels - Show labels (.show-labels)
 * @param {boolean} props.dataOnHover - Show data on hover (.show-data-on-hover)
 * @param {boolean} props.primaryAxis - Show primary axis (.show-primary-axis)
 * @param {boolean|string} props.secondaryAxis - Show secondary axes (.show-10-secondary-axes or custom class)
 * @param {number} props.spacing - Data spacing (1-20) (.data-spacing-X)
 * @param {boolean} props.reverse - Reverse orientation (.reverse)
 * @param {boolean} props.multiple - Enable multiple datasets (.multiple)
 * @param {boolean} props.stacked - Enable stacked mode (.stacked)
 * @param {boolean} props.useShadow - Render in Shadow DOM with isolated DaisyUI styles
 * @param {string} props.class - Additional classes
 */
const Chart = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    const LVX = window.LightviewX || {};

    if (!tags) return null;

    const { table, caption, div, shadowDOM } = tags;

    const {
        type = 'bar',
        heading,
        labels = false,
        dataOnHover = false,
        primaryAxis = false,
        secondaryAxis = false,
        spacing,
        reverse = false,
        multiple = false,
        stacked = false,
        useShadow,
        class: className = '',
        style = '',
        ...rest
    } = props;

    const classes = ['charts-css', type];
    if (labels) classes.push('show-labels');
    if (dataOnHover) classes.push('show-data-on-hover');
    if (heading) classes.push('show-heading');
    if (primaryAxis) classes.push('show-primary-axis');

    if (secondaryAxis === true) classes.push('show-10-secondary-axes');
    else if (typeof secondaryAxis === 'string') classes.push(secondaryAxis);

    if (spacing) classes.push(`data-spacing-${spacing}`);
    if (reverse) classes.push('reverse');
    if (multiple) classes.push('multiple');
    if (stacked) classes.push('stacked');
    if (className) classes.push(className);

    const content = [];
    if (heading) {
        content.push(caption(heading));
    }
    content.push(...children);

    const chartEl = table({ class: classes.join(' '), style, ...rest }, ...content);

    // Check if we should use shadow DOM
    let usesShadow = false;
    if (LVX.shouldUseShadow) {
        usesShadow = LVX.shouldUseShadow(useShadow);
    } else {
        usesShadow = useShadow === true;
    }

    if (usesShadow) {
        const adoptedStyleSheets = LVX.getAdoptedStyleSheets ? LVX.getAdoptedStyleSheets() : [];

        if (adoptedStyleSheets.length === 0) {
            console.warn('Lightview Chart: Shadow DOM enabled but DaisyUI stylesheet not loaded. Call LightviewX.initComponents() at app startup.');
        }

        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';

        return div({ class: 'contents' },
            shadowDOM({ mode: 'open', adoptedStyleSheets },
                div({ 'data-theme': currentTheme },
                    chartEl
                )
            )
        );
    }

    return chartEl;
};


/**
 * Chart Head (thead)
 */
Chart.Head = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;
    return tags.thead(props, ...children);
};

/**
 * Chart Body (tbody)
 */
Chart.Body = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;
    return tags.tbody(props, ...children);
};

/**
 * Chart Row (tr)
 */
Chart.Row = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;
    return tags.tr(props, ...children);
};

/**
 * Chart Label (th scope="row")
 */
Chart.Label = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { scope = 'row', ...rest } = props;
    return tags.th({ scope, ...rest }, ...children);
};

/**
 * Chart Data (td)
 * @param {Object} props
 * @param {number} props.value - Value (0.0 - 1.0) -> --size (for bar/column/line/area charts)
 * @param {number} props.start - Start value (0.0 - 1.0) -> --start (for range/waterfall and pie)
 * @param {number} props.end - End value (0.0 - 1.0) -> --end (for pie charts - use instead of value)
 * @param {string} props.color - CSS color -> --color
 * @param {string} props.tooltip - Tooltip text
 */
Chart.Data = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const {
        value,
        size, // alias for value
        start,
        end, // for pie charts
        color,
        tooltip,
        class: className = '',
        style: styleProp = '',
        ...rest
    } = props;

    const styles = [];
    const val = value !== undefined ? value : size;

    // For bar/column/line/area charts: use --size
    if (val !== undefined) styles.push(`--size: ${val};`);
    if (start !== undefined) styles.push(`--start: ${start};`);

    // For Pie charts: use --end directly if provided, otherwise calculate from start + value
    if (end !== undefined) {
        styles.push(`--end: ${end};`);
    } else if (start !== undefined && val !== undefined) {
        // Legacy: Calculate --end for backward compatibility
        const calculatedEnd = parseFloat(start) + parseFloat(val);
        styles.push(`--end: ${calculatedEnd};`);
    }

    if (color) styles.push(`--color: ${color};`);
    if (styleProp) styles.push(styleProp);

    const classes = [];
    if (className) classes.push(className);

    const content = [...children];
    if (tooltip) {
        content.push(tags.span({ class: 'tooltip' }, tooltip));
    }

    return tags.td({
        class: classes.join(' ') || undefined,
        style: styles.join(' ') || undefined,
        ...rest
    }, ...content);
};

if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Chart', Chart);
}

export default Chart;
