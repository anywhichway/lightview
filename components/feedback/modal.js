/**
 * Lightview Components - Modal
 * A dialog/modal component with accessibility support
 */

import { loadStylesheetSync } from '../utils/styles.js';
import { getIcon } from '../utils/icons.js';

// Load styles from external CSS file
loadStylesheetSync(import.meta.url);

/**
 * Modal Component
 * @param {Object} props - Modal properties
 * @param {boolean|Signal} props.open - Whether modal is open
 * @param {string} props.size - 'sm' | 'md' | 'lg' | 'xl' | 'full' (default: 'md')
 * @param {string} props.title - Modal title
 * @param {boolean} props.showClose - Show close button (default: true)
 * @param {boolean} props.closeOnBackdrop - Close when clicking backdrop (default: true)
 * @param {boolean} props.closeOnEscape - Close on Escape key (default: true)
 * @param {Function} props.onClose - Close handler
 * @param {...children} children - Modal content
 */
const Modal = (props = {}, ...children) => {
    
    const { tags, signal, effect } = window.Lightview || {};
    if (!tags) {
        console.error('Lightview not found');
        return null;
    }
    
    const { div, button, h2, span } = tags;
    
    const {
        open,
        size = 'md',
        title,
        showClose = true,
        closeOnBackdrop = true,
        closeOnEscape = true,
        onClose,
        class: className = '',
        ...rest
    } = props;
    
    // Track if we have an open signal/value
    const getOpen = () => {
        if (typeof open === 'function') return open();
        if (open && typeof open.value !== 'undefined') return open.value;
        return !!open;
    };
    
    const handleClose = () => {
        if (onClose) onClose();
        // If open is a signal, close it
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
    
    // Build modal content
    const modalContent = [];
    
    // Header (if title or showClose)
    if (title || showClose) {
        const headerContent = [];
        
        if (title) {
            headerContent.push(h2({ class: 'lv-modal__title', id: 'lv-modal-title' }, title));
        } else {
            headerContent.push(span()); // Spacer
        }
        
        if (showClose) {
            headerContent.push(
                button({
                    class: 'lv-modal__close',
                    onclick: handleClose,
                    'aria-label': 'Close modal',
                    innerHTML: getIcon('close', { size: 20 })
                })
            );
        }
        
        modalContent.push(div({ class: 'lv-modal__header' }, ...headerContent));
    }
    
    // Body
    modalContent.push(div({ class: 'lv-modal__body' }, ...children));
    
    const backdropClasses = () => {
        const classes = ['lv-modal-backdrop'];
        if (getOpen()) {
            classes.push('lv-modal-backdrop--visible');
        } else {
            classes.push('lv-modal-backdrop--hidden');
        }
        return classes.join(' ');
    };
    
    const modalClasses = () => {
        const classes = ['lv-modal', `lv-modal--${size}`];
        if (getOpen()) {
            classes.push('lv-modal--visible');
        } else {
            classes.push('lv-modal--hidden');
        }
        if (className) classes.push(className);
        return classes.join(' ');
    };
    
    // Create the modal structure
    const backdrop = div({
        class: backdropClasses,
        onclick: handleBackdropClick,
        onkeydown: handleKeyDown,
        'aria-hidden': () => !getOpen()
    });
    
    const modal = div({
        class: modalClasses,
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': title ? 'lv-modal-title' : undefined,
        'aria-hidden': () => !getOpen(),
        onmount: (el) => {
            // Set up effect to manage body scroll
            if (effect) {
                effect(() => {
                    if (getOpen()) {
                        document.body.classList.add('lv-modal-open');
                        // Focus the modal
                        el.domEl?.focus();
                    } else {
                        document.body.classList.remove('lv-modal-open');
                    }
                });
            }
        },
        onunmount: () => {
            document.body.classList.remove('lv-modal-open');
        },
        tabindex: -1,
        ...rest
    }, ...modalContent);
    
    // Return both backdrop and modal in a fragment-like container
    return div({ style: 'display: contents;' }, backdrop, modal);
};

/**
 * Modal Footer Component
 * @param {Object} props
 * @param {string} props.align - 'left' | 'center' | 'right' | 'between'
 * @param {...children} children - Footer content (usually buttons)
 */
Modal.Footer = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;
    
    const { div } = tags;
    
    const {
        align = 'right',
        class: className = '',
        ...rest
    } = props;
    
    const alignClass = align !== 'right' ? `lv-modal__footer--${align}` : '';
    
    return div({
        class: `lv-modal__footer ${alignClass} ${className}`.trim(),
        ...rest
    }, ...children);
};

// Auto-register
if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Modal', Modal);
}

export default Modal;
