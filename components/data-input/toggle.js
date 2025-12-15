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
    const { tags, signal } = window.Lightview || {};
    const LVX = window.LightviewX || {};

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
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';

            return div({ class: 'contents' },
                shadowDOM({ mode: 'open', adoptedStyleSheets },
                    div({ 'data-theme': currentTheme }, toggleInput)
                )
            );
        }

        return toggleInput;
    }

    // Build label content
    const labelContent = div({ class: 'flex flex-col' },
        span({ class: 'label-text' }, labelText),
        description ? span({ class: 'label-text-alt opacity-70' }, description) : null
    );

    // Arrange based on label position
    const labelChildren = labelPosition === 'right'
        ? [toggleInput, labelContent]
        : [labelContent, toggleInput];

    const formControl = div({
        class: `form-control ${className}`.trim()
    },
        label({ class: 'label cursor-pointer justify-start gap-3' },
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

        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';

        return div({ class: 'contents' },
            shadowDOM({ mode: 'open', adoptedStyleSheets },
                div({ 'data-theme': currentTheme }, formControl)
            )
        );
    }

    return formControl;
};

// Auto-register
if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Toggle', Toggle);
}

export default Toggle;
