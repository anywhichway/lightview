/**
 * Lightview Countdown Component (DaisyUI)
 * @see https://daisyui.com/components/countdown/
 */

import '../daisyui.js';

/**
 * Countdown Component
 * @param {Object} props
 * @param {number|function} props.value - Countdown value (0-99)
 */
const Countdown = (props = {}, ...children) => {
    const { tags } = window.Lightview || {};
    if (!tags) return null;

    const { span } = tags;

    const {
        value = 0,
        class: className = '',
        ...rest
    } = props;

    const getValue = () => typeof value === 'function' ? value() : value;

    return span({
        class: `countdown ${className}`.trim(),
        ...rest
    },
        span({
            style: typeof value === 'function'
                ? () => `--value:${getValue()};`
                : `--value:${value};`
        })
    );
};

if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('Countdown', Countdown);
}

export default Countdown;
