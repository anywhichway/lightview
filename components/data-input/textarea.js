/**
 * Lightview Components - Textarea
 * A multi-line text input component using DaisyUI 5 styling with validation support
 * @see https://daisyui.com/components/textarea/
 * 
 * Uses DaisyUI's fieldset pattern:
 * <fieldset class="fieldset">
 *     <legend class="fieldset-legend">Label</legend>
 *     <textarea class="textarea" />
 *     <p class="label">Helper text</p>
 * </fieldset>
 */

import '../daisyui.js';

/**
 * Textarea Component
 * @param {Object} props - Textarea properties
 * @param {string|Signal} props.value - Textarea value (controlled)
 * @param {string} props.defaultValue - Default value (uncontrolled)
 * @param {string} props.placeholder - Placeholder text
 * @param {string} props.size - 'xs' | 'sm' | 'md' | 'lg' (default: 'md')
 * @param {string} props.color - 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error'
 * @param {boolean} props.ghost - Ghost style (no background)
 * @param {boolean} props.disabled - Disable textarea
 * @param {boolean} props.required - Required field
 * @param {boolean} props.readOnly - Make read-only
 * @param {string} props.label - Label text (rendered as fieldset legend)
 * @param {string} props.helper - Helper text (rendered below textarea)
 * @param {string|Function} props.error - Error message (string or validation function)
 * @param {Function} props.validate - Validation function (value) => errorMessage | null
 * @param {number} props.rows - Number of visible rows (default: 3)
 * @param {number} props.maxLength - Maximum character length
 * @param {boolean} props.showCount - Show character count
 * @param {Function} props.onChange - Change handler
 * @param {Function} props.onBlur - Blur handler
 * @param {boolean} props.useShadow - Render in Shadow DOM with isolated DaisyUI styles
 */
const Textarea = (props = {}) => {
    const { tags, signal } = window.Lightview || {};
    const LVX = window.LightviewX || {};

    if (!tags) {
        console.error('Lightview not found');
        return null;
    }

    const { div, textarea, fieldset, legend, p, span, shadowDOM } = tags;

    const {
        value,
        defaultValue = '',
        placeholder,
        size = 'md',
        color,
        ghost = false,
        disabled = false,
        readOnly = false,
        required = false,
        label: labelText,
        helper,
        error,
        validate,
        rows = 3,
        maxLength,
        showCount = false,
        onChange,
        onBlur,
        onInput,
        name,
        id,
        class: className = '',
        useShadow,
        ...rest
    } = props;

    // Generate unique ID if not provided
    const textareaId = id || `textarea-${Math.random().toString(36).slice(2, 9)}`;
    const textareaName = name || textareaId;

    // Internal state
    const internalValue = signal ? signal(defaultValue) : { value: defaultValue };
    const internalError = signal ? signal(null) : { value: null };
    const touched = signal ? signal(false) : { value: false };

    const isControlled = value !== undefined;

    const getValue = () => {
        if (isControlled) {
            return typeof value === 'function' ? value() :
                (value && typeof value.value !== 'undefined') ? value.value : value;
        }
        return internalValue.value;
    };

    const getError = () => {
        // External error takes priority
        if (error) {
            const err = typeof error === 'function' ? error() : error;
            if (err) return err;
        }
        // Then internal validation error
        return internalError.value;
    };

    const runValidation = (val) => {
        if (!validate) return null;
        const result = validate(val);
        internalError.value = result;
        return result;
    };

    const handleInput = (e) => {
        const newValue = e.target.value;

        if (!isControlled) {
            internalValue.value = newValue;
        }

        if (isControlled && value && typeof value.value !== 'undefined') {
            value.value = newValue;
        }

        // Validate on input if already touched
        if (touched.value && validate) {
            runValidation(newValue);
        }

        if (onInput) onInput(e);
        if (onChange) onChange(newValue, e);
    };

    const handleBlur = (e) => {
        touched.value = true;
        runValidation(e.target.value);
        if (onBlur) onBlur(e);
    };

    // Build DaisyUI textarea classes
    const getTextareaClass = () => {
        const classes = ['textarea', 'w-full'];

        // Ghost style
        if (ghost) {
            classes.push('textarea-ghost');
        }

        // Size
        if (size && size !== 'md') {
            classes.push(`textarea-${size}`);
        }

        // Color
        if (color) {
            classes.push(`textarea-${color}`);
        }

        // Error state
        const currentError = getError();
        if (currentError) {
            classes.push('textarea-error');
        }

        return classes.join(' ');
    };

    const getCharCount = () => {
        const val = getValue() || '';
        return val.length;
    };

    // Build textarea attributes
    const textareaAttrs = {
        class: validate || error ? () => getTextareaClass() : getTextareaClass(),
        value: isControlled
            ? (typeof value === 'function' ? value : () => getValue())
            : () => internalValue.value,
        disabled: typeof disabled === 'function' ? disabled : disabled,
        readonly: readOnly,
        required,
        rows,
        name: textareaName,
        id: textareaId,
        oninput: handleInput,
        onblur: handleBlur,
        'aria-invalid': () => !!getError(),
        ...rest
    };

    // Only add placeholder if defined
    if (placeholder !== undefined) {
        textareaAttrs.placeholder = placeholder;
    }

    // Only add maxlength if defined
    if (maxLength !== undefined) {
        textareaAttrs.maxlength = maxLength;
    }

    const textareaEl = textarea(textareaAttrs);

    // Build the component using DaisyUI fieldset pattern
    const fieldsetContent = [];

    // Legend/Label (DaisyUI fieldset-legend)
    if (labelText) {
        fieldsetContent.push(
            legend({ class: 'fieldset-legend' },
                labelText,
                required ? span({ class: 'text-error' }, ' *') : null
            )
        );
    }

    // Textarea element
    fieldsetContent.push(textareaEl);

    // Footer with helper/error and character count
    const hasFooter = helper || validate || error || showCount || maxLength;
    if (hasFooter) {
        fieldsetContent.push(
            div({ class: 'flex justify-between items-center' },
                () => {
                    const currentError = getError();
                    if (currentError) {
                        return p({
                            class: 'label text-error flex-1',
                            role: 'alert'
                        }, currentError);
                    }
                    if (helper) {
                        return p({
                            class: 'label flex-1'
                        }, helper);
                    }
                    return span({ class: 'flex-1' });
                },
                (showCount || maxLength) ? span({
                    class: () => {
                        const count = getCharCount();
                        let classes = 'label text-xs';
                        if (maxLength) {
                            if (count > maxLength) classes += ' text-error';
                            else if (count > maxLength * 0.9) classes += ' text-warning';
                        }
                        return classes;
                    }
                }, () => maxLength ? `${getCharCount()}/${maxLength}` : getCharCount()) : null
            )
        );
    }

    // Wrapper with DaisyUI fieldset class
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

        // Get current theme from document
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';

        return div({ class: 'content', style: 'display: inline-block' },
            shadowDOM({ mode: 'open', adoptedStyleSheets },
                div({ 'data-theme': currentTheme },
                    wrapperEl
                )
            )
        );
    }

    return wrapperEl;
};

// Auto-register
if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Textarea', Textarea);
}

export default Textarea;
