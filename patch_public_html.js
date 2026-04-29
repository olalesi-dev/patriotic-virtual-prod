const fs = require('fs');

const indexPath = './public/index.html';
let html = fs.readFileSync(indexPath, 'utf-8');

// 1. Replace the svcs array
const svcsStart = html.indexOf('const svcs = [');
const svcsEndStr = '];\r\n\r\n    const iQs';
let svcsEnd = html.indexOf(svcsEndStr);
if (svcsEnd === -1) {
    svcsEnd = html.indexOf('];\n\n    const iQs');
}

if (svcsStart !== -1 && svcsEnd !== -1) {
    const newSvcs = `const svcs = [
  {
    id: "imaging-video",
    k: "imaging_video",
    name: "Imaging + Video Consult",
    desc: "Full imaging review plus a 30 - 60 minute secure video consultation to discuss findings directly with a specialist.",
    icon: "📹",
    ic: "rose",
    c: "rose",
    price: 449,
    cat: ["popular", "radiology"],
    stripe: "prod_TmuBq5Pwvt1rBc",
    priceId: "PRICE_ID_VIDEO_CONSULT",
  },
  {
    id: "erectile-dysfunction",
    k: "erectile_dysfunction",
    name: "Erectile Dysfunction",
    desc: "Sildenafil, tadalafil & custom compounds — discreetly delivered after cardiovascular safety screening.",
    icon: "⚡",
    ic: "blue",
    c: "blue",
    price: 79,
    cat: ["popular", "mens", "clinical"],
    stripe: "prod_TupASTZvm9MPDJ",
    priceId: "PRICE_ID_ED",
  },
  {
    id: "membership-elite",
    k: "membership_elite",
    name: "All Access — Elite",
    desc: "Everything: telehealth visits, specialty programs, AI health tools, AI imaging, and priority scheduling.",
    icon: "🏆",
    ic: "amber",
    c: "amber",
    price: 199,
    priceSuffix: "/mo",
    cat: ["popular", "membership"],
    stripe: "prod_TsnS735VNACb3g",
    priceId: "PRICE_ID_ELITE",
  },
  {
    id: "weight-loss",
    k: "weight_loss",
    name: "Rx Weight Loss",
    desc: "Comprehensive medical weight loss evaluation. Rx eligibility screening, personalized titration, dietary guidance. Medication cost separate.",
    icon: "💊",
    ic: "blue",
    c: "blue",
    price: 129,
    cat: ["popular", "clinical"],
    stripe: "prod_TsnZ1goCbeavNz",
    priceId: "PRICE_ID_WEIGHT_LOSS",
  },
  {
    id: "ai-imaging",
    k: "ai_imaging",
    name: "AI-Powered Imaging Analysis",
    desc: "Physician-supervised AI interpretation of reports. Educational tools to help you understand findings.",
    icon: "🔬",
    ic: "blue",
    c: "blue",
    price: 99,
    cat: ["ai", "radiology"],
    stripe: "prod_TsnPLrOTNMh7xM",
    priceId: "PRICE_ID_AI_IMAGING",
  },
  {
    id: "report-interpretation",
    k: "report_interpretation",
    name: "Report Interpretation",
    desc: "Expert analysis of your existing radiology report. We translate complex medical jargon into plain English.",
    icon: "📄",
    ic: "indigo",
    c: "indigo",
    price: 149,
    cat: ["radiology"],
    stripe: "prod_Tmu7Z6g8kmwvMd",
    priceId: "PRICE_ID_REPORT_INT",
  },
  {
    id: "standard-imaging",
    k: "standard_imaging",
    name: "Standard Imaging Review",
    desc: "Complete second-opinion over-read of your X-Ray, Ultrasound, CT, or MRI images by a board-certified radiologist.",
    icon: "🖥️",
    ic: "violet",
    c: "violet",
    price: 249,
    cat: ["radiology"],
    stripe: "prod_Tmu9kplu78Fs2m",
    priceId: "PRICE_ID_STD_REVIEW",
  },
  {
    id: "diagnostic-single",
    k: "diagnostic_single",
    name: "Single Study Read",
    desc: "Official diagnostic report for a single study (CT, XR, US). <24-48h turnaround.",
    icon: "🖼️",
    ic: "blue",
    c: "blue",
    price: 75,
    priceSuffix: "/read",
    cat: ["radiology", "diagnostic"],
    stripe: "",
    priceId: "",
  },
  {
    id: "diagnostic-second",
    k: "diagnostic_second",
    name: "Diagnostic Second Opinion",
    desc: "Full diagnostic review + written opinion + patient summary for CT, XR, or US.",
    icon: "📊",
    ic: "indigo",
    c: "indigo",
    price: 250,
    priceSuffix: "/consult",
    cat: ["radiology", "diagnostic"],
    stripe: "",
    priceId: "",
  },
  {
    id: "diagnostic-facility",
    k: "diagnostic_facility",
    name: "Facility Contracts",
    desc: "Urgent Care & Outpatient contracts. Unlimited reads, SLA, dedicated upload link.",
    icon: "🏢",
    ic: "navy",
    c: "navy",
    price: 3500,
    priceSuffix: "/mo+",
    cat: ["radiology", "diagnostic"],
    stripe: "",
    priceId: "",
  },
  {
    id: "general-visit",
    k: "general_visit",
    name: "General Visit",
    desc: "Virtual visits for non-emergent health concerns — medication management, wellness checks, health advice. Convenient care from home.",
    icon: "🩺",
    ic: "teal",
    c: "teal",
    price: 79,
    cat: ["clinical"],
    stripe: "prod_Tsna4xzySPbKT0",
    priceId: "PRICE_ID_GENERAL_VISIT",
  }
];`;
    
    html = html.substring(0, svcsStart) + newSvcs + html.substring(svcsEnd + 2);
    console.log("Updated svcs array in index.html");
}

