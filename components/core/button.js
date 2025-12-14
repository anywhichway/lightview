/**
 * Lightview Components - Button
 * A versatile button component with variants, colors, and sizes
 */

import { loadStylesheetSync } from '../utils/styles.js';
import { getIcon } from '../utils/icons.js';

// Load styles from external CSS file
loadStylesheetSync(import.meta.url);
/**
 * Button Component
 * @param {Object} props - Button properties
 * @param {string} props.variant - 'solid' | 'outline' | 'ghost' (default: 'solid')
 * @param {string} props.color - 'primary' | 'secondary' | 'neutral' | 'success' | 'warning' | 'danger' | 'info' (default: 'primary')
 * @param {string} props.size - 'sm' | 'md' | 'lg' (default: 'md')
 * @param {boolean} props.disabled - Disable the button
 * @param {boolean} props.loading - Show loading state
 * @param {boolean} props.full - Full width button
 * @param {string} props.icon - Icon name (for icon-only button)
 * @param {string} props.iconLeft - Icon name for left side
 * @param {string} props.iconRight - Icon name for right side
 * @param {string} props.type - Button type: 'button' | 'submit' | 'reset' (default: 'button')
 * @param {...children} children - Button content
 */
const Button = (props = {}, ...children) => {
    
    const { tags, signal } = window.Lightview || {};
    if (!tags) {
        console.error('Lightview not found. Make sure lightview.js is loaded.');
        return null;
    }
    
    const { button, span } = tags;
    
    const {
        variant = 'solid',
        color = 'primary',
        size = 'md',
        disabled = false,
        loading = false,
        full = false,
        icon,
        iconLeft,
        iconRight,
        type = 'button',
        class: className = '',
        ...rest
    } = props;
    
    // Determine if icon-only
    const isIconOnly = icon && children.length === 0;
    
    // Build class list
    const getClassList = () => {
        const classes = ['lv-btn'];
        classes.push(`lv-btn--${variant}`);
        classes.push(`lv-btn--${color}`);
        classes.push(`lv-btn--${size}`);
        
        // Handle reactive disabled/loading
        const isDisabled = typeof disabled === 'function' ? disabled() : disabled;
        const isLoading = typeof loading === 'function' ? loading() : loading;
        
        if (isDisabled) classes.push('lv-btn--disabled');
        if (isLoading) classes.push('lv-btn--loading');
        if (full) classes.push('lv-btn--full');
        if (isIconOnly) classes.push('lv-btn--icon-only');
        if (className) classes.push(className);
        
        return classes.join(' ');
    };
    
    // Determine icon size based on button size
    const iconSize = size === 'sm' ? 16 : size === 'lg' ? 24 : 20;
    
    // Build children with icons
    const buildContent = () => {
        const content = [];
        
        if (iconLeft) {
            content.push(span({ 
                class: 'lv-icon', 
                innerHTML: getIcon(iconLeft, { size: iconSize }) 
            }));
        }
        
        if (icon && isIconOnly) {
            content.push(span({ 
                class: 'lv-icon', 
                innerHTML: getIcon(icon, { size: iconSize }) 
            }));
        } else {
            content.push(...children);
        }
        
        if (iconRight) {
            content.push(span({ 
                class: 'lv-icon', 
                innerHTML: getIcon(iconRight, { size: iconSize }) 
            }));
        }
        
        return content;
    };
    
    return button({
        type,
        class: typeof disabled === 'function' || typeof loading === 'function' 
            ? () => getClassList() 
            : getClassList(),
        disabled: typeof disabled === 'function' 
            ? () => disabled() || (typeof loading === 'function' ? loading() : loading)
            : disabled || loading,
        'aria-busy': typeof loading === 'function' ? loading : loading,
        'aria-disabled': typeof disabled === 'function' ? disabled : disabled,
        ...rest
    }, ...buildContent());
};

// Auto-register with LightviewX if available
if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Button', Button);
}

export default Button;
