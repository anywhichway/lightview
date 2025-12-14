/**
 * Lightview Components - Badge
 * A small label component for status, counts, or labels
 */

import { loadStylesheetSync } from '../utils/styles.js';

// Load styles from external CSS file
loadStylesheetSync(import.meta.url);

/**
 * Badge Component
 * @param {Object} props - Badge properties
 * @param {string} props.color - 'primary' | 'secondary' | 'neutral' | 'success' | 'warning' | 'danger' | 'info'
 * @param {string} props.variant - 'solid' | 'light' | 'outline' (default: 'solid')
 * @param {string} props.size - 'sm' | 'md' | 'lg' (default: 'md')
 * @param {boolean} props.dot - Show as dot indicator (no content)
 * @param {boolean} props.pill - Use pill shape instead of round
 * @param {...children} children - Badge content
 */
const Badge = (props = {}, ...children) => {
    
    const { tags } = window.Lightview || {};
    if (!tags) {
        console.error('Lightview not found');
        return null;
    }
    
    const { span } = tags;
    
    const {
        color = 'neutral',
        variant = 'solid',
        size = 'md',
        dot = false,
        pill = false,
        class: className = '',
        ...rest
    } = props;
    
    const classes = [
        'lv-badge',
        `lv-badge--${variant}`,
        `lv-badge--${color}`,
        `lv-badge--${size}`
    ];
    
    if (dot) classes.push('lv-badge--dot');
    if (pill) classes.push('lv-badge--pill');
    if (className) classes.push(className);
    
    return span({
        class: classes.join(' '),
        ...rest
    }, ...(!dot ? children : []));
};

// Auto-register
if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Badge', Badge);
}

export default Badge;
