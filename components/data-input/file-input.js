/**
 * Lightview Components - FileInput
 * A file input component using DaisyUI 5 styling
 * @see https://daisyui.com/components/file-input/
 * 
 * Uses DaisyUI's fieldset pattern:
 * <fieldset class="fieldset">
 *     <legend class="fieldset-legend">Label</legend>
 *     <input type="file" class="file-input" />
 *     <p class="label">Helper text</p>
 * </fieldset>
 */

import '../daisyui.js';

/**
 * FileInput Component
 * @param {Object} props - FileInput properties
 * @param {string} props.size - 'xs' | 'sm' | 'md' | 'lg' (default: 'md')
 * @param {string} props.color - 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error'
 * @param {boolean} props.ghost - Ghost style (no background)
 * @param {boolean} props.disabled - Disable file input
 * @param {boolean} props.required - Required field
 * @param {string} props.accept - Accepted file types (e.g., '.pdf,.doc', 'image/*')
 * @param {boolean} props.multiple - Allow multiple file selection
 * @param {string} props.label - Label text
 * @param {string} props.helper - Helper text
 * @param {string|Function} props.error - Error message
 * @param {Function} props.validate - Validation function (files) => errorMessage | null
 * @param {Function} props.onChange - Change handler (files, event) => void
 * @param {boolean} props.useShadow - Render in Shadow DOM
 */
const FileInput = (props = {}) => {
    const { tags, signal } = window.Lightview || {};
    const LVX = window.LightviewX || {};

    if (!tags) {
        console.error('Lightview not found');
        return null;
    }

    const { div, input, fieldset, legend, p, span, shadowDOM } = tags;

    const {
        size = 'md',
        color,
        ghost = false,
        disabled = false,
        required = false,
        accept,
        multiple = false,
        label: labelText,
        helper,
        error,
        validate,
        onChange,
        name,
        id,
        class: className = '',
        useShadow,
        ...rest
    } = props;

    const fileInputId = id || `file-input-${Math.random().toString(36).slice(2, 9)}`;

    // Internal state
    const internalError = signal ? signal(null) : { value: null };

    const getError = () => {
        if (error) {
            const err = typeof error === 'function' ? error() : error;
            if (err) return err;
        }
        return internalError.value;
    };

    const handleChange = (e) => {
        const files = e.target.files;

        // Validation
        if (validate) {
            const validationError = validate(files);
            internalError.value = validationError;
        } else if (required && (!files || files.length === 0)) {
            internalError.value = 'Please select a file';
        } else {
            internalError.value = null;
        }

        if (onChange) onChange(files, e);
    };

    // Build DaisyUI file-input classes
    const getFileInputClass = () => {
        const classes = ['file-input', 'w-full'];

        // Ghost style
        if (ghost) {
            classes.push('file-input-ghost');
        }

        // Size
        if (size && size !== 'md') {
            classes.push(`file-input-${size}`);
        }

        // Color
        if (color) {
            classes.push(`file-input-${color}`);
        }

        // Error state
        const currentError = getError();
        if (currentError) {
            classes.push('file-input-error');
        }

        return classes.join(' ');
    };

    const fileInputEl = input({
        type: 'file',
        class: validate || error ? () => getFileInputClass() : getFileInputClass(),
        accept,
        multiple,
        disabled,
        required,
        name,
        id: fileInputId,
        onchange: handleChange,
        'aria-invalid': () => !!getError(),
        ...rest
    });

    // If no label and no helper, return just the file input
    if (!labelText && !helper && !validate && !error) {
        let usesShadow = false;
        if (LVX.shouldUseShadow) {
            usesShadow = LVX.shouldUseShadow(useShadow);
        } else {
            usesShadow = useShadow === true;
        }

        if (usesShadow) {
            const adoptedStyleSheets = LVX.getAdoptedStyleSheets ? LVX.getAdoptedStyleSheets() : [];
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';

            return div({ class: 'content', style: 'display: inline-block' },
                shadowDOM({ mode: 'open', adoptedStyleSheets },
                    div({ 'data-theme': currentTheme }, fileInputEl)
                )
            );
        }

        return fileInputEl;
    }

    // Build the component using DaisyUI fieldset pattern
    const fieldsetContent = [];

    // Legend/Label
    if (labelText) {
        fieldsetContent.push(
            legend({ class: 'fieldset-legend' },
                labelText,
                required ? span({ class: 'text-error' }, ' *') : null
            )
        );
    }

    // File input element
    fieldsetContent.push(fileInputEl);

    // Helper or error text
    if (helper || validate || error) {
        fieldsetContent.push(
            () => {
                const currentError = getError();
                if (currentError) {
                    return p({
                        class: 'label text-error',
                        role: 'alert'
                    }, currentError);
                }
                if (helper) {
                    return p({ class: 'label' }, helper);
                }
                return null;
            }
        );
    }

    // Wrapper
    const wrapperEl = fieldset({
        class: `fieldset ${className}`.trim()
    }, ...fieldsetContent);

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
                div({ 'data-theme': currentTheme }, wrapperEl)
            )
        );
    }

    return wrapperEl;
};

// Auto-register
window.Lightview.tags.FileInput = FileInput;

export default FileInput;
