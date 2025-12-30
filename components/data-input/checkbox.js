/**
 * Lightview Components - Checkbox
 * A checkbox component using DaisyUI 5 styling with validation support
 * @see https://daisyui.com/components/checkbox/
 * 
 * Uses DaisyUI's form-control pattern:
 * <div class="form-control">
 *     <label class="label cursor-pointer">
 *         <span class="label-text">Label</span>
 *         <input type="checkbox" class="checkbox" />
 *     </label>
 * </div>
 */

import '../daisyui.js';

/**
 * Checkbox Component
 * @param {Object} props - Checkbox properties
 * @param {boolean|Signal} props.checked - Controlled checked state
 * @param {boolean} props.defaultChecked - Initial checked state (uncontrolled)
 * @param {boolean} props.indeterminate - Indeterminate state
 * @param {string} props.size - 'xs' | 'sm' | 'md' | 'lg' (default: 'md')
 * @param {string} props.color - 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error'
 * @param {boolean} props.disabled - Disable checkbox
 * @param {boolean} props.required - Required field
 * @param {string} props.label - Label text
 * @param {string} props.description - Description text below label
 * @param {string|Function} props.error - Error message
 * @param {Function} props.validate - Validation function (checked) => errorMessage | null
 * @param {Function} props.onChange - Change handler
 * @param {boolean} props.useShadow - Render in Shadow DOM with isolated DaisyUI styles
 */
const Checkbox = (props = {}) => {
    const { tags, signal } = globalThis.Lightview || {};
    const LVX = globalThis.LightviewX || {};

    if (!tags) {
        console.error('Lightview not found');
        return null;
    }

    const { div, input, label, span, p, shadowDOM } = tags;

    const {
        checked,
        defaultChecked = false,
        indeterminate = false,
        size = 'md',
        color,
        disabled = false,
        required = false,
        label: labelText,
        description,
        error,
        validate,
        onChange,
        name,
        id,
        value,
        class: className = '',
        useShadow,
        ...rest
    } = props;

    // Generate unique ID if not provided
    const checkboxId = id || `checkbox-${Math.random().toString(36).slice(2, 9)}`;

    // Internal state
    const internalChecked = signal ? signal(defaultChecked) : { value: defaultChecked };
    const internalError = signal ? signal(null) : { value: null };

    const isControlled = checked !== undefined;

    const getChecked = () => {
        if (isControlled) {
            return typeof checked === 'function' ? checked() :
                (checked && typeof checked.value !== 'undefined') ? checked.value : checked;
        }
        return internalChecked.value;
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
            internalError.value = 'This field is required';
            return 'This field is required';
        }
        internalError.value = null;
        return null;
    };

    const handleChange = (e) => {
        const newValue = e.target.checked;

        if (!isControlled) {
            internalChecked.value = newValue;
        }

        if (isControlled && checked && typeof checked.value !== 'undefined') {
            checked.value = newValue;
        }

        runValidation(newValue);

        if (onChange) onChange(newValue, e);
    };

    // Build DaisyUI checkbox classes
    const getCheckboxClass = () => {
        const classes = ['checkbox'];

        // Size
        if (size && size !== 'md') {
            classes.push(`checkbox-${size}`);
        }

        // Color
        if (color) {
            classes.push(`checkbox-${color}`);
        }

        return classes.join(' ');
    };

    // Build checkbox input
    const checkboxInput = input({
        type: 'checkbox',
        class: getCheckboxClass(),
        checked: isControlled
            ? (typeof checked === 'function' ? checked : () => getChecked())
            : () => internalChecked.value,
        disabled: typeof disabled === 'function' ? disabled : disabled,
        required,
        name,
        id: checkboxId,
        value,
        onchange: handleChange,
        'aria-invalid': () => !!getError(),
        onmount: (el) => {
            // Handle indeterminate state (can only be set via JS)
            if (indeterminate) {
                el.indeterminate = typeof indeterminate === 'function' ? indeterminate() : indeterminate;
            }
        },
        ...rest
    });

    // If no label, return just the checkbox
    if (!labelText && !description) {
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
                    div({ 'data-theme': themeValue }, checkboxInput)
                )
            );
        }

        return checkboxInput;
    }

    // Build label content
    const labelContent = [];
    if (labelText) {
        labelContent.push(
            span({ class: 'label-text' },
                labelText,
                required ? span({ class: 'text-error' }, ' *') : null
            )
        );
    }

    // Build the form control wrapper
    const formControl = div({
        class: `form-control ${className}`.trim()
    },
        label({ class: 'label cursor-pointer', style: 'justify-content: flex-start; gap: 0;' },
            checkboxInput,
            labelContent.length > 0 ? div({ style: 'display: flex; flex-direction: column; margin-left: 0.5rem;' },
                ...labelContent,
                description ? span({ class: 'label-text-alt', style: 'opacity: 0.7;' }, description) : null
            ) : null
        ),
        // Error message
        (validate || error || required) ? () => {
            const currentError = getError();
            return currentError
                ? p({ class: 'label', style: 'color: oklch(var(--er)); font-size: 0.875rem;', role: 'alert' }, currentError)
                : null;
        } : null
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

        const themeValue = LVX.themeSignal ? () => LVX.themeSignal.value : 'light';

        return span({ style: 'margin-right: 0.5rem' },
            shadowDOM({ mode: 'open', adoptedStyleSheets },
                div({ 'data-theme': themeValue, style: 'display: inline-block' },
                    formControl
                )
            )
        );
    }

    return formControl;
};

// Auto-register
globalThis.Lightview.tags.Checkbox = Checkbox;

// Register as Custom Element
if (globalThis.LightviewX?.createCustomElement) {
    const CheckboxElement = globalThis.LightviewX.createCustomElement(Checkbox);
    if (!customElements.get('lv-checkbox')) {
        customElements.define('lv-checkbox', CheckboxElement);
    }
}

export default Checkbox;

