const fs = require('fs');

let html = fs.readFileSync('public/index.html', 'utf8');

// Replace the transparent container with a robust, full-width themed section
let patched = html.replace(
    '<!-- MED DISCLAIMER BLOCK -->\n    <div class="container theme-bg-transparent" style="margin-top:2rem;margin-bottom:2rem; position:relative; z-index:5;">',
    '<!-- MED DISCLAIMER BLOCK -->\n    <section class="theme-sec" style="padding: 2rem 0; margin: 0; width: 100%; border: none;">\n    <div class="container" style="position:relative; z-index:5;">'
);

// We need to also close the new section instead of closing the single div
patched = patched.replace(
    'Individual results vary.\n      </div>\n    </div>\n\n    <!-- RADIOLOGY & AI -->',
    'Individual results vary.\n      </div>\n    </div>\n    </section>\n\n    <!-- RADIOLOGY & AI -->'
);

fs.writeFileSync('public/index.html', patched);
console.log('Successfully wrapped med-disclaimer in a full-width theme section.');
