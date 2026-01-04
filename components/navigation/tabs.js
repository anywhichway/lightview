/**
 * Lightview Tabs Component (DaisyUI)
 * @see https://daisyui.com/components/tab/
 */

import '../daisyui.js';

/**
 * Tabs Component
 * @param {Object} props
 * @param {string} props.variant - 'boxed' | 'bordered' | 'lifted'
 * @param {string} props.size - 'xs' | 'sm' | 'lg' | 'xl'
 * @param {boolean} props.useShadow - Render in Shadow DOM with isolated DaisyUI styles
 */
const Tabs = (props = {}, ...children) => {
    const { tags } = globalThis.Lightview || {};
    const LVX = globalThis.LightviewX || {};

    if (!tags) return null;

    const { div, shadowDOM, a, button } = tags;

    const {
        variant,
        size,
        useShadow,
        theme,
        class: className = '',
        ...rest
    } = props;

    // Build tab list classes
    const classes = ['tabs'];
    if (variant === 'boxed') classes.push('tabs-box');
    else if (variant === 'bordered') classes.push('tabs-border');
    else if (variant === 'lifted') classes.push('tabs-lift');
    if (size) classes.push(`tabs-${size}`);
    if (className) classes.push(className);

    // Process children to extract tabs and content
    const processedChildren = [];
    const contentPanels = [];

    children.forEach((child) => {
        // Check if this is a Tabs.Tab component
        if (child && typeof child === 'object' && child.tag === Tabs.Tab) {
            const tabProps = child.attributes || {};
            const tabChildren = child.children || [];

            // Create proper <a> or <button> element for the tab
            const tabClasses = ['tab'];
            const isActive = typeof tabProps.active === 'function' ? tabProps.active : tabProps.active;
            const isDisabled = typeof tabProps.disabled === 'function' ? tabProps.disabled : tabProps.disabled;

            if (isActive) tabClasses.push('tab-active');
            if (isDisabled) tabClasses.push('tab-disabled');

            const tabElement = button({
                role: 'tab',
                class: typeof tabProps.active === 'function' || typeof tabProps.disabled === 'function'
                    ? () => {
                        const cls = ['tab'];
                        const active = typeof tabProps.active === 'function' ? tabProps.active() : tabProps.active;
                        const disabled = typeof tabProps.disabled === 'function' ? tabProps.disabled() : tabProps.disabled;
                        if (active) cls.push('tab-active');
                        if (disabled) cls.push('tab-disabled');
                        return cls.join(' ');
                    }
                    : tabClasses.join(' '),
                onclick: tabProps.onclick,
                disabled: isDisabled,
            }, ...tabChildren);

            processedChildren.push(tabElement);
        }
        // Check if this is a Tabs.Content component
        else if (child && typeof child === 'object' && child.tag === Tabs.Content) {
            contentPanels.push(child);
        }
        // Keep other children as-is
        else {
            processedChildren.push(child);
        }
    });

    // Add content panels after tabs
    processedChildren.push(...contentPanels);

    const tabsEl = div({
        role: 'tablist',
        class: classes.join(' '),
        ...rest
    }, ...processedChildren);

    // Check if we should use shadow DOM
    let usesShadow = false;
    if (LVX.shouldUseShadow) {
        usesShadow = LVX.shouldUseShadow(useShadow);
    } else {
        usesShadow = useShadow === true;
    }

    if (usesShadow) {
        const adoptedStyleSheets = LVX.getAdoptedStyleSheets ? LVX.getAdoptedStyleSheets() : [];

        const themeValue = theme || (LVX.themeSignal ? () => LVX.themeSignal.value : 'light');

        // Direct link to DaisyUI
        const { link } = tags;
        const daisyLink = link({
            rel: 'stylesheet',
            href: 'https://cdn.jsdelivr.net/npm/daisyui@5.5.14/daisyui.min.css'
        });

        return div({ class: 'contents' },
            shadowDOM({ mode: 'open', adoptedStyleSheets },
                daisyLink,
                div({ 'data-theme': themeValue },
                    tabsEl
                )
            )
        );
    }

    return tabsEl;
};

