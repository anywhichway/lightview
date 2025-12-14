function examplify(target, options = {}) {
    const { scripts, styles, modules, html, location = 'beforeEnd', type, height, allowSameOrigin = false } = options;
    const originalContent = target.textContent;


    // 2. Create controls above the target
    let controls;
    if (target.getAttribute('contenteditable') == 'true') {
        controls = document.createElement('div');
        controls.className = 'examplify-controls';
        controls.innerHTML = `
            <button class="examplify-btn examplify-run" title="Run">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                </svg>
                <span>Run</span>
            </button>
            <button class="examplify-btn examplify-copy" title="Copy">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                <span>Copy</span>
            </button>
            <button class="examplify-btn examplify-reset" title="Reset">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                    <path d="M3 3v5h5"/>
                </svg>
                <span>Reset</span>
            </button>
        `;

    }

    // 3. Create iframe after target
    let iframe = createIframe(target.textContent);
    if (height) {
        iframe.style.height = height;
    }
    target.insertAdjacentElement(location, iframe);
    if (controls) {
        target.insertAdjacentElement('beforebegin', controls);
    }

    function createIframe(content) {
        const frame = document.createElement('iframe');
        frame.className = 'examplify-iframe';
        frame.sandbox = `${allowSameOrigin ? 'allow-same-origin ' : ''}allow-scripts`;

        const doc = `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: system-ui, sans-serif; padding: 1rem; margin: 0; }
    </style>
    ${styles ? styles.map(href => `<link rel="stylesheet" href="${href}">`).join('\n') : ''}
    ${modules ? modules.map(src => `<script type="module" src="${src}"><\/script>`).join('\n') : ''}
    ${scripts ? scripts.map(src => `<script src="${src}"><\/script>`).join('\n') : ''}
</head>
<body>
${html ? html : ''}
<script ${type ? `type="${type}"` : ''}>(async () => {${content}})()<\/script>
</body>
</html>`;

        frame.srcdoc = doc;
        return frame;
    }

    // Event handlers
    if (controls) {
        controls.querySelector('.examplify-run').addEventListener('click', () => {
            const newIframe = createIframe(target.textContent);
            iframe.parentNode.replaceChild(newIframe, iframe);
            iframe = newIframe;
        });

        controls.querySelector('.examplify-copy').addEventListener('click', () => {
            navigator.clipboard.writeText(target.textContent);
        });

        controls.querySelector('.examplify-reset').addEventListener('click', () => {
            target.textContent = originalContent;
        });
    }

    // Add styles if not already added
    if (!document.querySelector('#examplify-styles')) {
        const style = document.createElement('style');
        style.id = 'examplify-styles';
        style.textContent = `
            .examplify-controls {
                display: flex;
                gap: 0.5rem;
                margin-bottom: 0.5rem;
            }
            .examplify-btn {
                display: inline-flex;
                align-items: center;
                gap: 0.25rem;
                padding: 0.25rem 0.5rem;
                font-size: 0.75rem;
                border: 1px solid #ccc;
                border-radius: 4px;
                background: #f5f5f5;
                cursor: pointer;
                transition: background 0.2s;
            }
            .examplify-btn:hover {
                background: #e5e5e5;
            }
            .examplify-iframe {
                width: 100%;
                min-height: 150px;
                border: 1px solid #ccc;
                border-radius: 4px;
                margin-top: 0.5rem;
            }
        `;
        document.head.appendChild(style);
    }

    return { controls, iframe, target };
}
