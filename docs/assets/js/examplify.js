// Unique ID counter for iframe identification
var examplifyIdCounter = window.examplifyIdCounter || 0;
window.examplifyIdCounter = examplifyIdCounter;

function examplify(target, options = {}) {
    const { scripts, styles, modules, html, at, location = 'beforeBegin', type, height, minHeight = 100, maxHeight = Infinity, allowSameOrigin = false } = options;
    const originalContent = target.textContent;
    const autoResize = !height; // Auto-resize if no explicit height is provided
    const iframeId = `examplify-${++examplifyIdCounter}`;

    // 2. Create controls above the target
    const controls = document.createElement('div');
    const editable = target.getAttribute('contenteditable') == 'true';
    controls.className = 'examplify-controls';
    controls.innerHTML = `
        ${editable ? `<button class="examplify-btn examplify-run" title="Run">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
            </svg>
            <span>Run</span>
        </button>` : ''}
        <button class="examplify-btn examplify-copy" title="Copy">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            <span>Copy</span>
        </button>
        ${editable ? `<button class="examplify-btn examplify-reset" title="Reset">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
            </svg>
            <span>Reset</span>
        </button>` : ''}
    `;



    // Set up message listener for auto-resize
    if (autoResize) {
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'examplify-resize' && event.data.id === iframeId) {
                iframe.style.height = Math.max(minHeight, Math.min(event.data.height + 2, maxHeight)) + 'px';
            }
        });
    }

    // 3. Create iframe after target
    let iframe = createIframe(target.textContent);
    if (height) {
        iframe.style.height = height;
    }
    if (minHeight) {
        iframe.style.minHeight = minHeight;
    }
    if (maxHeight && maxHeight !== Infinity) {
        iframe.style.maxHeight = maxHeight;
    }
    (at || target).insertAdjacentElement(location, iframe);
    if (controls) {
        if (target.parentElement && target.parentElement.tagName === 'PRE') {
            target.parentElement.insertAdjacentElement('beforebegin', controls);
            target.parentElement.classList.add('examplify-parent');
            target.style.outline = 'none';
            target.style.border = 'none';
        } else {
            target.insertAdjacentElement('beforebegin', controls);
        }
    }

    function createIframe(content) {
        const frame = document.createElement('iframe');
        frame.className = 'examplify-iframe';
        frame.sandbox = `${allowSameOrigin ? 'allow-same-origin ' : ''}allow-scripts`;
        // Auto-resize script that posts height to parent
        const autoResizeScript = autoResize ? `
    <script>
        const frameId = '${iframeId}';
        function sendHeight() {
            const height = Math.max(
                document.body.scrollHeight,
                document.body.offsetHeight,
                document.documentElement.scrollHeight,
                document.documentElement.offsetHeight
            );
            parent.postMessage({ type: 'examplify-resize', id: frameId, height: height }, '*');
        }
        
        // Send height on load
        window.addEventListener('load', () => {
            sendHeight();
            // Also send after a delay to catch async content
            setTimeout(sendHeight, 300);
            setTimeout(sendHeight, 1000);
        });
        
        // Use ResizeObserver for dynamic content changes
        if (typeof ResizeObserver !== 'undefined') {
            const resizeObserver = new ResizeObserver(() => sendHeight());
            resizeObserver.observe(document.body);
        }
        
        // Also observe DOM mutations
        const mutationObserver = new MutationObserver(() => {
            setTimeout(sendHeight, 50);
        });
        mutationObserver.observe(document.body, { childList: true, subtree: true, attributes: true });
    <\/script>
` : '';

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
${html ? html : '<div id="example"></div>'}
<script ${type ? `type="${type}"` : ''}>const render = (content) => { const target = document.querySelector('#example'); target.innerHTML = ''; target.insertAdjacentElement('afterbegin', content.domEl || content)};${type === 'module' ? content : `window.addEventListener('load', async () => {${content}})`}<\/script>
${autoResizeScript}
</body>
</html>`;
        frame.srcdoc = doc;
        return frame;
    }

    // Event handlers
    // Event handlers
    if (controls) {
        const runBtn = controls.querySelector('.examplify-run');
        if (runBtn) {
            runBtn.addEventListener('click', () => {
                const newIframe = createIframe(target.textContent);
                iframe.parentNode.replaceChild(newIframe, iframe);
                iframe = newIframe;
            });
        }

        const copyBtn = controls.querySelector('.examplify-copy');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(target.textContent);
            });
        }

        const resetBtn = controls.querySelector('.examplify-reset');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                target.textContent = originalContent;
            });
        }
    }

    // Add styles
    const style = document.createElement('style');
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
            height: 50px;
            border: 1px solid #ccc;
            border-radius: 4px;
            margin-top: 0.5rem;
            transition: height 0.15s ease-out;
        }
        .examplify-parent {
            transition: outline 0.2s;
            border-radius: 4px;
        }
        .examplify-parent:hover {
            outline: 1px solid #ccc;
            cursor: text;
        }
    `;

    const insertionPoint = (target.parentElement && target.parentElement.tagName === 'PRE') ? target.parentElement : target;
    insertionPoint.insertAdjacentElement('beforebegin', style);

    return { controls, iframe, target };
}
