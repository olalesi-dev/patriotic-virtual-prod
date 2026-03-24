const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

// Find and wipe my old CSS patch for the fonts
const oldCSSStart = '/* OVERRIDE HARDCODED WHITE FONTS IN LIGHT THEME */';
const oldCSSEnd = '</style>';

if (html.includes(oldCSSStart)) {
    const pre = html.substring(0, html.indexOf(oldCSSStart));
    const post = html.substring(html.lastIndexOf(oldCSSEnd));
    
    const newCSS = `    /* OVERRIDE HARDCODED WHITE FONTS IN LIGHT THEME */
    body.light-theme #landingPage .how-section,
    body.light-theme #landingPage .prov-transp-section {
        color: #000000 !important;
    }
    body.light-theme #landingPage .how-section *,
    body.light-theme #landingPage .prov-transp-section * {
        color: #000000 !important;
    }
    
    /* Exceptions for specific colorful badges inside the sections */
    body.light-theme #landingPage .how-section .sec-eye span,
    body.light-theme #landingPage .prov-transp-section .sec-eye span {
        color: var(--blue) !important;
    }
    body.light-theme #landingPage .how-section [style*="background:#ef4444"],
    body.light-theme #landingPage .prov-transp-section [style*="background:#ef4444"] {
        color: #ffffff !important; /* Keep the Rx badge text white */
    }
    body.light-theme #landingPage .how-section [style*="background:#3B82F6"],
    body.light-theme #landingPage .prov-transp-section [style*="background:#3B82F6"] {
        color: #ffffff !important; /* Keep the 1 2 3 4 5 number badges text white */
    }
    
`;
    fs.writeFileSync('public/index.html', pre + newCSS + post);
    console.log('CSS Specificity patch replaced with pure black DOM override');
} else {
    console.log('Old patch not found?!');
}
