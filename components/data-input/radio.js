/**
 * Lightview Components - Radio & RadioGroup
 * Radio button components using DaisyUI 5 styling with validation support
 * @see https://daisyui.com/components/radio/
 * 
 * Uses DaisyUI's form-control pattern:
 * <div class="form-control">
 *     <label class="label cursor-pointer">
 *         <span class="label-text">Option</span>
 *         <input type="radio" class="radio" />
 *     </label>
 * </div>
 */

import '../daisyui.js';

/**
 * Radio Component (Single radio button)
 * @param {Object} props - Radio properties
 * @param {string} props.name - Radio group name
 * @param {*} props.value - Radio value
 * @param {boolean|function} props.checked - Checked state
 * @param {string} props.size - 'xs' | 'sm' | 'md' | 'lg' (default: 'md')
 * @param {string} props.color - 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error'
 * @param {boolean} props.disabled - Disable radio
 * @param {string} props.label - Label text
 * @param {Function} props.onChange - Change handler
 */
const Radio = (props = {}) => {
    const { tags } = window.Lightview || {};
    const LVX = window.LightviewX || {};

    if (!tags) {
        console.error('Lightview not found');
        return null;
    }

    const { div, input, label, span, shadowDOM } = tags;

    const {
        name,
        value,
        checked = false,
        size = 'md',
        color,
        disabled = false,
        label: labelText,
        onChange,
        id,
        class: className = '',
        useShadow,
        ...rest
    } = props;

    const radioId = id || `radio-${Math.random().toString(36).slice(2, 9)}`;

    // Build DaisyUI radio classes
    const getRadioClass = () => {
        const classes = ['radio'];

        if (size && size !== 'md') {
            classes.push(`radio-${size}`);
        }

        if (color) {
            classes.push(`radio-${color}`);
        }

        return classes.join(' ');
    };

    const radioInput = input({
        type: 'radio',
        class: getRadioClass(),
        name,
        value,
        checked: typeof checked === 'function' ? checked : checked,
        disabled,
        id: radioId,
        onchange: onChange ? (e) => onChange(e.target.value, e) : undefined,
        ...rest
    });

    // If no label, return just the radio
    if (!labelText) {
        return radioInput;
    }

    const formControl = div({
        class: `form-control ${className}`.trim()
    },
        label({ class: 'label cursor-pointer justify-start gap-3' },
            radioInput,
            span({ class: 'label-text' }, labelText)
        )
    );

    // Check if we should use shadow DOM
    let usesShadow = false;
    if (LVX.shouldUseShadow) {
        usesShadow = LVX.shouldUseShadow(useShadow);
    } else {
        usesShadow = useShadow === true;
    }

    if (usesShadow) {
        const adoptedStyleSheets = LVX.getAdoptedStyleSheets ? LVX.getAdoptedStyleSheets() : [];
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';

        return div({ class: 'content', style: 'display: inline-block' },
            shadowDOM({ mode: 'open', adoptedStyleSheets },
                div({ 'data-theme': currentTheme }, formControl)
            )
        );
    }

    return formControl;
};

/**
 * RadioGroup Component
 * @param {Object} props - RadioGroup properties
 * @param {Array} props.options - Array of options: string[] or {value, label, description, disabled}[]
 * @param {*|Signal} props.value - Selected value (controlled)
 * @param {*} props.defaultValue - Default value (uncontrolled)
 * @param {string} props.name - Group name for form submission
 * @param {string} props.label - Group label
 * @param {string} props.helper - Helper text
 * @param {string|Function} props.error - Error message
 * @param {Function} props.validate - Validation function (value) => errorMessage | null
 * @param {string} props.color - 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error'
 * @param {string} props.size - 'xs' | 'sm' | 'md' | 'lg' (default: 'md')
 * @param {boolean} props.horizontal - Horizontal layout
 * @param {boolean} props.disabled - Disable all options
 * @param {boolean} props.required - Mark as required
 * @param {Function} props.onChange - Value change handler
 * @param {boolean} props.useShadow - Render in Shadow DOM
 */
