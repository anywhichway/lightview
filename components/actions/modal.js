/**
 * Lightview Modal Component (DaisyUI)
 * @see https://daisyui.com/components/modal/
 */

import '../daisyui.js';

/**
 * Modal Component using the dialog element
 * @param {Object} props
 * @param {string} props.id - Required unique ID for the modal
 * @param {boolean|function} props.open - Control open state reactively
 * @param {string} props.position - 'top' | 'bottom' | 'middle' (default)
 * @param {function} props.onClose - Callback when modal closes
 */
const Modal = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { dialog, form } = tags;

    const {
        id,
        open = false,
        position,
        onClose,
        class: className = '',
        ...rest
    } = props;

    const classes = ['modal'];
    if (position === 'top') classes.push('modal-top');
    else if (position === 'bottom') classes.push('modal-bottom');
    else if (position === 'middle') classes.push('modal-middle');
    if (className) classes.push(className);

    const modalEl = dialog({
        id,
        class: classes.join(' '),
        ...rest
    }, ...children);

    // Handle reactive open state
    if (typeof open === 'function') {
        const checkOpen = () => {
            if (open()) {
                modalEl.domEl?.showModal?.();
            } else {
                modalEl.domEl?.close?.();
            }
        };
        // Set up effect after element is in DOM
        setTimeout(checkOpen, 0);
    }

    return modalEl;
};

/**
 * Modal Box - the content container
 */
Modal.Box = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.div({
        class: `modal-box ${className}`.trim(),
        ...rest
    }, ...children);
};

/**
 * Modal Action - container for action buttons  
 */
Modal.Action = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.div({
        class: `modal-action ${className}`.trim(),
        ...rest
    }, ...children);
};

/**
 * Modal Backdrop - click to close
 */
Modal.Backdrop = (props = {}) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    return tags.form({ method: 'dialog', class: 'modal-backdrop' },
        tags.button({}, 'close')
    );
};

/**
 * Open a modal by ID
 */
Modal.open = (id) => {
    document.getElementById(id)?.showModal?.();
};

/**
 * Close a modal by ID
 */
Modal.close = (id) => {
    document.getElementById(id)?.close?.();
};

if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Modal', Modal);
}

export default Modal;
