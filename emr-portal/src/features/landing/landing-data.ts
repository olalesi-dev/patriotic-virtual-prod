import type { LucideIcon } from 'lucide-react';
import {
    Activity,
    BadgeCheck,
    Building2,
    Brain,
    Camera,
    ClipboardCheck,
    FileText,
    HeartPulse,
    MapPinned,
    MessageSquareHeart,
    MonitorSmartphone,
    Pill,
    ScanSearch,
    ShieldCheck,
    Sparkles,
    Stethoscope,
    Trophy,
    Truck,
    Users,
    Zap,
} from 'lucide-react';

export type LandingLocale = 'en' | 'es';

export type ServiceTone = 'blue' | 'rose' | 'amber' | 'violet' | 'emerald' | 'coral';

export type LandingService = {
    id: string;
    key: string;
    icon: LucideIcon;
    tone: ServiceTone;
    price: number;
    priceSuffix?: string;
    title: Record<LandingLocale, string>;
    description: Record<LandingLocale, string>;
};

export type RadiologyCard = {
    id: string;
    serviceKey: string;
    badge: string;
    badgeTone: 'blue' | 'indigo' | 'navy' | 'rose' | 'neutral' | 'amber';
    price: string;
    title: string;
    description: string;
};

export type ClinicianProfile = {
    id: string;
    name: string;
    role: string;
    imageSrc: string;
    imageAlt: string;
    summary: string;
    leftCardTitle: string;
    leftItems: string[];
    rightCardTitle: string;
    rightItems: string[];
    bottomCardTitle: string;
    bottomItems: string[];
    extraCardTitle?: string;
    extraCardBody?: string;
};

