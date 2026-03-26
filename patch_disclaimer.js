const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

html = html.replace(/<!-- MED DISCLAIMER BLOCK -->\s*<div class="container"\s*style="margin-top:2rem;margin-bottom:2rem;">/, '<!-- MED DISCLAIMER BLOCK -->\n    <div class="container theme-bg-transparent" style="margin-top:2rem;margin-bottom:2rem; position:relative; z-index:5;">');

fs.writeFileSync('public/index.html', html);
console.log('Fixed Med Disclaimer Container');
