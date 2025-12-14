/**
 * Lightview Components - Textarea
 * A multi-line text input component
 */

import { loadStylesheetSync } from '../utils/styles.js';

// Load styles from external CSS file
loadStylesheetSync(import.meta.url);

/**
 * Textarea Component
 * @param {Object} props - Textarea properties
 * @param {string|Signal} props.value - Current value (controlled)
 * @param {string} props.defaultValue - Default value (uncontrolled)
 * @param {string} props.placeholder - Placeholder text
 * @param {string} props.label - Label text
 * @param {string} props.helper - Helper text
 * @param {string} props.error - Error message
 * @param {string} props.size - 'sm' | 'md' | 'lg' (default: 'md')
 * @param {number} props.rows - Number of visible rows
 * @param {number} props.minRows - Minimum rows for auto-grow
 * @param {number} props.maxRows - Maximum rows for auto-grow
 * @param {number} props.maxLength - Maximum character length
 * @param {boolean} props.showCount - Show character count
 * @param {string} props.resize - 'none' | 'vertical' | 'horizontal' | 'both' (default: 'vertical')
 * @param {boolean} props.autoGrow - Auto-grow height with content
 * @param {boolean} props.disabled - Disable textarea
 * @param {boolean} props.readOnly - Make read-only
 * @param {boolean} props.required - Mark as required
 * @param {Function} props.onChange - Value change handler
 * @param {Function} props.validate - Custom validation function
 */
const Textarea = (props = {}) => {
    
    const { tags, signal, effect } = window.Lightview || {};
    if (!tags) {
        console.error('Lightview not found');
        return null;
    }
    
    const { div, label: labelTag, textarea, span } = tags;
    
    const {
        value,
        defaultValue = '',
        placeholder,
        label,
        helper,
        error: errorProp,
        size = 'md',
        rows = 3,
        minRows,
        maxRows,
        maxLength,
        showCount = false,
        resize = 'vertical',
        autoGrow = false,
        disabled = false,
        readOnly = false,
        required = false,
        onChange,
        validate,
        class: className = '',
        ...rest
    } = props;
    
    // State
    const internalValue = signal ? signal(defaultValue) : { value: defaultValue };
    const internalError = signal ? signal('') : { value: '' };
    
    const isControlled = value !== undefined;
    
    const getValue = () => {
        if (isControlled) {
            return typeof value === 'function' ? value() :
                   (value && typeof value.value !== 'undefined') ? value.value : value;
        }
        return internalValue.value;
    };
    
    const getError = () => errorProp || internalError.value;
    
    const handleInput = (e) => {
        const newValue = e.target.value;
        
        if (!isControlled) {
            internalValue.value = newValue;
        }
        
        if (isControlled && value && typeof value.value !== 'undefined') {
            value.value = newValue;
        }
        
        if (onChange) {
            onChange(newValue, e);
        }
        
        // Auto-grow
        if (autoGrow) {
            adjustHeight(e.target);
        }
    };
    
    const handleBlur = (e) => {
        // Validation
        if (validate) {
            const validationError = validate(getValue());
            internalError.value = validationError || '';
        } else if (required && !getValue()) {
            internalError.value = 'This field is required';
        } else {
            internalError.value = '';
        }
    };
    
    const adjustHeight = (target) => {
        target.style.height = 'auto';
        let newHeight = target.scrollHeight;
        
        // Calculate line height
        const lineHeight = parseInt(getComputedStyle(target).lineHeight) || 24;
        const padding = parseInt(getComputedStyle(target).paddingTop) + 
                       parseInt(getComputedStyle(target).paddingBottom);
        
        if (minRows) {
            const minHeight = (lineHeight * minRows) + padding;
            newHeight = Math.max(newHeight, minHeight);
        }
        
        if (maxRows) {
            const maxHeight = (lineHeight * maxRows) + padding;
            newHeight = Math.min(newHeight, maxHeight);
        }
        
        target.style.height = `${newHeight}px`;
    };
    
    const getCharCount = () => {
        const val = getValue() || '';
        return val.length;
    };
    
    const getCounterClass = () => {
        if (!maxLength) return 'lv-textarea__counter';
        const count = getCharCount();
        if (count > maxLength) return 'lv-textarea__counter lv-textarea__counter--over';
        if (count > maxLength * 0.9) return 'lv-textarea__counter lv-textarea__counter--limit';
        return 'lv-textarea__counter';
    };
    
    const classes = () => {
        const c = ['lv-textarea', `lv-textarea--${size}`];
        if (getError()) c.push('lv-textarea--error');
        if (resize !== 'vertical') c.push(`lv-textarea--resize-${resize}`);
        if (autoGrow) c.push('lv-textarea--auto-grow');
        if (className) c.push(className);
        return c.join(' ');
    };
    
    const hasFooter = helper || errorProp || showCount || maxLength;
    
    return div({
        class: classes,
        ...rest
    },
        label ? labelTag({ class: 'lv-textarea__label' },
            label,
            required ? span({ class: 'lv-textarea__required' }, '*') : null
        ) : null,
        
        textarea({
            class: 'lv-textarea__input',
            placeholder,
            rows,
            maxlength: maxLength,
            disabled,
            readonly: readOnly,
            required,
            'aria-invalid': () => !!getError(),
            'aria-describedby': hasFooter ? 'textarea-helper' : undefined,
            value: getValue,
            oninput: handleInput,
            onblur: handleBlur
        }),
        
        hasFooter ? div({ class: 'lv-textarea__footer', id: 'textarea-helper' },
            span({ class: 'lv-textarea__helper' }, () => getError() || helper || ''),
            (showCount || maxLength) ? span({
                class: getCounterClass
            }, () => maxLength ? `${getCharCount()}/${maxLength}` : getCharCount()) : null
        ) : null
    );
};

// Auto-register
if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Textarea', Textarea);
}

export default Textarea;
