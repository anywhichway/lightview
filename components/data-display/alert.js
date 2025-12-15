/**
 * Lightview Alert Component (DaisyUI)
 * @see https://daisyui.com/components/alert/
 */

import '../daisyui.js';

/**
 * Alert Component
 * @param {Object} props
 * @param {string} props.color - 'info' | 'success' | 'warning' | 'error'
 * @param {boolean} props.soft - Use soft/light variant
 * @param {boolean} props.dash - Use dashed border
 * @param {boolean} props.outline - Use outline style
 * @param {boolean} props.useShadow - Render in Shadow DOM with isolated DaisyUI styles
 */
const Alert = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    const LVX = window.LightviewX || {};

    if (!tags) return null;

    const { div, shadowDOM } = tags;

    const {
        color,
        soft = false,
        dash = false,
        outline = false,
        icon,
        useShadow,
        class: className = '',
        ...rest
    } = props;

    const classes = ['alert'];
    if (color) classes.push(`alert-${color}`);
    if (soft) classes.push('alert-soft');
    if (dash) classes.push('alert-dash');
    if (outline) classes.push('alert-outline');
    if (className) classes.push(className);

    const iconSvg = icon ? getAlertIcon(icon || color) : null;

    let alertEl;
    if (iconSvg) {
        alertEl = div({ role: 'alert', class: classes.join(' '), ...rest },
            iconSvg,
            ...children
        );
    } else {
        alertEl = div({ role: 'alert', class: classes.join(' '), ...rest }, ...children);
    }

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
            console.warn('Lightview Alert: Shadow DOM enabled but DaisyUI stylesheet not loaded. Call LightviewX.initComponents() at app startup.');
        }

        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';

        return div({ class: 'contents' },
            shadowDOM({ mode: 'open', adoptedStyleSheets },
                div({ 'data-theme': currentTheme },
                    alertEl
                )
            )
        );
    }

    return alertEl;
};

function getAlertIcon(type) {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const icons = {
        info: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>',
        success: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>',
        warning: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>',
        error: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>'
    };

    if (!icons[type]) return null;

    return tags.svg({
        xmlns: 'http://www.w3.org/2000/svg',
        class: 'h-6 w-6 shrink-0 stroke-current',
        fill: 'none',
        viewBox: '0 0 24 24',
        innerHTML: icons[type]
    });
}

if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Alert', Alert);
}

export default Alert;
