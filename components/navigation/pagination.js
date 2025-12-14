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
 */
const Pagination = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { div, button } = tags;

    const {
        currentPage = 1,
        totalPages = 1,
        onPageChange,
        size,
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

    return div({ class: classes.join(' '), ...rest }, ...buttons, ...children);
};

if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Pagination', Pagination);
}

export default Pagination;
