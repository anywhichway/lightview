/**
 * Lightview Components - Card
 * A container component for grouping content
 */

import { loadStylesheetSync } from '../utils/styles.js';

// Load styles from external CSS file
loadStylesheetSync(import.meta.url);

/**
 * Card Component
 * @param {Object} props - Card properties
 * @param {string} props.variant - 'elevated' | 'outlined' | 'filled' (default: 'elevated')
 * @param {string} props.padding - 'none' | 'sm' | 'md' | 'lg' (default: 'none' - children control padding)
 * @param {boolean} props.hoverable - Add hover effect
 * @param {boolean} props.full - Full width
 * @param {...children} children - Card content
 */
const Card = (props = {}, ...children) => {
    
    const { tags } = window.Lightview || {};
    if (!tags) {
        console.error('Lightview not found');
        return null;
    }
    
    const { div } = tags;
    
    const {
        variant = 'elevated',
        padding = 'none',
        hoverable = false,
        full = false,
        class: className = '',
        ...rest
    } = props;
    
    const classes = [
        'lv-card',
        `lv-card--${variant}`,
        `lv-card--padding-${padding}`
    ];
    
    if (hoverable) classes.push('lv-card--hoverable');
    if (full) classes.push('lv-card--full');
    if (className) classes.push(className);
    
    return div({
        class: classes.join(' '),
        ...rest
    }, ...children);
};

/**
 * Card Header Component
 * @param {Object} props
 * @param {string} props.title - Header title
 * @param {string} props.subtitle - Header subtitle
 * @param {...children} children - Actions/content for header
 */
Card.Header = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;
    
    const { div, h3, p } = tags;
    
    const {
        title,
        subtitle,
        class: className = '',
        ...rest
    } = props;
    
    const headerContent = [];
    
    if (title || subtitle) {
        const titleContent = [];
        if (title) titleContent.push(h3({ class: 'lv-card__title' }, title));
        if (subtitle) titleContent.push(p({ class: 'lv-card__subtitle' }, subtitle));
        headerContent.push(div({ class: 'lv-card__header-content' }, ...titleContent));
    }
    
    if (children.length > 0) {
        headerContent.push(div({ class: 'lv-card__header-actions' }, ...children));
    }
    
    return div({
        class: `lv-card__header ${className}`.trim(),
        ...rest
    }, ...headerContent);
};

/**
 * Card Body Component
 * @param {Object} props
 * @param {...children} children - Body content
 */
Card.Body = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;
    
    const { div } = tags;
    
    const { class: className = '', ...rest } = props;
    
    return div({
        class: `lv-card__body ${className}`.trim(),
        ...rest
    }, ...children);
};

/**
 * Card Footer Component
 * @param {Object} props
 * @param {string} props.align - 'left' | 'center' | 'right' | 'between' (default: 'right')
 * @param {...children} children - Footer content
 */
Card.Footer = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;
    
    const { div } = tags;
    
    const { 
        align = 'right',
        class: className = '', 
        ...rest 
    } = props;
    
    const alignClass = align !== 'right' ? `lv-card__footer--${align}` : '';
    
    return div({
        class: `lv-card__footer ${alignClass} ${className}`.trim(),
        ...rest
    }, ...children);
};

/**
 * Card Media Component (for images)
 * @param {Object} props
 * @param {string} props.src - Image source
 * @param {string} props.alt - Image alt text
 * @param {boolean} props.top - Position at top of card
 */
Card.Media = (props = {}) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;
    
    const { div, img } = tags;
    
    const {
        src,
        alt = '',
        top = true,
        class: className = '',
        ...rest
    } = props;
    
    const classes = ['lv-card__media'];
    if (top) classes.push('lv-card__media--top');
    if (className) classes.push(className);
    
    return div({
        class: classes.join(' ')
    }, img({ src, alt, ...rest }));
};

// Auto-register
if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Card', Card);
}

export default Card;
