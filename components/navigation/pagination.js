/**
 * Lightview Pagination Component (DaisyUI)
 * @see https://daisyui.com/components/pagination/
 */

import '../daisyui.js';

/**
 * Pagination Component
 * @param {Object} props
 * @param {number} props.currentPage - Current page number
 * @param {number} props.totalPages - Total number of pages
 * @param {function} props.onPageChange - Callback when page changes
 * @param {string} props.size - 'xs' | 'sm' | 'md' | 'lg'
 * @param {boolean} props.useShadow - Render in Shadow DOM with isolated DaisyUI styles
 */
const Pagination = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    const LVX = window.LightviewX || {};

    if (!tags) return null;

    const { div, button, shadowDOM } = tags;

    const {
        currentPage = 1,
        totalPages = 1,
        onPageChange,
        size,
        useShadow,
        class: className = '',
        ...rest
    } = props;

    const classes = ['join'];
    if (className) classes.push(className);

    const getCurrent = () => typeof currentPage === 'function' ? currentPage() : currentPage;

    const buttons = [];

    // Previous button
    buttons.push(
        button({
            class: `join-item btn ${size ? `btn-${size}` : ''}`.trim(),
            onclick: () => {
                const current = getCurrent();
                if (current > 1 && onPageChange) onPageChange(current - 1);
            },
            disabled: () => getCurrent() <= 1
        }, '«')
    );

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        buttons.push(
            button({
                class: () => `join-item btn ${size ? `btn-${size}` : ''} ${getCurrent() === i ? 'btn-active' : ''}`.trim(),
                onclick: () => onPageChange && onPageChange(i)
            }, String(i))
        );
    }

    // Next button
    buttons.push(
        button({
            class: `join-item btn ${size ? `btn-${size}` : ''}`.trim(),
            onclick: () => {
                const current = getCurrent();
                if (current < totalPages && onPageChange) onPageChange(current + 1);
            },
            disabled: () => getCurrent() >= totalPages
        }, '»')
    );

    const paginationEl = div({ class: classes.join(' '), ...rest }, ...buttons, ...children);

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
                    paginationEl
                )
            )
        );
    }

    return paginationEl;
};

window.Lightview.tags.Pagination = Pagination;

export default Pagination;
