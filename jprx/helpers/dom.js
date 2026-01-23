/**
 * DOM-related JPRX helpers for navigating and querying the DOM structure.
 */

/**
 * Registers DOM-related helpers including the xpath() helper.
 * @param {Function} registerHelper - The helper registration function
 */
export const registerDOMHelpers = (registerHelper) => {
    /**
     * Evaluates an XPath expression against the current DOM element.
     * Returns a computed signal that re-evaluates when observed nodes change.
     * Only supports backward-looking axes (parent, ancestor, preceding-sibling, etc.)
     * 
     * @param {string} expression - The XPath expression to evaluate
     * @param {object} context - The evaluation context (contains __node__)
     * @returns {any} The result of the XPath evaluation
     */
    registerHelper('xpath', function (expression) {
        const domNode = this; // 'this' is bound to the DOM element

        if (!domNode || !(domNode instanceof Element)) {
            console.warn('[Lightview-CDOM] xpath() called without valid DOM context');
            return '';
        }

        // Validate the expression (no forward-looking axes)
        const forbiddenAxes = /\b(child|descendant|following|following-sibling)::/;
        if (forbiddenAxes.test(expression)) {
            console.error(`[Lightview-CDOM] xpath(): Forward-looking axes not allowed: ${expression}`);
            return '';
        }

        const hasShorthandChild = /\/[a-zA-Z]/.test(expression) && !expression.startsWith('/html');
        if (hasShorthandChild) {
            console.error(`[Lightview-CDOM] xpath(): Shorthand child axis (/) not allowed: ${expression}`);
            return '';
        }

        // Get Lightview's computed function
        const LV = globalThis.Lightview;
        if (!LV || !LV.computed) {
            console.warn('[Lightview-CDOM] xpath(): Lightview not available');
            return '';
        }

        // Return a computed signal that evaluates the XPath
        return LV.computed(() => {
            try {
                const result = document.evaluate(
                    expression,
                    domNode,
                    null,
                    XPathResult.STRING_TYPE,
                    null
                );

                // TODO: Set up MutationObserver for reactivity
                // For now, this just evaluates once
                // Future: Observe parent/ancestor/sibling changes

                return result.stringValue;
            } catch (e) {
                console.error(`[Lightview-CDOM] xpath() evaluation failed:`, e.message);
                return '';
            }
        });
    }, { pathAware: false });
};
