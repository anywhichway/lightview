/**
 * Lightview Components - Drawer
 * A slide-out panel component
 */

import { loadStylesheetSync } from '../utils/styles.js';
import { getIcon } from '../utils/icons.js';

// Load styles from external CSS file
loadStylesheetSync(import.meta.url);

/**
 * Drawer Component
 * @param {Object} props - Drawer properties
 * @param {boolean|Signal} props.open - Whether drawer is open
 * @param {string} props.position - 'left' | 'right' | 'top' | 'bottom' (default: 'right')
 * @param {string} props.size - 'sm' | 'md' | 'lg' | 'xl' (default: 'md')
 * @param {string} props.title - Drawer title
 * @param {boolean} props.showClose - Show close button (default: true)
 * @param {boolean} props.overlay - Show backdrop overlay (default: true)
 * @param {boolean} props.closeOnBackdrop - Close when clicking backdrop (default: true)
 * @param {boolean} props.closeOnEscape - Close on Escape key (default: true)
 * @param {Function} props.onClose - Close handler
 * @param {...children} children - Drawer content
 */
const Drawer = (props = {}, ...children) => {
    
    const { tags, signal, effect } = window.Lightview || {};
    if (!tags) {
        console.error('Lightview not found');
        return null;
    }
    
    const { div, button, h2, span } = tags;
    
    const {
        open,
        position = 'right',
        size = 'md',
        title,
        showClose = true,
        overlay = true,
        closeOnBackdrop = true,
        closeOnEscape = true,
        onClose,
        class: className = '',
        ...rest
    } = props;
    
    const getOpen = () => {
        if (typeof open === 'function') return open();
        if (open && typeof open.value !== 'undefined') return open.value;
        return !!open;
    };
    
    const handleClose = () => {
        if (onClose) onClose();
        if (open && typeof open.value !== 'undefined') {
            open.value = false;
        }
    };
    
    const handleBackdropClick = (e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) {
            handleClose();
        }
    };
    
    const handleKeyDown = (e) => {
        if (closeOnEscape && e.key === 'Escape') {
            handleClose();
        }
    };
    
    // Build drawer content
    const drawerContent = [];
    
    // Header
    if (title || showClose) {
        const headerContent = [];
        
        if (title) {
            headerContent.push(h2({ class: 'lv-drawer__title' }, title));
        } else {
            headerContent.push(span());
        }
        
        if (showClose) {
            headerContent.push(
                button({
                    class: 'lv-drawer__close',
                    onclick: handleClose,
                    'aria-label': 'Close drawer',
                    innerHTML: getIcon('close', { size: 20 })
                })
            );
        }
        
        drawerContent.push(div({ class: 'lv-drawer__header' }, ...headerContent));
    }
    
    // Body
    drawerContent.push(div({ class: 'lv-drawer__body' }, ...children));
    
    const backdropClasses = () => {
        const classes = ['lv-drawer-backdrop'];
        if (getOpen()) {
            classes.push('lv-drawer-backdrop--visible');
        } else {
            classes.push('lv-drawer-backdrop--hidden');
        }
        return classes.join(' ');
    };
    
    const drawerClasses = () => {
        const classes = ['lv-drawer', `lv-drawer--${position}`, `lv-drawer--${size}`];
        if (getOpen()) {
            classes.push('lv-drawer--visible');
        }
        if (className) classes.push(className);
        return classes.join(' ');
    };
    
    const elements = [];
    
    // Backdrop (optional)
    if (overlay) {
        elements.push(
            div({
                class: backdropClasses,
                onclick: handleBackdropClick,
                onkeydown: handleKeyDown,
                'aria-hidden': 'true'
            })
        );
    }
    
    // Drawer
    elements.push(
        div({
            class: drawerClasses,
            role: 'dialog',
            'aria-modal': 'true',
            'aria-labelledby': title ? 'lv-drawer-title' : undefined,
            onmount: (el) => {
                if (effect) {
                    effect(() => {
                        if (getOpen()) {
                            document.body.classList.add('lv-drawer-open');
                        } else {
                            document.body.classList.remove('lv-drawer-open');
                        }
                    });
                }
                
                // Keyboard handler on document
                const keyHandler = (e) => {
                    if (closeOnEscape && e.key === 'Escape' && getOpen()) {
                        handleClose();
                    }
                };
                document.addEventListener('keydown', keyHandler);
                el._cleanup = () => document.removeEventListener('keydown', keyHandler);
            },
            onunmount: (el) => {
                document.body.classList.remove('lv-drawer-open');
                if (el._cleanup) el._cleanup();
            },
            tabindex: -1,
            ...rest
        }, ...drawerContent)
    );
    
    return div({ style: 'display: contents;' }, ...elements);
};

/**
 * Drawer Footer Component
 */
Drawer.Footer = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;
    
    const { div } = tags;
    const { class: className = '', ...rest } = props;
    
    return div({
        class: `lv-drawer__footer ${className}`.trim(),
        ...rest
    }, ...children);
};

// Auto-register
if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Drawer', Drawer);
}

export default Drawer;
