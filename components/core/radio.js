/**
 * Lightview Components - Radio
 * A radio button group component
 */

import { loadStylesheetSync } from '../utils/styles.js';

// Load styles from external CSS file
loadStylesheetSync(import.meta.url);

/**
 * Radio Group Component
 * @param {Object} props
 * @param {Array} props.options - Array of options: [{ value, label, description, disabled }] or strings
 * @param {*|Signal} props.value - Selected value (controlled)
 * @param {*} props.defaultValue - Default value (uncontrolled)
 * @param {string} props.name - Group name for form submission
 * @param {string} props.label - Group label
 * @param {string} props.helper - Helper text
 * @param {string} props.error - Error message
 * @param {string} props.color - 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
 * @param {string} props.size - 'sm' | 'md' | 'lg' (default: 'md')
 * @param {boolean} props.horizontal - Horizontal layout
 * @param {boolean} props.disabled - Disable all options
 * @param {boolean} props.required - Mark as required
 * @param {Function} props.onChange - Value change handler
 */
const Radio = (props = {}) => {
    const { tags, signal } = window.Lightview || {};
    if (!tags) {
        console.error('Lightview not found');
        return null;
    }
    
    const { div, label: labelTag, input, span } = tags;
    
    const {
        options = [],
        value,
        defaultValue,
        name = `radio-${Math.random().toString(36).slice(2, 9)}`,
        label,
        helper,
        error,
        color = 'primary',
        size = 'md',
        horizontal = false,
        disabled = false,
        required = false,
        onChange,
        class: className = '',
        ...rest
    } = props;
    
    // Normalize options
    const normalizedOptions = options.map(opt =>
        typeof opt === 'string' ? { value: opt, label: opt } : opt
    );
    
    // State
    const internalValue = signal
        ? signal(defaultValue !== undefined ? defaultValue : null)
        : { value: defaultValue !== undefined ? defaultValue : null };
    
    const isControlled = value !== undefined;
    
    const getValue = () => {
        if (isControlled) {
            return typeof value === 'function' ? value() :
                   (value && typeof value.value !== 'undefined') ? value.value : value;
        }
        return internalValue.value;
    };
    
    const handleChange = (optValue) => {
        if (!isControlled) {
            internalValue.value = optValue;
        }
        
        if (isControlled && value && typeof value.value !== 'undefined') {
            value.value = optValue;
        }
        
        if (onChange) {
            onChange(optValue);
        }
    };
    
    const classes = ['lv-radio-group'];
    if (horizontal) classes.push('lv-radio-group--horizontal');
    if (error) classes.push('lv-radio-group--error');
    if (className) classes.push(className);
    
    return div({
        class: classes.join(' '),
        role: 'radiogroup',
        'aria-label': label,
        ...rest
    },
        label ? div({ class: 'lv-radio-group__label' },
            label,
            required ? span({ class: 'lv-radio-group__required' }, ' *') : null
        ) : null,
        
        ...normalizedOptions.map(opt => {
            const optDisabled = disabled || opt.disabled;
            const isChecked = () => getValue() === opt.value;
            
            const radioClasses = [
                'lv-radio',
                `lv-radio--${color}`,
                `lv-radio--${size}`
            ];
            if (optDisabled) radioClasses.push('lv-radio--disabled');
            
            return labelTag({
                class: radioClasses.join(' ')
            },
                input({
                    class: 'lv-radio__input',
                    type: 'radio',
                    name,
                    value: opt.value,
                    checked: isChecked,
                    disabled: optDisabled,
                    onchange: () => handleChange(opt.value)
                }),
                span({ class: 'lv-radio__indicator' }),
                div({ class: 'lv-radio__content' },
                    span({ class: 'lv-radio__label' }, opt.label),
                    opt.description ? span({ class: 'lv-radio__description' }, opt.description) : null
                )
            );
        }),
        
        (helper || error) ? span({ class: 'lv-radio-group__helper' }, error || helper) : null
    );
};

// Auto-register
if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Radio', Radio);
}

export default Radio;
