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
 */
const Avatar = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { div, img } = tags;

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

    if (src) {
        return div({ class: wrapperClasses.join(' '), ...rest },
            div({ class: innerClasses.join(' ') },
                img({ src, alt })
            )
        );
    }

    // Placeholder avatar
    innerClasses.push('bg-neutral text-neutral-content');
    return div({ class: wrapperClasses.join(' '), ...rest },
        div({ class: innerClasses.join(' ') },
            tags.span({}, placeholder || children[0] || '?')
        )
    );
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

if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Avatar', Avatar);
}

export default Avatar;
