const fs = require('fs');

let html = fs.readFileSync('public/index.html', 'utf8');

const themeVars = `
    body.light-theme {
      --bg-panel: #ffffff;
      --bg-sec: #f8fafc;
      --bg-tertiary: var(--g50);
      --txt-main: var(--navy);
      --txt-sub: var(--g500);
      --border-soft: var(--g200);
      --border-strong: var(--g300);
      --shadow-color: rgba(0,0,0,0.05);
    }
    body:not(.light-theme) {
      --bg-panel: #0f172a;
      --bg-sec: #0a0f1c;
      --bg-tertiary: #1e293b;
      --txt-main: #f8fafc;
      --txt-sub: #94a3b8;
      --border-soft: #334155;
      --border-strong: #475569;
      --shadow-color: rgba(0,0,0,0.5);
    }
    
    /* Global fixes for inline classes */
    .theme-panel { background: var(--bg-panel) !important; color: var(--txt-main) !important; border-color: var(--border-soft) !important; }
    .theme-sec { background: var(--bg-sec) !important; color: var(--txt-main) !important; border-color: var(--border-soft) !important; }
    .theme-tertiary { background: var(--bg-tertiary) !important; color: var(--txt-main) !important; border-color: var(--border-soft) !important; }
    .theme-text { color: var(--txt-main) !important; }
    .theme-subtext { color: var(--txt-sub) !important; }
    .theme-border { border-color: var(--border-soft) !important; border-top-color: var(--border-soft) !important; border-bottom-color: var(--border-soft) !important; border-left-color: var(--border-soft) !important; border-right-color: var(--border-soft) !important; }
`;

if (!html.includes('--bg-panel:')) {
    html = html.replace('  </style>', themeVars + '\n  </style>');
}

// Map of replacements. We only replace inside style attributes that we know are problematic, OR add classes.
// Let's replace the inline dark spaces in light mode, and light spaces in dark mode.
const replacements = [
    // 1. My new Technology section (line 6725)
    { 
        find: /background:#f8fafc;padding:2.5rem;border-radius:1rem;border:1px solid #e2e8f0/g, 
        rep: 'background:var(--bg-sec);padding:2.5rem;border-radius:1rem;border:1px solid var(--border-soft)'
    },
    { 
        find: /background:white;padding:1rem 1.5rem;border-radius:0.75rem;border:1px solid #cbd5e1/g,
        rep: 'background:var(--bg-panel);padding:1rem 1.5rem;border-radius:0.75rem;border:1px solid var(--border-strong)'
    },
    {
        find: /<h2 class="sec-title" style="color:var\(--navy\)">/g,
        rep: '<h2 class="sec-title theme-text">'
    },
    {
        find: /<p style="font-size:1.1rem;line-height:1.7;color:var\(--navy\);font-weight:500;margin-bottom:1.5rem;">/g,
        rep: '<p class="theme-text" style="font-size:1.1rem;line-height:1.7;font-weight:500;margin-bottom:1.5rem;">'
    },
    // 2. Providers section (lines ~6950)
    {
        find: /<section class="providers" id="providers" style="background: white; padding: 80px 0;">/g,
        rep: '<section class="providers theme-panel" id="providers" style="padding: 80px 0;">'
    },
    {
        find: /<h2 class="sec-title" style="color: var\(--navy\);">/g,
        rep: '<h2 class="sec-title theme-text">'
    },
    {
        find: /<div class="provider-card" style="padding: 32px; border: 1px solid var\(--g200\); border-radius: 12px; background: #fff;">/g,
        rep: '<div class="provider-card theme-panel" style="padding: 32px; border: 1px solid var(--border-soft); border-radius: 12px;">'
    },
    // 3. Modals and Tabs (e.g. #aboutModal, #promoModal)
    {
        find: /background:var\(--g50\)/g,
        rep: 'background:var(--bg-tertiary)'
    },
    {
        find: /color:var\(--g500\)/g,
        rep: 'color:var(--txt-sub)'
    },
    {
        find: /color:var\(--g600\)/g,
        rep: 'color:var(--txt-sub)'
    },
    {
        find: /color:var\(--g700\)/g,
        rep: 'color:var(--txt-sub)'
    },
    {
        find: /border:1px solid var\(--g200\)/g,
        rep: 'border:1px solid var(--border-soft)'
    },
    {
        find: /border-bottom:1px solid var\(--g100\)/g,
        rep: 'border-bottom:1px solid var(--border-soft)'
    },
    {
        find: /background:white/g,
        rep: 'background:var(--bg-panel)'
    },
    {
        find: /background: white/g,
        rep: 'background: var(--bg-panel)'
    },
    {
        find: /color:var\(--navy\)/g,
        rep: 'color:var(--txt-main)'
    },
    {
        find: /color: var\(--navy\)/g,
        rep: 'color: var(--txt-main)'
    },
    {
        find: /background:#fff/g,
        rep: 'background:var(--bg-panel)'
    }
];

// Perform replacements, but safely split the string so we only replace HTML and inline styles starting from the <body> tag to avoid breaking <style> contents.
const bodySplit = html.indexOf('<main id="landingPage">');
if (bodySplit > -1) {
    let head = html.substring(0, bodySplit);
    let body = html.substring(bodySplit);
    for (let rule of replacements) {
        body = body.replace(rule.find, rule.rep);
    }
    fs.writeFileSync('public/index.html', head + body);
    console.log("Replaced successfully inside <body>");
} else {
    console.log("Could not find <main id='landingPage'>");
}

