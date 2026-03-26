const fs = require('fs');

const indexPath = './public/index.html';
let html = fs.readFileSync(indexPath, 'utf-8');

html = html.replace('function openConsultModal(sK = null) {', 
  'function openConsultModal(sK = null) {\n      window._initialSvcClick = sK;');

html = html.replace('const inner = svcs', 
  'const inner = svcs.filter(el => (window._initialSvcClick ? el.k === window._initialSvcClick : true))')

html = html.replace('svcs.map(', 'svcs.filter(el => (window._initialSvcClick ? el.k === window._initialSvcClick : true)).map(');

// Also remove TRT references in bot logic which were not caught earlier
html = html.replace(/"We offer <b>Testosterone([^"]+)";/g, '"We offer General Telehealth and Mens Health consultations.";');
html = html.replace(/v\.includes\("testosterone"\)\s*\|\|/gi, '');
html = html.replace(/t\.includes\("testosterone"\)\s*\|\|/gi, '');

fs.writeFileSync(indexPath, html, 'utf-8');
console.log("Updated HTML successfully.");
