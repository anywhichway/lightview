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
 * @param {...children} children - Button content
 */
const Button = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) {
        console.error('Lightview not found');
        return null;
    }

    const { button } = tags;

    const {
        color,
        size,
        variant,
        disabled = false,
        loading = false,
        active = false,
        glass = false,
        noAnimation = false,
        class: className = '',
        ...rest
    } = props;

    const getClassList = () => {
        const classes = ['btn'];

        // Color
        if (color) classes.push(`btn-${color}`);

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

    return button({
        class: typeof disabled === 'function' || typeof loading === 'function' || typeof active === 'function'
            ? () => getClassList()
            : getClassList(),
        disabled: typeof disabled === 'function'
            ? () => disabled() || (typeof loading === 'function' ? loading() : loading)
            : disabled || loading,
        ...rest
    }, ...(typeof loading === 'function' ? [() => buildContent()] : buildContent()));
};

// Auto-register with LightviewX if available
if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Button', Button);
}

export default Button;
