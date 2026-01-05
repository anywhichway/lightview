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
    const { tags } = globalThis.Lightview || {};
    const LVX = globalThis.LightviewX || {};

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

    const innerClasses = [];
    const innerStyle = {};

    // Check if size is a Tailwind class (w-*) or a direct measurement
    if (size) {
        if (/^w-(\d+)$/.test(size)) {
            // Workaround: Map w- classes to explicit styles as Tailwind classes might be missing
            const num = parseInt(size.split('-')[1]);
            const remValue = num * 0.25;
            innerStyle.width = `${remValue}rem`;
            innerStyle.height = `${remValue}rem`;
            innerClasses.push(size);
        } else if (/^w-/.test(size)) {
            innerClasses.push(size);
        } else {
            // Treat as direct measurement (e.g., 64px, 4rem)
            innerStyle.width = size;
            innerStyle.height = size;
        }
    } else {
        innerClasses.push('w-12');
        innerStyle.width = '3rem';
        innerStyle.height = '3rem';
    }

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
            div({ class: innerClasses.join(' '), style: innerStyle },
                img({ src, alt, style: 'width: 100%; height: 100%; object-fit: cover;' })
            )
        );
    } else {
        // Placeholder avatar
        // Use flexbox to center the placeholder text
        innerClasses.push('bg-neutral text-neutral-content flex items-center justify-center');

        // Support custom background/text colors via CSS variables if provided in style
        innerStyle.backgroundColor = 'var(--lv-avatar-bg)';
        innerStyle.color = 'var(--lv-avatar-text)';
        innerStyle.display = 'flex';
        innerStyle.alignItems = 'center';
        innerStyle.justifyContent = 'center';

        avatarEl = div({ class: wrapperClasses.join(' '), ...rest },
            div({
                class: innerClasses.join(' '),
                style: innerStyle
            },
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

        const themeValue = LVX.themeSignal ? () => LVX.themeSignal.value : 'light';

        return div({ class: 'contents' },
            shadowDOM({ mode: 'open', adoptedStyleSheets },
                div({ 'data-theme': themeValue },
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
    const { tags } = globalThis.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.div({
        class: `avatar-group -space-x-6 rtl:space-x-reverse ${className}`.trim(),
        ...rest
    }, ...children);
};

const tags = globalThis.Lightview.tags;
tags.Avatar = Avatar;
tags['Avatar.Group'] = Avatar.Group;

// Register as Custom Elements
if (globalThis.LightviewX?.customElementWrapper) {
    if (!customElements.get('lv-avatar')) {
        customElements.define('lv-avatar', globalThis.LightviewX.customElementWrapper(Avatar, {
            attributeMap: {
                src: String,
                alt: String,
                placeholder: String,
                size: String,
                shape: String,
                ring: Boolean,
                ringColor: String,
                online: Boolean,
                offline: Boolean,
                class: String
            }
        }));
    }
    if (!customElements.get('lv-avatar-group')) {
        customElements.define('lv-avatar-group', globalThis.LightviewX.customElementWrapper(Avatar.Group, {
            attributeMap: {
                class: String
            }
        }));
    }
} else if (globalThis.LightviewX?.createCustomElement) {
    if (!customElements.get('lv-avatar')) {
        customElements.define('lv-avatar', globalThis.LightviewX.createCustomElement(Avatar));
    }
    if (!customElements.get('lv-avatar-group')) {
        customElements.define('lv-avatar-group', globalThis.LightviewX.createCustomElement(Avatar.Group));
    }
}

export default Avatar;
