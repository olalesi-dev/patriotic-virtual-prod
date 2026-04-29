const fs = require('fs');
const lines = fs.readFileSync('public/index.html', 'utf8').split('\n');

const queries = [
    'id="mainNav"',
    'data-i18n="hero-h1"',
    'data-i18n="hero-sub"',
    'id="how"',
    'id="technology-platform"',
    'id="aboutModal"',
    'footer'
];

queries.forEach(q => {
    const idx = lines.findIndex(l => l.includes(q));
    console.log(`${q} -> line ${idx + 1}`); // 1-indexed
});
