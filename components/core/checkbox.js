/**
 * Lightview Components - Checkbox
 * A checkbox component with validation support
 */

import { loadStylesheetSync } from '../utils/styles.js';
import { getIcon } from '../utils/icons.js';

// Load styles from external CSS file
loadStylesheetSync(import.meta.url);

/**
 * Checkbox Component
 * @param {Object} props - Checkbox properties
 * @param {boolean|Signal} props.checked - Controlled checked state
 * @param {boolean} props.defaultChecked - Initial checked state (uncontrolled)
 * @param {boolean} props.indeterminate - Indeterminate state
 * @param {string} props.color - 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info'
 * @param {string} props.size - 'sm' | 'md' | 'lg' (default: 'md')
 * @param {boolean} props.disabled - Disable checkbox
 * @param {boolean} props.required - Required field
 * @param {string} props.label - Label text
 * @param {string} props.description - Description text
 * @param {string} props.error - Error message
 * @param {Function} props.validate - Validation function
 * @param {Function} props.onChange - Change handler
 */
const Checkbox = (props = {}) => {
    const { tags, signal } = window.Lightview || {};
    if (!tags) {
        console.error('Lightview not found');
        return null;
    }
    
    const { label: labelTag, input, span, div } = tags;
    
    const {
        checked,
        defaultChecked = false,
        indeterminate = false,
        color = 'primary',
        size = 'md',
        disabled = false,
        required = false,
        label,
        description,
        error,
        validate,
        onChange,
        name,
        id,
        value,
        class: className = '',
        ...rest
    } = props;
    
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
        if (error) return typeof error === 'function' ? error() : error;
        return internalError.value;
    };
    
    const handleChange = (e) => {
        const newValue = e.target.checked;
        
        if (!isControlled) {
            internalChecked.value = newValue;
        }
        
        if (isControlled && checked && typeof checked.value !== 'undefined') {
            checked.value = newValue;
        }
        
        // Validation
        if (validate) {
            internalError.value = validate(newValue);
        } else if (required && !newValue) {
            internalError.value = 'This field is required';
        } else {
            internalError.value = null;
        }
        
        if (onChange) onChange(newValue, e);
    };
    
    const iconSize = size === 'sm' ? 12 : size === 'lg' ? 18 : 14;
    
    const getClassList = () => {
        const classes = ['lv-checkbox'];
        classes.push(`lv-checkbox--${size}`);
        classes.push(`lv-checkbox--${color}`);
        
        const isDisabled = typeof disabled === 'function' ? disabled() : disabled;
        if (isDisabled) classes.push('lv-checkbox--disabled');
        
        if (getError()) classes.push('lv-checkbox--error');
        if (className) classes.push(className);
        
        return classes.join(' ');
    };
    
    const checkboxInput = input({
        type: 'checkbox',
        class: 'lv-checkbox__input',
        checked: isControlled 
            ? (typeof checked === 'function' ? checked : () => getChecked())
            : () => internalChecked.value,
        disabled: typeof disabled === 'function' ? disabled : disabled,
        required,
        name,
        id,
        value,
        onchange: handleChange,
        'aria-invalid': () => !!getError(),
        onmount: (el) => {
            // Handle indeterminate state (can only be set via JS)
            if (indeterminate) {
                el._interval = null; // placeholder
                el.indeterminate = typeof indeterminate === 'function' ? indeterminate() : indeterminate;
            }
        },
        ...rest
    });
    
    // Check or minus icon based on indeterminate
    const iconName = indeterminate ? 'minus' : 'check';
    
    const box = span({ class: 'lv-checkbox__box' },
        span({ 
            class: 'lv-icon',
            innerHTML: getIcon(iconName, { size: iconSize })
        })
    );
    
    const content = [];
    
    if (label || description) {
        const labelContent = [];
        if (label) {
            labelContent.push(span({ class: 'lv-checkbox__label' }, 
                label,
                required ? span({ style: 'color: var(--lv-color-danger)' }, ' *') : ''
            ));
        }
        if (description) {
            labelContent.push(span({ class: 'lv-checkbox__description' }, description));
        }
        content.push(div({ class: 'lv-checkbox__content' }, ...labelContent));
    }
    
    const result = [
        labelTag({
            class: validate || error 
                ? () => getClassList()
                : getClassList()
        }, checkboxInput, box, ...content)
    ];
    
    // Error message
    if (validate || error) {
        result.push(
            () => {
                const err = getError();
                return err ? span({ class: 'lv-checkbox__error', role: 'alert' }, err) : span();
            }
        );
    }
    
    return result.length === 1 ? result[0] : div({}, ...result);
};

// Auto-register
if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Checkbox', Checkbox);
}

export default Checkbox;
