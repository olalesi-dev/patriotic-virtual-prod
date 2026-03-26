const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

// 1. Fix Light Mode text overrides
const overrideCSS = `
    /* OVERRIDE HARDCODED WHITE FONTS IN LIGHT THEME */
    body.light-theme .how-section .sec-title,
    body.light-theme .how-section .sec-sub,
    body.light-theme .how-section .theme-text,
    body.light-theme .how-section .theme-subtext,
    body.light-theme .prov-transp-section .sec-title,
    body.light-theme .prov-transp-section .sec-sub,
    body.light-theme .prov-transp-section .theme-text,
    body.light-theme .prov-transp-section .theme-subtext {
        color: #0f172a !important; /* Forces dark navy text */
    }
    
    body.light-theme .how-section .sec-sub,
    body.light-theme .prov-transp-section .sec-sub,
    body.light-theme .theme-subtext {
        color: #475569 !important; /* Soft dark slate for subtext */
    }
`;

if (!html.includes('OVERRIDE HARDCODED WHITE FONTS')) {
    html = html.replace('  </style>', overrideCSS + '\n  </style>');
}

// 2. Fix the Modal Close Button in Dark Mode
html = html.replace(
    'var(--g100); color: var(--txt-main); border-radius: 18px; display: flex;',
    '#ffffff; color: #020617 !important; border-radius: 18px; display: flex;'
);

fs.writeFileSync('public/index.html', html);
console.log('Final fixes applied for light text and modal button issues.');
