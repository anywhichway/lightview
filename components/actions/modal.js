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
 * @param {boolean} props.useShadow - Render in Shadow DOM with isolated DaisyUI styles
 */
const Modal = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    const LVX = window.LightviewX || {};

    if (!tags) return null;

    const { dialog, div, shadowDOM } = tags;

    const {
        id,
        open = false,
        position,
        onClose,
        useShadow = false,
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

    // Check if we should use shadow DOM
    let usesShadow = false;
    if (LVX.shouldUseShadow) {
        usesShadow = LVX.shouldUseShadow(useShadow);
    } else {
        usesShadow = useShadow === true;
    }

    if (usesShadow) {
        const adoptedStyleSheets = LVX.getAdoptedStyleSheets ? LVX.getAdoptedStyleSheets() : [];

        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';

        return div({ class: 'contents' },
            shadowDOM({ mode: 'open', adoptedStyleSheets },
                div({ 'data-theme': currentTheme },
                    modalEl
                )
            )
        );
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

const tags = window.Lightview.tags;
tags.Modal = Modal;
tags['Modal.Box'] = Modal.Box;
tags['Modal.Action'] = Modal.Action;
tags['Modal.Backdrop'] = Modal.Backdrop;

export default Modal;
