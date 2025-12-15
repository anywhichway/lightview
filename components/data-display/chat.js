/**
 * Lightview Chat Component (DaisyUI)
 * @see https://daisyui.com/components/chat/
 */

import '../daisyui.js';

/**
 * Chat Component - container for chat bubbles
 * @param {Object} props
 * @param {string} props.position - 'start' | 'end'
 * @param {boolean} props.useShadow - Render in Shadow DOM with isolated DaisyUI styles
 */
const Chat = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    const LVX = window.LightviewX || {};

    if (!tags) return null;

    const { div, shadowDOM } = tags;

    const {
        position = 'start',
        useShadow,
        class: className = '',
        ...rest
    } = props;

    const classes = ['chat', `chat-${position}`];
    if (className) classes.push(className);

    const chatEl = div({ class: classes.join(' '), ...rest }, ...children);

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
                    chatEl
                )
            )
        );
    }

    return chatEl;
};

/**
 * Chat Image
 */
Chat.Image = (props = {}) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { src, alt = 'Avatar', class: className = '', ...rest } = props;

    return tags.div({ class: `chat-image avatar ${className}`.trim(), ...rest },
        tags.div({ class: 'w-10 rounded-full' },
            tags.img({ src, alt })
        )
    );
};

/**
 * Chat Header
 */
Chat.Header = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.div({
        class: `chat-header ${className}`.trim(),
        ...rest
    }, ...children);
};

/**
 * Chat Bubble
 */
Chat.Bubble = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { color, class: className = '', ...rest } = props;

    const classes = ['chat-bubble'];
    if (color) classes.push(`chat-bubble-${color}`);
    if (className) classes.push(className);

    return tags.div({ class: classes.join(' '), ...rest }, ...children);
};

/**
 * Chat Footer
 */
Chat.Footer = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.div({
        class: `chat-footer opacity-50 ${className}`.trim(),
        ...rest
    }, ...children);
};

if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Chat', Chat);
}

export default Chat;
