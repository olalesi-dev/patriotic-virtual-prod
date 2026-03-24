const fs = require('fs');

let html = fs.readFileSync('public/index.html', 'utf8');

// 1. Fix the inline text colors in "how-it-works"
let patched = html;
for (let i = 1; i <= 5; i++) {
    patched = patched.replace(
        '<strong style="color:#f8fafc;font-size:1.15rem;">', 
        '<strong class="theme-text" style="font-size:1.15rem;">'
    );
    patched = patched.replace(
        '<span style="font-size:0.95rem;color:#94a3b8;">',
        '<span class="theme-subtext" style="font-size:0.95rem;">'
    );
}

// 2. Fix the Med Disclaimer Gap Background 
// The med-disclaimer container is floating. We'll explicitly give it a class that forces it to inherit the body's native theme.
patched = patched.replace(
    '<!-- MED DISCLAIMER BLOCK -->\n    <div class="container" style="margin-top:2rem;margin-bottom:2rem;">',
    '<!-- MED DISCLAIMER BLOCK -->\n    <div class="container theme-bg-transparent" style="margin-top:2rem;margin-bottom:2rem; position:relative; z-index:5;">'
);

// 3. We must override `.how-section` and `.prov-transp-section` and `#technology-platform` in light mode!
// Because they have hardcoded `background: linear-gradient(..., var(--navy), #0f172a)`
const overrideCSS = `
    /* FIX FOR SECTIONS THAT STAY DARK IN LIGHT MODE */
    body.light-theme .how-section,
    body.light-theme .prov-transp-section {
        background: var(--bg-sec) !important;
    }
    .theme-bg-transparent {
        background: transparent !important;
    }
    body:not(.light-theme) #how-it-works {
        background: #020617 !important;
    }
    body.light-theme #how-it-works {
        background: var(--bg-sec) !important;
    }
    body:not(.light-theme) #technology-platform, body:not(.light-theme) #providers-transparency {
        background: #020617 !important;
    }
`;

if (!patched.includes('/* FIX FOR SECTIONS THAT STAY DARK IN LIGHT MODE */')) {
    patched = patched.replace('  </style>', overrideCSS + '\n  </style>');
}

fs.writeFileSync('public/index.html', patched);
console.log('Final theme patch applied successfully.');