/**
 * Tab Item
 */
Tabs.Tab = (props = {}, ...children) => {
    const { tags } = globalThis.Lightview || {};
    if (!tags) return null;

    const {
        active = false,
        disabled = false,
        class: className = '',
        ...rest
    } = props;

    const getClasses = () => {
        const classes = ['tab'];
        const isActive = typeof active === 'function' ? active() : active;
        const isDisabled = typeof disabled === 'function' ? disabled() : disabled;
        if (isActive) classes.push('tab-active');
        if (isDisabled) classes.push('tab-disabled');
        if (className) classes.push(className);
        return classes.join(' ');
    };

    return tags.button({
        role: 'tab',
        class: typeof active === 'function' || typeof disabled === 'function'
            ? () => getClasses()
            : getClasses(),
        ...rest
    }, ...children);
};

/**
 * Tab Content - for lifted tabs with content panels
 */
Tabs.Content = (props = {}, ...children) => {
    const { tags } = globalThis.Lightview || {};
    if (!tags) return null;

    const { class: className = '', ...rest } = props;

    return tags.div({
        role: 'tabpanel',
        class: `tab-content bg-base-100 border-base-300 p-6 ${className}`.trim(),
        ...rest
    }, ...children);
};

const tags = globalThis.Lightview.tags;
tags.Tabs = Tabs;
tags['Tabs.Tab'] = Tabs.Tab;
tags['Tabs.Content'] = Tabs.Content;

