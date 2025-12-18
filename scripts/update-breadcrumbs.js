/**
 * Script to update all component example files to use the Lightview Breadcrumbs component
 * instead of static DaisyUI breadcrumbs.
 */

const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, '..', 'docs', 'components');

// Get component name from filename (e.g., "chart-area.html" -> "Chart Area")
function toTitleCase(filename) {
    const name = filename.replace('.html', '');
    return name
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Pattern to match the old breadcrumbs (with or without comment)
const breadcrumbsPatternWithComment = /\s*<!-- Breadcrumbs -->\r?\n\s*<div class="breadcrumbs text-sm mb-4">\r?\n\s*<ul>\r?\n\s*<li><a href="\/docs\/components">Components<\/a><\/li>\r?\n\s*<li>[^<]+<\/li>\r?\n\s*<\/ul>\r?\n\s*<\/div>/;

const breadcrumbsPatternWithoutComment = /(\s*)<div class="breadcrumbs text-sm mb-4">\r?\n\s*<ul>\r?\n\s*<li><a href="\/docs\/components">Components<\/a><\/li>\r?\n\s*<li>([^<]+)<\/li>\r?\n\s*<\/ul>\r?\n\s*<\/div>/;

// Generate the new Lightview Breadcrumbs replacement
function generateReplacement(componentName, indent = '        ') {
    return `${indent}<!-- Breadcrumbs -->
${indent}<div id="page-breadcrumbs" class="mb-4"></div>
${indent}<script type="module">
${indent}    const { $ } = Lightview;
${indent}    const { default: Breadcrumbs } = await import('/components/navigation/breadcrumbs.js');
${indent}    
${indent}    const breadcrumbs = Breadcrumbs({
${indent}        items: [
${indent}            { label: 'Components', href: '/docs/components' },
${indent}            { label: '${componentName}' }
${indent}        ]
${indent}    });
${indent}    
${indent}    $('#page-breadcrumbs').content(breadcrumbs);
${indent}</script>`;
}

// Skip already updated files (check if they already have page-breadcrumbs)
function isAlreadyUpdated(content) {
    return content.includes('id="page-breadcrumbs"');
}

// Skip index.html as it's the gallery, not a component page
const skipFiles = ['index.html'];

// Process all HTML files in the components directory
const files = fs.readdirSync(componentsDir).filter(file =>
    file.endsWith('.html') && !skipFiles.includes(file)
);

let updatedCount = 0;
let skippedCount = 0;
let errorCount = 0;

files.forEach(file => {
    const filePath = path.join(componentsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    const componentName = toTitleCase(file);

    // Skip if already updated
    if (isAlreadyUpdated(content)) {
        console.log(`⏭️  Skipping ${file} (already updated)`);
        skippedCount++;
        return;
    }

    // Try to match with comment first
    let matched = false;
    if (breadcrumbsPatternWithComment.test(content)) {
        content = content.replace(breadcrumbsPatternWithComment, '\n' + generateReplacement(componentName));
        matched = true;
    }

    // Try without comment if no match
    if (!matched && breadcrumbsPatternWithoutComment.test(content)) {
        const match = content.match(breadcrumbsPatternWithoutComment);
        const indent = match[1].replace(/\r?\n/g, '');
        content = content.replace(breadcrumbsPatternWithoutComment, '\n' + generateReplacement(componentName, indent));
        matched = true;
    }

    if (matched) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Updated ${file}`);
        updatedCount++;
    } else {
        console.log(`❌ Could not find breadcrumbs pattern in ${file}`);
        errorCount++;
    }
});

console.log('\n--- Summary ---');
console.log(`Updated: ${updatedCount}`);
console.log(`Skipped: ${skippedCount}`);
console.log(`Errors: ${errorCount}`);
console.log(`Total files: ${files.length}`);
