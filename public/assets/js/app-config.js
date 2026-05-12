/* Firebase Config */
const firebaseConfig = {
  apiKey: "AIzaSyBtW_7IUCMqbk5V1MzqdIJzgufZEhzjyP8",
  authDomain: "patriotic-virtual-prod.firebaseapp.com",
  projectId: "patriotic-virtual-prod",
  storageBucket: "patriotic-virtual-prod.firebasestorage.app",
  messagingSenderId: "189906910824",
  appId: "1:189906910824:web:16d108f48445cb0e7d85dd",
  measurementId: "G-FY48JCRQ4D",
};

function normalizeRuntimeOrigin(value) {
  if (!value) return null;
  try {
    return new URL(value).toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function resolveRuntimeConfig() {
  const host = window.location.hostname;
  const isFirebasePreview = host.includes("-fresh") || host.includes("--");
  const isDevLanding = host === "dev.patriotictelehealth.com";
  const isCustomProdLanding = host === "patriotictelehealth.com" || host === "www.patriotictelehealth.com";

  const defaults = isDevLanding || isFirebasePreview
    ? {
        environment: "staging",
        emrOrigin: "https://emr-dev.patriotictelehealth.com",
        apiOrigin: "https://api.patriotictelehealth.com",
        pacsOrigin: "https://pacs.patriotictelehealth.com",
      }
    : isCustomProdLanding
      ? {
          environment: "production",
          emrOrigin: "https://emr.patriotictelehealth.com",
          apiOrigin: "https://api.patriotictelehealth.com",
          pacsOrigin: "https://pacs.patriotictelehealth.com",
        }
      : {
          environment: "default",
          emrOrigin: "https://emr.patriotictelehealth.com",
          apiOrigin: "https://api.patriotictelehealth.com",
          pacsOrigin: "https://pacs.patriotictelehealth.com",
        };

  const overrides = window.PVT_RUNTIME_OVERRIDES || {};
  const emrOrigin = normalizeRuntimeOrigin(overrides.emrOrigin) || defaults.emrOrigin;
  const apiOrigin = normalizeRuntimeOrigin(overrides.apiOrigin) || defaults.apiOrigin;
  const pacsOrigin = normalizeRuntimeOrigin(overrides.pacsOrigin) || defaults.pacsOrigin;

  return {
    environment: defaults.environment,
    emrOrigin,
    emrLoginUrl: `${emrOrigin}/login`,
    apiOrigin,
    pacsOrigin,
  };
}

const APP_RUNTIME_CONFIG = resolveRuntimeConfig();
window.PVT_RUNTIME_CONFIG = APP_RUNTIME_CONFIG;

function getEmrOrigin() {
  return APP_RUNTIME_CONFIG.emrOrigin;
}

function getEmrLoginUrl() {
  return APP_RUNTIME_CONFIG.emrLoginUrl;
}

function getApiOrigin() {
  return APP_RUNTIME_CONFIG.apiOrigin;
}

function getPacsOrigin() {
  return APP_RUNTIME_CONFIG.pacsOrigin;
}

function extendLandingI18n() {
  Object.assign(i18n.en, {
    "nav-clinicians": "For Clinicians & Facilities",
    "nav-get-started": "Start My Free Intake",
    "nav-provider-portal": "Provider Portal",
    "nav-emr-portal": "EMR Portal ↗",
    "hero-serving-label": "Serving in:",
    "hero-serving-state": "FLORIDA, USA",
    "hero-online": "Board-Certified Physicians Online Now",
    "hero-h1":
      'Welcome home to <span class="accent">better healthcare</span>',
    "hero-subhead":
      "Doctor-led weight loss and wellness — virtually, in English or Spanish.",
    "hero-sub":
      "Get evaluated by a licensed provider. Rx treatment available if clinically appropriate.",
    "hero-cta": "Start Your Consultation",
    "hero-powered-label": "Powered by:",
    "hero-powered": "RadiantLogiq",
    "hero-live-review": "Live Review",
    "hero-live-duration": "30-60 min",
    "hero-live-badge": "Board-Certified Radiologist",
    "hero-live-popular": "Popular",
    "proto-title":
      '<span class="accent">Protocol-driven</span> care.<br />No exceptions.',
    "proto-support":
      "We say no when treatment isn't right for you — and yes, with a clear plan, when it is.",
    "proto-sub":
      "Every consultation, treatment request, and imaging review follows strict clinical protocols. Our automated screening helps flag contraindications before care decisions are made.",
    "proto-card1-title": "Automated Risk Screening System",
    "proto-card2-title": "Evidence-Based Care Standards",
    "proto-card3-title": "Mandatory Physician Review Process",
    "proto-card4-title": "HIPAA-Compliant Secure Platform",
    "partners-eyebrow": "Partners",
    "innovation-title-prefix": "Powered by",
    "innovation-title-accent": "Innovation.",
    "innovation-body":
      "Patriotic Virtual Telehealth is powered by RadiantLogiq, a physician-founded clinical platform designed to enhance care delivery through workflow optimization and intelligent data processing. RadiantLogiq supports scalable telehealth operations today and is a member of the NVIDIA Inception program.",
    "innovation-card-title": "Secure Medication Management",
    "innovation-card-body":
      "We utilize a secure, integrated e-prescribing platform (DoseSpot) to support safe, compliant, and efficient medication management.",
    "how-title": 'Your Path to <span class="accent">Health</span>',
    "how-sub":
      "From first click to physician review, every step is secure and protocol-driven.",
    "step1-title": "Intake",
    "step1-desc":
      "Complete your health intake and secure payment via Stripe&trade;.",
    "step2-title": "Provider Evaluation",
    "step2-desc":
      "Complete ID verification via Vouched&trade; and, when needed, a video consult via Doxy.me&trade;.",
    "step3-title": "Eligibility",
    "step3-desc":
      "Your provider determines whether treatment is clinically appropriate for you.",
    "step4-title": "Prescription",
    "step4-desc":
      "If eligible, your provider sends Rx orders through licensed/certified compounding pharmacies, or to almost any U.S. pharmacy of choice for brand-name and other prescriptions.",
    "step5-title": "Follow-Up",
    "step5-desc":
      "Close personal follow-up by PVT staff helps monitor progress, answer questions, and coordinate next steps.",
    "radiology-eyebrow": "Radiology Education",
    "radiology-title":
      'Expert <span class="accent">imaging</span><br />insights.<br />Clear understanding.',
    "radiology-sub":
      "Physician-supervised educational services to help you understand your medical imaging.",
    "radiology-ai-desc":
      "Physician-supervised AI interpretation of your radiology reports. We help explain complex findings in plain English for educational purposes only.",
    "radiology-report-desc":
      "Expert analysis of your existing radiology report. We translate medical jargon into clear, understandable language for educational review.",
    "radiology-standard-desc":
      "A complete educational over-read of your actual images (X-Ray, CT, MRI) by a board-certified radiologist.",
    "radiology-video-desc":
      "Full educational image review plus a 30 - 60 minute secure video consultation to discuss findings directly with Dr. Olalesi Osunsade, MD.",
    "facility-eyebrow": "Diagnostic Radiology",
    "facility-title": "Clinical reads &amp;<br />Facility solutions.",
    "facility-sub":
      "Official diagnostic reports and B2B teleradiology services for urgent cares and clinics.",
    "facility-card1-label": "Diagnostic",
    "facility-card1-desc":
      "Official diagnostic report for CT, X-Ray, or Ultrasound. Fast 24-48h turnaround time.",
    "facility-card2-label": "Clinical Review",
    "facility-card2-title": "Second Opinion",
    "facility-card2-desc":
      "Full diagnostic review, written opinion, and patient summary for CT, XR, or US.",
    "facility-card3-label": "For Facilities",
    "facility-card3-title": "Urgent Care / Outpatient",
    "facility-card3-desc":
      "Unlimited reads, SLA guarantees, and dedicated upload link. Customized for your volume.",
    "providers-eyebrow": "Our Providers",
    "providers-title":
      "Transparent &amp; Dedicated Care From Our Licensed Medical Providers",
    "providers-sub":
      "Get to know the specific medical professionals evaluating your health.",
    "provider-1-role": "Medical Director",
    "provider-1-focus-1": "Diagnostic Radiology",
    "provider-1-focus-2": "Interventional Radiology",
    "provider-1-focus-3": "Medical Oversight",
    "provider-1-body":
      "Board Certified - Diagnostic Radiology &amp; Interventional Radiology (ABMS), providing medical oversight and direct patient care at Patriotic Virtual Telehealth.<br />Licensed in: FL, MI, DC, CA, MD, OH, NY, WI",
    "provider-2-role": "Head of Wellness &amp; Functional Medicine",
    "provider-2-focus-1": "Primary Care",
    "provider-2-focus-2": "Medical Weight Management",
    "provider-2-focus-3": "Family Health",
    "provider-2-body":
      "Board Certified - Family Nurse Practitioner (ANCC), dedicated to comprehensive primary care, evaluation, and medical weight management at Patriotic Virtual Telehealth.<br />Licensed in: FL, CA",
    "provider-3-role": "Nurse Practitioner",
    "provider-3-focus-1": "Acute Care",
    "provider-3-focus-2": "Stroke Certified",
    "provider-3-focus-3": "Clinical Guidance",
    "provider-3-body":
      "Board-certified Adult-Gerontology Acute Care Nurse Practitioner (AGACNP-BC) and Stroke Certified Nurse with over 15 years in the nursing field. La Donna is dedicated to evidence-based practice, improving patient outcomes through comprehensive care plans, and providing expert clinical guidance in critical care and stroke programs.",
    "provider-license-tag": "Active Florida Medical License",
    "testimonial-1-quote":
      '"Got my Rx prescription in 24 hours. Down 35 lbs and counting. The safety screening made me feel confident they actually care about doing this right."',
    "testimonial-1-detail": "Weight Loss &middot; Jacksonville, FL",
    "testimonial-2-quote":
      '"Having an actual radiologist explain my CT findings over video was incredible. Plain English, no jargon. Worth every penny for peace of mind."',
    "testimonial-2-detail": "Video Imaging Consult &middot; Tampa, FL",
    "testimonial-3-quote":
      '"The physician noticed something on my chest X-ray, confirmed the diagnosis, and walked me through next steps. Protocol-driven and professional."',
    "testimonial-3-detail": "Radiology Review &middot; Orlando, FL",
    "cta-eyebrow": "Medication Catalog",
    "cta-title": "Explore the medications we offer.",
    "cta-desc":
      "See every medication available through our licensed pharmacy partner — with clinical guidelines and transparent pricing. View the catalog now, or have the complete list emailed to you.",
    "cta-btn": "View our medications →",
    "cta-divider": "Or get the list in your inbox",
    "cta-email-placeholder": "Enter your email address",
    "cta-email-btn": "Email me the list",
    "cta-disclaimer":
      "All medications require evaluation by a licensed clinician. Compounded medications are not FDA-approved. Eligibility confirmed at consultation.",
    "footer-brand":
      "Board-certified telehealth and radiology services. Currently accepting patients in Florida. No controlled substances are prescribed through this platform.",
    "footer-contact-info": "Contact Info",
    "footer-partners": "Partners",
    "footer-terms": "Terms of Service",
    "footer-npp": "Notice of Privacy Practices",
    "footer-telehealth-consent": "Telehealth Consent",
    "footer-copy":
      "&copy; 2026 Patriotic Virtual Telehealth. All rights reserved.",
    "footer-badges":
      "HIPAA Compliant &middot; Florida-Licensed Providers &middot; Board-Certified Review &middot; Encrypted",
    "hero-card-weight_loss-title":
      '<span class="lp-service-title-accent">Medical<br />Weight Loss</span>',
    "hero-card-weight_loss-bottom":
      '<span>Start Your</span><br /><span>Journey Today</span><br /><span class="lp-service-card-bottom-note">and lose up to 20%</span>',
    "hero-card-metabolic-title":
      '<span class="lp-service-title-accent">Imaging-Guided</span><br /><span>Metabolic Wellness<br />Optimization</span>',
    "hero-card-membership_elite-title":
      '<span>All Access -</span><br /><span class="lp-service-title-accent">Elite</span>',
    "hero-card-imaging_video-title":
      '<span>Imaging + </span><br /><span class="lp-service-title-accent">Video Consult</span>',
    "mini-intimacy-title":
      '<span class="lp-service-mini-emphasis lp-service-mini-emphasis--red">Reignite</span> your sex life',
    "mini-intimacy-sub": "Discreet guidance for intimacy concerns.",
    "mini-hair-title":
      '<span class="lp-service-mini-emphasis lp-service-mini-emphasis--blue">Restore</span> your hair',
    "mini-hair-sub": "Care options for thinning hair.",
    "mini-health-title":
      '<span class="lp-service-mini-emphasis lp-service-mini-emphasis--brown">Recharge</span> your health',
    "mini-health-sub": "Support for energy, hormones, and whole-body wellness.",
    "mini-scans-title":
      '<span class="lp-service-mini-emphasis lp-service-mini-emphasis--darkblue">Review</span> your scans',
    "mini-scans-sub": "A simple online review of your concerns.",
    "newsletter-badge": "Exclusive",
    "newsletter-title": "Join Our Health Newsletter",
    "newsletter-desc":
      "Subscriber discounts, treatment alerts, and evidence-based updates delivered monthly.",
    "newsletter-placeholder": "Email address",
    "newsletter-submit": "Subscribe",
    "newsletter-consent":
      "I agree to receive marketing emails from Patriotic Virtual Telehealth.",
    "newsletter-fine":
      "Educational content only. You can unsubscribe anytime.",
    "breakthrough-title":
      'Your weight loss<br /><span>breakthrough is here</span>',
    "breakthrough-sub":
      "Clinician-guided treatment options, online visits, and simple next steps from the same secure platform.",
    "breakthrough-cta": "Get started",
    "breakthrough-carousel-title": "Access a range of GLP&#8209;1 medications",
    "med-badge-new": "New",
    "med-badge-high-dose-option": "High dose option",
    "med-badge-popular": "Popular",
    "med-fda-approved": "FDA<br />approved",
    "med-wegovy-pill": "Wegovy<sup>&reg;</sup> Pill",
    "med-zepbound-kwikpen": "Zepbound<sup>&reg;</sup> KwikPen",
    "med-foundayo": "Foundayo<sup>&reg;</sup>",
    "med-wegovy-pen": "Wegovy<sup>&reg;</sup> Pen",
    "med-zepbound-vial": "Zepbound<sup>&reg;</sup> Vial",
    "med-ozempic": "Ozempic",
    "med-price-149": "From $149/mo*",
    "med-price-299": "From $299/mo*",
    "med-price-199": "From $199/mo*",
    "med-price-199-flat": "$199/mo*",
    "breakthrough-note":
      "Pricing shown is starting price; final pricing confirmed at consultation. Eligibility determined by licensed clinician.",
    "breakthrough-science-title": "The perfect<br /><span>SNAC</span>",
    "breakthrough-science-explainer": "[Explainer copy pending]",
    "breakthrough-science-cta": "See the science",
    "breakthrough-dose-badge": "New high dose",
    "breakthrough-dose-title": "Lose 25% or more<br />body weight*",
    "breakthrough-dose-cta": "Explore Wegovy Pen",
    "breakthrough-footnote":
      "*Placeholder educational copy. Final claims should be reviewed against approved labeling and clinical/legal guidance.",
    "svc-general_visit-name": "General Health Visit",
    "svc-general_visit-desc":
      "Virtual visits for non-emergent health concerns - medication management, wellness checks, health advice. Convenient care from home.",
    "svc-weight_loss-name": "Rx Weight Loss",
    "svc-weight_loss-desc":
      "Comprehensive medical weight loss evaluation. Rx eligibility screening, personalized titration, dietary guidance. Medication cost separate.",
    "svc-membership_elite-name": "All Access — Elite",
    "svc-membership_elite-desc":
      "Everything: telehealth visits, specialty programs, priority radiology reviews, and priority scheduling.",
    "svc-imaging_video-name": "Imaging + Video Consult",
    "svc-imaging_video-desc":
      "Full imaging review plus a 30 - 60 minute secure video consultation to discuss findings directly with a specialist.",
    "svc-ai_imaging-name": "AI-Powered Imaging Analysis",
    "svc-report_interpretation-name": "Report Interpretation",
    "svc-standard_imaging-name": "Standard Imaging Review",
    "svc-diagnostic_single-name": "Single Study Read",
  });

  Object.assign(i18n.es, {
    "nav-clinicians": "Para Clinicos y Centros",
    "nav-get-started": "Comenzar Mi Evaluacion Gratis",
    "nav-provider-portal": "Portal del Proveedor",
    "nav-emr-portal": "Portal EMR ↗",
    "hero-serving-label": "Disponible en:",
    "hero-serving-state": "FLORIDA, USA",
    "hero-online": "Medicos Certificados en Linea Ahora",
    "hero-h1":
      'Bienvenidos a casa a una <span class="accent">mejor atencion medica</span>',
    "hero-subhead":
      "Perdida de peso y bienestar dirigidos por medicos — virtualmente, en ingles o espanol.",
    "hero-sub":
      "Sea evaluado por un proveedor con licencia. Tratamiento con receta disponible si es clinicamente apropiado.",
    "hero-cta": "Comenzar Consulta",
    "hero-powered-label": "Impulsado por:",
    "hero-powered": "RadiantLogiq",
    "hero-live-review": "Revision en Vivo",
    "hero-live-duration": "30-60 min",
    "hero-live-badge": "Radiologo Certificado",
    "hero-live-popular": "Popular",
    "proto-title":
      'Atencion <span class="accent">guiada por protocolos</span>.<br />Sin excepciones.',
    "proto-support":
      "Decimos no cuando el tratamiento no es adecuado para usted — y si, con un plan claro, cuando lo es.",
    "proto-sub":
      "Cada consulta, solicitud de tratamiento y revision de imagen sigue protocolos clinicos estrictos. Nuestra evaluacion automatizada ayuda a detectar contraindicaciones antes de tomar decisiones clinicas.",
    "proto-card1-title": "Sistema Automatizado de Riesgo",
    "proto-card2-title": "Estandares Clinicos Basados en Evidencia",
    "proto-card3-title": "Revision Medica Obligatoria",
    "proto-card4-title": "Plataforma Segura Compatible con HIPAA",
    "partners-eyebrow": "Socios",
    "innovation-title-prefix": "Impulsado por",
    "innovation-title-accent": "Innovacion.",
    "innovation-body":
      "Patriotic Virtual Telehealth esta impulsado por RadiantLogiq, una plataforma clinica fundada por medicos y disenada para mejorar la atencion mediante optimizacion de flujo de trabajo y procesamiento inteligente de datos. RadiantLogiq respalda operaciones escalables de telesalud y es miembro del programa NVIDIA Inception.",
    "innovation-card-title": "Gestion Segura de Medicamentos",
    "innovation-card-body":
      "Utilizamos una plataforma segura e integrada de prescripcion electronica (DoseSpot) para respaldar una gestion de medicamentos segura, eficiente y compatible.",
    "how-title": 'Su Camino hacia la <span class="accent">Salud</span>',
    "how-sub":
      "Desde el primer clic hasta la revision medica, cada paso es seguro y guiado por protocolos.",
    "step1-title": "Registro",
    "step1-desc":
      "Complete su registro de salud y pago seguro mediante Stripe&trade;.",
    "step2-title": "Evaluacion del Proveedor",
    "step2-desc":
      "Complete verificacion de identidad mediante Vouched&trade; y, cuando sea necesario, una consulta por video via Doxy.me&trade;.",
    "step3-title": "Elegibilidad",
    "step3-desc":
      "Su proveedor determina si el tratamiento es clinicamente apropiado para usted.",
    "step4-title": "Receta",
    "step4-desc":
      "Si es elegible, su proveedor envia recetas a farmacias de preparacion magistral con licencia/certificacion, o a casi cualquier farmacia de EE. UU. de su eleccion para medicamentos de marca y otras recetas.",
    "step5-title": "Seguimiento",
    "step5-desc":
      "Seguimiento personal cercano por parte del equipo de PVT para monitorear progreso, responder preguntas y coordinar proximos pasos.",
    "radiology-eyebrow": "Radiologia Educativa",
    "radiology-title":
      'Perspectivas <span class="accent">de imagenes</span><br />expertas.<br />Mayor claridad.',
    "radiology-sub":
      "Servicios educativos supervisados por medicos para ayudarle a comprender sus estudios de imagen.",
    "radiology-ai-desc":
      "Interpretacion supervisada por medicos de sus informes de radiologia con IA. Ayudamos a explicar hallazgos complejos en lenguaje sencillo solo con fines educativos.",
    "radiology-report-desc":
      "Analisis experto de su informe de radiologia existente. Traducimos el lenguaje medico a explicaciones claras para revision educativa.",
    "radiology-standard-desc":
      "Revision educativa completa de sus imagenes reales (X-Ray, CT, MRI) por un radiologo certificado.",
    "radiology-video-desc":
      "Revision educativa completa de imagenes mas una consulta segura por video de 30 a 60 minutos para analizar hallazgos directamente con Dr. Olalesi Osunsade, MD.",
    "facility-eyebrow": "Radiologia Diagnostica",
    "facility-title": "Lecturas clinicas y<br />soluciones para centros.",
    "facility-sub":
      "Informes diagnosticos oficiales y servicios B2B de teleradiologia para urgencias y clinicas.",
    "facility-card1-label": "Diagnostico",
    "facility-card1-desc":
      "Informe diagnostico oficial para CT, Rayos X o Ultrasonido. Entrega rapida en 24-48 horas.",
    "facility-card2-label": "Revision Clinica",
    "facility-card2-title": "Segunda Opinion",
    "facility-card2-desc":
      "Revision diagnostica completa, opinion escrita y resumen para el paciente para CT, XR o US.",
    "facility-card3-label": "Para Centros",
    "facility-card3-title": "Urgencias / Ambulatorio",
    "facility-card3-desc":
      "Lecturas ilimitadas, garantias SLA y enlace de carga dedicado. Personalizado para su volumen.",
    "providers-eyebrow": "Nuestros Proveedores",
    "providers-title":
      "Atencion Transparente y Dedicada de Nuestros Proveedores Medicos",
    "providers-sub":
      "Conozca a los profesionales medicos que evaluan su salud.",
    "provider-1-role": "Director Medico",
    "provider-1-focus-1": "Radiologia Diagnostica",
    "provider-1-focus-2": "Radiologia Intervencionista",
    "provider-1-focus-3": "Supervision Medica",
    "provider-1-body":
      "Certificado en Radiologia Diagnostica e Intervencionista (ABMS), brinda supervision medica y atencion directa al paciente en Patriotic Virtual Telehealth.<br />Licencias en: FL, MI, DC, CA, MD, OH, NY, WI",
    "provider-2-role": "Director de Bienestar y Medicina Funcional",
    "provider-2-focus-1": "Atencion Primaria",
    "provider-2-focus-2": "Manejo Medico del Peso",
    "provider-2-focus-3": "Salud Familiar",
    "provider-2-body":
      "Certificado como Family Nurse Practitioner (ANCC), dedicado a la atencion primaria integral, evaluacion y manejo medico del peso en Patriotic Virtual Telehealth.<br />Licencias en: FL, CA",
    "provider-3-role": "Enfermera Practicante",
    "provider-3-focus-1": "Cuidados Agudos",
    "provider-3-focus-2": "Certificada en Stroke",
    "provider-3-focus-3": "Orientacion Clinica",
    "provider-3-body":
      "Enfermera Practicante de Cuidados Agudos en Adultos y Gerontologia certificada (AGACNP-BC) y enfermera certificada en stroke, con mas de 15 anos de experiencia en enfermeria. La Donna se dedica a la practica basada en evidencia, a mejorar los resultados de los pacientes mediante planes de atencion integrales y a brindar orientacion clinica experta en cuidados criticos y programas de stroke.",
    "provider-license-tag": "Licencia Medica Activa en Florida",
    "testimonial-1-quote":
      '"Recibi mi receta en 24 horas. He bajado 35 libras y sigo avanzando. La evaluacion de seguridad me hizo sentir que realmente les importa hacerlo bien."',
    "testimonial-1-detail": "Perdida de Peso &middot; Jacksonville, FL",
    "testimonial-2-quote":
      '"Fue increible que un radiologo real me explicara mis hallazgos de CT por video. Ingles claro, sin jerga. Valio cada dolar por la tranquilidad."',
    "testimonial-2-detail": "Consulta de Imagen por Video &middot; Tampa, FL",
    "testimonial-3-quote":
      '"El medico detecto algo en mi radiografia de pecho, confirmo el diagnostico y me explico los siguientes pasos. Profesional y guiado por protocolos."',
    "testimonial-3-detail": "Revision Radiologica &middot; Orlando, FL",
    "cta-eyebrow": "Catalogo de Medicamentos",
    "cta-title": "Explore los medicamentos que ofrecemos.",
    "cta-desc":
      "Vea cada medicamento disponible a traves de nuestro socio farmaceutico con licencia, con guias clinicas y precios transparentes. Consulte el catalogo ahora o reciba la lista completa por correo.",
    "cta-btn": "Ver medicamentos →",
    "cta-divider": "O reciba la lista en su correo",
    "cta-email-placeholder": "Ingrese su correo electronico",
    "cta-email-btn": "Enviarme la lista",
    "cta-disclaimer":
      "Todos los medicamentos requieren evaluacion por un clinico con licencia. Los medicamentos compuestos no estan aprobados por la FDA. La elegibilidad se confirma en la consulta.",
    "footer-brand":
      "Servicios de telesalud y radiologia certificados. Actualmente aceptando pacientes en Florida. No se recetan sustancias controladas por esta plataforma.",
    "footer-contact-info": "Informacion de Contacto",
    "footer-partners": "Socios",
    "footer-terms": "Terminos del Servicio",
    "footer-npp": "Aviso de Practicas de Privacidad",
    "footer-telehealth-consent": "Consentimiento de Telesalud",
    "footer-copy":
      "&copy; 2026 Patriotic Virtual Telehealth. Todos los derechos reservados.",
    "footer-badges":
      "Compatible con HIPAA &middot; Proveedores con Licencia en Florida &middot; Revision Certificada &middot; Encriptado",
    "hero-card-weight_loss-title":
      '<span class="lp-service-title-accent">Perdida<br />de Peso<br />Medica</span>',
    "hero-card-weight_loss-bottom":
      '<span>Empiece</span><br /><span>Hoy</span><br /><span class="lp-service-card-bottom-note">y pierda hasta un 20%</span>',
    "hero-card-metabolic-title":
      '<span class="lp-service-title-accent">Guiada por Imagenes</span><br /><span>Optimizacion<br />del Bienestar Metabolico</span>',
    "hero-card-membership_elite-title":
      '<span>Acceso Total -</span><br /><span class="lp-service-title-accent">Elite</span>',
    "hero-card-imaging_video-title":
      '<span>Imagenes + </span><br /><span class="lp-service-title-accent">Consulta Video</span>',
    "mini-intimacy-title":
      '<span class="lp-service-mini-emphasis lp-service-mini-emphasis--red">Reaviva</span> tu vida sexual',
    "mini-intimacy-sub": "Orientacion discreta para inquietudes de intimidad.",
    "mini-hair-title":
      '<span class="lp-service-mini-emphasis lp-service-mini-emphasis--blue">Restaura</span> tu cabello',
    "mini-hair-sub": "Opciones de atencion para el adelgazamiento del cabello.",
    "mini-health-title":
      '<span class="lp-service-mini-emphasis lp-service-mini-emphasis--brown">Recarga</span> tu salud',
    "mini-health-sub": "Apoyo para energia, hormonas y bienestar integral.",
    "mini-scans-title":
      '<span class="lp-service-mini-emphasis lp-service-mini-emphasis--darkblue">Revisa</span> tus estudios',
    "mini-scans-sub": "Una revision sencilla en linea de sus inquietudes.",
    "newsletter-badge": "Exclusivo",
    "newsletter-title": "Boletin de Salud",
    "newsletter-desc":
      "Descuentos para suscriptores, alertas de tratamiento y actualizaciones basadas en evidencia cada mes.",
    "newsletter-placeholder": "Correo electronico",
    "newsletter-submit": "Suscribirse",
    "newsletter-consent":
      "Acepto recibir correos de marketing de Patriotic Virtual Telehealth.",
    "newsletter-fine":
      "Contenido educativo solamente. Puede cancelar la suscripcion cuando quiera.",
    "breakthrough-title":
      'Tu avance en perdida<br /><span>de peso ya esta aqui</span>',
    "breakthrough-sub":
      "Opciones de tratamiento guiadas por clinicos, visitas en linea y pasos simples desde la misma plataforma segura.",
    "breakthrough-cta": "Comenzar",
    "breakthrough-carousel-title": "Acceda a una variedad de medicamentos GLP&#8209;1",
    "med-badge-new": "Nuevo",
    "med-badge-high-dose-option": "Opcion de dosis alta",
    "med-badge-popular": "Popular",
    "med-fda-approved": "Aprobado<br />por FDA",
    "med-wegovy-pill": "Wegovy<sup>&reg;</sup> en pastilla",
    "med-zepbound-kwikpen": "Zepbound<sup>&reg;</sup> KwikPen",
    "med-foundayo": "Foundayo<sup>&reg;</sup>",
    "med-wegovy-pen": "Wegovy<sup>&reg;</sup> Pen",
    "med-zepbound-vial": "Zepbound<sup>&reg;</sup> Vial",
    "med-ozempic": "Ozempic",
    "med-price-149": "Desde $149/mes*",
    "med-price-299": "Desde $299/mes*",
    "med-price-199": "Desde $199/mes*",
    "med-price-199-flat": "$199/mes*",
    "breakthrough-note":
      "El precio mostrado es inicial; el precio final se confirma en la consulta. La elegibilidad la determina un clinico con licencia.",
    "breakthrough-science-title": "El SNAC<br /><span>perfecto</span>",
    "breakthrough-science-explainer": "[Explainer copy pending]",
    "breakthrough-science-cta": "Ver la ciencia",
    "breakthrough-dose-badge": "Nueva dosis alta",
    "breakthrough-dose-title": "Pierda 25% o mas<br />de peso corporal*",
    "breakthrough-dose-cta": "Explorar Wegovy Pen",
    "breakthrough-footnote":
      "*Texto educativo provisional. Las afirmaciones finales deben revisarse segun el etiquetado aprobado y la orientacion clinica/legal.",
    "svc-general_visit-name": "Visita General de Salud",
    "svc-general_visit-desc":
      "Visitas virtuales para problemas de salud no emergentes: manejo de medicamentos, controles de bienestar y orientacion de salud. Atencion conveniente desde casa.",
    "svc-weight_loss-name": "Rx para Perdida de Peso",
    "svc-weight_loss-desc":
      "Evaluacion medica integral para perdida de peso. Revision de elegibilidad para receta, titulacion personalizada y orientacion dietetica. El costo del medicamento es aparte.",
    "svc-imaging_video-name": "Imagenes + Consulta por Video",
    "svc-imaging_video-desc":
      "Revision completa de imagenes mas una consulta segura por video de 30 a 60 minutos para analizar hallazgos directamente con un especialista.",
    "svc-ai_imaging-name": "Analisis de Imagenes con IA",
    "svc-report_interpretation-name": "Interpretacion de Informes",
    "svc-standard_imaging-name": "Revision Estandar de Imagenes",
    "svc-diagnostic_single-name": "Lectura de Estudio Unico",
  });
}
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Fallback to Next.js API URL if available, otherwise absolute Cloud Run backend
const API = getApiOrigin();
const ACTIVE_STATES = ["FL"];
const COMING_STATES = ["IN", "VA"];
let token = null,
  user = null,
  selSvc = null,
  intake = {},
  fbUser = null;
