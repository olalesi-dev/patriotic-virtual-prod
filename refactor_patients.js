const fs = require('fs');
const path = require('path');

const targetDir = 'c:\\Users\\dayoo\\.gemini\\antigravity\\scratch\\patriotic-virtual-prod\\emr-portal';

function replaceInFile(filePath) {
    let content;
    try {
        content = fs.readFileSync(filePath, 'utf8');
    } catch (err) {
        console.error(`Could not read ${filePath}: ${err}`);
        return;
    }

    // RegEx replacements
    // (?<!...) is not supported in all JS environments but Node 24 supports it.
    // However, for compatibility I'll do a simple match and conditional replace or use lookbehind if supported.

    // Node 24 supports lookbehind.

    const replacements = [
        [/(?<!use\s+)clients/g, 'patients'],
        [/(?<!use\s+)Clients/g, 'Patients'],
        [/(?<!use\s+)client/g, 'patient'],
        [/(?<!use\s+)Client/g, 'Patient'],
        [/CLIENTS/g, 'PATIENTS'],
        [/CLIENT(?!\s+Component)/g, 'PATIENT']
    ];

    let newContent = content;
    for (const [pattern, replacement] of replacements) {
        newContent = newContent.replace(pattern, replacement);
    }

    if (newContent !== content) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`Updated: ${filePath}`);
    }
}

function walk(dir) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fullPath.includes('node_modules') || fullPath.includes('.next') || fullPath.includes('.git')) {
            return;
        }
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            walk(fullPath);
        } else {
            if (['.ts', '.tsx', '.js', '.jsx', '.json', '.md'].includes(path.extname(fullPath))) {
                replaceInFile(fullPath);
            }
        }
    });
}

walk(targetDir);
console.log('Refactor complete.');