// Register as Custom Elements using Hybrid Pattern
// Pattern: Container has Shadow DOM, children do NOT
if (globalThis.LightviewX && typeof customElements !== 'undefined') {
    // lv-tabs: Real Web Component WITH Shadow DOM
    class TabsElement extends HTMLElement {
        constructor() {
            super();
            this.attachShadow({ mode: 'open' });
        }

        async connectedCallback() {
            const LVX = globalThis.LightviewX || {};

            // Sync theme from document
            const themeWrapper = document.createElement('div');
            themeWrapper.style.display = 'contents';

            const syncTheme = () => {
                const theme = document.documentElement.getAttribute('data-theme') || 'light';
                themeWrapper.setAttribute('data-theme', theme);
            };
            syncTheme();

            // Observe theme changes
            this.themeObserver = new MutationObserver(syncTheme);
            this.themeObserver.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ['data-theme']
            });

            // Get adopted stylesheets (includes DaisyUI)
            const adoptedStyleSheets = LVX.getAdoptedStyleSheets ? LVX.getAdoptedStyleSheets() : [];

            // Apply stylesheets to shadow root
            if (adoptedStyleSheets && adoptedStyleSheets.length > 0) {
                try {
                    this.shadowRoot.adoptedStyleSheets = adoptedStyleSheets;
                } catch (e) {
                    console.warn('Failed to adopt stylesheets', e);
                }
            }

            // Direct link to DaisyUI
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/npm/daisyui@5.5.14/daisyui.min.css';
            this.shadowRoot.appendChild(link);

            this.shadowRoot.appendChild(themeWrapper);

            // Initial render
            this.render();

            // Observe light DOM children changes
            this.childObserver = new MutationObserver(() => this.render());
            this.childObserver.observe(this, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['active', 'disabled']
            });
        }

        disconnectedCallback() {
            if (this.themeObserver) {
                this.themeObserver.disconnect();
            }
            if (this.attrObserver) {
                this.attrObserver.disconnect();
            }
            if (this.childObserver) {
                this.childObserver.disconnect();
            }
        }

        render() {
            const variant = this.getAttribute('variant');
            const size = this.getAttribute('size');

            const classes = ['tabs'];
            if (variant === 'boxed') classes.push('tabs-box');
            else if (variant === 'bordered') classes.push('tabs-border');
            else if (variant === 'lifted') classes.push('tabs-lift');
            if (size) classes.push(`tabs-${size}`);

            // Process light DOM children
            const tabElements = [];
            const contentElements = [];

            Array.from(this.children).forEach((child) => {
                if (child.tagName === 'LV-TAB') {
                    // Create proper button element
                    const button = document.createElement('button');
                    button.setAttribute('role', 'tab');
                    button.className = 'tab';

                    const active = child.getAttribute('active');
                    const disabled = child.getAttribute('disabled');

                    if (active === 'true' || active === '') {
                        button.classList.add('tab-active');
                    }
                    if (disabled === 'true' || disabled === '') {
                        button.classList.add('tab-disabled');
                        button.disabled = true;
                    }

                    // Copy content
                    button.textContent = child.textContent;

                    // Copy event handlers
                    if (child.onclick) {
                        button.onclick = child.onclick.bind(child);
                    }

                    tabElements.push(button);
                } else if (child.tagName === 'LV-TAB-CONTENT') {
                    const content = document.createElement('div');
                    content.setAttribute('role', 'tabpanel');
                    content.className = 'tab-content bg-base-100 border-base-300 p-6';
                    content.innerHTML = child.innerHTML;
                    contentElements.push(content);
                }
            });

            const themeWrapper = this.shadowRoot.querySelector('[data-theme]');
            if (themeWrapper) {
                const tablist = document.createElement('div');
                tablist.setAttribute('role', 'tablist');
                tablist.className = classes.join(' ');

                // Add tabs
                tabElements.forEach(tab => tablist.appendChild(tab));

                // Add content panels
                contentElements.forEach(content => tablist.appendChild(content));

                themeWrapper.innerHTML = '';
                themeWrapper.appendChild(tablist);
            }
        }

        static get observedAttributes() {
            return ['variant', 'size'];
        }

        attributeChangedCallback() {
            if (this.shadowRoot.querySelector('[data-theme]')) {
                this.render();
            }
        }
    }

    // lv-tab: Custom Element WITHOUT Shadow DOM (just enhanced HTML)
    class TabElement extends HTMLElement {
        connectedCallback() {
            this.setAttribute('role', 'tab');
            this.updateClasses();

            // Watch for attribute changes
            this.attrObserver = new MutationObserver(() => this.updateClasses());
            this.attrObserver.observe(this, {
                attributes: true,
                attributeFilter: ['active', 'disabled']
            });
        }

        disconnectedCallback() {
            if (this.attrObserver) {
                this.attrObserver.disconnect();
            }
        }

        updateClasses() {
            const classes = ['tab'];

            const active = this.getAttribute('active');
            const disabled = this.getAttribute('disabled');

            if (active === 'true' || active === '') {
                classes.push('tab-active');
            }
            if (disabled === 'true' || disabled === '') {
                classes.push('tab-disabled');
            }

            this.className = classes.join(' ');
        }

        static get observedAttributes() {
            return ['active', 'disabled'];
        }

        attributeChangedCallback() {
            this.updateClasses();
        }
    }

    // lv-tab-content: Custom Element WITHOUT Shadow DOM
    class TabContentElement extends HTMLElement {
        connectedCallback() {
            this.setAttribute('role', 'tabpanel');
            const classes = ['tab-content', 'bg-base-100', 'border-base-300', 'p-6'];
            this.className = classes.join(' ');
        }
    }

    // Register the custom elements
    if (!customElements.get('lv-tabs')) {
        customElements.define('lv-tabs', TabsElement);
    }
    if (!customElements.get('lv-tab')) {
        customElements.define('lv-tab', TabElement);
    }
    if (!customElements.get('lv-tab-content')) {
        customElements.define('lv-tab-content', TabContentElement);
    }
}

export default Tabs;
