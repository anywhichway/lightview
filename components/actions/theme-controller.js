/**
 * Lightview Theme Controller Component (DaisyUI)
 * @see https://daisyui.com/components/theme-controller/
 */

import '../daisyui.js';
import { themes, setTheme, getTheme } from '../daisyui.js';

/**
 * Theme Controller - toggle or select themes
 * @param {Object} props
 * @param {string} props.type - 'toggle' | 'dropdown' | 'radio'
 * @param {string[]} props.themes - Array of theme names to show
 * @param {string} props.lightTheme - Theme for light mode (toggle only)
 * @param {string} props.darkTheme - Theme for dark mode (toggle only)
 * @param {boolean} props.useShadow - Render in Shadow DOM with isolated DaisyUI styles
 */
const ThemeController = (props = {}) => {
    const { tags, signal } = window.Lightview || {};
    const LVX = window.LightviewX || {};

    if (!tags) return null;

    const { div, shadowDOM } = tags;

    const {
        type = 'toggle',
        themes: themeList = ['light', 'dark'],
        lightTheme = 'light',
        darkTheme = 'dark',
        useShadow,
        class: className = '',
        ...rest
    } = props;

    let controllerEl;

    if (type === 'toggle') {
        const isDark = signal(getTheme() === darkTheme);

        controllerEl = tags.label({
            class: `swap swap-rotate ${className}`.trim(),
            ...rest
        },
            tags.input({
                type: 'checkbox',
                class: 'theme-controller',
                value: darkTheme,
                checked: isDark,
                onchange: (e) => {
                    const newTheme = e.target.checked ? darkTheme : lightTheme;
                    setTheme(newTheme);
                    isDark.value = e.target.checked;
                }
            }),
            // Sun icon
            tags.svg({
                class: 'swap-off h-6 w-6 fill-current',
                xmlns: 'http://www.w3.org/2000/svg',
                viewBox: '0 0 24 24',
                innerHTML: '<path d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,4.93,6.34Zm12,.29a1,1,0,0,0,.7-.29l.71-.71a1,1,0,1,0-1.41-1.41L17,5.64a1,1,0,0,0,0,1.41A1,1,0,0,0,17.66,7.34ZM21,11H20a1,1,0,0,0,0,2h1a1,1,0,0,0,0-2Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,17A1,1,0,0,0,17,18.36l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z"/>'
            }),
            // Moon icon
            tags.svg({
                class: 'swap-on h-6 w-6 fill-current',
                xmlns: 'http://www.w3.org/2000/svg',
                viewBox: '0 0 24 24',
                innerHTML: '<path d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z"/>'
            })
        );
    } else if (type === 'dropdown') {
        controllerEl = tags.div({ class: `dropdown ${className}`.trim(), ...rest },
            tags.div({ tabindex: '0', role: 'button', class: 'btn m-1' }, 'Theme'),
            tags.ul({
                tabindex: '0',
                class: 'dropdown-content bg-base-300 rounded-box z-1 w-52 p-2 shadow-2xl'
            },
                ...themeList.map(theme =>
                    tags.li({},
                        tags.input({
                            type: 'radio',
                            name: 'theme-dropdown',
                            class: 'theme-controller w-full btn btn-sm btn-block btn-ghost justify-start',
                            'aria-label': theme,
                            value: theme,
                            onclick: () => setTheme(theme)
                        })
                    )
                )
            )
        );
    } else {
        // Radio buttons
        controllerEl = tags.div({ class: `flex flex-wrap gap-2 ${className}`.trim(), ...rest },
            ...themeList.map(theme =>
                tags.input({
                    type: 'radio',
                    name: 'theme-radios',
                    class: 'theme-controller btn btn-xs',
                    'aria-label': theme,
                    value: theme,
                    checked: getTheme() === theme,
                    onclick: () => setTheme(theme)
                })
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
                    controllerEl
                )
            )
        );
    }

    return controllerEl;
};

if (typeof window !== 'undefined' && window.LightviewX) {
    window.LightviewX.registerComponent('ThemeController', ThemeController);
}

export default ThemeController;
