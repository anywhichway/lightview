/**
 * Lightview Components - Rating
 * A rating component using DaisyUI 5 styling
 * @see https://daisyui.com/components/rating/
 */

import '../daisyui.js';

/**
 * Rating Component
 * @param {Object} props - Rating properties
 * @param {number|Signal} props.value - Current rating value (controlled)
 * @param {number} props.defaultValue - Default rating value (uncontrolled)
 * @param {number} props.max - Maximum stars (default: 5)
 * @param {string} props.size - 'xs' | 'sm' | 'md' | 'lg'
 * @param {boolean} props.half - Allow half stars
 * @param {string} props.color - Color for stars (default: 'orange-400')
 * @param {string} props.mask - 'star' | 'star-2' | 'heart' | 'circle' | 'square' | 'diamond' (default: 'star-2')
 * @param {boolean} props.hidden - Include hidden 0-star option for clearing
 * @param {boolean} props.disabled - Disable rating
 * @param {boolean} props.readOnly - Make read-only (just display)
 * @param {string} props.label - Label text
 * @param {string} props.helper - Helper text
 * @param {Function} props.onChange - Change handler
 * @param {boolean} props.useShadow - Render in Shadow DOM
 */
const Rating = (props = {}) => {
    const { tags, signal } = window.Lightview || {};
    const LVX = window.LightviewX || {};

    if (!tags) {
        console.error('Lightview not found');
        return null;
    }

    const { div, input, fieldset, legend, p, span, shadowDOM } = tags;

    const {
        value,
        defaultValue = 0,
        max = 5,
        size,
        half = false,
        color = 'orange-400',
        mask = 'star-2',
        hidden = false,
        disabled = false,
        readOnly = false,
        label: labelText,
        helper,
        name = `rating-${Math.random().toString(36).slice(2, 9)}`,
        onChange,
        class: className = '',
        useShadow,
        ...rest
    } = props;

    // Internal state
    const internalValue = signal ? signal(defaultValue) : { value: defaultValue };

    const isControlled = value !== undefined;

    const getValue = () => {
        if (isControlled) {
            return typeof value === 'function' ? value() :
                (value && typeof value.value !== 'undefined') ? value.value : value;
        }
        return internalValue.value;
    };

    const handleChange = (rating) => {
        if (readOnly || disabled) return;

        if (!isControlled) {
            internalValue.value = rating;
        }

        if (isControlled && value && typeof value.value !== 'undefined') {
            value.value = rating;
        }

        if (onChange) onChange(rating);
    };

    // Build rating classes
    const getRatingClass = () => {
        const classes = ['rating'];
        if (size) classes.push(`rating-${size}`);
        if (half) classes.push('rating-half');
        return classes.join(' ');
    };

    const bgClass = `bg-${color}`;

    // Build rating inputs
    const buildInputs = () => {
        const inputs = [];
        const currentValue = getValue();

        if (hidden) {
            inputs.push(input({
                type: 'radio',
                name,
                class: 'rating-hidden',
                checked: () => getValue() === 0,
                disabled,
                onchange: () => handleChange(0)
            }));
        }

        for (let i = 1; i <= max; i++) {
            if (half) {
                // Half stars
                inputs.push(input({
                    type: 'radio',
                    name,
                    class: `mask mask-${mask} mask-half-1 ${bgClass}`,
                    'aria-label': `${i - 0.5} stars`,
                    checked: () => getValue() === i - 0.5,
                    disabled,
                    onchange: () => handleChange(i - 0.5)
                }));
                inputs.push(input({
                    type: 'radio',
                    name,
                    class: `mask mask-${mask} mask-half-2 ${bgClass}`,
                    'aria-label': `${i} stars`,
                    checked: () => getValue() === i,
                    disabled,
                    onchange: () => handleChange(i)
                }));
            } else {
                inputs.push(input({
                    type: 'radio',
                    name,
                    class: `mask mask-${mask} ${bgClass}`,
                    'aria-label': `${i} stars`,
                    checked: () => getValue() === i,
                    disabled,
                    onchange: () => handleChange(i)
                }));
            }
        }

        return inputs;
    };

    const ratingEl = div({
        class: getRatingClass(),
        ...rest
    }, ...buildInputs());

    // If no label and no helper, return just the rating
    if (!labelText && !helper) {
        let usesShadow = false;
        if (LVX.shouldUseShadow) {
            usesShadow = LVX.shouldUseShadow(useShadow);
        } else {
            usesShadow = useShadow === true;
        }

        if (usesShadow) {
            const adoptedStyleSheets = LVX.getAdoptedStyleSheets ? LVX.getAdoptedStyleSheets() : [];
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';

            return div({ class: 'content', style: 'display: inline-block' },
                shadowDOM({ mode: 'open', adoptedStyleSheets },
                    div({ 'data-theme': currentTheme }, ratingEl)
                )
            );
        }

        return ratingEl;
    }

    // Build with fieldset pattern
    const fieldsetContent = [];

    if (labelText) {
        fieldsetContent.push(legend({ class: 'fieldset-legend' }, labelText));
    }

    fieldsetContent.push(ratingEl);

    if (helper) {
        fieldsetContent.push(p({ class: 'label' }, helper));
    }

    const wrapperEl = fieldset({
        class: `fieldset ${className}`.trim()
    }, ...fieldsetContent);

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

        return span({ style: 'margin-right: 0.5rem' },
            shadowDOM({ mode: 'open', adoptedStyleSheets },
                div({ 'data-theme': currentTheme, style: 'display: inline-block' }, wrapperEl)
            )
        );
    }

    return wrapperEl;
};

// Auto-register
window.Lightview.tags.Rating = Rating;

export default Rating;
