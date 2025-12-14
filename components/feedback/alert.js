/**
 * Lightview Components - Alert
 * A component for displaying messages and notifications
 */

import { loadStylesheetSync } from '../utils/styles.js';
import { getIcon } from '../utils/icons.js';

// Load styles from external CSS file
loadStylesheetSync(import.meta.url);

const typeIcons = {
    info: 'info',
    success: 'success',
    warning: 'warning',
    danger: 'error',
    neutral: 'info'
};

/**
 * Alert Component
 * @param {Object} props - Alert properties
 * @param {string} props.type - 'info' | 'success' | 'warning' | 'danger' | 'neutral' (default: 'info')
 * @param {string} props.variant - 'filled' | 'light' | 'outlined' (default: 'light')
 * @param {string} props.title - Alert title
 * @param {boolean} props.showIcon - Show type icon (default: true)
 * @param {string} props.icon - Custom icon name
 * @param {boolean} props.dismissible - Show close button
 * @param {Function} props.onDismiss - Dismiss handler
 * @param {...children} children - Alert message content
 */
const Alert = (props = {}, ...children) => {
    
    const { tags, signal } = window.Lightview || {};
    if (!tags) {
        console.error('Lightview not found');
        return null;
    }
    
    const { div, button, span } = tags;
    
    const {
        type = 'info',
        variant = 'light',
        title,
        showIcon = true,
        icon,
        dismissible = false,
        onDismiss,
        class: className = '',
        ...rest
    } = props;
    
    // For dismissible alerts, track visibility
    const visible = signal ? signal(true) : { value: true };
    
    const handleDismiss = () => {
        visible.value = false;
        if (onDismiss) onDismiss();
    };
    
    const alertContent = [];
    
    // Icon
    if (showIcon) {
        const iconName = icon || typeIcons[type];
        alertContent.push(
            span({
                class: 'lv-alert__icon',
                innerHTML: getIcon(iconName, { size: 20 })
            })
        );
    }
    
    // Content
    const contentChildren = [];
    if (title) {
        contentChildren.push(div({ class: 'lv-alert__title' }, title));
    }
    if (children.length > 0) {
        contentChildren.push(div({ class: 'lv-alert__message' }, ...children));
    }
    alertContent.push(div({ class: 'lv-alert__content' }, ...contentChildren));
    
    // Close button
    if (dismissible) {
        alertContent.push(
            button({
                class: 'lv-alert__close',
                onclick: handleDismiss,
                'aria-label': 'Dismiss alert',
                innerHTML: getIcon('close', { size: 16 })
            })
        );
    }
    
    const classes = [
        'lv-alert',
        `lv-alert--${variant}`,
        `lv-alert--${type}`
    ];
    if (className) classes.push(className);
    
    // If dismissible, wrap in a conditional
    if (dismissible && signal) {
        return () => visible.value ? div({
            class: classes.join(' '),
            role: 'alert',
            ...rest
        }, ...alertContent) : null;
    }
    
    return div({
        class: classes.join(' '),
        role: 'alert',
        ...rest
    }, ...alertContent);
};

/**
 * Alert Actions Component
 * @param {Object} props
 * @param {...children} children - Action buttons
 */
Alert.Actions = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;
    
    const { div } = tags;
    const { class: className = '', ...rest } = props;
    
    return div({
        class: `lv-alert__actions ${className}`.trim(),
        ...rest
    }, ...children);
};

// Auto-register
if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Alert', Alert);
}

export default Alert;