export const LANDING_COPY = {
    en: {
        nav: {
            about: 'About Us',
            services: 'Services',
            how: 'How It Works',
            radiology: 'Radiology Education',
            clinicians: 'For Clinicians and Facilities',
            reviews: 'Reviews',
            login: 'Log In',
            getStarted: 'Get Started',
            dashboard: 'Dashboard',
            logout: 'Log Out',
        },
        hero: {
            badge: 'Board-Certified Physicians Online Now',
            titleHtml: 'Healthcare<br />that comes<br />to <span class="gt">you.</span>',
            subtitle:
                'General telehealth, radiology second opinions, physician-supervised AI imaging, and expert video consults - all protocol-driven, all from board-certified providers.',
            cta: 'Start Your Visit ->',
            servicesKicker: 'Browse Services',
            servicesTitle: 'Pick a treatment and start intake in minutes.',
            servicesSubtitle:
                'Tap any card to begin a secure, protocol-driven consultation flow.',
        },
        safety: [
            'Evidence-Based Protocols',
            'Automated Safety Screening',
            'Contraindication Checks',
            'Board-Certified Review',
        ],
        protocol: {
            eyebrow: 'Our Approach',
            titleHtml: 'Protocol-driven care.<br />No exceptions.',
            subtitle:
                'Every prescription, every consultation, every imaging read follows strict clinical protocols. Our automated screening catches contraindications before they become problems.',
            pills: [
                'Automated contraindication screening on every visit',
                'Evidence-based treatment protocols for all services',
                'Board-certified physician review required for every Rx',
                'HIPAA-compliant platform with full audit logging',
            ],
        },
        how: {
            eyebrow: 'How It Works',
            titleHtml: 'Care in four<br />simple steps.',
            subtitle:
                'From first click to treatment at your door - protocol-driven at every step.',
            steps: [
                {
                    title: 'Pick Your Service',
                    description:
                        "Choose from clinical visits, AI tools, and membership plans - general telehealth, weight loss, sexual health, hormone therapy, AI imaging, and much more.",
                },
                {
                    title: 'Safety Screening',
                    description:
                        'Complete a secure intake. Our system automatically screens for contraindications to ensure safe, protocol-based treatment.',
                },
                {
                    title: 'Provider Reviews',
                    description:
                        'A board-certified physician or radiologist reviews your case against clinical protocols and creates a personalized plan.',
                },
                {
                    title: 'Get Treated',
                    description:
                        'Prescriptions ship to your door. Radiology reports are delivered digitally. Video consults can happen from anywhere. Ongoing support is included.',
                },
            ],
        },
        reviews: {
            eyebrow: 'Reviews',
            titleHtml: 'Real results,<br />real people.',
            subtitle:
                'Hear from Florida patients who transformed their health with Patriotic Virtual Telehealth.',
        },
        cta: {
            title: 'Your health, your schedule.',
            description:
                'Protocol-driven care from board-certified physicians and radiologists - entirely online, entirely safe. Now available in Florida.',
            button: 'Start Your Free Visit ->',
        },
        footer: {
            brand:
                'Board-certified telehealth and radiology services. Protocol-driven care, delivered to your door. Currently serving Florida.',
            company: 'Company',
            support: 'Support',
            about: 'About Us',
            careers: 'Careers',
            press: 'Press',
            faq: 'FAQ',
            contact: 'Contact',
            privacy: 'Privacy Policy',
            copy: '© 2026 Patriotic Virtual Telehealth. All rights reserved.',
            badges: 'HIPAA Compliant · FL-Licensed · Protocol-Based · Encrypted',
        },
    },
    es: {
        nav: {
            about: 'Sobre Nosotros',
            services: 'Servicios',
            how: 'Como Funciona',
            radiology: 'Educacion en Radiologia',
            clinicians: 'Para Clinicos e Instalaciones',
            reviews: 'Opiniones',
            login: 'Iniciar Sesion',
            getStarted: 'Comenzar',
            dashboard: 'Panel',
            logout: 'Cerrar Sesion',
        },
        hero: {
            badge: 'Medicos Certificados en Linea Ahora',
            titleHtml: 'Atencion medica<br />que llega<br />a <span class="gt">usted.</span>',
            subtitle:
                'Telesalud general, segundas opiniones en radiologia, imagenes con IA supervisadas por medicos y consultas por video con expertos - todo guiado por protocolos, todo con proveedores certificados.',
            cta: 'Comienza Tu Visita ->',
            servicesKicker: 'Ver Servicios',
            servicesTitle: 'Elige un tratamiento y comienza el proceso en minutos.',
            servicesSubtitle:
                'Toca cualquier tarjeta para iniciar una consulta segura y guiada por protocolos.',
        },
        safety: [
            'Protocolos Basados en Evidencia',
            'Deteccion de Seguridad Automatizada',
            'Verificacion de Contraindicaciones',
            'Revision por Medico Certificado',
        ],
        protocol: {
            eyebrow: 'Nuestro Enfoque',
            titleHtml: 'Atencion guiada por protocolos.<br />Sin excepciones.',
            subtitle:
                'Cada receta, cada consulta, cada lectura de imagen sigue protocolos clinicos estrictos. Nuestra deteccion automatizada capta contraindicaciones antes de que se conviertan en problemas.',
            pills: [
                'Deteccion automatica de contraindicaciones en cada visita',
                'Protocolos de tratamiento basados en evidencia para todos los servicios',
                'Revision medica certificada requerida para cada receta',
                'Plataforma compatible con HIPAA con registro de auditoria completo',
            ],
        },
        how: {
            eyebrow: 'Como Funciona',
            titleHtml: 'Atencion en cuatro<br />pasos sencillos.',
            subtitle:
                'Desde el primer clic hasta el tratamiento en su puerta - guiado por protocolos en cada paso.',
            steps: [
                {
                    title: 'Elige Tu Servicio',
                    description:
                        'Elige entre consultas clinicas, herramientas de IA y planes de membresia - telesalud general, perdida de peso, salud sexual, terapia hormonal, imagenes con IA y mucho mas.',
                },
                {
                    title: 'Evaluacion de Seguridad',
                    description:
                        'Completa un registro seguro. Nuestro sistema detecta automaticamente contraindicaciones para garantizar un tratamiento seguro basado en protocolos.',
                },
                {
                    title: 'Revision del Proveedor',
                    description:
                        'Un medico o radiologo certificado revisa su caso segun protocolos clinicos y crea un plan personalizado.',
                },
                {
                    title: 'Recibe Atencion',
                    description:
                        'Las recetas llegan a su puerta. Informes de radiologia entregados digitalmente. Consultas por video desde cualquier lugar. Soporte continuo incluido.',
                },
            ],
        },
        reviews: {
            eyebrow: 'Opiniones',
            titleHtml: 'Resultados reales,<br />personas reales.',
            subtitle:
                'Escuche a pacientes de Florida que transformaron su salud con Patriotic Virtual Telehealth.',
        },
        cta: {
            title: 'Tu salud, tu horario.',
            description:
                'Atencion guiada por protocolos de medicos y radiologos certificados - completamente en linea, completamente segura. Ahora disponible en Florida.',
            button: 'Comienza Tu Visita Gratis ->',
        },
        footer: {
            brand:
                'Servicios de telesalud y radiologia certificados. Atencion guiada por protocolos, entregada a su puerta. Actualmente atendiendo a Florida.',
            company: 'Empresa',
            support: 'Soporte',
            about: 'Sobre Nosotros',
            careers: 'Empleos',
            press: 'Prensa',
            faq: 'Preguntas Frecuentes',
            contact: 'Contacto',
            privacy: 'Politica de Privacidad',
            copy: '© 2026 Patriotic Virtual Telehealth. Todos los derechos reservados.',
            badges: 'Compatible con HIPAA · Licencia en FL · Basado en Protocolos · Encriptado',
        },
    },
} satisfies Record<LandingLocale, unknown>;