// 2. Remove testosterone keys from iQs
html = html.replace(/testosterone_hrt:\s*\[[\s\S]*?\],/g, '');


// 3. Remove from lab panels (Total & free)
html = html.replace(/<option value="Testosterone_Total_Free">[\s\S]*?<\/option>/g, '');
html = html.replace(/<label class="ro" style="color:white"><input type="checkbox" class="lab-panel" value="Testosterone Free\/Total"> Testosterone<\/label>/g, '');

// 4. Update renderSvcSel() to filter by initSel if it exists
// Original function:
/*
    function renderSvcSel() {
      const e = document.getElementById("svcSel");
      e.innerHTML = svcs
        .map(
          (s) =>
            \`<div class="ro \${selSvc === s.k ? "sel" : ""}" onclick="selectSvc('\${
              s.k
            }')">\` +
            \`<div class="rd2"></div><span>\${s.icon} \${s.name} — $\${s.price}</span></div>\`
        )
        .join("");
    }
*/

const oldRender = 'e.innerHTML = svcs';
const newRender = 'e.innerHTML = svcs.filter(el => (window._initialSvcClick ? el.k === window._initialSvcClick : true))';
if (html.includes(oldRender)) {
    html = html.replace(oldRender, newRender);
    console.log("Updated renderSvcSel logic");
}

// 5. Update how modal is triggered to capture window._initialSvcClick
const triggerOld = `function openConsultModal(sK = null) {`;
const triggerNew = `function openConsultModal(sK = null) {
      window._initialSvcClick = sK;`;
if (html.includes(triggerOld)) {
    html = html.replace(triggerOld, triggerNew);
    console.log("Updated openConsultModal logic");
}

// 6. Fix "we offer testosterone HRT" in bot text
html = html.replace(/return "We offer <b>Testosterone([^"]+)";/g, 'return "We offer General Telehealth and Mens Health consultations.";');
html = html.replace(/v\.includes\("testosterone"\)\s*\|\|/g, '');
html = html.replace(/t\.includes\("testosterone"\)\s*\|\|/g, '');

fs.writeFileSync(indexPath, html, 'utf-8');

// Also do it for public/faq/index.html (Wait, FAQ mentions testosterone replacement therapy)
const faqPath = './public/faq/index.html';
if (fs.existsSync(faqPath)) {
    let faq = fs.readFileSync(faqPath, 'utf-8');
    faq = faq.replace('testosterone replacement, and longevity science', 'and longevity science');
    fs.writeFileSync(faqPath, faq, 'utf-8');
    console.log("Updated faq text");
}

console.log("Script completed.");
