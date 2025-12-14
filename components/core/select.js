/**
 * Lightview Components - Select
 * A dropdown select component with search and multi-select support
 */

import { loadStylesheetSync } from '../utils/styles.js';
import { getIcon } from '../utils/icons.js';

// Load styles from external CSS file
loadStylesheetSync(import.meta.url);

/**
 * Select Component
 * @param {Object} props - Select properties
 * @param {Array} props.options - Array of options: [{ value, label, disabled, group }] or simple strings
 * @param {*|Signal} props.value - Selected value (controlled)
 * @param {*} props.defaultValue - Default value (uncontrolled)
 * @param {string} props.placeholder - Placeholder text
 * @param {string} props.label - Label text
 * @param {string} props.helper - Helper text
 * @param {string} props.error - Error message
 * @param {string} props.size - 'sm' | 'md' | 'lg' (default: 'md')
 * @param {boolean} props.disabled - Disable select
 * @param {boolean} props.required - Mark as required
 * @param {boolean} props.searchable - Enable search/filter
 * @param {boolean} props.multiple - Allow multiple selection
 * @param {boolean} props.clearable - Show clear button
 * @param {Function} props.onChange - Value change handler
 */
const Select = (props = {}) => {
    
    const { tags, signal } = window.Lightview || {};
    if (!tags) {
        console.error('Lightview not found');
        return null;
    }
    
    const { div, button, span, input, label: labelTag } = tags;
    
    const {
        options = [],
        value,
        defaultValue,
        placeholder = 'Select...',
        label,
        helper,
        error,
        size = 'md',
        disabled = false,
        required = false,
        searchable = false,
        multiple = false,
        clearable = false,
        onChange,
        class: className = '',
        ...rest
    } = props;
    
    // Normalize options
    const normalizedOptions = options.map(opt => 
        typeof opt === 'string' ? { value: opt, label: opt } : opt
    );
    
    // State
    const isOpen = signal ? signal(false) : { value: false };
    const searchQuery = signal ? signal('') : { value: '' };
    const internalValue = signal 
        ? signal(defaultValue !== undefined ? defaultValue : (multiple ? [] : null))
        : { value: defaultValue !== undefined ? defaultValue : (multiple ? [] : null) };
    
    const isControlled = value !== undefined;
    
    const getValue = () => {
        if (isControlled) {
            return typeof value === 'function' ? value() :
                   (value && typeof value.value !== 'undefined') ? value.value : value;
        }
        return internalValue.value;
    };
    
    const setValue = (newValue) => {
        if (!isControlled) {
            internalValue.value = newValue;
        }
        
        if (isControlled && value && typeof value.value !== 'undefined') {
            value.value = newValue;
        }
        
        if (onChange) {
            onChange(newValue);
        }
    };
    
    const toggleOpen = () => {
        if (!disabled) {
            isOpen.value = !isOpen.value;
            if (!isOpen.value) {
                searchQuery.value = '';
            }
        }
    };
    
    const closeDropdown = () => {
        isOpen.value = false;
        searchQuery.value = '';
    };
    
    const selectOption = (optValue) => {
        if (multiple) {
            const current = getValue() || [];
            const newValue = current.includes(optValue)
                ? current.filter(v => v !== optValue)
                : [...current, optValue];
            setValue(newValue);
        } else {
            setValue(optValue);
            closeDropdown();
        }
    };
    
    const removeChip = (e, optValue) => {
        e.stopPropagation();
        const current = getValue() || [];
        setValue(current.filter(v => v !== optValue));
    };
    
    const getSelectedLabel = () => {
        const currentValue = getValue();
        
        if (multiple) {
            return currentValue?.length > 0 ? currentValue : null;
        }
        
        const opt = normalizedOptions.find(o => o.value === currentValue);
        return opt ? opt.label : null;
    };
    
    const filteredOptions = () => {
        const query = searchQuery.value.toLowerCase();
        if (!query) return normalizedOptions;
        return normalizedOptions.filter(opt => 
            opt.label.toLowerCase().includes(query)
        );
    };
    
    const isSelected = (optValue) => {
        const currentValue = getValue();
        if (multiple) {
            return (currentValue || []).includes(optValue);
        }
        return currentValue === optValue;
    };
    
    // Click outside handler
    const handleClickOutside = (e) => {
        if (!e.target.closest('.lv-select')) {
            closeDropdown();
        }
    };
    
    const classes = () => {
        const c = ['lv-select', `lv-select--${size}`];
        if (error) c.push('lv-select--error');
        if (isOpen.value) c.push('lv-select--open');
        if (className) c.push(className);
        return c.join(' ');
    };
    
    // Build value display
    const renderValue = () => {
        const selected = getSelectedLabel();
        
        if (multiple && selected) {
            return div({ class: 'lv-select__chips' },
                ...selected.map(val => {
                    const opt = normalizedOptions.find(o => o.value === val);
                    return span({ class: 'lv-select__chip' },
                        opt?.label || val,
                        button({
                            class: 'lv-select__chip-remove',
                            onclick: (e) => removeChip(e, val),
                            innerHTML: getIcon('close', { size: 12 })
                        })
                    );
                })
            );
        }
        
        if (selected) {
            return span({ class: 'lv-select__value' }, selected);
        }
        
        return span({ class: 'lv-select__placeholder' }, placeholder);
    };
    
    // Build options
    const renderOptions = () => {
        const filtered = filteredOptions();
        
        if (filtered.length === 0) {
            return div({ class: 'lv-select__empty' }, 'No options found');
        }
        
        return filtered.map(opt => 
            button({
                class: () => `lv-select__option ${isSelected(opt.value) ? 'lv-select__option--selected' : ''} ${opt.disabled ? 'lv-select__option--disabled' : ''}`,
                disabled: opt.disabled,
                onclick: () => !opt.disabled && selectOption(opt.value)
            },
                span({
                    class: 'lv-select__option-check',
                    innerHTML: getIcon('check', { size: 16 })
                }),
                opt.label
            )
        );
    };
    
    return div({
        class: classes,
        onclick: (e) => {
            // Register click outside handler
            if (isOpen.value) {
                setTimeout(() => document.addEventListener('click', handleClickOutside, { once: true }), 0);
            }
        },
        ...rest
    },
        label ? labelTag({ class: 'lv-select__label' },
            label,
            required ? span({ class: 'lv-select__required' }, '*') : null
        ) : null,
        
        button({
            class: 'lv-select__trigger',
            type: 'button',
            disabled,
            'aria-haspopup': 'listbox',
            'aria-expanded': () => isOpen.value,
            onclick: toggleOpen
        },
            renderValue,
            span({
                class: 'lv-select__chevron',
                innerHTML: getIcon('chevronDown', { size: 16 })
            })
        ),
        
        div({ class: 'lv-select__dropdown' },
            searchable ? div({ class: 'lv-select__search' },
                input({
                    class: 'lv-select__search-input',
                    type: 'text',
                    placeholder: 'Search...',
                    value: () => searchQuery.value,
                    oninput: (e) => { searchQuery.value = e.target.value; },
                    onclick: (e) => e.stopPropagation()
                })
            ) : null,
            div({
                class: 'lv-select__options',
                role: 'listbox'
            }, renderOptions)
        ),
        
        (helper || error) ? span({ class: 'lv-select__helper' }, error || helper) : null
    );
};

// Auto-register
if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Select', Select);
}

export default Select;
