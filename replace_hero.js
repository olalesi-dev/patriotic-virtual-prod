const fs = require('fs');

// Read the file
const content = fs.readFileSync('public/index.html', 'utf8');

// Define the replacement
const oldPattern = /<div class="hv-main">[\s\S]*?<\/svg>\s*<\/div>/;
const newContent = '<div class="hv-main"><img src="hero-image.png" alt="Healthcare professional using holographic medical display" style="width: 100%; height: auto; border-radius: 22px; box-shadow: 0 24px 60px rgba(0, 0, 0, .5);" /></div>';

// Replace
const newFileContent = content.replace(oldPattern, newContent);

// Write back
fs.writeFileSync('public/index.html', newFileContent, 'utf8');

console.log("Hero image replaced successfully!");
