const fs = require('fs');
const lines = fs.readFileSync('public/index.html', 'utf8').split('\n');
const results = [];
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('.light-theme')) {
        results.push(`Line ${i + 1}: ${lines[i].trim()}`);
    }
}
fs.writeFileSync('light_theme_rules.txt', results.join('\n'));
