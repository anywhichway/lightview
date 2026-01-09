const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

// Parse command line arguments
const args = process.argv.slice(2);
const envArg = args.find(arg => arg.startsWith('--env='));
const env = envArg ? envArg.split('=')[1] : 'prod';

// Validate env
const validEnvs = ['prod', 'test', 'dev'];
if (!validEnvs.includes(env)) {
    console.error(`Invalid env "${env}". Allowed values: ${validEnvs.join(', ')}`);
    process.exit(1);
}

const shouldMinify = env === 'prod';

const rootDir = __dirname;
const distDir = path.join(rootDir, 'dist');
const docsDir = path.join(rootDir, 'docs');
const componentsDir = path.join(rootDir, 'components');
const middlewareDir = path.join(rootDir, 'middleware');
const jprxDir = path.join(rootDir, 'jprx');

// Configuration
// Files in root that should be copied
const allowedExtensions = ['.html', '.js', '.css', '.txt', '.xml', '.ico', '.png', '.svg', '.jpg', '.jpeg', '.md'];
const includeFiles = ['_headers']; // specific files to always include
const excludeFiles = ['build.js', 'build-bundles.mjs', 'package.json', 'package-lock.json', 'wrangler.toml'];

/**
 * Minify a JavaScript file using terser
 * @param {string} code - The JavaScript source code
 * @returns {Promise<string>} - The minified code
 */
async function minifyJS(code) {
    if (!shouldMinify) {
        return code; // Skip minification in dev mode
    }
    try {
        const result = await minify(code, {
            module: true, // Handle ES6 module syntax
            compress: {
                drop_console: false
            },
            mangle: {
                reserved: ['examplify', 'examplifyIdCounter'] // Preserve global function names called from HTML
            }
        });
        return result.code;
    } catch (e) {
        console.error('Minification error:', e);
        return code; // Return original on error
    }
}

/**
 * Copy a file, minifying if it's a JS file (and minification is enabled)
 * @param {string} srcPath - Source file path
 * @param {string} destPath - Destination file path
 */
async function copyFile(srcPath, destPath) {
    const ext = path.extname(srcPath).toLowerCase();

    if (ext === '.js' && shouldMinify) {
        // Read, minify, and write JS files
        const code = fs.readFileSync(srcPath, 'utf8');
        const minified = await minifyJS(code);
        fs.writeFileSync(destPath, minified);
    } else {
        // Copy other files directly
        fs.copyFileSync(srcPath, destPath);
    }
}

/**
 * Recursively copy a directory, minifying JS files if enabled
 * @param {string} srcDir - Source directory
 * @param {string} destDir - Destination directory
 */
async function copyDirWithMinify(srcDir, destDir) {
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }

    const entries = fs.readdirSync(srcDir, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(srcDir, entry.name);
        const destPath = path.join(destDir, entry.name);

        if (entry.isDirectory()) {
            await copyDirWithMinify(srcPath, destPath);
        } else {
            await copyFile(srcPath, destPath);
        }
    }
}

