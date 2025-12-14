/**
 * Lightview Components - Avatar
 * A user avatar component with image, initials, or icon fallback
 */

import { loadStylesheetSync } from '../utils/styles.js';
import { getIcon } from '../utils/icons.js';

// Load styles from external CSS file
loadStylesheetSync(import.meta.url);

// User icon SVG for fallback
const userIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="60%" height="60%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;

/**
 * Get initials from a name
 */
const getInitials = (name, maxLength = 2) => {
    if (!name) return '';
    return name
        .split(' ')
        .map(word => word[0])
        .filter(Boolean)
        .slice(0, maxLength)
        .join('')
        .toUpperCase();
};

/**
 * Avatar Component
 * @param {Object} props - Avatar properties
 * @param {string} props.src - Image URL
 * @param {string} props.alt - Alt text
 * @param {string} props.name - User name (for initials fallback)
 * @param {string} props.size - 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' (default: 'md')
 * @param {string} props.shape - 'circle' | 'rounded' | 'square' (default: 'circle')
 * @param {string} props.color - 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info'
 * @param {string} props.status - 'online' | 'offline' | 'busy' | 'away'
 * @param {boolean} props.bordered - Show border
 */
const Avatar = (props = {}) => {
    
    const { tags, signal } = window.Lightview || {};
    if (!tags) {
        console.error('Lightview not found');
        return null;
    }
    
    const { div, img, span } = tags;
    
    const {
        src,
        alt = '',
        name,
        size = 'md',
        shape = 'circle',
        color,
        status,
        bordered = false,
        class: className = '',
        ...rest
    } = props;
    
    const imageError = signal ? signal(false) : { value: false };
    
    const classes = ['lv-avatar', `lv-avatar--${size}`, `lv-avatar--${shape}`];
    if (color) classes.push(`lv-avatar--${color}`);
    if (bordered) classes.push('lv-avatar--bordered');
    if (className) classes.push(className);
    
    const renderContent = () => {
        // If we have a valid src and no error, show image
        if (src && !imageError.value) {
            return img({
                class: 'lv-avatar__image',
                src,
                alt: alt || name || 'Avatar',
                onerror: () => { imageError.value = true; }
            });
        }
        
        // If we have a name, show initials
        if (name) {
            return span({}, getInitials(name));
        }
        
        // Default to user icon
        return span({
            class: 'lv-avatar__icon',
            innerHTML: userIcon
        });
    };
    
    return div({
        class: classes.join(' '),
        ...rest
    },
        renderContent(),
        status ? span({ class: `lv-avatar__status lv-avatar__status--${status}` }) : null
    );
};

/**
 * Avatar Group - displays multiple avatars
 * @param {Object} props
 * @param {number} props.max - Maximum avatars to show before overflow
 * @param {string} props.size - Size for all avatars
 * @param {string} props.spacing - 'sm' | 'md' | 'lg' (default: 'md')
 */
Avatar.Group = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;
    
    const { div, span } = tags;
    
    const {
        max,
        size = 'md',
        spacing = 'md',
        class: className = '',
        ...rest
    } = props;
    
    const classes = ['lv-avatar-group'];
    if (spacing !== 'md') classes.push(`lv-avatar-group--${spacing}`);
    if (className) classes.push(className);
    
    // If max is set and we have more children, show overflow
    const visibleChildren = max && children.length > max 
        ? children.slice(0, max)
        : children;
    
    const overflowCount = max && children.length > max
        ? children.length - max
        : 0;
    
    return div({
        class: classes.join(' '),
        ...rest
    },
        overflowCount > 0 ? div({
            class: `lv-avatar lv-avatar--${size} lv-avatar--circle lv-avatar-group__overflow`
        }, `+${overflowCount}`) : null,
        ...visibleChildren.reverse()
    );
};

// Auto-register
if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Avatar', Avatar);
}

export default Avatar;
