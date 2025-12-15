const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const distDir = path.join(rootDir, 'dist');
const docsDir = path.join(rootDir, 'docs');
const componentsDir = path.join(rootDir, 'components');

// Configuration
// Files in root that should be copied
const allowedExtensions = ['.html', '.js', '.css', '.txt', '.xml', '.ico', '.png', '.svg', '.jpg', '.jpeg', '.md'];
const includeFiles = ['_headers']; // specific files to always include
const excludeFiles = ['build.js', 'package.json', 'package-lock.json', 'wrangler.toml'];

console.log('Building for deployment...');

// 1. Clean/Create dist
if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir);
console.log('Created dist directory.');

// 2. Copy Root Files
const files = fs.readdirSync(rootDir);
files.forEach(file => {
    const srcPath = path.join(rootDir, file);
    const stat = fs.statSync(srcPath);

    if (stat.isFile()) {
        const ext = path.extname(file).toLowerCase();

        // Check if file should be copied
        const isAllowedExt = allowedExtensions.includes(ext);
        const isExplicitInclude = includeFiles.includes(file);
        const isExcluded = excludeFiles.includes(file) || file.startsWith('.');

        if ((isAllowedExt || isExplicitInclude) && !isExcluded) {
            fs.copyFileSync(srcPath, path.join(distDir, file));
            console.log(`Copied: ${file}`);
        }
    }
});

// 3. Copy Docs Directory
if (fs.existsSync(docsDir)) {
    fs.cpSync(docsDir, path.join(distDir, 'docs'), { recursive: true });
    console.log('Copied: docs directory');
} else {
    console.warn('Warning: docs directory not found.');
}

// 4. Copy Components Directory
if (fs.existsSync(componentsDir)) {
    fs.cpSync(componentsDir, path.join(distDir, 'components'), { recursive: true });
    console.log('Copied: components directory');
} else {
    console.warn('Warning: components directory not found.');
}

console.log('Build complete! Assets are ready in ./dist');
