/**
 * Lightview Badge Component (DaisyUI)
 * @see https://daisyui.com/components/badge/
 */

import '../daisyui.js';

/**
 * Badge Component
 * @param {Object} props
 * @param {string} props.color - 'primary' | 'secondary' | 'accent' | 'neutral' | 'info' | 'success' | 'warning' | 'error' | 'ghost'
 * @param {string} props.size - 'xs' | 'sm' | 'md' | 'lg'
 * @param {string} props.variant - 'outline' | 'soft' | 'dash'
 * @param {boolean} props.useShadow - Render in Shadow DOM with isolated DaisyUI styles
 */
const Badge = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    const LVX = window.LightviewX || {};

    if (!tags) return null;

    const { span, div, shadowDOM } = tags;

    const {
        color,
        size,
        variant,
        useShadow,
        theme, // Explicit theme override
        class: className = '',
        ...rest
    } = props;

    const classes = ['badge'];

    if (color) classes.push(`badge-${color}`);
    if (size) classes.push(`badge-${size}`);
    if (variant === 'outline') classes.push('badge-outline');
    else if (variant === 'soft') classes.push('badge-soft');
    else if (variant === 'dash') classes.push('badge-dash');

    if (className) classes.push(className);

    const badgeEl = span({ class: classes.join(' '), ...rest }, ...children);

    // Check if we should use shadow DOM
    let usesShadow = false;
    if (LVX.shouldUseShadow) {
        usesShadow = LVX.shouldUseShadow(useShadow);
    } else {
        usesShadow = useShadow === true;
    }

    if (usesShadow) {
        const adoptedStyleSheets = LVX.getAdoptedStyleSheets ? LVX.getAdoptedStyleSheets() : [];

        // Use reactive theme signal if available, otherwise fallback to explicit 'theme' prop or default
        const themeValue = theme || (LVX.themeSignal ? () => LVX.themeSignal.value : 'light');

        return div({ class: 'content', style: 'display: inline-block' },
            shadowDOM({ mode: 'open', adoptedStyleSheets },
                div({ 'data-theme': themeValue },
                    badgeEl
                )
            )
        );
    }

    return badgeEl;
};

window.Lightview.tags.Badge = Badge;

// Register as Custom Element
if (window.LightviewX?.createCustomElement) {
    const BadgeElement = window.LightviewX.createCustomElement(Badge);
    if (!customElements.get('lv-badge')) {
        customElements.define('lv-badge', BadgeElement);
    }
}

export default Badge;
