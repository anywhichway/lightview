/**
 * Lightview Dropdown Component (DaisyUI)
 * @see https://daisyui.com/components/dropdown/
 */

import '../daisyui.js';

/**
 * Dropdown Component
 * @param {Object} props
 * @param {string} props.position - 'top' | 'bottom' | 'left' | 'right' | 'end'
 * @param {boolean} props.hover - Open on hover
 * @param {boolean} props.open - Force open state
 * @param {boolean} props.useShadow - Render in Shadow DOM with isolated DaisyUI styles
 */
const Dropdown = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    const LVX = window.LightviewX || {};

    if (!tags) return null;

    const { div, shadowDOM } = tags;

    const {
        position,
        hover = false,
        open = false,
        useShadow,
        class: className = '',
        ...rest
    } = props;

    const classes = ['dropdown'];
    if (position === 'top') classes.push('dropdown-top');
    else if (position === 'bottom') classes.push('dropdown-bottom');
    else if (position === 'left') classes.push('dropdown-left');
    else if (position === 'right') classes.push('dropdown-right');
    else if (position === 'end') classes.push('dropdown-end');

    if (hover) classes.push('dropdown-hover');
    if (open) classes.push('dropdown-open');
    if (className) classes.push(className);

    const dropdownEl = div({ class: classes.join(' '), ...rest }, ...children);

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
                    dropdownEl
                )
            )
        );
    }

    return dropdownEl;
};

/**
 * Dropdown Trigger - the element that toggles the dropdown
 */
Dropdown.Trigger = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.div({
        tabindex: '0',
        role: 'button',
        class: `btn m-1 ${className}`.trim(),
        ...rest
    }, ...children);
};

/**
 * Dropdown Content - the menu that appears
 */
Dropdown.Content = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.ul({
        tabindex: '0',
        class: `dropdown-content menu bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm ${className}`.trim(),
        ...rest
    }, ...children);
};

/**
 * Dropdown Item
 */
Dropdown.Item = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    return tags.li(props, tags.a({}, ...children));
};

const tags = window.Lightview.tags;
tags.Dropdown = Dropdown;
tags['Dropdown.Trigger'] = Dropdown.Trigger;
tags['Dropdown.Content'] = Dropdown.Content;
tags['Dropdown.Item'] = Dropdown.Item;

export default Dropdown;
