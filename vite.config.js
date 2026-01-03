import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        lib: {
            // Define multiple entry points
            entry: {
                'lightview': resolve(__dirname, 'lightview.js'),
                'lightview-x': resolve(__dirname, 'lightview-x.js'),
                'lightview-cdom': resolve(__dirname, 'lightview-cdom.js'),
                'lightview-all': resolve(__dirname, 'lightview-all.js')
            },
            name: 'Lightview',
            formats: ['iife', 'es'],
            fileName: (format, entryName) => `${entryName}.${format === 'iife' ? 'js' : 'mjs'}`
        },
        outDir: 'dist',
        rollupOptions: {
            // Ensure components and docs are NOT part of the library bundle
            external: (id) => id.includes('/components/') || id.includes('/docs/'),
            output: {
                // Handle global names for IIFE builds
                globals: {
                    'lightview': 'Lightview',
                    'lightview-x': 'LightviewX',
                    'lightview-cdom': 'LightviewCDOM'
                },
                extend: true
            }
        },
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: false, // Keep console warnings for now
                pure_funcs: ['console.debug']
            }
        }
    },
    test: {
        environment: 'jsdom',
        globals: true,
        include: ['tests/**/*.test.js']
    },
    server: {
        open: '/docs/index.html',
        watch: {
            usePolling: true
        }
    }
});
