const fs = require('fs');
const p = 'emr-portal/src/app/(provider)/analytics/google/PageClient.tsx';
let txt = fs.readFileSync(p, 'utf8');

txt = txt.replace('const rawData = Array.isArray(report) ? report : [];', 'const rawData = Array.isArray(report) ? (report as any[]) : [];');
txt = txt.replace('curr.source', '(curr as any).source');
txt = txt.replace('curr.users', '(curr as any).users');
txt = txt.replace('d.date', '(d as any).date');
txt = txt.replace('d.users', '(d as any).users');
txt = txt.replace('d.sessions', '(d as any).sessions');
txt = txt.replace('d.views', '(d as any).views');

fs.writeFileSync(p, txt);
console.log('Fixed useQuery casting!');
