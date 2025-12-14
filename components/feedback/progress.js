/**
 * Lightview Components - Progress
 * A progress bar component
 */

import { loadStylesheetSync } from '../utils/styles.js';

// Load styles from external CSS file
loadStylesheetSync(import.meta.url);

/**
 * Progress Component
 * @param {Object} props - Progress properties
 * @param {number|Signal} props.value - Current value (0-100)
 * @param {number} props.max - Maximum value (default: 100)
 * @param {string} props.color - 'primary' | 'secondary' | 'neutral' | 'success' | 'warning' | 'danger' | 'info'
 * @param {string} props.size - 'sm' | 'md' | 'lg' (default: 'md')
 * @param {string} props.label - Label text
 * @param {boolean} props.showValue - Show percentage value
 * @param {boolean} props.valueInside - Show value inside the bar
 * @param {boolean} props.striped - Use striped pattern
 * @param {boolean} props.animated - Animate the stripes
 * @param {boolean} props.gradient - Use gradient color
 * @param {boolean} props.indeterminate - Show indeterminate progress
 * @param {Function} props.formatValue - Custom value formatter (value, max) => string
 */
const Progress = (props = {}) => {
    
    const { tags } = window.Lightview || {};
    if (!tags) {
        console.error('Lightview not found');
        return null;
    }
    
    const { div, span } = tags;
    
    const {
        value = 0,
        max = 100,
        color = 'primary',
        size = 'md',
        label,
        showValue = false,
        valueInside = false,
        striped = false,
        animated = false,
        gradient = false,
        indeterminate = false,
        formatValue,
        class: className = '',
        ...rest
    } = props;
    
    const getValue = () => {
        if (typeof value === 'function') return value();
        if (value && typeof value.value !== 'undefined') return value.value;
        return value;
    };
    
    const getPercentage = () => Math.min(100, Math.max(0, (getValue() / max) * 100));
    
    const getFormattedValue = () => {
        if (formatValue) return formatValue(getValue(), max);
        return `${Math.round(getPercentage())}%`;
    };
    
    const classes = [
        'lv-progress',
        `lv-progress--${color}`,
        `lv-progress--${size}`
    ];
    
    if (striped) classes.push('lv-progress--striped');
    if (animated) classes.push('lv-progress--animated');
    if (gradient) classes.push('lv-progress--gradient');
    if (indeterminate) classes.push('lv-progress--indeterminate');
    if (valueInside) classes.push('lv-progress--value-inside');
    if (className) classes.push(className);
    
    const hasHeader = label || (showValue && !valueInside);
    
    return div({
        class: classes.join(' '),
        role: 'progressbar',
        'aria-valuenow': () => indeterminate ? undefined : getValue(),
        'aria-valuemin': 0,
        'aria-valuemax': max,
        'aria-label': label || 'Progress',
        ...rest
    },
        hasHeader ? div({ class: 'lv-progress__header' },
            label ? span({ class: 'lv-progress__label' }, label) : null,
            showValue && !valueInside ? span({ class: 'lv-progress__value' }, getFormattedValue) : null
        ) : null,
        div({ class: 'lv-progress__track' },
            div({
                class: 'lv-progress__bar',
                style: () => indeterminate ? '' : `width: ${getPercentage()}%`
            },
                valueInside ? span({ class: 'lv-progress__bar-value' }, getFormattedValue) : null
            )
        )
    );
};

// Auto-register
if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Progress', Progress);
}

export default Progress;
