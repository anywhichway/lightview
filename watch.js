const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = __dirname;
const distDir = path.join(rootDir, 'dist');

// Configuration (must match build.js)
const allowedExtensions = ['.html', '.js', '.css', '.txt', '.xml', '.ico', '.png', '.svg', '.jpg', '.jpeg', '.md'];
const includeFiles = ['_headers'];
const excludeFiles = ['build.js', 'watch.js', 'package.json', 'package-lock.json', 'wrangler.toml'];
const allowedDirs = ['docs', 'components', 'middleware'];

function build() {
    try {
        console.log('Running full build...');
        execSync('node build.js', { stdio: 'inherit' });
    } catch (e) {
        console.error('Build failed:', e);
    }
}

function copyFile(srcPath, relativePath) {
    try {
        const destPath = path.join(distDir, relativePath);
        const destDir = path.dirname(destPath);

        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }

        fs.copyFileSync(srcPath, destPath);
        console.log(`Updated: ${relativePath}`);
    } catch (err) {
        // Ignore errors for deleted files or temporary locks
        if (err.code !== 'ENOENT' && err.code !== 'EBUSY') {
            console.error(`Error copying ${relativePath}:`, err.message);
        }
    }
}

// Initial build
build();

console.log('Watching for changes...');

fs.watch(rootDir, { recursive: true }, (eventType, filename) => {
    if (!filename) return;

    // Ignore .git, node_modules, dist, etc.
    if (filename.startsWith('.git') ||
        filename.startsWith('node_modules') ||
        filename.startsWith('dist') ||
        filename.startsWith('.gemini')) {
        return;
    }

    const srcPath = path.join(rootDir, filename);
    const parts = filename.split(path.sep);
    const topLevel = parts[0];

    // Check if it's in one of the allowed directories
    if (allowedDirs.includes(topLevel)) {
        // Check if file exists to handle deletions gracefully
        if (fs.existsSync(srcPath)) {
            copyFile(srcPath, filename);
        }
        return;
    }

    // Check if it's a file in the root directory
    if (parts.length === 1) {
        const ext = path.extname(filename).toLowerCase();
        const isAllowedExt = allowedExtensions.includes(ext);
        const isExplicitInclude = includeFiles.includes(filename);
        const isExcluded = excludeFiles.includes(filename) || filename.startsWith('.');

        if ((isAllowedExt || isExplicitInclude) && !isExcluded) {
            if (fs.existsSync(srcPath)) {
                copyFile(srcPath, filename);
            }
        }
    }
});
