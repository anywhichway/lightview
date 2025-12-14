/**
 * Lightview Text Input Component (DaisyUI)
 * @see https://daisyui.com/components/input/
 */

import '../daisyui.js';

/**
 * TextInput Component
 * @param {Object} props
 * @param {string} props.type - 'text' | 'password' | 'email' | 'number' | 'tel' | 'url' | 'search'
 * @param {string} props.color - 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'info' | 'error' | 'ghost'
 * @param {string} props.size - 'xs' | 'sm' | 'md' | 'lg'
 * @param {boolean} props.bordered - Add border
 * @param {string|function} props.value - Input value
 * @param {string} props.placeholder - Placeholder text
 */
const TextInput = (props = {}) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { input } = tags;

    const {
        type = 'text',
        color,
        size,
        bordered = false,
        value,
        placeholder,
        onChange,
        onInput,
        class: className = '',
        ...rest
    } = props;

    const classes = ['input'];
    if (color) classes.push(`input-${color}`);
    if (size) classes.push(`input-${size}`);
    if (bordered) classes.push('input-bordered');
    if (className) classes.push(className);

    return input({
        type,
        class: classes.join(' '),
        value: typeof value === 'function' ? value : value,
        placeholder,
        onchange: onChange ? (e) => onChange(e.target.value, e) : undefined,
        oninput: onInput ? (e) => onInput(e.target.value, e) : undefined,
        ...rest
    });
};

if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('TextInput', TextInput);
}

export default TextInput;
