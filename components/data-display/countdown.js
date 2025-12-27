/**
 * Lightview Countdown Component (DaisyUI)
 * @see https://daisyui.com/components/countdown/
 */

import '../daisyui.js';

/**
 * Countdown Component
 * @param {Object} props
 * @param {number|function} props.value - Countdown value (0-99)
 * @param {boolean} props.useShadow - Render in Shadow DOM with isolated DaisyUI styles
 */
const Countdown = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    const LVX = window.LightviewX || {};

    if (!tags) return null;

    const { span, div, shadowDOM } = tags;

    const {
        value = 0,
        useShadow,
        class: className = '',
        ...rest
    } = props;

    const getValue = () => typeof value === 'function' ? value() : value;

    const countdownEl = span({
        class: `countdown ${className}`.trim(),
        ...rest
    },
        span({
            style: typeof value === 'function'
                ? () => `--value:${getValue()};`
                : `--value:${value};`
        })
    );

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
                    countdownEl
                )
            )
        );
    }

    return countdownEl;
};

window.Lightview.tags.Countdown = Countdown;

export default Countdown;
