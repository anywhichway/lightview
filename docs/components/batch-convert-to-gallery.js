#!/usr/bin/env node

/**
 * Batch convert component HTML files to gallery layout with slide-out drawer
 * This script finds all component files still using the old <div class="section"> pattern
 * and converts them to the new gallery layout
 */

const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname);

// Files to exclude (already converted or special files)
const excludeFiles = new Set([
    'component-nav.html',
    'index.html',
    'index.css',
    'sidebar-setup.js',
    'batch-convert-to-gallery.js',
    'convert-to-gallery-layout.ps1'
]);

// Get all HTML files in the components directory
const files = fs.readdirSync(componentsDir)
    .filter(file => file.endsWith('.html') && !excludeFiles.has(file));

console.log(`Found ${files.length} HTML files to check\n`);

let convertedCount = 0;
let skippedCount = 0;
let errorCount = 0;

files.forEach(fileName => {
    const filePath = path.join(componentsDir, fileName);

    try {
        let content = fs.readFileSync(filePath, 'utf8');

        // Check if file still uses old pattern
        if (!content.includes('<div class="section">')) {
            console.log(`⏭️  SKIP: ${fileName} (already converted)`);
            skippedCount++;
            return;
        }

        console.log(`🔄 Converting: ${fileName}...`);

        // Extract component name from filename
        const componentName = fileName
            .replace('.html', '')
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

        // Extract description paragraph if it exists
        const descMatch = content.match(/<p class="text-lg"[^>]*>\s*([\s\S]*?)\s*<\/p>/);
        const description = descMatch ? descMatch[1].trim() : 'Component description';

        // Pattern 1: Replace old section opening
        // This regex captures everything from <div class="section"> to the description </p>
        const oldSectionRegex = /<div class="section">\s*<div class="section-content"[^>]*>[\s\S]*?(?:<script type="module">[\s\S]*?<\/script>|<script>[\s\S]*?<\/script>)\s*(?:<h1>.*?<\/h1>)?\s*<p class="text-lg"[^>]*>[\s\S]*?<\/p>/;

        const newSectionOpening = `<!-- Gallery Structure -->
<div class="gallery-page">
    <div class="gallery-layout">
        <!-- Sidebar Overlay -->
        <div id="sidebar-overlay" class="sidebar-overlay"></div>

        <!-- Sidebar -->
        <div id="gallery-sidebar" class="gallery-sidebar" style="visibility: hidden" src="./component-nav.html"></div>

        <!-- Main Content -->
        <div id="gallery-main" class="gallery-main">
            <!-- Header Container -->
            <div
                style="position: sticky; top: 0; z-index: 30; background: var(--gallery-surface); border-bottom: 1px solid var(--gallery-border); backdrop-filter: blur(8px);">
                <!-- Breadcrumbs Row -->
                <div style="padding: 0.75rem 1.5rem 0;">
                    <script>
                        (() => {
                            const { Breadcrumbs } = Lightview.tags;
                            const breadcrumbs = Breadcrumbs({
                                id: 'page-breadcrumbs',
                                items: [
                                    { label: 'Components', href: '/docs/components' },
                                    { label: '${componentName}' }
                                ]
                            });
                            document.currentScript.replaceWith(breadcrumbs.domEl);
                        })();
                    </script>
                </div>
                <!-- Title Row -->
                <div class="gallery-header"
                    style="border-bottom: none; height: auto; padding-top: 0.5rem; padding-bottom: 0.75rem;">
                    <button id="toggle-btn" class="toggle-btn" aria-label="Toggle Sidebar">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="toggle-icon"
                            style="stroke: currentColor; stroke-width: 2;">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
                            <path stroke-linecap="round" stroke-linejoin="round" d="M11 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 class="gallery-title">${componentName}</h1>
                </div>
            </div>

            <!-- Content -->
            <div class="gallery-content">
                <div class="section-content" style="max-width: 1000px;">
                    <p class="text-lg" style="opacity: 0.7; margin-bottom: 1.5rem;">
                        ${description}
                    </p>`;

        if (oldSectionRegex.test(content)) {
            content = content.replace(oldSectionRegex, newSectionOpening);
        } else {
            console.log(`   ⚠️  WARNING: Could not find old section pattern in ${fileName}`);
        }

        // Pattern 2: Replace old section closing
        // Look for the closing tags at the end of the file (with possible extra whitespace/newlines)
        const oldClosingRegex = /\s*<\/div>\s*\r?\n\s*\r?\n\s*\r?\n?\s*<\/div>\s*\r?\n<\/div>\s*$/;
        const newClosing = `                </div>
            </div>
        </div>
    </div>
</div>`;

        content = content.replace(oldClosingRegex, newClosing);

        // Write the updated content back to the file
        fs.writeFileSync(filePath, content, 'utf8');

        console.log(`   ✅ Successfully converted ${fileName}`);
        convertedCount++;

    } catch (error) {
        console.error(`   ❌ ERROR converting ${fileName}:`, error.message);
        errorCount++;
    }
});

console.log('\n' + '='.repeat(60));
console.log('BATCH CONVERSION COMPLETE');
console.log('='.repeat(60));
console.log(`✅ Converted:  ${convertedCount} files`);
console.log(`⏭️  Skipped:    ${skippedCount} files (already converted)`);
console.log(`❌ Errors:     ${errorCount} files`);
console.log(`📊 Total:      ${files.length} files processed`);
console.log('='.repeat(60));

if (convertedCount > 0) {
    console.log('\n✨ All component files have been updated to use the gallery layout!');
    console.log('🎯 The slide-out drawer navigation is now available on all pages.');
}
