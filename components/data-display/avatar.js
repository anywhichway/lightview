/**
 * Lightview Avatar Component (DaisyUI)
 * @see https://daisyui.com/components/avatar/
 */

import '../daisyui.js';

/**
 * Avatar Component
 * @param {Object} props
 * @param {string} props.src - Image source URL
 * @param {string} props.alt - Alt text for image
 * @param {string} props.placeholder - Text to show when no image
 * @param {string} props.size - Size in pixels or class
 * @param {string} props.shape - 'circle' | 'rounded' | 'squircle' | 'hexagon' | 'triangle'
 * @param {boolean} props.ring - Add ring border
 * @param {string} props.ringColor - Ring color class
 * @param {boolean} props.online - Show online indicator
 * @param {boolean} props.offline - Show offline indicator
 * @param {boolean} props.useShadow - Render in Shadow DOM with isolated DaisyUI styles
 */
const Avatar = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    const LVX = window.LightviewX || {};

    if (!tags) return null;

    const { div, img, shadowDOM } = tags;

    const {
        src,
        alt = 'Avatar',
        placeholder,
        size = 'w-12',
        shape = 'circle',
        ring = false,
        ringColor = 'ring-primary',
        online = false,
        offline = false,
        useShadow,
        class: className = '',
        ...rest
    } = props;

    const wrapperClasses = ['avatar'];
    if (online) wrapperClasses.push('online');
    if (offline) wrapperClasses.push('offline');
    if (placeholder && !src) wrapperClasses.push('placeholder');
    if (className) wrapperClasses.push(className);

    const innerClasses = [size];
    if (ring) {
        innerClasses.push('ring', ringColor, 'ring-offset-base-100', 'ring-offset-2');
    }

    // Shape classes
    if (shape === 'circle') innerClasses.push('rounded-full');
    else if (shape === 'rounded') innerClasses.push('rounded');
    else if (shape === 'squircle') innerClasses.push('mask mask-squircle');
    else if (shape === 'hexagon') innerClasses.push('mask mask-hexagon');
    else if (shape === 'triangle') innerClasses.push('mask mask-triangle');

    let avatarEl;
    if (src) {
        avatarEl = div({ class: wrapperClasses.join(' '), ...rest },
            div({ class: innerClasses.join(' ') },
                img({ src, alt })
            )
        );
    } else {
        // Placeholder avatar
        innerClasses.push('bg-neutral text-neutral-content');
        avatarEl = div({ class: wrapperClasses.join(' '), ...rest },
            div({ class: innerClasses.join(' ') },
                tags.span({}, placeholder || children[0] || '?')
            )
        );
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
                    avatarEl
                )
            )
        );
    }

    return avatarEl;
};

/**
 * Avatar Group
 */
Avatar.Group = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.div({
        class: `avatar-group -space-x-6 rtl:space-x-reverse ${className}`.trim(),
        ...rest
    }, ...children);
};

window.Lightview.tags.Avatar = Avatar;

export default Avatar;
