/**
 * Lightview Table Component (DaisyUI)
 * @see https://daisyui.com/components/table/
 */

import '../daisyui.js';

/**
 * Table Component
 * @param {Object} props
 * @param {boolean} props.zebra - Zebra striping
 * @param {boolean} props.pinRows - Pin rows on scroll
 * @param {boolean} props.pinCols - Pin columns on scroll
 * @param {string} props.size - 'xs' | 'sm' | 'md' | 'lg'
 */
const Table = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { table } = tags;

    const {
        zebra = false,
        pinRows = false,
        pinCols = false,
        size,
        class: className = '',
        ...rest
    } = props;

    const classes = ['table'];
    if (zebra) classes.push('table-zebra');
    if (pinRows) classes.push('table-pin-rows');
    if (pinCols) classes.push('table-pin-cols');
    if (size) classes.push(`table-${size}`);
    if (className) classes.push(className);

    return table({ class: classes.join(' '), ...rest }, ...children);
};

/**
 * Table Head
 */
Table.Head = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    return tags.thead(props, ...children);
};

/**
 * Table Body
 */
Table.Body = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    return tags.tbody(props, ...children);
};

/**
 * Table Row
 */
Table.Row = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { hover = false, active = false, class: className = '', ...rest } = props;

    const classes = [];
    if (hover) classes.push('hover');
    if (active) classes.push('active');
    if (className) classes.push(className);

    return tags.tr({ class: classes.join(' ') || undefined, ...rest }, ...children);
};

/**
 * Table Header Cell
 */
Table.Th = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    return tags.th(props, ...children);
};

/**
 * Table Data Cell
 */
Table.Td = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    return tags.td(props, ...children);
};

/**
 * Table Foot
 */
Table.Foot = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    return tags.tfoot(props, ...children);
};

if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Table', Table);
}

export default Table;
