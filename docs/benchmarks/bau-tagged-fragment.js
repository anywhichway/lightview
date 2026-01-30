(async function () {
    // In ES modules, document.currentScript is null, so we use import.meta.url
    const urlParams = new URLSearchParams(import.meta.url.split('?')[1]);
    const count = parseInt(urlParams.get('count')) || 1000;

    // Settle inside the script context
    if (window.gc) window.gc();
    await new Promise(r => setTimeout(r, 100));

    const start = performance.now();

    // Import Bau from CDN
    const { default: Bau } = await import('https://cdn.jsdelivr.net/npm/@grucloud/bau@0.106.0/+esm');
    const bau = Bau();
    const { section, header, h2, h3, div, article, p, span, footer } = bau.tags;

    const items = [];
    for (let i = 0; i < count; i++) {
        items.push(article({ class: 'item-card' },
            header(h3({ class: 'item-title' }, `Item ${i}`)),
            div({ class: 'item-content' }, p({ class: 'item-description' }, `Detailed description for item ${i} in the benchmark list.`)),
            footer({ class: 'item-footer' }, span(`Metadata for item ${i}`))
        ));
    }
    const fragment = section({ class: 'benchmark-container' },
        header(h2('Benchmark Results')),
        div({ class: 'items-grid' }, ...items)
    );
    const target = document.getElementById('benchmark-target');
    target.replaceChildren(fragment);

    const end = performance.now();

    // Store timing in a global for the driver to pick up
    window.__bauTaggedBenchmarkTime = end - start;

    // Signal completion
    if (window.__resolveBauTaggedBenchmark) {
        window.__resolveBauTaggedBenchmark();
    }
})();
