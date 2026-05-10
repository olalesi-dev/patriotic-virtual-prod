    function openAboutUs() {
      document.getElementById("aboutModal").classList.add("active");
      switchAboutTab(1); // always open on first tab
    }
    function closeAbout(e) {
      if (e && e.target !== e.currentTarget) return;
      document.getElementById("aboutModal").classList.remove("active");
    }
    function switchAboutTab(tab) {
      const tabs = [1, 2, 3];
      tabs.forEach(t => {
        const p = document.getElementById('aboutProfile' + t);
        const btn = document.getElementById('aboutTab' + t);
        if(p) p.style.display = t === tab ? "flex" : "none";
        if(btn) {
          btn.style.background = t === tab ? "var(--blue)" : "transparent";
          btn.style.color = t === tab ? "#fff" : "var(--txt-sub)";
        }
      });
    }
    /* --- LANGUAGE TOGGLE --- */
    const i18n = {
      en: {
        // Nav
        'nav-about': 'About Us',
        'nav-services': 'Services',
        'nav-how': 'How It Works',
        'nav-radiology': 'Radiology Education',
        'nav-clinicians': 'For Clinicians & Facilities',
        'nav-reviews': 'Reviews',
        'nav-login': 'Log In',
        'nav-get-started': 'Get Started',
        'nav-dashboard': 'Dashboard',
        'nav-logout': 'Log Out',
        // Hero
        'hero-badge': 'Board-Certified Physicians Online Now',
        'hero-h1': 'Healthcare<br />that comes<br />to <span class="gt">you.</span>',
        'hero-sub': 'General telehealth, radiology second opinions, physician-supervised AI imaging, and expert video consults - all protocol-driven, all from board-certified providers.',
        'hero-cta': 'Start Your Visit ->',
        // Services section
        'svc-kicker': 'Browse Services',
        'svc-heading': 'Pick a treatment and start intake in minutes.',
        'svc-sub': 'Tap any card to begin a secure, protocol-driven consultation flow.',
        // Safety bar
        'safety-1': 'Evidence-Based Protocols',
        'safety-2': 'Automated Safety Screening',
        'safety-3': 'Contraindication Checks',
        'safety-4': 'Board-Certified Review',
        // Protocol
        'proto-eyebrow': 'Our Approach',
        'proto-title': 'Protocol-driven care.<br />No exceptions.',
        'proto-sub': 'Every prescription, every consultation, every imaging read follows strict clinical protocols. Our automated screening catches contraindications before they become problems.',
        'proto-pill1': 'Automated contraindication screening on every visit',
        'proto-pill2': 'Evidence-based treatment protocols for all services',
        'proto-pill3': 'Board-certified physician review required for every Rx',
        'proto-pill4': 'HIPAA-compliant platform with full audit logging',
        'partners-eyebrow': 'Partners',
        // How It Works
        'how-eyebrow': 'How It Works',
        'how-title': 'Care in four<br />simple steps.',
        'how-sub': 'From first click to treatment at your door — protocol-driven at every step.',
        'step1-title': 'Pick Your Service',
        'step1-desc': 'Complete your health intake and secure payment via Stripe&trade;.',
        'step2-title': 'Safety Screening',
        'step2-desc': 'Complete ID verification via Vouched&trade; and, when needed, a video consult via Doxy.me&trade;.',
        'step3-title': 'Provider Reviews',
        'step3-desc': 'A board-certified physician or radiologist reviews your case against clinical protocols and creates a personalized plan.',
        'step4-title': 'Get Treated',
        'step4-desc': 'If eligible, your provider sends Rx orders through licensed/certified compounding pharmacies, or to almost any U.S. pharmacy of choice for brand-name and other prescriptions.',
        'step5-title': 'Follow-Up',
        'step5-desc': 'Close personal follow-up by PVT staff helps monitor progress, answer questions, and coordinate next steps.',
        // Reviews
        'reviews-eyebrow': 'Reviews',
        'reviews-title': 'Real results,<br />real people.',
        'reviews-sub': 'Hear from Florida patients who transformed their health with Patriotic Virtual Telehealth.',
        // CTA
        'cta-title': 'Your health, your schedule.',
        'cta-desc': 'Protocol-driven care from board-certified physicians and radiologists — entirely online, entirely safe. Now available in Florida.',
        'cta-btn': 'Start Your Free Visit →',
        // Footer
        'footer-brand': 'Board-certified telehealth and radiology services. Protocol-driven care, delivered to your door. Currently serving Florida.',
        'footer-company': 'Company',
        'footer-about': 'About Us',
        'footer-partners': 'Partners',
        'footer-careers': 'Careers',
        'footer-press': 'Press',
        'footer-support': 'Support',
        'footer-faq': 'FAQ',
        'footer-contact': 'Contact',
        'footer-privacy': 'Privacy Policy',
        'footer-copy': '© 2026 Patriotic Virtual Telehealth. All rights reserved.',
        'footer-badges': 'HIPAA Compliant · FL-Licensed · Protocol-Based · Encrypted',
      },
      es: {
        // Nav
        'nav-about': 'Sobre Nosotros',
        'nav-services': 'Servicios',
        'nav-how': 'Cómo Funciona',
        'nav-radiology': 'Educación en Radiología',
        'nav-clinicians': 'Para Clinicos y Centros',
        'nav-reviews': 'Opiniones',
        'nav-login': 'Iniciar Sesión',
        'nav-get-started': 'Comenzar',
        'nav-dashboard': 'Panel',
        'nav-logout': 'Cerrar Sesión',
        // Hero
        'hero-badge': 'Médicos Certificados en Línea Ahora',
        'hero-h1': 'Atención médica<br />que llega<br />a <span class="gt">usted.</span>',
        'hero-sub': 'Telesalud general, segundas opiniones en radiología, imágenes con IA supervisadas por médicos y consultas por video con expertos — todo guiado por protocolos, todo con proveedores certificados.',
        'hero-cta': 'Comienza Tu Visita ->',
        // Services section
        'svc-kicker': 'Ver Servicios',
        'svc-heading': 'Elige un tratamiento y comienza el proceso en minutos.',
        'svc-sub': 'Toca cualquier tarjeta para iniciar una consulta segura y guiada por protocolos.',
        // Safety bar
        'safety-1': 'Protocolos Basados en Evidencia',
        'safety-2': 'Detección de Seguridad Automatizada',
        'safety-3': 'Verificación de Contraindicaciones',
        'safety-4': 'Revisión por Médico Certificado',
        // Protocol
        'proto-eyebrow': 'Nuestro Enfoque',
        'proto-title': 'Atención guiada por protocolos.<br />Sin excepciones.',
        'proto-sub': 'Cada receta, cada consulta, cada lectura de imagen sigue protocolos clínicos estrictos. Nuestra detección automatizada capta contraindicaciones antes de que se conviertan en problemas.',
        'proto-pill1': 'Detección automática de contraindicaciones en cada visita',
        'proto-pill2': 'Protocolos de tratamiento basados en evidencia para todos los servicios',
        'proto-pill3': 'Revisión médica certificada requerida para cada receta',
        'proto-pill4': 'Plataforma compatible con HIPAA con registro de auditoría completo',
        'partners-eyebrow': 'Socios',
        // How It Works
        'how-eyebrow': 'Cómo Funciona',
        'how-title': 'Atención en cuatro<br />pasos sencillos.',
        'how-sub': 'Desde el primer clic hasta el tratamiento en su puerta — guiado por protocolos en cada paso.',
        'step1-title': 'Elige Tu Servicio',
        'step1-desc': 'Complete su registro de salud y pago seguro mediante Stripe&trade;.',
        'step2-title': 'Evaluación de Seguridad',
        'step2-desc': 'Complete verificación de identidad mediante Vouched&trade; y, cuando sea necesario, una consulta por video vía Doxy.me&trade;.',
        'step3-title': 'Revisión del Proveedor',
        'step3-desc': 'Un médico o radiólogo certificado revisa su caso según protocolos clínicos y crea un plan personalizado.',
        'step4-title': 'Recibe Atención',
        'step4-desc': 'Si es elegible, su proveedor envía recetas a farmacias de preparación magistral con licencia/certificación, o a casi cualquier farmacia de EE. UU. de su elección para medicamentos de marca y otras recetas.',
        'step5-title': 'Seguimiento',
        'step5-desc': 'Seguimiento personal cercano por parte del equipo de PVT para monitorear progreso, responder preguntas y coordinar próximos pasos.',
        // Reviews
        'reviews-eyebrow': 'Opiniones',
        'reviews-title': 'Resultados reales,<br />personas reales.',
        'reviews-sub': 'Escuche a pacientes de Florida que transformaron su salud con Patriotic Virtual Telehealth.',
        // CTA
        'cta-title': 'Tu salud, tu horario.',
        'cta-desc': 'Atención guiada por protocolos de médicos y radiólogos certificados — completamente en línea, completamente segura. Ahora disponible en Florida.',
        'cta-btn': 'Comienza Tu Visita Gratis →',
        // Footer
        'footer-brand': 'Servicios de telesalud y radiología certificados. Atención guiada por protocolos, entregada a su puerta. Actualmente atendiendo a Florida.',
        'footer-company': 'Empresa',
        'footer-about': 'Sobre Nosotros',
        'footer-partners': 'Socios',
        'footer-careers': 'Empleos',
        'footer-press': 'Prensa',
        'footer-support': 'Soporte',
        'footer-faq': 'Preguntas Frecuentes',
        'footer-contact': 'Contacto',
        'footer-privacy': 'Política de Privacidad',
        'footer-copy': '© 2026 Patriotic Virtual Telehealth. Todos los derechos reservados.',
        'footer-badges': 'Compatible con HIPAA · Licencia en FL · Basado en Protocolos · Encriptado',
        // Services
        'svc-imaging_video-name': 'Imágenes + Consulta por Video',
        'svc-imaging_video-desc': 'Revisión completa de imágenes más una consulta segura por video de 30 a 60 minutos para analizar los hallazgos directamente con un especialista.',
        'svc-erectile_dysfunction-name': 'Disfunción Eréctil',
        'svc-erectile_dysfunction-desc': 'Sildenafil, tadalafil y compuestos personalizados — entregados discretamente después de una evaluación de seguridad cardiovascular.',
        'svc-membership_elite-name': 'Acceso Total — Elite',
        'svc-membership_elite-desc': 'Todo incluido: visitas de telesalud, programas especializados, herramientas de IA para la salud, imágenes con IA y programación prioritaria.',
        'svc-digital_platform-name': 'Plataforma de Salud Digital',
        'svc-digital_platform-desc': 'Acceso mensual a herramientas de salud digital, contenido educativo y funciones de navegación impulsadas por IA. Sin servicios clínicos.',
        'svc-weight_loss-name': 'Rx y Pérdida de Peso',
        'svc-weight_loss-desc': 'Evaluación médica integral de pérdida de peso. Detección para elegibilidad de Rx, titulación personalizada, orientación dietética. Costo del medicamento por separado.',
        'svc-premature_ejaculation-name': 'Eyaculación Precoz',
        'svc-premature_ejaculation-desc': 'Sertralina (terapia ISRS), agentes tópicos anestésicos y técnicas conductuales. Basado en evidencia, enviado discretamente.',
        'svc-testosterone_hrt-name': 'Testosterona / TRH',
        'svc-testosterone_hrt-desc': 'Evaluación hormonal integral para hombres y mujeres — testosterona, estrógeno, progesterona, DHEA, apoyo tiroideo y péptidos.',
        'svc-ai_imaging-name': 'Análisis de Imágenes con IA',
        'svc-ai_imaging-desc': 'Interpretación de informes de radiología con IA supervisada por médicos. Herramientas educativas para ayudarle a comprender los hallazgos.',
        'svc-report_interpretation-name': 'Interpretación de Informes',
        'svc-report_interpretation-desc': 'Análisis experto de su informe de radiología existente. Traducimos el lenguaje médico complejo a un lenguaje sencillo.',
        'svc-standard_imaging-name': 'Revisión de Imágenes Estándar',
        'svc-standard_imaging-desc': 'Segunda revisión completa de sus imágenes de rayos X, ultrasonido, TC o resonancia magnética por un radiólogo certificado.',
        'svc-diagnostic_single-name': 'Lectura de Estudio Individual',
        'svc-diagnostic_single-desc': 'Informe de diagnóstico oficial para un estudio (TC, RX, US). Tiempo de entrega menor a 24-48 horas.',
        'svc-diagnostic_second-name': 'Segunda Opinión Diagnóstica',
        'svc-diagnostic_second-desc': 'Revisión diagnóstica completa + opinión escrita + resumen para el paciente para TC, RX o US.',
        'svc-diagnostic_facility-name': 'Contratos para Instalaciones',
        'svc-diagnostic_facility-desc': 'Contratos para Urgencias y Ambulatorio. Lecturas ilimitadas, garantías de nivel de servicio y enlace de carga dedicado.',
        'svc-ai_assistant-name': 'Asistente de Salud con IA',
        'svc-ai_assistant-desc': 'Educación en salud impulsada por IA, orientación sobre síntomas y navegación de atención. No sustituye el consejo médico profesional.',
        'svc-general_visit-name': 'Visita General',
        'svc-general_visit-desc': 'Visitas virtuales para problemas de salud no urgentes — manejo de medicamentos, controles de bienestar, asesoramiento de salud. Atención conveniente desde casa.',
        'svc-membership_plus-name': 'Acceso Total — Plus',
        'svc-membership_plus-desc': 'Visitas de telesalud, asistente de salud con IA, herramientas de imágenes con IA y programación prioritaria en una suscripción.',
        'svc-membership_core-name': 'Acceso Total — Core',
        'svc-membership_core-desc': 'Telesalud general, asistente de salud con IA, herramientas de imágenes con IA y programación. Excelente membresía inicial.',
        'svc-telehealth_premium-name': 'Telesalud Premium',
        'svc-telehealth_premium-desc': 'Acceso ilimitado/prioritario a telesalud general para problemas no urgentes, visitas clínicas y soporte digital.',
        'svc-telehealth_standard-name': 'Telesalud Estándar',
        'svc-telehealth_standard-desc': '1 visita/mes a telesalud general para problemas médicos no urgentes, más visitas clínicas y soporte digital.',
        'svc-telehealth_basic-name': 'Telesalud Básica',
        'svc-telehealth_basic-desc': 'IA + visitas limitadas para telesalud general. Soporte digital y navegación de atención para problemas no urgentes.',
      }
    };

    extendLandingI18n();

    let currentLang = 'en';

    function toggleLanguage() {
      currentLang = currentLang === 'en' ? 'es' : 'en';
      const btn = document.getElementById('langBtn');
      if (btn) {
        btn.classList.toggle('is-es', currentLang === 'es');
        btn.title = currentLang === 'en' ? 'Switch to Spanish' : 'Switch to English';
        btn.setAttribute('aria-pressed', currentLang === 'es' ? 'true' : 'false');
        btn.setAttribute('aria-label', currentLang === 'en' ? 'Language: English' : 'Language: Espanol');
      }
      applyLanguage(currentLang);
      renderSvc('popular'); // re-render service cards in new language
    }

    function applyLanguage(lang) {
      const dict = i18n[lang];
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key] !== undefined) {
          el.innerHTML = dict[key];
        }
      });
      document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (dict[key] !== undefined) {
          el.setAttribute('placeholder', dict[key]);
        }
      });
    }

