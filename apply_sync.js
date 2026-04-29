const fs = require('fs');

function updatePublicHtml() {
    const p = './public/index.html';
    let content = fs.readFileSync(p, 'utf-8');

    // Update modal filter
    content = content.replace(
        'window._initialSvcClick ? svcs.filter(s => s.k === window._initialSvcClick) : svcs;',
        'window._initialSvcClick ? svcs.filter(s => (s.k === window._initialSvcClick || s.k === "general_visit")) : svcs;'
    );
    
    // Fallback if the innerHTML was patched differently in my previous scripts:
    content = content.replace(
        'window._initialSvcClick ? svcs.filter(el => el.k === window._initialSvcClick) : svcs;',
        'window._initialSvcClick ? svcs.filter(el => (el.k === window._initialSvcClick || el.k === "general_visit")) : svcs;'
    );

    // AI bot text replacements
    content = content.replace(
        '⏱️ Premature Ejaculation — $79',
        '📹 Imaging + Video Consult — $449'
    );
    // Might have HTML tags in index.html
    content = content.replace(
        '⏱️ <b>Premature Ejaculation</b> — $79',
        '📹 <b>Imaging + Video Consult</b> — $449'
    );
    
    content = content.replace(
        'Membership plans from <b>$29/mo</b> to <b>$199/mo</b>.',
        'Membership plans: <b>All Access — Elite — $199/mo</b>.'
    );
    content = content.replace(
        'Membership plans from $29/mo to $199/mo.',
        'Membership plans: All Access — Elite — $199'
    );

    fs.writeFileSync(p, content, 'utf-8');
    console.log("Updated public/index.html");
}

function updateLandingModals() {
    const p = './emr-portal/src/features/landing/components/LandingModals.tsx';
    if (!fs.existsSync(p)) return;
    let content = fs.readFileSync(p, 'utf-8');

    content = content.replace(
        'initialService ? s.k === initialService : true',
        'initialService ? (s.k === initialService || s.k === "general_visit") : true'
    );

    fs.writeFileSync(p, content, 'utf-8');
    console.log("Updated LandingModals.tsx");
}

function updateAINavigator() {
    const p = './emr-portal/src/components/AINavigator.tsx';
    if (!fs.existsSync(p)) return;
    let content = fs.readFileSync(p, 'utf-8');

    content = content.replace(
        '⏱️ **Premature Ejaculation** — $79',
        '📹 **Imaging + Video Consult** — $449'
    );
    content = content.replace(
        '⏱️ Premature Ejaculation — $79',
        '📹 Imaging + Video Consult — $449'
    );

    content = content.replace(
        'Membership plans from **$29/mo** to **$199/mo**.',
        'Membership plans: **All Access — Elite — $199/mo**.'
    );
    content = content.replace(
        'Membership plans from $29/mo to $199/mo.',
        'Membership plans: All Access — Elite — $199'
    );
    
    fs.writeFileSync(p, content, 'utf-8');
    console.log("Updated AINavigator.tsx");
}

updatePublicHtml();
updateLandingModals();
updateAINavigator();
