const fs = require('fs');

function updatePublicHtml() {
  const p = './public/index.html';
  let c = fs.readFileSync(p, 'utf-8');

  // Remove ED from Marquee
  c = c.replace(/<div class="marquee-item"><span>⚡<\/span>Erectile Dysfunction<\/div>/g, '');

  // Update svcs array order and 'popular' tags
  // We'll surgically extract the objects or just use string replacements.
  
  // 1. Remove 'popular' and 'clinical' and 'mens' from ED so it won't show
  c = c.replace(/cat: \["popular", "mens", "clinical"\],\s*stripe: "prod_TupASTZvm9MPDJ"/, 'cat: [], stripe: "prod_TupASTZvm9MPDJ"');

  // 2. Add 'popular' to general-visit
  c = c.replace(/cat: \["clinical"\],\s*stripe: "prod_Tsna4xzySPbKT0"/, 'cat: ["popular", "clinical"], stripe: "prod_Tsna4xzySPbKT0"');

  c = c.replace(/name: "General Visit",/, 'name: "General Health Visit",');

  // 3. Since we want a specific order in the popular view, the easiest way is to reorder the objects in the array.
  // We can just rely on flex order if flex is used, but we don't know if flex order is easily assignable.
  // Instead, let's just let the javascript filter handle it. BUT we need the array order to be correct.
  // Let's replace the whole svcs array definition with the correct order of the popular ones first.
  
  // Actually, wait. I can just reorder the text blocks!
  let weightLossBlockMatch = c.match(/\{\s*id: "weight-loss"[\s\S]*?priceId: "PRICE_ID_WEIGHT_LOSS",\s*\}/);
  let generalVisitBlockMatch = c.match(/\{\s*id: "general-visit"[\s\S]*?priceId: "PRICE_ID_GENERAL_VISIT",\s*\}/);
  let membershipEliteBlockMatch = c.match(/\{\s*id: "membership-elite"[\s\S]*?priceId: "PRICE_ID_ELITE",\s*\}/);
  let imagingVideoBlockMatch = c.match(/\{\s*id: "imaging-video"[\s\S]*?priceId: "PRICE_ID_VIDEO_CONSULT",\s*\}/);

  if (weightLossBlockMatch && generalVisitBlockMatch && membershipEliteBlockMatch && imagingVideoBlockMatch) {
      const wlb = weightLossBlockMatch[0];
      const gvb = generalVisitBlockMatch[0];
      const meb = membershipEliteBlockMatch[0];
      const ivb = imagingVideoBlockMatch[0];

      // Replace them all with nothing initially (or a token) to remove them from their original spots.
      // Carefully replacing them without breaking the array.
      c = c.replace(wlb + ',', ''); // sometimes followed by comma
      c = c.replace(wlb, ''); 
      c = c.replace(gvb + ',', '');
      c = c.replace(gvb, '');
      c = c.replace(meb + ',', '');
      c = c.replace(meb, '');
      c = c.replace(ivb + ',', '');
      c = c.replace(ivb, '');

      // Now insert them at the top of the svcs array
      c = c.replace('const svcs = [', `const svcs = [\n  ${wlb},\n  ${gvb},\n  ${meb},\n  ${ivb},`);
  }

  // Also remove Erectile Dysfunction from AI Bot:
  // "⚡ <b>Erectile Dysfunction</b> — $79 (sildenafil, tadalafil, custom compounds)\n\nAll medications shipped discreetly after safety screening."
  // Wait, let's just rewrite the whole if/else for ED in the aiBot logic.
  // "Sexual", "Erectile", "ED"
  // Let me replace it so it redirects to General Health instead.
  c = c.replace(
      'if (t.includes("erectile") || t.includes("ed"))\n        return "erectile_dysfunction";',
      ''
  );
  c = c.replace(
      'if (\n        t.includes("erectile") || t.includes("ed")\n      )\n        return "erectile_dysfunction";',
      ''
  );

  fs.writeFileSync(p, c, 'utf-8');
  console.log("Updated public/index.html");
}

function updateLandingData() {
  const p = './emr-portal/src/features/landing/landing-data.ts';
  let c = fs.readFileSync(p, 'utf-8');

  // Replace ED in the marquee
  c = c.replace(
      "{ label: 'Erectile Dysfunction', icon: Zap },",
      ""
  );

  // For HERO_SERVICES, we want it to be:
  // 1. weight-loss
  // 2. general-visit 
  // 3. membership-elite
  // 4. imaging-video
  
  // Wait, is general-visit even defined in HERO_SERVICES?
  // It wasn't in the list I saw! Let me add it.
  const generalVisitBlock = `    {
        id: 'general-health',
        key: 'general_visit',
        icon: Stethoscope,
        tone: 'emerald',
        price: 79,
        title: {
            en: 'General Health Visit',
            es: 'Visita de Salud General',
        },
        description: {
            en: 'Virtual visits for non-emergent health concerns — medication management, wellness checks, and health advice.',
            es: 'Visitas virtuales para problemas de salud no urgentes — manejo de medicamentos, chequeos de bienestar y consejos de salud.',
        },
    },`;

    const weightLossBlock = `    {
        id: 'weight-loss',
        key: 'weight_loss',
        icon: Pill,
        tone: 'blue',
        price: 129,
        title: {
            en: 'Rx Weight Loss',
            es: 'Rx y Perdida de Peso',
        },
        description: {
            en: 'Comprehensive medical weight loss evaluation with Rx eligibility screening, personalized titration, and dietary guidance.',
            es: 'Evaluacion medica integral de perdida de peso con elegibilidad para Rx, titulacion personalizada y orientacion dietetica.',
        },
    },`;

    const membershipEliteBlock = `    {
        id: 'membership-elite',
        key: 'membership_elite',
        icon: Trophy,
        tone: 'amber',
        price: 199,
        priceSuffix: '/mo',
        title: {
            en: 'All Access - Elite',
            es: 'Acceso Total - Elite',
        },
        description: {
            en: 'Everything: telehealth visits, specialty programs, AI health tools, AI imaging, and priority scheduling.',
            es: 'Todo incluido: visitas de telesalud, programas especializados, herramientas de IA para la salud, imagenes con IA y programacion prioritaria.',
        },
    },`;

    const imagingVideoBlock = `    {
        id: 'imaging-video',
        key: 'imaging_video',
        icon: Camera,
        tone: 'rose',
        price: 449,
        title: {
            en: 'Imaging + Video Consult',
            es: 'Imagenes + Consulta por Video',
        },
        description: {
            en: 'Full imaging review plus a 30 to 60 minute secure video consultation to discuss findings directly with a specialist.',
            es: 'Revision completa de imagenes mas una consulta segura por video de 30 a 60 minutos para analizar los hallazgos directamente con un especialista.',
        },
    },`;

    // Strip out the existing HERO_SERVICES array
    // Wait, let's use a regex to capture it.
    c = c.replace(/export const HERO_SERVICES: LandingService\[\] = \[[\s\S]*?\];/, 
`export const HERO_SERVICES: LandingService[] = [
${weightLossBlock}
${generalVisitBlock}
${membershipEliteBlock}
${imagingVideoBlock}
];`);

  fs.writeFileSync(p, c, 'utf-8');
  console.log("Updated landing-data.ts");
}

updatePublicHtml();
updateLandingData();
