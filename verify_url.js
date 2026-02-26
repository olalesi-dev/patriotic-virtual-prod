const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\dayoo\\.gemini\\antigravity\\scratch\\patriotic-virtual-prod\\public\\index.html', 'utf8');
const lines = content.split('\n');
const line = lines[5808]; // 0-indexed, so 5809 is 5808
fs.writeFileSync('C:\\Users\\dayoo\\.gemini\\antigravity\\scratch\\patriotic-virtual-prod\\line5809.txt', line);
console.log('Saved to line5809.txt');
