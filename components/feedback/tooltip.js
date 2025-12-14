/**
 * Lightview Components - Tooltip
 * A floating tooltip component
 */

import { loadStylesheetSync } from '../utils/styles.js';

// Load styles from external CSS file
loadStylesheetSync(import.meta.url);

/**
 * Tooltip Component
 * @param {Object} props - Tooltip properties
 * @param {string} props.content - Tooltip text content
 * @param {string} props.position - 'top' | 'bottom' | 'left' | 'right' (default: 'top')
 * @param {string} props.variant - 'dark' | 'light' (default: 'dark')
 * @param {number} props.delay - Show delay in ms (default: 0)
 * @param {boolean} props.multiline - Allow multiline content
 * @param {boolean} props.disabled - Disable tooltip
 * @param {...children} children - Element to wrap
 */
const Tooltip = (props = {}, ...children) => {
    
    const { tags, signal } = window.Lightview || {};
    if (!tags) {
        console.error('Lightview not found');
        return null;
    }
    
    const { div, span } = tags;
    
    const {
        content,
        position = 'top',
        variant = 'dark',
        delay = 0,
        multiline = false,
        disabled = false,
        class: className = '',
        ...rest
    } = props;
    
    const visible = signal ? signal(false) : { value: false };
    let showTimeout = null;
    
    const show = () => {
        if (disabled) return;
        if (delay > 0) {
            showTimeout = setTimeout(() => {
                visible.value = true;
            }, delay);
        } else {
            visible.value = true;
        }
    };
    
    const hide = () => {
        if (showTimeout) {
            clearTimeout(showTimeout);
            showTimeout = null;
        }
        visible.value = false;
    };
    
    const tooltipClasses = () => {
        const classes = ['lv-tooltip', `lv-tooltip--${position}`];
        if (variant === 'light') classes.push('lv-tooltip--light');
        if (multiline) classes.push('lv-tooltip--multiline');
        if (visible.value) classes.push('lv-tooltip--visible');
        return classes.join(' ');
    };
    
    return div({
        class: `lv-tooltip-wrapper ${className}`.trim(),
        onmouseenter: show,
        onmouseleave: hide,
        onfocus: show,
        onblur: hide,
        ...rest
    },
        ...children,
        span({
            class: tooltipClasses,
            role: 'tooltip',
            'aria-hidden': () => !visible.value
        }, content)
    );
};

// Auto-register
if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Tooltip', Tooltip);
}

export default Tooltip;
