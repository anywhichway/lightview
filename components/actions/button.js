/**
 * Lightview Button Component (DaisyUI)
 * @see https://daisyui.com/components/button/
 */

import '../daisyui.js';

/**
 * Button Component
 * @param {Object} props
 * @param {string} props.color - 'primary' | 'secondary' | 'accent' | 'neutral' | 'info' | 'success' | 'warning' | 'error' | 'ghost' | 'link'
 * @param {string} props.size - 'xs' | 'sm' | 'md' | 'lg'
 * @param {string} props.variant - 'outline' | 'soft' | 'dash' | 'wide' | 'block' | 'square' | 'circle'
 * @param {boolean} props.disabled - Disable the button
 * @param {boolean} props.loading - Show loading state
 * @param {boolean} props.active - Force active state
 * @param {boolean} props.glass - Glass morphism effect
 * @param {boolean} props.noAnimation - Disable click animation
 * @param {boolean} props.useShadow - Render in Shadow DOM with isolated DaisyUI styles
 * @param {...children} children - Button content
 */
const Button = (props = {}, ...children) => {
    const { tags } = globalThis.Lightview || {};
    const LVX = globalThis.LightviewX || {};

    if (!tags) {
        console.error('Lightview not found');
        return null;
    }

    const { button, div, span, shadowDOM } = tags;

    const {
        color,
        size,
        variant,
        disabled = false,
        loading = false,
        active = false,
        glass = false,
        noAnimation = false,
        useShadow,
        theme, // Explicit theme override
        class: className = '',
        ...rest
    } = props;

    const getClassList = () => {
        const classes = ['btn'];

        // Color
        if (['primary', 'secondary', 'accent', 'neutral', 'info', 'success', 'warning', 'error', 'ghost', 'link'].includes(color)) classes.push(`btn-${color}`);

        // Size
        if (size) classes.push(`btn-${size}`);

        // Variant
        if (variant === 'outline') classes.push('btn-outline');
        else if (variant === 'soft') classes.push('btn-soft');
        else if (variant === 'dash') classes.push('btn-dash');
        else if (variant === 'wide') classes.push('btn-wide');
        else if (variant === 'block') classes.push('btn-block');
        else if (variant === 'square') classes.push('btn-square');
        else if (variant === 'circle') classes.push('btn-circle');

        // States
        const isDisabled = typeof disabled === 'function' ? disabled() : disabled;
        const isLoading = typeof loading === 'function' ? loading() : loading;
        const isActive = typeof active === 'function' ? active() : active;

        if (isDisabled) classes.push('btn-disabled');
        if (isActive) classes.push('btn-active');
        if (glass) classes.push('glass');
        if (noAnimation) classes.push('no-animation');

        if (className) classes.push(className);

        return classes.join(' ');
    };

    const buildContent = () => {
        const isLoading = typeof loading === 'function' ? loading() : loading;
        if (isLoading) {
            return [
                tags.span({ class: 'loading loading-spinner' }),
                ...children
            ];
        }
        return children;
    };

    if (color && !['primary', 'secondary', 'accent', 'neutral', 'info', 'success', 'warning', 'error', 'ghost', 'link'].includes(color)) {
        // set the background color using style
        rest.style = rest.style || '';
        if (typeof rest.style === 'object') {
            rest.style.backgroundColor = color;
        } else {
            rest.style += `;background-color: ${color};`;
        }
    }
    const buttonEl = button({
        class: typeof disabled === 'function' || typeof loading === 'function' || typeof active === 'function'
            ? () => getClassList()
            : getClassList(),
        disabled: typeof disabled === 'function'
            ? () => disabled() || (typeof loading === 'function' ? loading() : loading)
            : disabled || loading,
        ...rest
    }, ...(typeof loading === 'function' ? [() => buildContent()] : buildContent()));

    // Check if we should use shadow DOM
    let usesShadow = false;
    if (LVX.shouldUseShadow) {
        usesShadow = LVX.shouldUseShadow(useShadow);
    } else {
        usesShadow = useShadow === true;
    }

    if (usesShadow) {
        const adoptedStyleSheets = LVX.getAdoptedStyleSheets ? LVX.getAdoptedStyleSheets() : [];

        // If theme is explicitly provided, wrap in a div with data-theme
        // Otherwise, return button directly in shadow root to allow inheritance from host
        // Use reactive theme signal if available, otherwise fallback to explicit 'theme' prop or default
        const themeValue = theme || (LVX.themeSignal ? () => LVX.themeSignal.value : 'light');

        return div({ class: 'content', style: 'display: inline-block' },
            shadowDOM({ mode: 'open', adoptedStyleSheets },
                div({ 'data-theme': themeValue },
                    buttonEl
                )
            )
        );
    }

    return buttonEl;
};


globalThis.Lightview.tags.Button = Button;

// Register as Custom Element
if (globalThis.LightviewX?.createCustomElement) {
    const ButtonElement = globalThis.LightviewX.createCustomElement(Button);
    if (!customElements.get('lv-button')) {
        customElements.define('lv-button', ButtonElement);
    }
}


export default Button;
