import { build } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { copyFileSync, rmSync, existsSync } from 'fs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const isWatch = process.argv.includes('--watch');

const builds = [
    { entry: 'src/lightview.js', name: 'lightview', globalName: 'Lightview' },
    { entry: 'src/lightview-x.js', name: 'lightview-x', globalName: 'LightviewX' },
    { entry: 'src/lightview-cdom.js', name: 'lightview-cdom', globalName: 'LightviewCDOM' },
    { entry: 'src/lightview-all.js', name: 'lightview-all', globalName: 'LightviewAll' }
];

let building = false;
let queued = false;

async function runBuilds() {
    if (building) {
        queued = true;
        return;
    }
    building = true;

    console.log(isWatch ? 'Change detected. Rebuilding bundled files...' : 'Building bundles...');

    try {
        for (const b of builds) {
            // console.log(`Building ${b.name}...`);
            await build({
                configFile: false,
                logLevel: 'silent', // Reduce noise
                build: {
                    lib: {
                        entry: resolve(__dirname, b.entry),
                        name: b.globalName,
                        formats: ['iife'],
                        fileName: () => `${b.name}.js`
                    },
                    outDir: 'build_tmp',
                    // Don't clean here, clean manually
                    emptyOutDir: false,
                    rollupOptions: {
                        external: (id) => id.includes('/components/') || id.includes('/docs/')
                    },
                    minify: 'terser',
                    terserOptions: {
                        compress: {
                            drop_console: false
                        }
                    }
                }
            });
        }

        // Copy files
        for (const b of builds) {
            try {
                const src = resolve(__dirname, `build_tmp/${b.name}.js`);
                const dest = resolve(__dirname, `${b.name}.js`);
                if (existsSync(src)) {
                    copyFileSync(src, dest);
                    console.log(`Updated ${b.name}.js`);
                } else {
                    console.error(`Missing built file: ${src}`);
                }
            } catch (e) {
                console.error(`Failed to copy ${b.name}.js`, e);
            }
        }

        // Cleanup
        if (existsSync(resolve(__dirname, 'build_tmp'))) {
            rmSync(resolve(__dirname, 'build_tmp'), { recursive: true, force: true });
        }
    } catch (e) {
        console.error('Build error:', e);
    }

    building = false;
    if (queued) {
        queued = false;
        runBuilds();
    } else {
        if (isWatch) console.log('Waiting for changes...');
    }
}

// Initial run
runBuilds();

if (isWatch) {
    console.log('Watching src/ for changes...');
    // Dynamic import to avoid errors if run in environment without fs (unlikely here but good practice)
    const { watch } = await import('fs');
    let debounceTimer;

    // Watch src directory
    // Note: recursive option for Linux requires Node 20+, Windows/macOS supported earlier.
    watch(resolve(__dirname, 'src'), { recursive: true }, (event, filename) => {
        if (filename && !filename.includes('~')) {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                runBuilds();
            }, 300); // 300ms debounce
        }
    });
}
