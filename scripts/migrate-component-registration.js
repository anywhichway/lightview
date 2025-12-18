/**
 * Script to migrate component files from old LightviewX registration to new Lightview.tags registration
 * 
 * Replaces:
 *   if (typeof window !== 'undefined' && window.LightviewX) {
 *       window.LightviewX.registerComponent('ComponentName', ComponentName);
 *   }
 * 
 * With:
 *   window.Lightview.tags.ComponentName = ComponentName;
 */

const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, '..', 'components');

// Recursively find all .js files
function findJsFiles(dir) {
    const files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...findJsFiles(fullPath));
        } else if (entry.name.endsWith('.js')) {
            files.push(fullPath);
        }
    }
    return files;
}

// Pattern to match the old registration block
// Matches:
// if (typeof window !== 'undefined' && window.LightviewX) {
//     window.LightviewX.registerComponent('ComponentName', ComponentName);
//     window.LightviewX.registerComponent('ComponentName2', ComponentName2); // multiple possible
// }
const oldPatternRegex = /if\s*\(\s*typeof\s+window\s*!==\s*['"]undefined['"]\s*&&\s*window\.LightviewX\s*\)\s*\{\s*([\s\S]*?window\.LightviewX\.registerComponent[\s\S]*?)\}/g;

// Pattern to extract individual registerComponent calls
const registerComponentRegex = /window\.LightviewX\.registerComponent\s*\(\s*['"](\w+)['"]\s*,\s*(\w+)\s*\)/g;

function migrateFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;

    // Check if file has the old pattern
    if (!content.includes('window.LightviewX.registerComponent')) {
        return { modified: false, file: filePath };
    }

    // Check if file already has new pattern
    if (content.includes('window.Lightview.tags.')) {
        console.log(`Skipping ${filePath} - already has new pattern`);
        return { modified: false, file: filePath, reason: 'already migrated' };
    }

    // Extract component names from registerComponent calls
    const registrations = [];
    let match;
    while ((match = registerComponentRegex.exec(content)) !== null) {
        registrations.push({
            name: match[1],
            variable: match[2]
        });
    }

    if (registrations.length === 0) {
        return { modified: false, file: filePath, reason: 'no registrations found' };
    }

    // Create new registration lines
    const newRegistrations = registrations.map(r =>
        `window.Lightview.tags.${r.name} = ${r.variable};`
    ).join('\n');

    // Replace the old block with new registrations
    content = content.replace(oldPatternRegex, newRegistrations);

    if (content === originalContent) {
        return { modified: false, file: filePath, reason: 'replacement failed' };
    }

    // Write the file
    fs.writeFileSync(filePath, content, 'utf-8');

    return {
        modified: true,
        file: filePath,
        registrations: registrations.map(r => r.name)
    };
}

// Main execution
console.log('Migrating component registrations...\n');

const files = findJsFiles(componentsDir);
const results = {
    modified: [],
    skipped: []
};

for (const file of files) {
    const result = migrateFile(file);
    if (result.modified) {
        results.modified.push(result);
        console.log(`✓ Modified: ${path.relative(componentsDir, file)}`);
        console.log(`  Components: ${result.registrations.join(', ')}`);
    } else {
        results.skipped.push(result);
    }
}

console.log('\n--- Summary ---');
console.log(`Modified: ${results.modified.length} files`);
console.log(`Skipped: ${results.skipped.length} files`);

if (results.skipped.length > 0) {
    console.log('\nSkipped files:');
    for (const result of results.skipped) {
        if (result.reason) {
            console.log(`  - ${path.relative(componentsDir, result.file)}: ${result.reason}`);
        }
    }
}
