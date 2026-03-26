const fs = require('fs');
const lines = fs.readFileSync('public/index.html', 'utf8').split('\n');
const results = [];
for (let i = 0; i < lines.length; i++) {
    const l = lines[i].toLowerCase();
    if (l.includes('style="') && (l.includes('background') || l.includes('color'))) {
        // Collect them and we can sample
        results.push(`${i + 1}: ${lines[i].trim()}`);
    }
}
fs.writeFileSync('bad_colors.txt', results.join('\n'));
console.log('done, found ' + results.length + ' lines');
