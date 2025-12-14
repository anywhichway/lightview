/**
 * Lightview Components - Spinner
 * A loading indicator component
 */

import { loadStylesheetSync } from '../utils/styles.js';

// Load styles from external CSS file
loadStylesheetSync(import.meta.url);

/**
 * Spinner Component
 * @param {Object} props - Spinner properties
 * @param {string} props.size - 'sm' | 'md' | 'lg' | 'xl' (default: 'md')
 * @param {string} props.color - 'primary' | 'secondary' | 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'white'
 * @param {string} props.label - Loading text
 * @param {boolean} props.vertical - Stack label vertically
 * @param {number} props.thickness - Stroke thickness (default: 3)
 */
const Spinner = (props = {}) => {
    
    const { tags } = window.Lightview || {};
    if (!tags) {
        console.error('Lightview not found');
        return null;
    }
    
    const { div, span } = tags;
    
    const {
        size = 'md',
        color = 'primary',
        label,
        vertical = false,
        thickness = 3,
        class: className = '',
        ...rest
    } = props;
    
    const sizeMap = { sm: 16, md: 24, lg: 32, xl: 48 };
    const svgSize = sizeMap[size] || 24;
    const radius = (svgSize - thickness) / 2;
    const circumference = 2 * Math.PI * radius;
    
    const spinner = div({
        class: `lv-spinner lv-spinner--${size} lv-spinner--${color} ${className}`.trim(),
        role: 'status',
        'aria-label': label || 'Loading',
        innerHTML: `
            <svg width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}">
                <circle
                    class="lv-spinner__circle"
                    cx="${svgSize / 2}"
                    cy="${svgSize / 2}"
                    r="${radius}"
                    fill="none"
                    stroke-width="${thickness}"
                    stroke-linecap="round"
                    stroke-dasharray="${circumference}"
                    stroke-dashoffset="${circumference * 0.75}"
                />
            </svg>
        `,
        ...rest
    });
    
    if (label) {
        return div({
            class: `lv-spinner-container ${vertical ? 'lv-spinner-container--vertical' : ''}`
        },
            spinner,
            span({ class: 'lv-spinner__label' }, label)
        );
    }
    
    return spinner;
};

/**
 * Spinner Overlay - covers parent element
 * @param {Object} props - Same as Spinner plus overlay-specific
 * @param {boolean|Signal} props.visible - Show/hide overlay
 */
Spinner.Overlay = (props = {}) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;
    
    const { div } = tags;
    
    const {
        visible = true,
        ...spinnerProps
    } = props;
    
    const getVisible = () => {
        if (typeof visible === 'function') return visible();
        if (visible && typeof visible.value !== 'undefined') return visible.value;
        return visible;
    };
    
    return () => getVisible() ? div({ class: 'lv-spinner-overlay' }, Spinner(spinnerProps)) : null;
};

// Auto-register
if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Spinner', Spinner);
}

export default Spinner;
