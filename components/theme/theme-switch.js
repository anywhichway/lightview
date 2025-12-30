/**
 * Lightview Components - ThemeSwitch
 * A toggle for switching between light and dark themes
 */

import { loadStylesheetSync } from '../utils/styles.js';
import { getIcon } from '../utils/icons.js';

// Load styles from external CSS file
loadStylesheetSync(import.meta.url);

/**
 * ThemeSwitch Component
 * @param {Object} props
 * @param {string|Signal} props.theme - Current theme ('light' | 'dark')
 * @param {string} props.defaultTheme - Default theme if uncontrolled
 * @param {string} props.size - 'sm' | 'md' | 'lg' (default: 'md')
 * @param {boolean} props.animated - Use animated transition (default: true)
 * @param {string} props.storageKey - localStorage key to persist theme (default: 'lv-theme')
 * @param {Function} props.onChange - Theme change handler
 */
const ThemeSwitch = (props = {}) => {

    const { tags, signal, effect } = globalThis.Lightview || {};
    if (!tags) {
        console.error('Lightview not found');
        return null;
    }

    const { button, span } = tags;

    const {
        theme,
        defaultTheme,
        size = 'md',
        animated = true,
        storageKey = 'lv-theme',
        onChange,
        class: className = '',
        ...rest
    } = props;

    // Detect system preference
    const getSystemTheme = () => {
        if (typeof window === 'undefined') return 'light';
        return globalThis.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };

    // Get initial theme
    const getInitialTheme = () => {
        if (typeof window === 'undefined') return defaultTheme || 'light';

        // Check localStorage first
        const stored = localStorage.getItem(storageKey);
        if (stored === 'light' || stored === 'dark') return stored;

        // Then default or system
        return defaultTheme || getSystemTheme();
    };

    // Internal state
    const internalTheme = signal ? signal(getInitialTheme()) : { value: getInitialTheme() };

    const isControlled = theme !== undefined;

    const getTheme = () => {
        if (isControlled) {
            return typeof theme === 'function' ? theme() :
                (theme && typeof theme.value !== 'undefined') ? theme.value : theme;
        }
        return internalTheme.value;
    };

    const applyTheme = (newTheme) => {
        document.documentElement.setAttribute('data-theme', newTheme);

        // Also update meta theme-color for mobile browsers
        let metaTheme = document.querySelector('meta[name="theme-color"]');
        if (!metaTheme) {
            metaTheme = document.createElement('meta');
            metaTheme.name = 'theme-color';
            document.head.appendChild(metaTheme);
        }
        metaTheme.content = newTheme === 'dark' ? '#0f172a' : '#ffffff';
    };

    const toggle = () => {
        const currentTheme = getTheme();
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        if (!isControlled) {
            internalTheme.value = newTheme;
        }

        if (isControlled && theme && typeof theme.value !== 'undefined') {
            theme.value = newTheme;
        }

        // Persist to localStorage
        if (storageKey) {
            localStorage.setItem(storageKey, newTheme);
        }

        applyTheme(newTheme);

        if (onChange) {
            onChange(newTheme);
        }
    };

    // Apply theme on mount
    if (typeof window !== 'undefined') {
        // Apply immediately
        applyTheme(getTheme());

        // Set up effect to watch for changes
        if (effect) {
            effect(() => {
                applyTheme(getTheme());
            });
        }

        // Listen for system theme changes
        globalThis.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem(storageKey)) {
                const newTheme = e.matches ? 'dark' : 'light';
                if (!isControlled) {
                    internalTheme.value = newTheme;
                }
                applyTheme(newTheme);
            }
        });
    }

    const iconSize = size === 'sm' ? 16 : size === 'lg' ? 28 : 20;

    const classes = ['lv-theme-switch', `lv-theme-switch--${size}`];
    if (animated) classes.push('lv-theme-switch--animated');
    if (className) classes.push(className);

    if (animated) {
        return button({
            class: classes.join(' '),
            onclick: toggle,
            'aria-label': () => `Switch to ${getTheme() === 'light' ? 'dark' : 'light'} mode`,
            title: () => `Switch to ${getTheme() === 'light' ? 'dark' : 'light'} mode`,
            ...rest
        },
            span({
                class: () => `lv-theme-switch__icon ${getTheme() === 'light' ? 'lv-theme-switch__icon--visible' : 'lv-theme-switch__icon--hidden'}`,
                innerHTML: getIcon('sun', { size: iconSize })
            }),
            span({
                class: () => `lv-theme-switch__icon ${getTheme() === 'dark' ? 'lv-theme-switch__icon--visible' : 'lv-theme-switch__icon--hidden'}`,
                innerHTML: getIcon('moon', { size: iconSize })
            })
        );
    }

    return button({
        class: classes.join(' '),
        onclick: toggle,
        'aria-label': () => `Switch to ${getTheme() === 'light' ? 'dark' : 'light'} mode`,
        title: () => `Switch to ${getTheme() === 'light' ? 'dark' : 'light'} mode`,
        ...rest
    },
        span({
            class: 'lv-theme-switch__icon',
            innerHTML: () => getIcon(getTheme() === 'light' ? 'sun' : 'moon', { size: iconSize })
        })
    );
};

// Auto-register
globalThis.Lightview.tags.ThemeSwitch = ThemeSwitch;

export default ThemeSwitch;