async function build() {
    console.log(`Building for deployment (env: ${env}, minify: ${shouldMinify})...`);

    // 1. Clean/Create dist - continue even if deletion fails (e.g., file locks on Windows)
    if (fs.existsSync(distDir)) {
        try {
            fs.rmSync(distDir, { recursive: true, force: true });
            console.log('Cleaned dist directory.');
        } catch (e) {
            console.warn('Warning: Could not delete dist directory (files may be locked). Overwriting files instead.');
        }
    }

    if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir);
        console.log('Created dist directory.');
    }

    // 2. Copy Root Files (with minification for JS if enabled)
    const files = fs.readdirSync(rootDir);
    for (const file of files) {
        const srcPath = path.join(rootDir, file);
        const stat = fs.statSync(srcPath);

        if (stat.isFile()) {
            const ext = path.extname(file).toLowerCase();

            // Check if file should be copied
            const isAllowedExt = allowedExtensions.includes(ext);
            const isExplicitInclude = includeFiles.includes(file);
            const isExcluded = excludeFiles.includes(file) || file.startsWith('.');

            if ((isAllowedExt || isExplicitInclude) && !isExcluded) {
                await copyFile(srcPath, path.join(distDir, file));
                const suffix = ext === '.js' && shouldMinify ? ' (minified)' : '';
                console.log(`Copied: ${file}${suffix}`);
            }
        }
    }

    // 3. Copy Docs Directory
    if (fs.existsSync(docsDir)) {
        await copyDirWithMinify(docsDir, path.join(distDir, 'docs'));
        console.log(`Copied: docs directory${shouldMinify ? ' (JS files minified)' : ''}`);
    } else {
        console.warn('Warning: docs directory not found.');
    }

    // 4. Copy Components Directory
    if (fs.existsSync(componentsDir)) {
        await copyDirWithMinify(componentsDir, path.join(distDir, 'components'));
        console.log(`Copied: components directory${shouldMinify ? ' (JS files minified)' : ''}`);
    } else {
        console.warn('Warning: components directory not found.');
    }

    // 5. Copy Middleware Directory
    if (fs.existsSync(middlewareDir)) {
        await copyDirWithMinify(middlewareDir, path.join(distDir, 'middleware'));
        console.log(`Copied: middleware directory${shouldMinify ? ' (JS files minified)' : ''}`);
    } else {
        console.warn('Warning: middleware directory not found.');
    }



    // 7. Copy JPRX Directory
    if (fs.existsSync(jprxDir)) {
        await copyDirWithMinify(jprxDir, path.join(distDir, 'jprx'));
        console.log(`Copied: jprx directory${shouldMinify ? ' (JS files minified)' : ''}`);
    } else {
        console.warn('Warning: jprx directory not found.');
    }

    console.log('Build complete! Assets are ready in ./dist');
}

// Check for --watch flag
const isWatch = args.includes('--watch');

if (isWatch) {
    // Watch mode
    const { watch } = require('fs');
    const { execSync } = require('child_process');
    let debounceTimer;
    let building = false;
    let queued = false;
    let needsBundleRebuild = false;

    const runBuildBundles = () => {
        console.log('Rebuilding bundles...');
        try {
            execSync('node build-bundles.mjs', { cwd: rootDir, stdio: 'inherit' });
            console.log('Bundles rebuilt successfully.');
        } catch (e) {
            console.error('Bundle rebuild failed:', e.message);
        }
    };

    const runBuild = async () => {
        if (building) {
            queued = true;
            return;
        }
        building = true;
        try {
            if (needsBundleRebuild) {
                runBuildBundles();
                needsBundleRebuild = false;
            }
            await build();
        } catch (e) {
            console.error('Build failed:', e);
        }
        building = false;
        if (queued) {
            queued = false;
            runBuild();
        }
    };

    const watchDir = (dir, name, triggersBundleRebuild = false) => {
        if (fs.existsSync(dir)) {
            watch(dir, { recursive: true }, (event, filename) => {
                if (filename && !filename.includes('~') && !filename.includes('.git')) {
                    clearTimeout(debounceTimer);
                    if (triggersBundleRebuild) {
                        needsBundleRebuild = true;
                    }
                    debounceTimer = setTimeout(() => {
                        console.log(`\nChange detected in ${name}: ${filename}`);
                        runBuild();
                    }, 300);
                }
            });
            console.log(`Watching: ${name}${triggersBundleRebuild ? ' (triggers bundle rebuild)' : ''}`);
        }
    };

    console.log('Starting watch mode...\n');

    // Initial build (bundles already built by npm script)
    runBuild().then(() => {
        // Watch all relevant directories
        // src/ and jprx/ trigger bundle rebuilds
        watchDir(path.join(rootDir, 'src'), 'src/', true);
        watchDir(jprxDir, 'jprx/', true);
        // Other directories just get copied
        watchDir(docsDir, 'docs/');
        watchDir(componentsDir, 'components/');
        watchDir(middlewareDir, 'middleware/');
        console.log('\nWaiting for changes...');
    });
} else {
    // Single build
    build().catch(e => {
        console.error('Build failed:', e);
        process.exit(1);
    });
}