export const TRUST_PILLS = [
    {
        label: 'Location',
        value: 'Serving in Florida',
        icon: MapPinned,
    },
    {
        label: 'Shield',
        value: 'HIPAA Compliant',
        icon: ShieldCheck,
    },
    {
        label: 'Rx',
        value: 'Free Shipping',
        icon: Truck,
    },
    {
        label: 'SOP',
        value: 'Protocol Based',
        icon: ClipboardCheck,
    },
] as const;

export const HERO_SERVICES: LandingService[] = [
    {
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
    },
    {
        id: 'erectile-dysfunction',
        key: 'erectile_dysfunction',
        icon: Zap,
        tone: 'blue',
        price: 79,
        title: {
            en: 'Erectile Dysfunction',
            es: 'Disfuncion Erectil',
        },
        description: {
            en: 'Sildenafil, tadalafil and custom compounds delivered discreetly after cardiovascular safety screening.',
            es: 'Sildenafil, tadalafil y compuestos personalizados entregados discretamente despues de una evaluacion de seguridad cardiovascular.',
        },
    },
    {
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
    },
    {
        id: 'weight-loss',
        key: 'weight_loss',
        icon: Pill,
        tone: 'blue',
        price: 129,
        title: {
            en: 'GLP-1 & Weight Loss',
            es: 'GLP-1 y Perdida de Peso',
        },
        description: {
            en: 'Comprehensive medical weight loss evaluation with GLP-1 eligibility screening, personalized titration, and dietary guidance.',
            es: 'Evaluacion medica integral de perdida de peso con elegibilidad para GLP-1, titulacion personalizada y orientacion dietetica.',
        },
    },
];

export const PROTOCOL_PILL_ICONS = [ShieldCheck, ClipboardCheck, Stethoscope, Activity] as const;

export const PROTOCOL_METRICS = [
    { value: '100%', label: 'Protocol Adherence' },
    { value: '9', label: 'Service Categories' },
    { value: '<24h', label: 'Provider Response' },
    { value: '24/7', label: 'Platform Access' },
] as const;

export const MARQUEE_ITEMS = [
    { label: 'AI Health Assistant', icon: Brain },
    { label: 'AI-Powered Imaging', icon: ScanSearch },
    { label: 'Digital Health Platform', icon: MonitorSmartphone },
    { label: 'Available in Florida', icon: MapPinned },
    { label: 'General Telehealth', icon: Stethoscope },
    { label: 'GLP-1 Weight Loss', icon: Pill },
    { label: 'Erectile Dysfunction', icon: Zap },
] as const;

