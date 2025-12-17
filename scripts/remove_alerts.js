const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '../docs/components');

if (!fs.existsSync(targetDir)) {
    console.error(`Target directory not found: ${targetDir}`);
    process.exit(1);
}

const files = fs.readdirSync(targetDir);

// Matches the div with class "alert mt-8" containing "For more examples, see the" until the closing div
const regex = /<div class="alert mt-8">\s*<svg[\s\S]*?<\/svg>\s*<span>\s*For more examples, see the[\s\S]*?<\/span>\s*<\/div>/g;

files.forEach(file => {
    if (path.extname(file) === '.html') {
        const filePath = path.join(targetDir, file);
        const content = fs.readFileSync(filePath, 'utf8');

        // Reset regex lastIndex just in case
        regex.lastIndex = 0;

        if (regex.test(content)) {
            const newContent = content.replace(regex, '');
            fs.writeFileSync(filePath, newContent);
            console.log(`Updated ${file}`);
        }
    }
});
