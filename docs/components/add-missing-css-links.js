#!/usr/bin/env node

/**
 * Add missing index.css link to component HTML files
 * This script finds all component files missing the CSS link and adds it
 */

const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname);

// Files to exclude
const excludeFiles = new Set([
    'component-nav.html',
    'index.css',
    'sidebar-setup.js',
    'batch-convert-to-gallery.js',
    'batch-convert-v2.js',
    'convert-to-gallery-layout.ps1',
    'add-missing-css-links.js'
]);

// Get all HTML files in the components directory
const files = fs.readdirSync(componentsDir)
    .filter(file => file.endsWith('.html') && !excludeFiles.has(file));

console.log(`Found ${files.length} HTML files to check\n`);

let fixedCount = 0;
let skippedCount = 0;

files.forEach(fileName => {
    const filePath = path.join(componentsDir, fileName);

    try {
        let content = fs.readFileSync(filePath, 'utf8');

        // Check if file already has the CSS link
        if (content.includes('href="./index.css"')) {
            console.log(`⏭️  SKIP: ${fileName} (already has CSS link)`);
            skippedCount++;
            return;
        }

        console.log(`🔧 Fixing: ${fileName}...`);

        // Find the position after </script> and before <!-- Gallery Structure -->
        const insertPoint = content.indexOf('<!-- Gallery Structure -->');

        if (insertPoint === -1) {
            console.log(`   ⚠️  WARNING: Could not find insertion point in ${fileName}`);
            return;
        }

        // Insert the CSS link before <!-- Gallery Structure -->
        const cssLink = `<!-- Load the page-specific stylesheet -->
<link rel="stylesheet" href="./index.css">

`;

        content = content.substring(0, insertPoint) + cssLink + content.substring(insertPoint);

        // Write the updated content back to the file
        fs.writeFileSync(filePath, content, 'utf8');

        console.log(`   ✅ Added CSS link to ${fileName}`);
        fixedCount++;

    } catch (error) {
        console.error(`   ❌ ERROR processing ${fileName}:`, error.message);
    }
});

console.log('\n' + '='.repeat(60));
console.log('CSS LINK FIX COMPLETE');
console.log('='.repeat(60));
console.log(`✅ Fixed:   ${fixedCount} files`);
console.log(`⏭️  Skipped: ${skippedCount} files (already had CSS link)`);
console.log(`📊 Total:   ${files.length} files processed`);
console.log('='.repeat(60));
