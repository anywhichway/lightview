/**
 * Lightview Components - Switch
 * A toggle switch component for boolean inputs
 */

import { loadStylesheetSync } from '../utils/styles.js';

// Load styles from external CSS file
loadStylesheetSync(import.meta.url);

/**
 * Switch Component
 * @param {Object} props - Switch properties
 * @param {boolean|Signal} props.checked - Controlled checked state
 * @param {boolean} props.defaultChecked - Initial checked state (uncontrolled)
 * @param {string} props.color - 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info'
 * @param {string} props.size - 'sm' | 'md' | 'lg' (default: 'md')
 * @param {boolean} props.disabled - Disable the switch
 * @param {string} props.label - Label text
 * @param {string} props.labelPosition - 'left' | 'right' (default: 'right')
 * @param {string} props.name - Form field name
 * @param {string} props.id - Element ID
 * @param {Function} props.onChange - Change handler
 */
const Switch = (props = {}) => {
    
    const { tags, signal } = window.Lightview || {};
    if (!tags) {
        console.error('Lightview not found');
        return null;
    }
    
    const { label: labelTag, input, span } = tags;
    
    const {
        checked,
        defaultChecked = false,
        color = 'primary',
        size = 'md',
        disabled = false,
        label,
        labelPosition = 'right',
        name,
        id,
        onChange,
        class: className = '',
        ...rest
    } = props;
    
    // Internal state for uncontrolled mode
    const internalChecked = signal ? signal(defaultChecked) : { value: defaultChecked };
    
    // Determine if controlled or uncontrolled
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
        
        if (onChange) {
            onChange(newValue, e);
        }
        
        // If controlled with a signal, update it
        if (isControlled && checked && typeof checked.value !== 'undefined') {
            checked.value = newValue;
        }
    };
    
    const getClassList = () => {
        const classes = ['lv-switch'];
        classes.push(`lv-switch--${size}`);
        classes.push(`lv-switch--${color}`);
        
        const isDisabled = typeof disabled === 'function' ? disabled() : disabled;
        if (isDisabled) classes.push('lv-switch--disabled');
        if (className) classes.push(className);
        
        return classes.join(' ');
    };
    
    const switchInput = input({
        type: 'checkbox',
        class: 'lv-switch__input',
        checked: isControlled ? (typeof checked === 'function' ? checked : () => getChecked()) : () => internalChecked.value,
        disabled: typeof disabled === 'function' ? disabled : disabled,
        name,
        id,
        onchange: handleChange,
        role: 'switch',
        'aria-checked': isControlled ? (typeof checked === 'function' ? checked : () => getChecked()) : () => internalChecked.value,
        ...rest
    });
    
    const track = span({ class: 'lv-switch__track' },
        span({ class: 'lv-switch__thumb' })
    );
    
    const labelEl = label ? span({ class: 'lv-switch__label' }, label) : null;
    
    const content = labelPosition === 'left' && labelEl
        ? [labelEl, switchInput, track]
        : [switchInput, track, labelEl].filter(Boolean);
    
    return labelTag({
        class: typeof disabled === 'function' ? () => getClassList() : getClassList()
    }, ...content);
};

// Auto-register
if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Switch', Switch);
}

export default Switch;