export const RADIOLOGY_EDUCATION_CARDS: RadiologyCard[] = [
    {
        id: 'ai-imaging',
        serviceKey: 'ai_imaging',
        badge: 'Tier 1',
        badgeTone: 'blue',
        price: '$99 / analysis',
        title: 'AI-Powered Analysis',
        description:
            'Physician-supervised AI interpretation of your radiology reports. We help explain complex findings in plain English.',
    },
    {
        id: 'report-interpretation',
        serviceKey: 'report_interpretation',
        badge: 'Tier 2',
        badgeTone: 'neutral',
        price: '$149 / report',
        title: 'Report Interpretation',
        description:
            'Expert analysis of your existing radiology report. We translate medical jargon into clear, understandable language.',
    },
    {
        id: 'standard-imaging',
        serviceKey: 'standard_imaging',
        badge: 'Tier 3',
        badgeTone: 'amber',
        price: '$249 / study',
        title: 'Standard Imaging Review',
        description:
            'A complete educational over-read of your actual images by a board-certified radiologist.',
    },
    {
        id: 'imaging-video-premier',
        serviceKey: 'imaging_video',
        badge: 'Tier 4 - Premier',
        badgeTone: 'rose',
        price: '$449 / consult',
        title: 'Imaging + Video Consult',
        description:
            'Full educational image review plus a 30 to 60 minute secure video consultation to discuss findings directly with Dr. Osunsade.',
    },
];

export const RADIOLOGY_CLINICAL_CARDS: RadiologyCard[] = [
    {
        id: 'diagnostic-single',
        serviceKey: 'diagnostic_single',
        badge: 'Diagnostic',
        badgeTone: 'blue',
        price: '$75 / read',
        title: 'Single Study Read',
        description:
            'Official diagnostic report for CT, X-Ray, or Ultrasound with a fast 24 to 48 hour turnaround.',
    },
    {
        id: 'diagnostic-second',
        serviceKey: 'diagnostic_second',
        badge: 'Clinical Review',
        badgeTone: 'indigo',
        price: '$250 / consult',
        title: 'Second Opinion',
        description:
            'Full diagnostic review, written opinion, and patient summary for CT, XR, or US.',
    },
    {
        id: 'diagnostic-facility',
        serviceKey: 'diagnostic_facility',
        badge: 'For Facilities',
        badgeTone: 'navy',
        price: '$3,500+ / month',
        title: 'Urgent Care / Outpatient',
        description:
            'Unlimited reads, SLA guarantees, and a dedicated upload link customized for your imaging volume.',
    },
];

export const TESTIMONIALS = [
    {
        initials: 'MR',
        quote:
            'Got my GLP-1 prescription in 24 hours. Down 35 lbs and counting. The safety screening made me feel confident they actually care about doing this right.',
        name: 'Marcus R.',
        details: 'Weight Loss - Jacksonville, FL',
    },
    {
        initials: 'SK',
        quote:
            'Having an actual radiologist explain my CT findings over video was incredible. Plain English, no jargon. Worth every penny for peace of mind.',
        name: 'Sarah K.',
        details: 'Video Imaging Consult - Tampa, FL',
    },
    {
        initials: 'JD',
        quote:
            'The AI flagged something on my chest X-ray, then the radiologist confirmed it and walked me through next steps. Protocol-driven and professional.',
        name: 'James D.',
        details: 'AI + Radiologist - Orlando, FL',
    },
] as const;