const RadioGroup = (props = {}) => {
    const { tags, signal } = window.Lightview || {};
    const LVX = window.LightviewX || {};

    if (!tags) {
        console.error('Lightview not found');
        return null;
    }

    const { div, fieldset, legend, input, label, span, p, shadowDOM } = tags;

    const {
        options = [],
        value,
        defaultValue,
        name = `radio-group-${Math.random().toString(36).slice(2, 9)}`,
        label: groupLabel,
        helper,
        error,
        validate,
        color,
        size = 'md',
        horizontal = false,
        disabled = false,
        required = false,
        onChange,
        class: className = '',
        useShadow,
        ...rest
    } = props;

    // Normalize options
    const normalizedOptions = options.map(opt =>
        typeof opt === 'string' ? { value: opt, label: opt } : opt
    );

    // Internal state
    const internalValue = signal
        ? signal(defaultValue !== undefined ? defaultValue : null)
        : { value: defaultValue !== undefined ? defaultValue : null };
    const internalError = signal ? signal(null) : { value: null };

    const isControlled = value !== undefined;

    const getValue = () => {
        if (isControlled) {
            return typeof value === 'function' ? value() :
                (value && typeof value.value !== 'undefined') ? value.value : value;
        }
        return internalValue.value;
    };

    const getError = () => {
        if (error) {
            const err = typeof error === 'function' ? error() : error;
            if (err) return err;
        }
        return internalError.value;
    };

    const runValidation = (val) => {
        if (validate) {
            const result = validate(val);
            internalError.value = result;
            return result;
        }
        if (required && !val) {
            internalError.value = 'Please select an option';
            return 'Please select an option';
        }
        internalError.value = null;
        return null;
    };

    const handleChange = (optValue) => {
        if (!isControlled) {
            internalValue.value = optValue;
        }

        if (isControlled && value && typeof value.value !== 'undefined') {
            value.value = optValue;
        }

        runValidation(optValue);

        if (onChange) onChange(optValue);
    };

    // Build radio class
    const getRadioClass = () => {
        const classes = ['radio'];
        if (size && size !== 'md') classes.push(`radio-${size}`);
        if (color) classes.push(`radio-${color}`);
        return classes.join(' ');
    };

    // Build options
    const radioOptions = normalizedOptions.map(opt => {
        const optDisabled = disabled || opt.disabled;
        const isChecked = () => getValue() === opt.value;

        return label({ class: 'label cursor-pointer justify-start gap-3' },
            input({
                type: 'radio',
                class: getRadioClass(),
                name,
                value: opt.value,
                checked: isChecked,
                disabled: optDisabled,
                onchange: () => handleChange(opt.value)
            }),
            div({ class: 'flex flex-col' },
                span({ class: 'label-text' }, opt.label),
                opt.description ? span({ class: 'label-text-alt opacity-70' }, opt.description) : null
            )
        );
    });

    // Build the component
    const fieldsetContent = [];

    if (groupLabel) {
        fieldsetContent.push(
            legend({ class: 'fieldset-legend' },
                groupLabel,
                required ? span({ class: 'text-error' }, ' *') : null
            )
        );
    }

    fieldsetContent.push(
        div({
            class: horizontal ? 'flex flex-wrap gap-4' : 'space-y-2',
            role: 'radiogroup',
            'aria-label': groupLabel
        }, ...radioOptions)
    );

    // Helper or error text
    if (helper || validate || error || required) {
        fieldsetContent.push(
            () => {
                const currentError = getError();
                if (currentError) {
                    return p({ class: 'label text-error', role: 'alert' }, currentError);
                }
                if (helper) {
                    return p({ class: 'label' }, helper);
                }
                return null;
            }
        );
    }

    const wrapperEl = fieldset({
        class: `fieldset ${className}`.trim(),
        ...rest
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

        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';

        return span({ style: 'margin-right: 0.5rem' },
            shadowDOM({ mode: 'open', adoptedStyleSheets },
                div({ 'data-theme': currentTheme, style: 'display: inline-block' }, wrapperEl)
            )
        );
    }

    return wrapperEl;
};

// Auto-register
if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Radio', Radio);
    window.LightviewX.registerComponent('RadioGroup', RadioGroup);
}

export default Radio;
export { Radio, RadioGroup };
