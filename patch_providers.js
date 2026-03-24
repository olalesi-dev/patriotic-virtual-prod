const fs = require('fs');

const p1 = 'public/index.html';
let t1 = fs.readFileSync(p1, 'utf8');

// Title
t1 = t1.replace('Transparent & Dedicated Care.', 'Transparent & Dedicated Care From Our Licensed Medical Providers');

// Dr O target
const dr_orig = 'Board-certified physician providing medical oversight and direct patient care at Patriotic Virtual Telehealth.';
const dr_new = 'Board Certified — Diagnostic Radiology &amp; Interventional Radiology (ABMS®), providing medical oversight and direct patient care at Patriotic Virtual Telehealth.<br>Licensed in: FL, MI, DC, CA, MD, OH, NY, WI';
t1 = t1.replace(dr_orig, dr_new);

// AB target
const ab_orig = 'Board-certified family nurse practitioner dedicated to comprehensive primary care, evaluation, and medical weight management.';
const ab_new = 'Board Certified — Family Nurse Practitioner (ANCC®), dedicated to comprehensive primary care, evaluation, and medical weight management at Patriotic Virtual Telehealth.<br>Licensed in: FL, CA';
t1 = t1.replace(ab_orig, ab_new);

// Remove Practitioners block
t1 = t1.replace(/\s*<!-- PROVIDER TRANSPARENCY -->[\s\S]*?id="providers-transparency"[\s\S]*?<\/section>/, '');

fs.writeFileSync(p1, t1);
console.log("Done");
