import('/components/daisyui.js');

/**
 * Tabs Component - Refactored to use single implementation
 * Custom elements delegate to functional component for rendering
 */

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

    const { button } = tags;

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

    return button({
        role: 'tab',
        class: typeof active === 'function' || typeof disabled === 'function'
            ? () => getClasses()
            : getClasses(),
        ...rest
    }, ...children);
};

/**
 * Tab Content Panel
 */
Tabs.Content = (props = {}, ...children) => {
    const { tags } = globalThis.Lightview || {};
    if (!tags) return null;

    const { div } = tags;

    const {
        class: className = '',
        ...rest
    } = props;

    const classes = ['tab-content', 'bg-base-100', 'border-base-300', 'p-6'];
    if (className) classes.push(className);

    return div({
        role: 'tabpanel',
        class: classes.join(' '),
        ...rest
    }, ...children);
};

const tags = globalThis.Lightview.tags;
tags.Tabs = Tabs;
tags['Tabs.Tab'] = Tabs.Tab;
tags['Tabs.Content'] = Tabs.Content;

// Custom Element Factory - PROMOTED to LightviewX.customElementWrapper
// This local copy will use the global when lightview-x.js is rebuilt
function customElementWrapper(Component, config = {}) {
    const {
        attributeMap = {},
        childElements = {}
    } = config;

    return class extends HTMLElement {
        constructor() {
            super();
            this.attachShadow({ mode: 'open' });
        }

        connectedCallback() {
            this.render();

            // Observe attributes
            const attrs = Object.keys(attributeMap);
            if (attrs.length > 0) {
                this.attrObserver = new MutationObserver(() => this.render());
                this.attrObserver.observe(this, {
                    attributes: true,
                    attributeFilter: attrs
                });
            }

            // Observe children if specified
            if (Object.keys(childElements).length > 0) {
                this.childObserver = new MutationObserver(() => this.render());
                this.childObserver.observe(this, {
                    childList: true,
                    subtree: true,
                    attributes: true
                });
            }
        }

        disconnectedCallback() {
            if (this.attrObserver) this.attrObserver.disconnect();
            if (this.childObserver) this.childObserver.disconnect();
        }

        parseChildrenToVDOM() {
            return Array.from(this.children).map(child => {
                const tagName = child.tagName.toLowerCase();
                const componentInfo = childElements[tagName];

                if (!componentInfo) return null;

                const { component, attributeMap = {}, innerHTML = false } = componentInfo;
                const attributes = {};

                // Parse attributes based on map
                Object.entries(attributeMap).forEach(([attr, type]) => {
                    const value = child.getAttribute(attr);
                    if (value !== null) {
                        if (type === Boolean) {
                            attributes[attr] = value === 'true' || value === '';
                        } else if (type === Number) {
                            attributes[attr] = Number(value);
                        } else {
                            attributes[attr] = value;
                        }
                    }
                });

                // Copy event handlers
                if (child.onclick) attributes.onclick = child.onclick.bind(child);

                return {
                    tag: component,
                    attributes,
                    children: innerHTML ? [child.innerHTML] : [child.textContent]
                };
            }).filter(Boolean);
        }

        render() {
            // Build props from attributes
            const props = { useShadow: true };
            Object.entries(attributeMap).forEach(([attr, type]) => {
                const value = this.getAttribute(attr);
                if (value !== null) {
                    if (type === Boolean) {
                        props[attr] = value === 'true' || value === '';
                    } else if (type === Number) {
                        props[attr] = Number(value);
                    } else {
                        props[attr] = value;
                    }
                }
            });

            const vdomChildren = this.parseChildrenToVDOM();
            const result = Component(props, ...vdomChildren);

            // Use Lightview's internal rendering
            if (globalThis.Lightview?.internals?.setupChildren) {
                this.shadowRoot.innerHTML = '';
                globalThis.Lightview.internals.setupChildren([result], this.shadowRoot);
            }
        }

        static get observedAttributes() {
            return Object.keys(attributeMap);
        }

        attributeChangedCallback() {
            this.render();
        }
    };
}

// Register as Custom Elements using Factory
if (globalThis.LightviewX && typeof customElements !== 'undefined') {
    // Use global customElementWrapper from LightviewX (fallback to local if not rebuilt)
    const wrapper = globalThis.LightviewX.customElementWrapper || customElementWrapper;
    const TabsElement = wrapper(Tabs, {
        attributeMap: {
            variant: String,
            size: String
        },
        childElements: {
            'lv-tab': {
                component: Tabs.Tab,
                attributeMap: {
                    active: Boolean,
                    disabled: Boolean
                },
                innerHTML: false
            },
            'lv-tab-content': {
                component: Tabs.Content,
                attributeMap: {},
                innerHTML: true
            }
        }
    });

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
