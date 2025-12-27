/**
 * Lightview Components - Range
 * A range slider component using DaisyUI 5 styling
 * @see https://daisyui.com/components/range/
 * 
 * Uses DaisyUI's fieldset pattern for labeled ranges:
 * <fieldset class="fieldset">
 *     <legend class="fieldset-legend">Label</legend>
 *     <input type="range" class="range" />
 *     <p class="label">Helper</p>
 * </fieldset>
 */

import '../daisyui.js';

/**
 * Range Component
 * @param {Object} props - Range properties
 * @param {number|Signal} props.value - Current value (controlled)
 * @param {number} props.defaultValue - Default value (uncontrolled)
 * @param {number} props.min - Minimum value (default: 0)
 * @param {number} props.max - Maximum value (default: 100)
 * @param {number} props.step - Step increment (default: 1)
 * @param {string} props.size - 'xs' | 'sm' | 'md' | 'lg' (default: 'md')
 * @param {string} props.color - 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error'
 * @param {boolean} props.disabled - Disable range
 * @param {string} props.label - Label text
 * @param {string} props.helper - Helper text
 * @param {boolean} props.showValue - Show current value display
 * @param {Function} props.formatValue - Format function for displayed value
 * @param {Function} props.onChange - Change handler
 * @param {boolean} props.useShadow - Render in Shadow DOM
 */
const Range = (props = {}) => {
    const { tags, signal } = window.Lightview || {};
    const LVX = window.LightviewX || {};

    if (!tags) {
        console.error('Lightview not found');
        return null;
    }

    const { div, input, fieldset, legend, p, span, shadowDOM } = tags;

    const {
        value,
        defaultValue = 0,
        min = 0,
        max = 100,
        step = 1,
        size = 'md',
        color,
        disabled = false,
        label: labelText,
        helper,
        showValue = false,
        formatValue = (v) => v,
        onChange,
        name,
        id,
        class: className = '',
        useShadow,
        ...rest
    } = props;

    const rangeId = id || `range-${Math.random().toString(36).slice(2, 9)}`;

    // Internal state
    const internalValue = signal ? signal(defaultValue) : { value: defaultValue };

    const isControlled = value !== undefined;

    const getValue = () => {
        if (isControlled) {
            return typeof value === 'function' ? value() :
                (value && typeof value.value !== 'undefined') ? value.value : value;
        }
        return internalValue.value;
    };

    const handleInput = (e) => {
        const newValue = Number(e.target.value);

        if (!isControlled) {
            internalValue.value = newValue;
        }

        if (isControlled && value && typeof value.value !== 'undefined') {
            value.value = newValue;
        }

        if (onChange) onChange(newValue, e);
    };

    // Build DaisyUI range classes
    const getRangeClass = () => {
        const classes = ['range', 'w-full'];

        if (size && size !== 'md') {
            classes.push(`range-${size}`);
        }

        if (color) {
            classes.push(`range-${color}`);
        }

        return classes.join(' ');
    };

    const rangeInput = input({
        type: 'range',
        class: getRangeClass(),
        value: isControlled
            ? (typeof value === 'function' ? value : () => getValue())
            : () => internalValue.value,
        min,
        max,
        step,
        disabled: typeof disabled === 'function' ? disabled : disabled,
        name,
        id: rangeId,
        oninput: handleInput,
        ...rest
    });

    // If no label and no showValue, return just the range
    if (!labelText && !showValue && !helper) {
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

            return div({ class: 'content', style: 'display: inline-block' },
                shadowDOM({ mode: 'open', adoptedStyleSheets },
                    div({ 'data-theme': themeValue }, rangeInput)
                )
            );
        }

        return rangeInput;
    }

    // Build the component using DaisyUI fieldset pattern
    const fieldsetContent = [];

    // Legend/Label with optional value display
    if (labelText || showValue) {
        fieldsetContent.push(
            div({ class: 'flex justify-between items-center mb-1' },
                labelText ? legend({ class: 'fieldset-legend' }, labelText) : span(),
                showValue ? span({ class: 'text-sm font-mono opacity-70' },
                    () => formatValue(getValue())
                ) : null
            )
        );
    }

    // Range input
    fieldsetContent.push(rangeInput);

    // Helper text
    if (helper) {
        fieldsetContent.push(p({ class: 'label' }, helper));
    }

    // Wrapper
    const wrapperEl = fieldset({
        class: `fieldset ${className}`.trim()
    }, ...fieldsetContent);

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

        return span({ style: 'margin-right: 0.5rem' },
            shadowDOM({ mode: 'open', adoptedStyleSheets },
                div({ 'data-theme': themeValue, style: 'display: inline-block' }, wrapperEl)
            )
        );
    }

    return wrapperEl;
};

// Auto-register
window.Lightview.tags.Range = Range;

export default Range;
