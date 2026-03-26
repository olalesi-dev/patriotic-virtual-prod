const fs = require('fs');
const indexPath = './public/index.html';
let html = fs.readFileSync(indexPath, 'utf-8');

html = html.replace('function triggerConsult(k) {', 'function startSvc(k) {');
fs.writeFileSync(indexPath, html, 'utf-8');
console.log("Renamed triggerConsult back to startSvc");
