/**
 * Lightview Components - Select
 * A select dropdown component using DaisyUI 5 styling with validation support
 * @see https://daisyui.com/components/select/
 * 
 * Uses DaisyUI's fieldset pattern:
 * <fieldset class="fieldset">
 *     <legend class="fieldset-legend">Label</legend>
 *     <select class="select" />
 *     <p class="label">Helper text</p>
 * </fieldset>
 */

import '../daisyui.js';

/**
 * Select Component
 * @param {Object} props - Select properties
 * @param {Array} props.options - Array of options: string[] or {value, label, disabled}[]
 * @param {*|Signal} props.value - Selected value (controlled)
 * @param {*} props.defaultValue - Default value (uncontrolled)
 * @param {string} props.placeholder - Placeholder text (shows as disabled first option)
 * @param {string} props.size - 'xs' | 'sm' | 'md' | 'lg' (default: 'md')
 * @param {string} props.color - 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error'
 * @param {boolean} props.ghost - Ghost style (no background)
 * @param {boolean} props.disabled - Disable select
 * @param {boolean} props.required - Required field
 * @param {string} props.label - Label text (rendered as fieldset legend)
 * @param {string} props.helper - Helper text (rendered below select)
 * @param {string|Function} props.error - Error message (string or validation function)
 * @param {Function} props.validate - Validation function (value) => errorMessage | null
 * @param {Function} props.onChange - Change handler
 * @param {boolean} props.useShadow - Render in Shadow DOM with isolated DaisyUI styles
 */
const Select = (props = {}) => {
    const { tags, signal } = globalThis.Lightview || {};
    const LVX = globalThis.LightviewX || {};

    if (!tags) {
        console.error('Lightview not found');
        return null;
    }

    const { div, select, option, fieldset, legend, p, span, shadowDOM } = tags;

    const {
        options = [],
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
        name,
        id,
        class: className = '',
        useShadow,
        ...rest
    } = props;

    // Generate unique ID if not provided
    const selectId = id || `select-${Math.random().toString(36).slice(2, 9)}`;
    const selectName = name || selectId;

    // Internal state
    const internalValue = signal ? signal(defaultValue) : { value: defaultValue };
    const internalError = signal ? signal(null) : { value: null };
    const touched = signal ? signal(false) : { value: false };

    const isControlled = value !== undefined;

    // Normalize options - first parse from JSON string if needed (from HTML attribute)
    let parsedOptions = options;
    if (typeof parsedOptions === 'string') {
        try {
            parsedOptions = JSON.parse(parsedOptions);
        } catch (e) {
            console.error('Select: Failed to parse options JSON:', e);
            parsedOptions = [];
        }
    }

    const normalizedOptions = (Array.isArray(parsedOptions) ? parsedOptions : []).map(opt =>
        typeof opt === 'string' ? { value: opt, label: opt } : opt
    );

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

    const handleChange = (e) => {
        const newValue = e.target.value;

        if (!isControlled) {
            internalValue.value = newValue;
        }

        if (isControlled && value && typeof value.value !== 'undefined') {
            value.value = newValue;
        }

        // Validate on change
        touched.value = true;
        runValidation(newValue);

        if (onChange) onChange(newValue, e);
    };

    // Build DaisyUI select classes
    const getSelectClass = () => {
        const classes = ['select', 'w-full'];

        // Ghost style
        if (ghost) {
            classes.push('select-ghost');
        }

        // Size
        if (size && size !== 'md') {
            classes.push(`select-${size}`);
        }

        // Color
        if (color) {
            classes.push(`select-${color}`);
        }

        // Error state
        const currentError = getError();
        if (currentError) {
            classes.push('select-error');
        }

        return classes.join(' ');
    };

    // Build options elements
    const buildOptions = () => {
        const optionEls = [];

        // Placeholder option
        if (placeholder) {
            optionEls.push(
                option({
                    disabled: true,
                    selected: () => !getValue(),
                    value: ''
                }, placeholder)
            );
        }

        // Regular options
        normalizedOptions.forEach(opt => {
            optionEls.push(
                option({
                    value: opt.value,
                    selected: () => getValue() === opt.value,
                    disabled: opt.disabled
                }, opt.label || opt.value)
            );
        });

        return optionEls;
    };

    // Build select attributes
    const selectAttrs = {
        class: validate || error ? () => getSelectClass() : getSelectClass(),
        disabled: typeof disabled === 'function' ? disabled : disabled,
        required,
        name: selectName,
        id: selectId,
        onchange: handleChange,
        'aria-invalid': () => !!getError(),
        ...rest
    };

    const selectEl = select(selectAttrs, ...buildOptions());

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

    // Select element
    fieldsetContent.push(selectEl);

    // Helper or error text
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
globalThis.Lightview.tags.Select = Select;

// Register as Custom Element
if (globalThis.LightviewX?.createCustomElement) {
    const SelectElement = globalThis.LightviewX.createCustomElement(Select);
    if (!customElements.get('lv-select')) {
        customElements.define('lv-select', SelectElement);
    }
}

export default Select;
