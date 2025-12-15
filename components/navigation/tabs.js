/**
 * Lightview Tabs Component (DaisyUI)
 * @see https://daisyui.com/components/tab/
 */

import '../daisyui.js';

/**
 * Tabs Component
 * @param {Object} props
 * @param {string} props.variant - 'boxed' | 'bordered' | 'lifted'
 * @param {string} props.size - 'xs' | 'sm' | 'md' | 'lg'
 * @param {boolean} props.useShadow - Render in Shadow DOM with isolated DaisyUI styles
 */
const Tabs = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    const LVX = window.LightviewX || {};

    if (!tags) return null;

    const { div, shadowDOM } = tags;

    const {
        variant,
        size,
        useShadow,
        class: className = '',
        ...rest
    } = props;

    const classes = ['tabs'];
    if (variant === 'boxed') classes.push('tabs-boxed');
    else if (variant === 'bordered') classes.push('tabs-bordered');
    else if (variant === 'lifted') classes.push('tabs-lifted');
    if (size) classes.push(`tabs-${size}`);
    if (className) classes.push(className);

    const tabsEl = div({
        role: 'tablist',
        class: classes.join(' '),
        ...rest
    }, ...children);

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
            console.warn('Lightview Tabs: Shadow DOM enabled but DaisyUI stylesheet not loaded. Call LightviewX.initComponents() at app startup.');
        }

        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';

        return div({ class: 'contents' },
            shadowDOM({ mode: 'open', adoptedStyleSheets },
                div({ 'data-theme': currentTheme },
                    tabsEl
                )
            )
        );
    }

    return tabsEl;
};

/**
 * Tab Item
 */
Tabs.Tab = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const {
        active = false,
        disabled = false,
        class: className = '',
        ...rest
    } = props;

    const getClasses = () => {
        const classes = ['tab'];
        const isActive = typeof active === 'function' ? active() : active;
        const isDisabled = typeof disabled === 'function' ? disabled() : disabled;
        if (isActive) classes.push('tab-active');
        if (isDisabled) classes.push('tab-disabled');
        if (className) classes.push(className);
        return classes.join(' ');
    };

    return tags.button({
        role: 'tab',
        class: typeof active === 'function' || typeof disabled === 'function'
            ? () => getClasses()
            : getClasses(),
        ...rest
    }, ...children);
};

/**
 * Tab Content - for lifted tabs with content panels
 */
Tabs.Content = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.div({
        role: 'tabpanel',
        class: `tab-content bg-base-100 border-base-300 p-6 ${className}`.trim(),
        ...rest
    }, ...children);
};

if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Tabs', Tabs);
}

export default Tabs;
