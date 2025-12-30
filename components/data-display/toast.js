/**
 * Lightview Toast Component (DaisyUI)
 * @see https://daisyui.com/components/toast/
 */

import '../daisyui.js';

/**
 * Toast Component - positioned container for alerts
 * @param {Object} props
 * @param {string} props.position - 'start' | 'center' | 'end'
 * @param {string} props.vertical - 'top' | 'middle' | 'bottom'
 * @param {boolean} props.useShadow - Render in Shadow DOM with isolated DaisyUI styles
 */
const Toast = (props = {}, ...children) => {
    const { tags } = globalThis.Lightview || {};
    const LVX = globalThis.LightviewX || {};

    if (!tags) return null;

    const { div, shadowDOM } = tags;

    const {
        position = 'end',
        vertical = 'bottom',
        useShadow,
        class: className = '',
        ...rest
    } = props;

    const classes = ['toast'];

    if (position === 'start') classes.push('toast-start');
    else if (position === 'center') classes.push('toast-center');
    else if (position === 'end') classes.push('toast-end');

    if (vertical === 'top') classes.push('toast-top');
    else if (vertical === 'middle') classes.push('toast-middle');
    else if (vertical === 'bottom') classes.push('toast-bottom');

    if (className) classes.push(className);

    const toastEl = div({ class: classes.join(' '), ...rest }, ...children);

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
                    toastEl
                )
            )
        );
    }

    return toastEl;
};

globalThis.Lightview.tags.Toast = Toast;

export default Toast;
