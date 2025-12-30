/**
 * Lightview Components - Toggle
 * A toggle switch component using DaisyUI 5 styling
 * @see https://daisyui.com/components/toggle/
 * 
 * Uses DaisyUI's form-control pattern:
 * <div class="form-control">
 *     <label class="label cursor-pointer">
 *         <span class="label-text">Label</span>
 *         <input type="checkbox" class="toggle" />
 *     </label>
 * </div>
 */

import '../daisyui.js';

/**
 * Toggle Component
 * @param {Object} props - Toggle properties
 * @param {boolean|Signal} props.checked - Controlled checked state
 * @param {boolean} props.defaultChecked - Initial checked state (uncontrolled)
 * @param {string} props.size - 'xs' | 'sm' | 'md' | 'lg' (default: 'md')
 * @param {string} props.color - 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error'
 * @param {boolean} props.disabled - Disable toggle
 * @param {string} props.label - Label text
 * @param {string} props.labelPosition - 'left' | 'right' (default: 'left')
 * @param {string} props.description - Description text below label
 * @param {Function} props.onChange - Change handler
 * @param {boolean} props.useShadow - Render in Shadow DOM
 */
const Toggle = (props = {}) => {
    const { tags, signal } = globalThis.Lightview || {};
    const LVX = globalThis.LightviewX || {};

    if (!tags) {
        console.error('Lightview not found');
        return null;
    }

    const { div, input, label, span, shadowDOM } = tags;

    const {
        checked,
        defaultChecked = false,
        size = 'md',
        color,
        disabled = false,
        label: labelText,
        labelPosition = 'left',
        description,
        onChange,
        name,
        id,
        class: className = '',
        useShadow,
        theme, // Explicit theme override
        ...rest
    } = props;

    const toggleId = id || `toggle-${Math.random().toString(36).slice(2, 9)}`;

    // Internal state for uncontrolled mode
    const internalChecked = signal ? signal(defaultChecked) : { value: defaultChecked };

    const isControlled = checked !== undefined;

    const getChecked = () => {
        if (isControlled) {
            return typeof checked === 'function' ? checked() :
                (checked && typeof checked.value !== 'undefined') ? checked.value : checked;
        }
        return internalChecked.value;
    };

    const handleChange = (e) => {
        const newValue = e.target.checked;

        if (!isControlled) {
            internalChecked.value = newValue;
        }

        // If controlled with a signal, update it
        if (isControlled && checked && typeof checked.value !== 'undefined') {
            checked.value = newValue;
        }

        if (onChange) onChange(newValue, e);
    };

    // Build DaisyUI toggle classes
    const getToggleClass = () => {
        const classes = ['toggle'];

        if (size && size !== 'md') {
            classes.push(`toggle-${size}`);
        }

        if (color) {
            classes.push(`toggle-${color}`);
        }

        return classes.join(' ');
    };

    const toggleInput = input({
        type: 'checkbox',
        class: getToggleClass(),
        checked: isControlled
            ? (typeof checked === 'function' ? checked : () => getChecked())
            : () => internalChecked.value,
        disabled: typeof disabled === 'function' ? disabled : disabled,
        name,
        id: toggleId,
        onchange: handleChange,
        role: 'switch',
        'aria-checked': isControlled
            ? (typeof checked === 'function' ? checked : () => getChecked())
            : () => internalChecked.value,
        ...rest
    });

    // If no label, return just the toggle
    if (!labelText) {
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
                    div({ 'data-theme': themeValue }, toggleInput)
                )
            );
        }

        return toggleInput;
    }

    // Build label content
    const labelContent = div({ style: 'display: flex; flex-direction: column;' },
        span({ class: 'label-text' }, labelText),
        description ? span({ class: 'label-text-alt', style: 'opacity: 0.7;' }, description) : null
    );

    // Arrange based on label position
    const labelChildren = labelPosition === 'right'
        ? [toggleInput, labelContent]
        : [labelContent, toggleInput];

    const formControl = div({
        class: `form-control ${className}`.trim()
    },
        label({ class: 'label cursor-pointer', style: 'justify-content: flex-start; gap: 0.75rem;' },
            ...labelChildren
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

        // Use reactive theme signal if available, otherwise fallback to explicit 'theme' prop or default
        const themeValue = theme || (LVX.themeSignal ? () => LVX.themeSignal.value : 'light');

        return span({ style: 'margin-right: 0.5rem' },
            shadowDOM({ mode: 'open', adoptedStyleSheets },
                div({ 'data-theme': themeValue, style: 'display: inline-block' }, formControl)
            )
        );
    }

    return formControl;
};

// Auto-register
globalThis.Lightview.tags.Toggle = Toggle;

// Register as Custom Element
if (globalThis.LightviewX?.createCustomElement) {
    const ToggleElement = globalThis.LightviewX.createCustomElement(Toggle);
    if (!customElements.get('lv-toggle')) {
        customElements.define('lv-toggle', ToggleElement);
    }
}

export default Toggle;
