const fs = require('fs');
let t = fs.readFileSync('public/index.html', 'utf8');

// 1. Title replacement
t = t.replace(/Dr\. Olalesi Osunsade, MD(?!\s*(?:,|DABR))/g, 'Dr. Olalesi Osunsade, MD, DABR');

// 2. Picture for Practitioner 1
const p11 = `<div class="prov-transp-card">
            <p class="prov-transp-name">Dr. Olalesi Osunsade, MD, DABR</p>`;
const r11 = `<div class="prov-transp-card">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
              <img src="assets/dr_osunsade_new.jpg" style="width:48px;height:48px;border-radius:50%;object-fit:cover;" alt="Dr. Osunsade" />
              <p class="prov-transp-name" style="margin:0;">Dr. Olalesi Osunsade, MD, DABR</p>
            </div>`;
t = t.replace(p11, r11);

// 3. Picture for Practitioner 2
const p12 = `<div class="prov-transp-card">
            <p class="prov-transp-name">Alvaro Berrios, MS, FNP-BC</p>`;
const r12 = `<div class="prov-transp-card">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
              <img src="assets/alvaro_berrios.jpg" style="width:48px;height:48px;border-radius:50%;object-fit:cover;" alt="Alvaro Berrios" />
              <p class="prov-transp-name" style="margin:0;">Alvaro Berrios, MS, FNP-BC</p>
            </div>`;
t = t.replace(p12, r12);

// 4. Picture for Provider 1 (OO Circle)
const p21 = `<div style="width: 56px; height: 56px; border-radius: 50%; background: var(--base-soft); color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 20px;">OO</div>`;
const r21 = `<img src="assets/dr_osunsade_new.jpg" style="width: 56px; height: 56px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border-soft); box-sizing: border-box;" alt="Dr. Osunsade" />`;
t = t.replace(p21, r21);

// 5. Picture for Provider 2 (AB Circle)
const p22 = `<div style="width: 56px; height: 56px; border-radius: 50%; background: var(--base-soft); color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 20px;">AB</div>`;
const r22 = `<img src="assets/alvaro_berrios.jpg" style="width: 56px; height: 56px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border-soft); box-sizing: border-box;" alt="Alvaro Berrios" />`;
t = t.replace(p22, r22);

// 6. Removing Testosterone Object and Text
t = t.replace(/\s*\{[\s\n]*id:\s*"testosterone-hrt"[\s\S]*?\},/g, '');
t = t.replace(/\\n🧬 <b>Testosterone \/ HRT<\/b> — \$149/g, '');
// For checking arrays like ["⏱️ Premature Ejaculation", "🧬 Testosterone / HRT"]
t = t.replace(/,\s*"🧬 Testosterone \/ HRT"/g, '');
t = t.replace(/"🧬 Testosterone \/ HRT",?\s*/g, '');


// 7. Inject Mobile Layout Fix
// Add explicit flex ordering to mobile media query
const mqTrigger = `@media (max-width: 1100px) {`;
const mobileFix = 
`@media (max-width: 1100px) {
      /* MOBILE FIX: Prioritize Doctor-Supervised Hero text Over Services */
      #landingPage .hero-showcase .hero-grid {
        display: flex !important;
        flex-direction: column !important;
      }
      #landingPage .hero-copy {
        order: 1 !important;
      }
      #landingPage .hero-services-showcase {
        order: 2 !important;
      }
`;
t = t.replace(mqTrigger, mobileFix);


fs.writeFileSync('public/index.html', t);

// Do the same for public/weight-loss/index.html just in case there's the MD name.
if (fs.existsSync('public/weight-loss/index.html')) {
  let wt = fs.readFileSync('public/weight-loss/index.html', 'utf8');
  wt = wt.replace(/Dr\. Olalesi Osunsade, MD(?!\s*(?:,|DABR))/g, 'Dr. Olalesi Osunsade, MD, DABR');
  fs.writeFileSync('public/weight-loss/index.html', wt);
}
