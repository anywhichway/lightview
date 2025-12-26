// Unique ID counter for iframe identification
var examplifyIdCounter = window.examplifyIdCounter || 0;
window.examplifyIdCounter = examplifyIdCounter;

function examplify(target, options = {}) {
    const { scripts, styles, modules, html, at, location = 'beforeBegin', type, height, minHeight = 100, maxHeight = Infinity, allowSameOrigin = false, language = 'js', autoRun = false } = options;
    const originalContent = target.textContent;
    const autoResize = !height; // Auto-resize if no explicit height is provided
    const iframeId = `examplify-${++examplifyIdCounter}`;

    // State
    let isRunning = false;

    // 2. Create controls above the target
    const controls = document.createElement('div');
    const editable = target.getAttribute('contenteditable') == 'true';
    controls.className = 'examplify-controls';

    // Controls HTML
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
        ${editable ? `<button class="examplify-btn examplify-reset" title="Reset" style="display: none;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
            </svg>
            <span>Reset</span>
        </button>` : ''}
    `;

    // 3. Create iframe after target (initially empty)
    let iframe = document.createElement('iframe');
    iframe.className = 'examplify-iframe';
    iframe.style.opacity = '1';
    iframe.style.background = '#f9fafb'; // Light gray placeholder
    iframe.style.border = '1px solid #e5e7eb';
    iframe.style.transition = 'opacity 0.2s ease-in, height 0.2s ease-out';
    iframe.sandbox = `${allowSameOrigin ? 'allow-same-origin ' : ''}allow-scripts`;

    if (height) iframe.style.height = height;
    if (minHeight) iframe.style.minHeight = typeof minHeight === 'number' ? `${minHeight}px` : minHeight;
    if (maxHeight && maxHeight !== Infinity) iframe.style.maxHeight = typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight;

    // Set initial placeholder height if not specified, to show it exists
    if (!height && !iframe.style.minHeight) {
        iframe.style.height = '100px';
    }

    // Insert elements
    const insertionPoint = (at || target);
    insertionPoint.insertAdjacentElement(location, iframe);

    if (target.parentElement && target.parentElement.tagName === 'PRE') {
        target.parentElement.insertAdjacentElement('beforebegin', controls);
        target.parentElement.classList.add('examplify-parent');
        target.style.outline = 'none';
        target.style.border = 'none';
    } else {
        target.insertAdjacentElement('beforebegin', controls);
    }

    // Styles
    // We add styles only if not present, to avoid duplication if called multiple times
    if (!document.getElementById('examplify-styles')) {
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
                border: 1px solid #e5e7eb;
                border-radius: 4px;
                background: #f9fafb;
                cursor: pointer;
                transition: all 0.2s;
                color: #374151;
            }
            .examplify-btn:hover {
                background: #f3f4f6;
                border-color: #d1d5db;
            }
            .examplify-iframe {
                width: 100%;
                border: 1px solid #e5e7eb;
                border-radius: 6px;
                margin-top: 0.5rem;
                background: white;
            }
            .examplify-parent {
                transition: outline 0.2s;
                border-radius: 4px;
            }
            .examplify-parent:hover {
                outline: 1px solid #d1d5db;
            }
        `;
        document.head.appendChild(style);
    }

    // Helper: Placeholder Content
    function getPlaceholderContent() {
        return `<!DOCTYPE html>
<html>
<head>
<style>
    body { 
        margin:0; padding:0; height:100vh; 
        display:flex; align-items:center; justify-content:center; 
        background:#f9fafb; color:#6b7280; 
        cursor:pointer; user-select:none; 
        font-family:system-ui,-apple-system,sans-serif; 
        transition: color 0.2s;
    }
    body:hover { color: #374151; }
    .content { display:flex; align-items:center; gap:0.5rem; font-size:0.875rem; font-weight: 500; }
</style>
</head>
<body onclick="parent.postMessage({type:'examplify-run-click', id:'${iframeId}'}, '*')">
    <div class="content">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
        </svg>
        <span>Click to run</span>
    </div>
</body>
</html>`;
    }

    // Helper: Generate Iframe Content
    function getIframeContent(codeContent) {
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
                
                window.addEventListener('load', () => {
                    sendHeight();
                    setTimeout(sendHeight, 300);
                    setTimeout(sendHeight, 1000);
                });
                
                if (typeof ResizeObserver !== 'undefined') {
                    const resizeObserver = new ResizeObserver(() => sendHeight());
                    resizeObserver.observe(document.body);
                }
                
                const mutationObserver = new MutationObserver(() => {
                    setTimeout(sendHeight, 50);
                });
                mutationObserver.observe(document.body, { childList: true, subtree: true, attributes: true });
            </script>
        ` : '';

        return `<!DOCTYPE html>
<html>
<head>
    <style>
        /* Hide body until stylesheets are loaded to prevent FOUC */
        body { 
            font-family: system-ui, -apple-system, sans-serif; 
            padding: 1rem; 
            margin: 0; 
            opacity: 0;
            transition: opacity 0.15s ease-in;
        }
        body.styles-ready { opacity: 1; }
    </style>
    ${styles ? styles.map(href => `<link rel="stylesheet" href="${href}">`).join('\n') : ''}
    <script>
        // Synchronously create the stylesheet-ready promise before any modules execute
        window.__stylesheetsReady = (function() {
            return new Promise(resolve => {
                // Use requestAnimationFrame to ensure DOM is ready for querying
                requestAnimationFrame(() => {
                    const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
                    if (links.length === 0) {
                        resolve();
                        return;
                    }
                    
                    let loaded = 0;
                    const checkDone = () => {
                        loaded++;
                        if (loaded >= links.length) resolve();
                    };
                    
                    links.forEach(link => {
                        if (link.sheet) {
                            checkDone();
                        } else {
                            link.addEventListener('load', checkDone);
                            link.addEventListener('error', checkDone);
                        }
                    });
                    
                    // Fallback timeout
                    setTimeout(resolve, 2000);
                });
            });
        })();
    <\/script>
    ${modules ? modules.map(src => `<script type="module" src="${src}"></script>`).join('\n') : ''}
    ${scripts ? scripts.map(src => `<script src="${src}"></script>`).join('\n') : ''}
    <script type="module">
        // Wait for stylesheets before initializing Lightview components
        await window.__stylesheetsReady;
        if (window.LightviewX) {
            await window.LightviewX.initComponents({ shadowDefault: true });
        }
    </script>
</head>
<body>
    ${language === 'html' ? codeContent : (html ? html : '<div id="example"></div>')}
    ${language === 'html' ? '' : `<script ${type ? `type="${type}"` : ''}>
        const render = (content) => { 
            const target = document.querySelector('#example'); 
            target.innerHTML = ''; 
            if (typeof content === 'string') {
                target.innerHTML = content;
            } else if (content && content.domEl) {
                target.insertAdjacentElement('afterbegin', content.domEl);
            } else if (content instanceof Node) {
                target.insertAdjacentElement('afterbegin', content);
            }
        };
        ${type === 'module' ? codeContent : `
            // Wait for stylesheets before running example code
            window.__stylesheetsReady.then(async () => {
                ${codeContent}
            });
        `}
    </script>`}
    ${autoResizeScript}
    <script>
        // Reveal body and signal ready only after stylesheets are loaded
        window.__stylesheetsReady.then(() => {
            document.body.classList.add('styles-ready');
            setTimeout(() => {
                parent.postMessage({ type: 'examplify-ready', id: '${iframeId}' }, '*');
            }, 50);
        });
    </script>
</body>
</html>`;
    }

    // Helper: Run
    function run() {
        const content = getIframeContent(target.textContent);
        iframe.style.background = '#fff';
        iframe.srcdoc = content;
        isRunning = true;
    }

    // Initialize: auto-run or show placeholder
    if (autoRun) {
        run();
    } else {
        iframe.srcdoc = getPlaceholderContent();
    }

    // Event Listeners
    const runBtn = controls.querySelector('.examplify-run');
    runBtn.addEventListener('click', run);

    const copyBtn = controls.querySelector('.examplify-copy');
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(target.textContent);

        // Feedback
        const originalHtml = copyBtn.innerHTML;
        copyBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Copied!</span>
        `;
        setTimeout(() => copyBtn.innerHTML = originalHtml, 2000);
    });

    if (editable) {
        const resetBtn = controls.querySelector('.examplify-reset');

        // Reset action
        resetBtn.addEventListener('click', () => {
            target.textContent = originalContent;
            resetBtn.style.display = 'none';
            // Force reset even if running to reflect text change if any, 
            // but actually we want to reset to original content AND re-run 
            // OR go back to placeholder?
            // Usually reset means "restore code to initial state".
            // If the user modified code, we reset text. 
            // If they want to run the original code, they should click run? 
            // Or should we auto-run? Use Case: "Reset" usually implies "Fix my broken code".
            // So re-running the original code makes sense.
            if (isRunning) run();
        });

        // Watch for changes
        target.addEventListener('input', () => {
            if (target.textContent !== originalContent) {
                resetBtn.style.display = 'inline-flex';
            } else {
                resetBtn.style.display = 'none';
            }
        });
    }

    // Global Message Listener (for resizing and run click)
    window.addEventListener('message', (event) => {
        if (!event.data || event.data.id !== iframeId) return;

        if (event.data.type === 'examplify-resize' && autoResize) {
            const h = event.data.height + 2; // buffer
            iframe.style.height = Math.max(minHeight, Math.min(h, maxHeight)) + 'px';
        }

        if (event.data.type === 'examplify-run-click') {
            run();
        }
    });

    return { controls, iframe, target, run };
}