export const ABOUT_PROFILES: ClinicianProfile[] = [
    {
        id: 'osunsade',
        name: 'Dr. Olalesi Osunsade',
        role: 'Dr. "O" - Diagnostic & Interventional Radiologist',
        imageSrc: '/assets/dr_osunsade_new.jpg',
        imageAlt: 'Dr. Osunsade',
        summary:
            "Dual board-certified Diagnostic and Interventional Radiologist with extensive experience across academic medical centers, community hospitals, and teleradiology. Born in Washington, DC, Dr. Osunsade brings an international perspective shaped by time in the Philippines, Tanzania, Kenya, Nigeria, and the United States.",
        leftCardTitle: 'Education',
        leftItems: [
            'MD: George Washington University School of Medicine (2012)',
            "Residency: St. Vincent's Medical Center (Chief Resident)",
            'Fellowship (IR): Henry Ford Hospital',
        ],
        rightCardTitle: 'Active Licenses',
        rightItems: [
            'FL · MD · CA · NY · MI · DC',
            'OH · WI · TX',
            'Enrolled in IMLC (Interstate Compact)',
        ],
        bottomCardTitle: 'Personal & Bio',
        bottomItems: [
            'Languages: English (Native), French (Proficient), Yoruba & Swahili (Conversational)',
            'Recognition: TOP DOCTOR Magazine (2017, 2022)',
        ],
        extraCardTitle: 'Partnership',
        extraCardBody:
            'We partner with Sterling Union for operations, compliance, and administrative excellence, and with Orosun Health for advanced imaging and radiology support. Those partnerships help us deliver safe, coordinated, and compassionate virtual care.',
    },
    {
        id: 'berrios',
        name: 'Alvaro Berrios, MS, FNP-BC',
        role: 'Family Nurse Practitioner - Functional Medicine Practitioner',
        imageSrc: '/assets/alvaro_berrios.jpg',
        imageAlt: 'Alvaro Berrios',
        summary:
            'Board-certified Family Nurse Practitioner since 2006 with more than 30 years in the nursing field. Alvaro focuses on restoring health by targeting the root cause of illness, not just the symptoms, with a strong emphasis on prevention and treatment.',
        leftCardTitle: 'Education',
        leftItems: [
            'BS: University of Southern California (USC)',
            'MS in Nursing / FNP Certificate: Cal State Dominguez Hills',
            'Functional Medicine Certificate: The Functional Medicine Academy',
        ],
        rightCardTitle: 'Areas of Expertise',
        rightItems: [
            "Women's Health · Pediatrics",
            'Acute Care · Urgent Care',
            'Family Medicine · Geriatrics',
        ],
        bottomCardTitle: 'Practice',
        bottomItems: ['Founder: Restore Your Health Functional Medicine'],
        extraCardTitle: 'Community Impact',
        extraCardBody:
            'Throughout his career, Alvaro has established programs designed to address the healthcare needs of uninsured patients, ensuring quality care remains accessible regardless of insurance status.',
    },
];

export const CONSENT_SECTIONS = [
    {
        title: '1. Telehealth Consent',
        body:
            'By using this service, you consent to receive medical care via electronic information and communication technologies. You understand that telehealth has limitations compared to in-person visits, including the inability to perform hands-on physical exams.',
    },
    {
        title: '2. Payment Policy (Cash-Pay Only)',
        body:
            'Patriotic Virtual Telehealth is a cash-pay only practice. We do not accept or bill commercial insurance, Medicare, or Medicaid. All fees are due at the time of service.',
    },
    {
        title: '3. HIPAA & Privacy',
        body:
            'We utilize HIPAA-compliant secure platforms for video consults, messaging, and data storage. Your information will only be shared for treatment, payment, healthcare operations, or as required by law.',
    },
    {
        title: '4. GLP-1 & Weight Loss',
        body:
            'For GLP-1 agonist prescriptions, you acknowledge potential side effects including nausea, vomiting, and risk of thyroid C-cell tumors. You confirm you do not have a personal or family history of Medullary Thyroid Carcinoma or MEN 2 syndrome.',
    },
    {
        title: '5. Radiology Services',
        body:
            'Educational tiers are for informational use only and do not constitute a formal diagnosis or replace your official medical record. Official diagnostic reports are provided only for services explicitly labeled Diagnostic or Clinical Consult.',
    },
    {
        title: '6. Data Usage for Artificial Intelligence & Analytics',
        body:
            'You acknowledge and consent to the collection, aggregation, and anonymization of de-identified health data and usage patterns for internal analytics, quality improvement, and AI model improvement in accordance with applicable privacy laws.',
    },
    {
        title: '7. SMS Notifications & Communications',
        body:
            'Patients who opt in may receive SMS confirmations, reminders, and in-platform notification alerts. No marketing content will be sent by SMS. Message and data rates may apply. Reply STOP to unsubscribe and HELP for support.',
    },
] as const;

export const CONSENT_ALERT =
    'NO EMERGENCY CARE: We do not treat medical emergencies. If you have chest pain, shortness of breath, severe bleeding, or any life-threatening emergency, call 911 or go to the nearest ER immediately.';

export const SUPPORT_EMAIL = 'support@patriotictelehealth.com';

export const FOOTER_LINKS = {
    company: ['about', 'careers', 'press'],
    support: ['faq', 'contact', 'privacy'],
} as const;

export const HERO_BADGE_ICONS = {
    browser: Sparkles,
    scheduling: Users,
    reviews: MessageSquareHeart,
    clinical: HeartPulse,
    imaging: FileText,
    diagnostics: Building2,
    ai: Brain,
    protocols: BadgeCheck,
} as const;
