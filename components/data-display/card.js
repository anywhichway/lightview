/**
 * Lightview Card Component (DaisyUI)
 * @see https://daisyui.com/components/card/
 */

import '../daisyui.js';

/**
 * Card Component
 * @param {Object} props
 * @param {string} props.variant - 'bordered' | 'dash' | 'side' | 'compact'
 * @param {string} props.imageFull - Image fills width
 * @param {string} props.bg - Background class (e.g., 'bg-base-100')
 * @param {string} props.shadow - Shadow class (e.g., 'shadow-sm', 'shadow-xl')
 * @param {boolean} props.useShadow - Render in Shadow DOM with isolated DaisyUI styles
 */
const Card = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    const LVX = window.LightviewX || {};

    if (!tags) return null;

    const { div, shadowDOM } = tags;

    const {
        variant,
        imageFull = false,
        bg = 'bg-base-100',
        shadow = 'shadow-sm',
        useShadow,
        class: className = '',
        ...rest
    } = props;

    const classes = ['card', bg, shadow];

    if (variant === 'bordered') classes.push('card-bordered');
    else if (variant === 'dash') classes.push('card-dash');
    else if (variant === 'side') classes.push('card-side');
    else if (variant === 'compact') classes.push('card-compact');

    if (imageFull) classes.push('image-full');
    if (className) classes.push(className);

    const cardEl = div({ class: classes.join(' '), ...rest }, ...children);

    // Check if we should use shadow DOM
    let usesShadow = false;
    if (LVX.shouldUseShadow) {
        usesShadow = LVX.shouldUseShadow(useShadow);
    } else {
        usesShadow = useShadow === true;
    }

    if (usesShadow) {
        const mixedSheets = LVX.getAdoptedStyleSheets ? LVX.getAdoptedStyleSheets(null, props.styleSheets) : [];
        const adoptedStyleSheets = mixedSheets.filter(s => s instanceof CSSStyleSheet);
        const fallbackLinks = mixedSheets.filter(s => typeof s === 'string');

        // Use reactive theme signal if available (matches Button pattern)
        const themeValue = LVX.themeSignal ? () => LVX.themeSignal.value : 'light';

        return div({ class: 'contents' },
            shadowDOM({ mode: 'open', adoptedStyleSheets },
                // Inject fallback links if any
                ...fallbackLinks.map(url => tags.link({ rel: 'stylesheet', href: url })),
                div({ 'data-theme': themeValue },
                    cardEl
                )
            )
        );
    }

    return cardEl;
};

/**
 * Card Body
 */
Card.Body = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.div({
        class: `card-body ${className}`.trim(),
        ...rest
    }, ...children);
};

/**
 * Card Title
 */
Card.Title = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.h2({
        class: `card-title ${className}`.trim(),
        ...rest
    }, ...children);
};

/**
 * Card Actions
 */
Card.Actions = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const {
        justify = 'end',
        class: className = '',
        ...rest
    } = props;

    return tags.div({
        class: `card-actions justify-${justify} ${className}`.trim(),
        ...rest
    }, ...children);
};

/**
 * Card Figure (for images)
 */
Card.Figure = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { src, alt = '', class: className = '', ...rest } = props;

    if (src) {
        return tags.figure({ class: className, ...rest },
            tags.img({ src, alt })
        );
    }

    return tags.figure({ class: className, ...rest }, ...children);
};

const tags = window.Lightview.tags;
tags.Card = Card;
tags['Card.Body'] = Card.Body;
tags['Card.Title'] = Card.Title;
tags['Card.Actions'] = Card.Actions;
tags['Card.Figure'] = Card.Figure;

export default Card;
