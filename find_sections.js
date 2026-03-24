const fs = require('fs');
const lines = fs.readFileSync('public/index.html', 'utf8').split('\n');
const res = [];
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('<section') || lines[i].includes('class="how-section"')) {
        res.push(`[${i+1}] ${lines[i].trim()}`);
    }
}
fs.writeFileSync('sections.txt', res.join('\n'));
