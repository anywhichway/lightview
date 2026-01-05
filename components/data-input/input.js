/**
 * Lightview Components - Input
 * A text input component using DaisyUI 5 styling with validation support
 * @see https://daisyui.com/components/input/
 * 
 * Uses DaisyUI's fieldset pattern:
 * <fieldset class="fieldset">
 *     <legend class="fieldset-legend">Label</legend>
 *     <input class="input" />
 *     <p class="label">Helper text</p>
 * </fieldset>
 */

import '../daisyui.js';

/**
 * Input Component
 * @param {Object} props - Input properties
 * @param {string} props.type - Input type (default: 'text')
 * @param {string|Signal} props.value - Input value
 * @param {string} props.defaultValue - Default value (uncontrolled)
 * @param {string} props.placeholder - Placeholder text
 * @param {string} props.size - 'xs' | 'sm' | 'md' | 'lg' (default: 'md')
 * @param {string} props.color - 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error'
 * @param {boolean} props.ghost - Ghost style (no background)
 * @param {boolean} props.disabled - Disable input
 * @param {boolean} props.required - Required field
 * @param {string} props.label - Label text (rendered as fieldset legend)
 * @param {string} props.helper - Helper text (rendered below input)
 * @param {string|Function} props.error - Error message (string or validation function)
 * @param {Function} props.validate - Validation function (value) => errorMessage | null
 * @param {Function} props.onChange - Change handler
 * @param {Function} props.onBlur - Blur handler
 * @param {boolean} props.useShadow - Render in Shadow DOM with isolated DaisyUI styles
 */
const Input = (props = {}) => {
    const { tags, signal } = globalThis.Lightview || {};
    const LVX = globalThis.LightviewX || {};

    if (!tags) {
        console.error('Lightview not found');
        return null;
    }

    const { div, input, fieldset, legend, p, span, shadowDOM } = tags;

    const {
        type = 'text',
        value,
        defaultValue = '',
        placeholder,
        size = 'md',
        color,
        ghost = false,
        disabled = false,
        required = false,
        label: labelText,
        helper,
        error,
        validate,
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
    const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`;
    const inputName = name || inputId;

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

    // Build DaisyUI input classes
    const getInputClass = () => {
        const classes = ['input', 'w-full'];

        // Ghost style
        if (ghost) {
            classes.push('input-ghost');
        }

        // Size
        if (size && size !== 'md') {
            classes.push(`input-${size}`);
        }

        // Color
        if (color) {
            classes.push(`input-${color}`);
        }

        // Error state
        const currentError = getError();
        if (currentError) {
            classes.push('input-error');
        }

        return classes.join(' ');
    };

    // Build input attributes
    const inputAttrs = {
        type,
        class: validate || error ? () => getInputClass() : getInputClass(),
        value: isControlled
            ? (typeof value === 'function' ? value : () => getValue())
            : () => internalValue.value,
        disabled: typeof disabled === 'function' ? disabled : disabled,
        required,
        name: inputName,
        id: inputId,
        oninput: handleInput,
        onblur: handleBlur,
        'aria-invalid': () => !!getError(),
        ...rest
    };

    // Only add placeholder if defined
    if (placeholder !== undefined) {
        inputAttrs.placeholder = placeholder;
    }

    const inputEl = input(inputAttrs);

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

    // Input element
    fieldsetContent.push(inputEl);

    // Helper or error text (DaisyUI label class for helper text below)
    if (helper || validate || error) {
        fieldsetContent.push(
            () => {
                const currentError = getError();
                if (currentError) {
                    return p({
                        class: 'label text-error',
                        role: 'alert'
                    }, currentError);
                }
                if (helper) {
                    return p({
                        class: 'label'
                    }, helper);
                }
                return null;
            }
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
        const themeValue = LVX.themeSignal ? () => LVX.themeSignal.value : 'light';

        return div({ class: 'content', style: 'display: inline-block' },
            shadowDOM({ mode: 'open', adoptedStyleSheets },
                div({ 'data-theme': themeValue },
                    wrapperEl
                )
            )
        );
    }

    return wrapperEl;
};

// Auto-register
globalThis.Lightview.tags.Input = Input;

// Register as Custom Element
if (globalThis.LightviewX?.customElementWrapper) {
    const InputElement = globalThis.LightviewX.customElementWrapper(Input, {
        attributeMap: {
            type: String,
            value: String,
            defaultValue: String,
            placeholder: String,
            size: String,
            color: String,
            ghost: Boolean,
            disabled: Boolean,
            required: Boolean,
            label: String,
            helper: String,
            error: String,
            name: String,
            id: String,
            class: String
        }
    });
    if (!customElements.get('lv-input')) {
        customElements.define('lv-input', InputElement);
    }
} else if (globalThis.LightviewX?.createCustomElement) {
    const InputElement = globalThis.LightviewX.createCustomElement(Input);
    if (!customElements.get('lv-input')) {
        customElements.define('lv-input', InputElement);
    }
}

export default Input;
