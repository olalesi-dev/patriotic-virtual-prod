"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { LandingModals } from "./LandingModals";

type LandingLocale = "en" | "es";

type ServiceCard = {
  id: string;
  key: string;
  icon: string;
  iconClass: string;
  color: string;
  price: number;
  priceSuffix?: string;
  title: Record<LandingLocale, string>;
  description: Record<LandingLocale, string>;
};

const POPULAR_SERVICES: ServiceCard[] = [
  {
    id: "imaging-video",
    key: "imaging_video",
    icon: "📹",
    iconClass: "rose",
    color: "rose",
    price: 449,
    title: {
      en: "Imaging + Video Consult",
      es: "Imágenes + Consulta por Video",
    },
    description: {
      en: "Full imaging review plus a 30 - 60 minute secure video consultation to discuss findings directly with a specialist.",
      es: "Revisión completa de imágenes más una consulta segura por video de 30 a 60 minutos para analizar los hallazgos directamente con un especialista.",
    },
  },
  {
    id: "erectile-dysfunction",
    key: "erectile_dysfunction",
    icon: "⚡",
    iconClass: "blue",
    color: "blue",
    price: 79,
    title: {
      en: "Erectile Dysfunction",
      es: "Disfunción Eréctil",
    },
    description: {
      en: "Sildenafil, tadalafil & custom compounds — discreetly delivered after cardiovascular safety screening.",
      es: "Sildenafil, tadalafil y compuestos personalizados — entregados discretamente después de una evaluación de seguridad cardiovascular.",
    },
  },
  {
    id: "membership-elite",
    key: "membership_elite",
    icon: "🏆",
    iconClass: "amber",
    color: "amber",
    price: 199,
    priceSuffix: "/mo",
    title: {
      en: "All Access — Elite",
      es: "Acceso Total — Elite",
    },
    description: {
      en: "Everything: telehealth visits, specialty programs, AI health tools, AI imaging, and priority scheduling.",
      es: "Todo incluido: visitas de telesalud, programas especializados, herramientas de IA para la salud, imágenes con IA y programación prioritaria.",
    },
  },
  {
    id: "weight-loss",
    key: "weight_loss",
    icon: "💊",
    iconClass: "blue",
    color: "blue",
    price: 129,
    title: {
      en: "GLP-1 & Weight Loss",
      es: "GLP-1 y Pérdida de Peso",
    },
    description: {
      en: "Comprehensive medical weight loss evaluation. GLP-1 eligibility screening, personalized titration, dietary guidance. Medication cost separate.",
      es: "Evaluación médica integral de pérdida de peso. Detección para elegibilidad de GLP-1, titulación personalizada y orientación dietética. Costo del medicamento por separado.",
    },
  },
];

const COPY = {
  en: {
    nav: {
      about: "About Us",
      services: "Services",
      how: "How It Works",
      radiology: "Radiology Education",
      clinicians: "For Clinicians and Facilities",
      reviews: "Reviews",
      login: "Log In",
      getStarted: "Get Started",
      dashboard: "Dashboard",
      logout: "Log Out",
    },
    hero: {
      badge: "Board-Certified Physicians Online Now",
      titleHtml:
        'Healthcare<br />that comes<br />to <span class="gt">you.</span>',
      subtitle:
        "General telehealth, radiology second opinions, physician-supervised AI imaging, and expert video consults - all protocol-driven, all from board-certified providers.",
      cta: "Start Your Visit ->",
      servicesKicker: "Browse Services",
      servicesHeading: "Pick a treatment and start intake in minutes.",
      servicesSub:
        "Tap any card to begin a secure, protocol-driven consultation flow.",
    },
    safety: [
      "Evidence-Based Protocols",
      "Automated Safety Screening",
      "Contraindication Checks",
      "Board-Certified Review",
    ],
    protocol: {
      eyebrow: "Our Approach",
      titleHtml: "Protocol-driven care.<br />No exceptions.",
      subtitle:
        "Every prescription, every consultation, every imaging read follows strict clinical protocols. Our automated screening catches contraindications before they become problems.",
      pills: [
        "Automated contraindication screening on every visit",
        "Evidence-based treatment protocols for all services",
        "Board-certified physician review required for every Rx",
        "HIPAA-compliant platform with full audit logging",
      ],
    },
    how: {
      eyebrow: "How It Works",
      titleHtml: "Care in four<br />simple steps.",
      subtitle:
        "From first click to treatment at your door — protocol-driven at every step.",
      steps: [
        {
          number: "01",
          title: "Pick Your Service",
          description:
            "Choose from clinical visits, AI tools, and membership plans — general telehealth, weight loss, sexual health, hormone therapy, AI imaging, and much more.",
        },
        {
          number: "02",
          title: "Safety Screening",
          description:
            "Complete a secure intake. Our system automatically screens for contraindications to ensure safe, protocol-based treatment.",
        },
        {
          number: "03",
          title: "Provider Reviews",
          description:
            "A board-certified physician or radiologist reviews your case against clinical protocols and creates a personalized plan.",
        },
        {
          number: "04",
          title: "Get Treated",
          description:
            "Prescriptions ship to your door. Radiology reports delivered digitally. Video consults from anywhere. Ongoing support included.",
        },
      ],
    },
    reviews: {
      eyebrow: "Reviews",
      titleHtml: "Real results,<br />real people.",
      subtitle:
        "Hear from Florida patients who transformed their health with Patriotic Virtual Telehealth.",
    },
    cta: {
      title: "Your health, your schedule.",
      description:
        "Protocol-driven care from board-certified physicians and radiologists — entirely online, entirely safe. Now available in Florida.",
      button: "Start Your Free Visit →",
    },
    footer: {
      brand:
        "Board-certified telehealth and radiology services. Protocol-driven care, delivered to your door. Currently serving Florida.",
      company: "Company",
      about: "About Us",
      careers: "Careers",
      press: "Press",
      support: "Support",
      faq: "FAQ",
      contact: "Contact",
      privacy: "Privacy Policy",
      copy: "© 2026 Patriotic Virtual Telehealth. All rights reserved.",
      badges: "HIPAA Compliant · FL-Licensed · Protocol-Based · Encrypted",
    },
  },
  es: {
    nav: {
      about: "Sobre Nosotros",
      services: "Servicios",
      how: "Cómo Funciona",
      radiology: "Educación en Radiología",
      clinicians: "Para Clínicos e Instalaciones",
      reviews: "Opiniones",
      login: "Iniciar Sesión",
      getStarted: "Comenzar",
      dashboard: "Panel",
      logout: "Cerrar Sesión",
    },
    hero: {
      badge: "Médicos Certificados en Línea Ahora",
      titleHtml:
        'Atención médica<br />que llega<br />a <span class="gt">usted.</span>',
      subtitle:
        "Telesalud general, segundas opiniones en radiología, imágenes con IA supervisadas por médicos y consultas por video con expertos — todo guiado por protocolos, todo con proveedores certificados.",
      cta: "Comienza Tu Visita ->",
      servicesKicker: "Ver Servicios",
      servicesHeading: "Elige un tratamiento y comienza el proceso en minutos.",
      servicesSub:
        "Toca cualquier tarjeta para iniciar una consulta segura y guiada por protocolos.",
    },
    safety: [
      "Protocolos Basados en Evidencia",
      "Detección de Seguridad Automatizada",
      "Verificación de Contraindicaciones",
      "Revisión por Médico Certificado",
    ],
    protocol: {
      eyebrow: "Nuestro Enfoque",
      titleHtml: "Atención guiada por protocolos.<br />Sin excepciones.",
      subtitle:
        "Cada receta, cada consulta, cada lectura de imagen sigue protocolos clínicos estrictos. Nuestra detección automatizada capta contraindicaciones antes de que se conviertan en problemas.",
      pills: [
        "Detección automática de contraindicaciones en cada visita",
        "Protocolos de tratamiento basados en evidencia para todos los servicios",
        "Revisión médica certificada requerida para cada receta",
        "Plataforma compatible con HIPAA con registro de auditoría completo",
      ],
    },
    how: {
      eyebrow: "Cómo Funciona",
      titleHtml: "Atención en cuatro<br />pasos sencillos.",
      subtitle:
        "Desde el primer clic hasta el tratamiento en su puerta — guiado por protocolos en cada paso.",
      steps: [
        {
          number: "01",
          title: "Elige Tu Servicio",
          description:
            "Elige entre consultas clínicas, herramientas de IA y planes de membresía — telesalud general, pérdida de peso, salud sexual, terapia hormonal, imágenes con IA y mucho más.",
        },
        {
          number: "02",
          title: "Evaluación de Seguridad",
          description:
            "Completa un registro seguro. Nuestro sistema detecta automáticamente contraindicaciones para garantizar un tratamiento seguro basado en protocolos.",
        },
        {
          number: "03",
          title: "Revisión del Proveedor",
          description:
            "Un médico o radiólogo certificado revisa su caso según protocolos clínicos y crea un plan personalizado.",
        },
        {
          number: "04",
          title: "Recibe Atención",
          description:
            "Las recetas llegan a su puerta. Informes de radiología entregados digitalmente. Consultas por video desde cualquier lugar. Soporte continuo incluido.",
        },
      ],
    },
    reviews: {
      eyebrow: "Opiniones",
      titleHtml: "Resultados reales,<br />personas reales.",
      subtitle:
        "Escuche a pacientes de Florida que transformaron su salud con Patriotic Virtual Telehealth.",
    },
    cta: {
      title: "Tu salud, tu horario.",
      description:
        "Atención guiada por protocolos de médicos y radiólogos certificados — completamente en línea, completamente segura. Ahora disponible en Florida.",
      button: "Comienza Tu Visita Gratis →",
    },
    footer: {
      brand:
        "Servicios de telesalud y radiología certificados. Atención guiada por protocolos, entregada a su puerta. Actualmente atendiendo a Florida.",
      company: "Empresa",
      about: "Sobre Nosotros",
      careers: "Empleos",
      press: "Prensa",
      support: "Soporte",
      faq: "Preguntas Frecuentes",
      contact: "Contacto",
      privacy: "Política de Privacidad",
      copy: "© 2026 Patriotic Virtual Telehealth. Todos los derechos reservados.",
      badges:
        "Compatible con HIPAA · Licencia en FL · Basado en Protocolos · Encriptado",
    },
  },
} as const;

const SAFETY_ICON_BACKGROUNDS = [
  "var(--emerald)",
  "var(--blue)",
  "var(--amber)",
  "var(--violet)",
] as const;
const PROTOCOL_PILL_ICONS = ["🛡", "📋", "⚕️", "🔒"] as const;
const MARQUEE_ITEMS = [
  { icon: "🤖", label: "AI Health Assistant" },
  { icon: "🔬", label: "AI-Powered Imaging" },
  { icon: "📱", label: "Digital Health Platform" },
  { icon: "🌴", label: "Available in Florida" },
  { icon: "🩺", label: "General Telehealth" },
  { icon: "💊", label: "GLP-1 Weight Loss" },
  { icon: "⚡", label: "Erectile Dysfunction" },
] as const;
const PROTOCOL_METRICS = [
  { value: "100%", className: "n1", label: "Protocol Adherence" },
  { value: "9", className: "n2", label: "Service Categories" },
  { value: "<24h", className: "n3", label: "Provider Response" },
  { value: "24/7", className: "n4", label: "Platform Access" },
] as const;
const TESTIMONIALS = [
  {
    initials: "MR",
    avatarClass: "ta1",
    quote:
      '"Got my GLP-1 prescription in 24 hours. Down 35 lbs and counting. The safety screening made me feel confident they actually care about doing this right."',
    name: "Marcus R.",
    details: "Weight Loss · Jacksonville, FL",
  },
  {
    initials: "SK",
    avatarClass: "ta2",
    quote:
      '"Having an actual radiologist explain my CT findings over video was incredible. Plain English, no jargon. Worth every penny for peace of mind."',
    name: "Sarah K.",
    details: "Video Imaging Consult · Tampa, FL",
  },
  {
    initials: "JD",
    avatarClass: "ta3",
    quote:
      '"The AI flagged something on my chest X-ray, then the radiologist confirmed it and walked me through next steps. Protocol-driven and professional."',
    name: "James D.",
    details: "AI + Radiologist · Orlando, FL",
  },
] as const;

function getAboutTabStyle(isActive: boolean) {
  return {
    flex: 1,
    padding: "10px 20px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
    transition: "all 0.2s",
    background: isActive ? "var(--blue)" : "transparent",
    color: isActive ? "#fff" : "var(--g500)",
  } as const;
}

function PaymentStatusHandler({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams?.get("payment") === "success") {
      onSuccess();
    } else if (searchParams?.get("payment") === "cancelled") {
      onCancel();
    }
  }, [searchParams, onSuccess, onCancel]);

  return null;
}

export function LandingEmbed() {
  const router = useRouter();
  const [locale, setLocale] = useState<LandingLocale>("en");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [aboutTab, setAboutTab] = useState<1 | 2>(1);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [dashboardHref, setDashboardHref] = useState("/dashboard");
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimerRef = useRef<number | null>(null);

  // Added Modals state
  const [consultModalOpen, setConsultModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [initialService, setInitialService] = useState<string | null>(null);
  const [initialConsultStep, setInitialConsultStep] = useState(1);
  const [authInitiator, setAuthInitiator] = useState<"header_login" | "header_get_started" | "service_card">("header_login");

  const copy = COPY[locale];

  const handlePaymentSuccess = () => {
    setInitialConsultStep(4);
    setConsultModalOpen(true);
  };

  const handlePaymentCancel = () => {
    showToast("Payment was cancelled.");
    router.push("/");
  };

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("theme");
    if (savedTheme === "light") {
      setTheme("light");
    }

    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    handleScroll();

    if (
      window.location.hash === "#privacy" ||
      window.location.hash === "#consent"
    ) {
      setConsentOpen(true);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("light-theme", theme === "light");
    document.documentElement.classList.toggle("light-theme", theme === "light");
    window.localStorage.setItem("theme", theme);

    return () => {
      document.body.classList.remove("light-theme");
      document.documentElement.classList.remove("light-theme");
    };
  }, [theme]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let active = true;

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!active) {
        return;
      }

      if (!user) {
        setIsAuthenticated(false);
        setDashboardHref("/dashboard");
        return;
      }

      setIsAuthenticated(true);
      setDashboardHref("/dashboard");

      try {
        const patientDoc = await getDoc(doc(db, "patients", user.uid));
        if (!active) {
          return;
        }

        const role = String(patientDoc.data()?.role ?? "").toLowerCase();
        const isPatient = patientDoc.exists() && role === "patient";
        setDashboardHref(isPatient ? "/patient" : "/dashboard");
      } catch (error) {
        console.error("Landing auth routing error:", error);
        if (active) {
          setDashboardHref("/dashboard");
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const showToast = (message: string) => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }

    setToastMessage(message);
    setToastVisible(true);
    toastTimerRef.current = window.setTimeout(() => {
      setToastVisible(false);
    }, 3500);
  };

  const handleShowLanding = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openAbout = () => {
    setAboutTab(1);
    setAboutOpen(true);
    setMobileMenuOpen(false);
  };

  const openConsent = () => {
    setConsentOpen(true);
    setMobileMenuOpen(false);
  };

  const handleThemeToggle = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  const handleLocaleToggle = () => {
    setLocale((current) => (current === "en" ? "es" : "en"));
  };

  const handlePrimaryCta = () => {
    setMobileMenuOpen(false);
    setInitialService(null);
    if (!isAuthenticated) {
      setAuthInitiator("header_get_started");
      setAuthMode("register");
      setAuthModalOpen(true);
    } else {
      setConsultModalOpen(true);
    }
  };

  const handleServiceStart = (serviceKey: string) => {
    setMobileMenuOpen(false);
    setInitialService(serviceKey);
    if (!isAuthenticated) {
      setAuthInitiator("service_card");
      setAuthMode("register");
      setAuthModalOpen(true);
    } else {
      setConsultModalOpen(true);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Landing logout failed:", error);
    } finally {
      setIsAuthenticated(false);
      setDashboardHref("/dashboard");
      setMobileMenuOpen(false);
      showToast("Logged out.");
    }
  };

  return (
    <>
      <nav id="mainNav" className={scrolled ? "scrolled" : ""}>
        <div className="nav-inner">
          <a href="#" className="nav-logo" onClick={handleShowLanding}>
            <img
              src="/assets/logo.png"
              alt="Patriotic Virtual Telehealth"
              className="brand-logo-img brand-logo-light"
            />
            <img
              src="/assets/logomarkdark.png"
              alt="Patriotic Virtual Telehealth"
              className="brand-logo-img brand-logo-dark"
            />
          </a>

          <div className="nav-links">
            <a
              href="#"
              onClick={(event) => {
                event.preventDefault();
                openAbout();
              }}
            >
              {copy.nav.about}
            </a>
            <a href="#services" onClick={() => setMobileMenuOpen(false)}>
              {copy.nav.services}
            </a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>
              {copy.nav.how}
            </a>
            <a href="#radiology" onClick={() => setMobileMenuOpen(false)}>
              {copy.nav.radiology}
            </a>
            <a href="#clinicians" onClick={() => setMobileMenuOpen(false)}>
              {copy.nav.clinicians}
            </a>
            <a href="#testimonials" onClick={() => setMobileMenuOpen(false)}>
              {copy.nav.reviews}
            </a>
          </div>

          <div className="nav-actions">
            <button
              className={`btn btn-ghost ${isAuthenticated ? "hidden" : ""}`}
              id="loginBtn"
              onClick={() => {
                setAuthInitiator("header_login");
                setAuthMode("login");
                setAuthModalOpen(true);
              }}
            >
              {copy.nav.login}
            </button>
            <button
              className={`btn btn-primary ${isAuthenticated ? "hidden" : ""}`}
              id="signupBtn"
              onClick={handlePrimaryCta}
            >
              {copy.nav.getStarted}
            </button>
            <Link
              className={`btn btn-ghost ${isAuthenticated ? "" : "hidden"}`}
              id="dashBtn"
              href={dashboardHref}
            >
              {copy.nav.dashboard}
            </Link>
            <button
              className="btn btn-ghost"
              id="themeBtn"
              onClick={handleThemeToggle}
              style={{ fontSize: 18, padding: "6px 12px", borderRadius: 12 }}
              title={
                theme === "light"
                  ? "Switch to Dark Mode"
                  : "Switch to Light Mode"
              }
              type="button"
            >
              {theme === "light" ? "🌙" : "☀️"}
            </button>
            <button
              className="btn btn-ghost"
              id="langBtn"
              onClick={handleLocaleToggle}
              style={{
                fontSize: 13,
                fontWeight: 700,
                padding: "6px 12px",
                borderRadius: 12,
                letterSpacing: "0.5px",
                opacity: locale === "es" ? 1 : 0.7,
              }}
              title={
                locale === "en" ? "Switch to Spanish" : "Switch to English"
              }
              type="button"
            >
              {locale === "en" ? "ES" : "EN"}
            </button>
            <button
              className={`btn btn-outline ${isAuthenticated ? "" : "hidden"}`}
              id="logoutBtn"
              onClick={handleLogout}
              type="button"
            >
              {copy.nav.logout}
            </button>
          </div>

          <button
            className="mobile-toggle"
            onClick={() => setMobileMenuOpen((current) => !current)}
            type="button"
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>
      </nav>

      <main id="landingPage">
        <section className="hero hero-showcase">
          <div className="hero-video-bg" aria-hidden="true">
            <video
              className="hero-bg-video"
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
            >
              <source
                src="https://cdn.prod.website-files.com/65a5297de1b7fe80c0727d5e/65cf3b5948e49d354b5918f6_hero_video-transcode.mp4"
                type="video/mp4"
              />
            </video>
            <div className="hero-video-overlay" />
            <div className="hero-video-glow" />
          </div>

          <div className="container hero-inner">
            <div className="hero-grid">
              <div className="hero-copy">
                <div className="hero-badge">
                  <div className="bdot" />
                  <span>{copy.hero.badge}</span>
                </div>
                <div className="hero-badge" style={{ background: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.3)', color: '#00d9a3', marginLeft: '8px' }}>
                  <span>📍 Services are currently available to patients located in Florida only.</span>
                </div>
                <h1 dangerouslySetInnerHTML={{ __html: copy.hero.titleHtml }} />
                <p className="hero-sub">{copy.hero.subtitle}</p>
                <div className="hero-ctas">
                  <button
                    className="btn btn-primary btn-large"
                    onClick={handlePrimaryCta}
                    type="button"
                  >
                    {copy.hero.cta}
                  </button>
                </div>

                <div
                  className="trust-micro"
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    marginTop: 12,
                    maxWidth: 560,
                  }}
                >
                  <div
                    className="trust-pill"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 10px",
                      borderRadius: 999,
                      background: "rgba(3,26,14,0.82)",
                      border: "1px solid rgba(74,222,128,0.75)",
                      boxShadow:
                        "0 6px 16px rgba(22,163,74,0.24),inset 0 0 0 1px rgba(240,253,244,0.08)",
                    }}
                  >
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 999,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#052e16",
                        background: "linear-gradient(180deg,#4ade80,#22c55e)",
                      }}
                    >
                      <svg
                        aria-hidden="true"
                        fill="none"
                        style={{
                          width: 12,
                          height: 12,
                          display: "block",
                        }}
                        viewBox="0 0 12 12"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle
                          cx="6"
                          cy="6"
                          r="4.3"
                          stroke="currentColor"
                          strokeWidth="1.2"
                        />
                        <path
                          d="m4.1 6.2 1.2 1.2 2.5-2.5"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.2"
                        />
                      </svg>
                    </span>
                    <span
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        lineHeight: 1.05,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 9,
                          color: "#86efac",
                          letterSpacing: ".05em",
                          textTransform: "uppercase",
                          fontWeight: 700,
                        }}
                      >
                        Location
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: "#f0fdf4",
                          fontWeight: 600,
                        }}
                      >
                        Serving in{" "}
                        <span style={{ fontWeight: 600 }}>Florida</span>
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="hero-vis hero-services-showcase" id="services">
                <div className="hero-services-head">
                  <div className="hero-services-kicker">
                    {copy.hero.servicesKicker}
                  </div>
                  <h3>{copy.hero.servicesHeading}</h3>
                  <p>{copy.hero.servicesSub}</p>
                </div>
                <div
                  className="services-tabs hero-services-tabs"
                  id="heroServiceTabs"
                >
                  <div className="tab active">Popular</div>
                  <div
                    className="services-grid hero-services-grid"
                    id="svcGrid"
                  >
                    {POPULAR_SERVICES.map((service) => (
                      <div
                        className="svc"
                        data-c={service.color}
                        key={service.id}
                        onClick={() => handleServiceStart(service.key)}
                      >
                        <div className={`svc-ic ${service.iconClass}`}>
                          {service.icon}
                        </div>
                        <h3>{service.title[locale]}</h3>
                        <p>{service.description[locale]}</p>
                        <div className="svc-bot">
                          <div className="svc-pr">
                            ${service.price}{" "}
                            <span>{service.priceSuffix ?? "/ visit"}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="safety-bar">
          <div className="safety-bg" />
          <div className="container">
            <div className="sb-inner">
              {copy.safety.map((item, index) => (
                <div className="sb-item" key={item}>
                  <div
                    className="sb-icon"
                    style={{ background: SAFETY_ICON_BACKGROUNDS[index] }}
                  >
                    ✓
                  </div>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="marquee-section">
          <div className="marquee-track">
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map(
              (item, index) => (
                <div className="marquee-item" key={`${item.label}-${index}`}>
                  <span>{item.icon}</span>
                  {item.label}
                </div>
              ),
            )}
          </div>
        </section>

        <section className="protocol-section">
          <div className="container">
            <div className="proto-box">
              <div className="proto-left">
                <div className="sec-eye eye-em" style={{ marginBottom: 20 }}>
                  <div className="eye-line" />
                  <div className="eye-text" style={{ color: "white" }}>
                    {copy.protocol.eyebrow}
                  </div>
                </div>
                <h2
                  dangerouslySetInnerHTML={{
                    __html: copy.protocol.titleHtml,
                  }}
                />
                <p>{copy.protocol.subtitle}</p>
                <div className="proto-pills">
                  {copy.protocol.pills.map((pill, index) => (
                    <div className="pp" key={pill}>
                      <div className={`pp-ic c${index + 1}`}>
                        {PROTOCOL_PILL_ICONS[index]}
                      </div>
                      <span>{pill}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="proto-right">
                {PROTOCOL_METRICS.map((metric) => (
                  <div className="pr-card" key={metric.label}>
                    <div className={`pr-num ${metric.className}`}>
                      {metric.value}
                    </div>
                    <div className="pr-label">{metric.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="how-section" id="how-it-works">
          <div className="container">
            <div className="sec-eye eye-coral">
              <div className="eye-line" />
              <span>{copy.how.eyebrow}</span>
            </div>
            <h2
              className="sec-title"
              dangerouslySetInnerHTML={{ __html: copy.how.titleHtml }}
            />
            <p className="sec-sub">{copy.how.subtitle}</p>
            <div className="steps-grid">
              {copy.how.steps.map((step) => (
                <div className="step" key={step.number}>
                  <div className="step-acc" />
                  <div className="step-num">{step.number}</div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="radiology" id="radiology">
          <div className="container">
            <div className="sec-eye eye-em">
              <div className="eye-line" />
              Radiology Education
            </div>

            <div className="rad-intro">
              <div>
                <h2 className="sec-title">
                  Expert imaging insights.
                  <br />
                  Clearer understanding.
                </h2>
                <p className="sec-sub">
                  Physician-supervised educational services to help you
                  understand your medical imaging.
                  <span
                    style={{
                      display: "block",
                      marginTop: 8,
                      fontWeight: 600,
                      color: "var(--amber)",
                    }}
                  >
                    ⚠️ For Educational Purposes Only. Not a diagnostic service.
                  </span>
                </p>
              </div>
              <div className="rad-intro-media">
                <img
                  src="/assets/familyimage.png"
                  alt="Family reviewing medical imaging information"
                />
              </div>
            </div>

            <div
              className="rad-grid"
              style={{ gridTemplateColumns: "repeat(2, 1fr)" }}
            >
              <div
                className="rad-card"
                onClick={() => handleServiceStart("ai_imaging")}
                style={{ cursor: "pointer" }}
              >
                <div className="rad-top">
                  <div className="rad-badge rb-b">Tier 1</div>
                  <h3>AI-Powered Analysis</h3>
                  <p className="rd">
                    Physician-supervised AI interpretation of your radiology
                    reports. We help explain complex findings in plain English.
                  </p>
                  <div className="rpt">
                    $99 <span>/ analysis</span>
                  </div>
                </div>
              </div>

              <div
                className="rad-card"
                onClick={() => handleServiceStart("report_interpretation")}
                style={{ cursor: "pointer" }}
              >
                <div className="rad-top">
                  <div className="rad-badge rb-n">Tier 2</div>
                  <h3>Report Interpretation</h3>
                  <p className="rd">
                    Expert analysis of your existing radiology report. We
                    translate medical jargon into clear, understandable
                    language.
                  </p>
                  <div className="rpt">
                    $149 <span>/ report</span>
                  </div>
                </div>
              </div>

              <div
                className="rad-card"
                onClick={() => handleServiceStart("standard_imaging")}
                style={{ cursor: "pointer" }}
              >
                <div className="rad-top">
                  <div className="rad-badge rb-a">Tier 3</div>
                  <h3>Standard Imaging Review</h3>
                  <p className="rd">
                    A complete educational over-read of your actual images
                    (X-Ray, CT, MRI) by a board-certified radiologist.
                  </p>
                  <div className="rpt">
                    $249 <span>/ study</span>
                  </div>
                </div>
              </div>

              <div
                className="rad-card"
                onClick={() => handleServiceStart("imaging_video")}
                style={{ cursor: "pointer" }}
              >
                <div className="rad-top">
                  <div
                    className="rad-badge rb-n"
                    style={{
                      background: "var(--rose-soft)",
                      color: "var(--rose)",
                    }}
                  >
                    Tier 4 · Premier
                  </div>
                  <h3>
                    Imaging + Video Consult
                    <span
                      style={{
                        fontSize: 11,
                        background: "var(--amber-soft)",
                        color: "var(--amber)",
                        padding: "4px 10px",
                        borderRadius: 100,
                        verticalAlign: "middle",
                        marginLeft: 6,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Popular
                    </span>
                  </h3>
                  <p className="rd">
                    Full educational image review plus a 30 - 60 minute secure
                    video consultation to discuss findings directly with Dr.
                    Olalesi Osunsade, MD.
                  </p>
                  <div className="rpt">
                    $449 <span>/ consult</span>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="sec-eye eye-em"
              id="clinicians"
              style={{
                marginTop: 80,
                color: "var(--navy)",
                scrollMarginTop: 100,
              }}
            >
              <div className="eye-line" style={{ background: "var(--navy)" }} />
              Diagnostic Radiology
            </div>
            <h2 className="sec-title" style={{ color: "var(--navy)" }}>
              Clinical reads &
              <br />
              Facility solutions.
            </h2>
            <p className="sec-sub" style={{ marginBottom: 40 }}>
              Official diagnostic reports and B2B teleradiology services for
              urgent cares and clinics.
            </p>

            <div
              className="rad-grid"
              style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
            >
              <div
                className="rad-card"
                onClick={() => handleServiceStart("diagnostic_single")}
                style={{ cursor: "pointer" }}
              >
                <div className="rad-top">
                  <div
                    className="rad-badge rb-b"
                    style={{ background: "var(--blue)", color: "white" }}
                  >
                    Diagnostic
                  </div>
                  <h3>Single Study Read</h3>
                  <p className="rd">
                    Official diagnostic report for CT, X-Ray, or Ultrasound.
                    Fast 24-48h turnaround time.
                  </p>
                  <div className="rpt">
                    $75 <span>/ read</span>
                  </div>
                </div>
              </div>

              <div
                className="rad-card"
                onClick={() => handleServiceStart("diagnostic_second")}
                style={{ cursor: "pointer" }}
              >
                <div className="rad-top">
                  <div
                    className="rad-badge rb-n"
                    style={{ background: "var(--indigo)", color: "white" }}
                  >
                    Clinical Review
                  </div>
                  <h3>Second Opinion</h3>
                  <p className="rd">
                    Full diagnostic review, written opinion, and patient summary
                    for CT, XR, or US.
                  </p>
                  <div className="rpt">
                    $250 <span>/ consult</span>
                  </div>
                </div>
              </div>

              <div
                className="rad-card"
                onClick={() => handleServiceStart("diagnostic_facility")}
                style={{ cursor: "pointer" }}
              >
                <div className="rad-top">
                  <div
                    className="rad-badge rb-a"
                    style={{ background: "var(--navy)", color: "white" }}
                  >
                    For Facilities
                  </div>
                  <h3>Urgent Care / Outpatient</h3>
                  <p className="rd">
                    Unlimited reads, SLA guarantees, and dedicated upload link.
                    Customized for your volume.
                  </p>
                  <div className="rpt">
                    $3,500+ <span>/ month</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="testimonials" id="testimonials">
          <div className="container">
            <div className="sec-eye eye-amber">
              <div className="eye-line" />
              <span>{copy.reviews.eyebrow}</span>
            </div>
            <h2
              className="sec-title"
              dangerouslySetInnerHTML={{ __html: copy.reviews.titleHtml }}
            />
            <p className="sec-sub">{copy.reviews.subtitle}</p>
            <div className="test-grid">
              {TESTIMONIALS.map((testimonial) => (
                <div className="tc" key={testimonial.name}>
                  <div className="tc-stars">★★★★★</div>
                  <blockquote>{testimonial.quote}</blockquote>
                  <div className="tc-auth">
                    <div className={`tc-av ${testimonial.avatarClass}`}>
                      {testimonial.initials}
                    </div>
                    <div>
                      <div className="tc-name">{testimonial.name}</div>
                      <div className="tc-det">{testimonial.details}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="cta-section">
          <div className="container">
            <div className="cta-box">
              <h2>{copy.cta.title}</h2>
              <p>{copy.cta.description}</p>
              <button
                className="btn btn-white btn-large"
                onClick={handlePrimaryCta}
                type="button"
              >
                {copy.cta.button}
              </button>
            </div>
          </div>
        </section>

        <footer>
          <div className="container">
            <div className="footer-grid">
              <div>
                <a
                  href="#"
                  className="nav-logo"
                  onClick={handleShowLanding}
                  style={{ marginBottom: 4 }}
                >
                  <img
                    src="/assets/logo.png"
                    alt="Patriotic Virtual Telehealth"
                    className="brand-logo-img brand-logo-light"
                  />
                  <img
                    src="/assets/logomarkdark.png"
                    alt="Patriotic Virtual Telehealth"
                    className="brand-logo-img brand-logo-dark"
                  />
                </a>
                <p className="footer-brand-text">{copy.footer.brand}</p>
              </div>

              <div className="footer-col">
                <h4>{copy.footer.company}</h4>
                <a
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    openAbout();
                  }}
                >
                  {copy.footer.about}
                </a>
                <a
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    showToast("Careers page coming soon!");
                  }}
                >
                  {copy.footer.careers}
                </a>
                <a
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    showToast("Press page coming soon!");
                  }}
                >
                  {copy.footer.press}
                </a>
              </div>

              <div className="footer-col">
                <h4>{copy.footer.support}</h4>
                <a
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    showToast("FAQ coming soon!");
                  }}
                >
                  {copy.footer.faq}
                </a>
                <a
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    showToast(
                      "Contact support: support@patriotictelehealth.com",
                    );
                  }}
                >
                  {copy.footer.contact}
                </a>
                <a
                  href="/terms"
                >
                  Terms of Service
                </a>
                <a
                  href="/privacy-policy"
                >
                  {copy.footer.privacy}
                </a>
              </div>
            </div>

            <div className="footer-bottom">
              <span>{copy.footer.copy}</span>
              <span>{copy.footer.badges}</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#9ca3af', textAlign: 'center', maxWidth: '48rem', margin: '1rem auto 0' }}>
              All treatments are prescribed only after evaluation by a licensed medical provider.
              Not all patients qualify. Results may vary.
            </p>
          </div>
        </footer>
      </main>

      {aboutOpen ? (
        <div
          className="mo active"
          id="aboutModal"
          onClick={() => setAboutOpen(false)}
        >
          <div
            className="modal cm"
            onClick={(event) => event.stopPropagation()}
            style={{ maxWidth: 800 }}
          >
            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "center",
                marginBottom: 28,
                background: "var(--g50)",
                borderRadius: 12,
                padding: 6,
              }}
            >
              <button
                id="aboutTab1"
                onClick={() => setAboutTab(1)}
                style={getAboutTabStyle(aboutTab === 1)}
                type="button"
              >
                Dr. Olalesi Osunsade, MD
              </button>
              <button
                id="aboutTab2"
                onClick={() => setAboutTab(2)}
                style={getAboutTabStyle(aboutTab === 2)}
                type="button"
              >
                Alvaro Berrios, MS, FNP-BC
              </button>
            </div>

            <div
              id="aboutProfile1"
              style={{
                display: aboutTab === 1 ? "flex" : "none",
                gap: 24,
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 200,
                  height: 200,
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "3px solid var(--blue)",
                }}
              >
                <img
                  src="/assets/dr_osunsade_new.jpg"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  alt="Dr. Osunsade"
                />
              </div>
              <div>
                <h2 style={{ marginBottom: 8 }}>Dr. Olalesi Osunsade, MD</h2>
                <div
                  style={{
                    fontSize: 14,
                    color: "var(--g500)",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    marginBottom: 20,
                  }}
                >
                  Dr. &quot;O&quot; · Diagnostic & Interventional Radiologist
                </div>
                <p
                  style={{
                    fontSize: 15,
                    lineHeight: 1.7,
                    color: "var(--g700)",
                    marginBottom: 24,
                    maxWidth: 600,
                    marginLeft: "auto",
                    marginRight: "auto",
                  }}
                >
                  Dual board-certified Diagnostic and Interventional Radiologist
                  with extensive experience across academic medical centers,
                  community hospitals, and teleradiology. Born in Washington,
                  DC, Dr. Osunsade brings a unique international perspective,
                  having lived in the Philippines, Tanzania, Kenya, and Nigeria
                  before returning to the U.S. for undergraduate/medical school
                  and medical training.
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 24,
                    textAlign: "left",
                    width: "100%",
                  }}
                >
                  <div
                    style={{
                      background: "var(--g50)",
                      padding: 20,
                      borderRadius: 12,
                    }}
                  >
                    <h3
                      style={{
                        fontSize: 15,
                        color: "var(--navy)",
                        marginBottom: 12,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      🎓 Education
                    </h3>
                    <ul
                      style={{
                        listStyle: "none",
                        fontSize: 13,
                        color: "var(--g600)",
                        lineHeight: 1.6,
                        padding: 0,
                        margin: 0,
                      }}
                    >
                      <li style={{ marginBottom: 6 }}>
                        <b>MD:</b> George Washington Univ. SOM (2012)
                      </li>
                      <li style={{ marginBottom: 6 }}>
                        <b>Residency:</b> St. Vincent&apos;s Medical Center
                        (Chief Resident)
                      </li>
                      <li style={{ marginBottom: 6 }}>
                        <b>Fellowship (IR):</b> Henry Ford Hospital
                      </li>
                    </ul>
                  </div>
                  <div
                    style={{
                      background: "var(--g50)",
                      padding: 20,
                      borderRadius: 12,
                    }}
                  >
                    <h3
                      style={{
                        fontSize: 15,
                        color: "var(--navy)",
                        marginBottom: 12,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      📜 Active Licenses
                    </h3>
                    <ul
                      style={{
                        listStyle: "none",
                        fontSize: 13,
                        color: "var(--g600)",
                        lineHeight: 1.6,
                        padding: 0,
                        margin: 0,
                      }}
                    >
                      <li style={{ marginBottom: 6 }}>
                        FL · MD · CA · NY · MI · DC
                      </li>
                      <li style={{ marginBottom: 6 }}>OH · WI · TX</li>
                      <li
                        style={{
                          marginBottom: 6,
                          color: "var(--blue)",
                        }}
                      >
                        Enrolled in IMLC (Interstate Compact)
                      </li>
                    </ul>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 24,
                    width: "100%",
                    textAlign: "left",
                    background: "var(--g50)",
                    padding: 20,
                    borderRadius: 12,
                  }}
                >
                  <h3
                    style={{
                      fontSize: 15,
                      color: "var(--navy)",
                      marginBottom: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    🌍 Personal & Bio
                  </h3>
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--g600)",
                      lineHeight: 1.6,
                      marginBottom: 8,
                    }}
                  >
                    <b>Languages:</b> English (Native), French (Proficient),
                    Yoruba & Swahili (Conversational)
                  </p>
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--g600)",
                      lineHeight: 1.6,
                    }}
                  >
                    <b>Recognition:</b> TOP DOCTOR Magazine (2017, 2022)
                  </p>
                </div>
                <div
                  style={{
                    marginTop: 24,
                    width: "100%",
                    textAlign: "left",
                    background: "var(--g50)",
                    padding: 20,
                    borderRadius: 12,
                  }}
                >
                  <h3
                    style={{
                      fontSize: 15,
                      color: "var(--navy)",
                      marginBottom: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    🤝 Partnership
                  </h3>
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--g600)",
                      lineHeight: 1.6,
                    }}
                  >
                    We believe exceptional care is built on strong
                    collaboration. That&apos;s why we proudly partner with
                    Sterling Union, a trusted Management Services Organization
                    (MSO) that supports our operations, compliance, and
                    administrative excellence, allowing our clinical team to
                    stay focused on what matters most: you. For advanced imaging
                    and radiology expertise, we work closely with Orosun Health,
                    ensuring seamless access to high-quality diagnostic support
                    when specialized insight is needed. Together, these
                    partnerships help us deliver safe, coordinated, and
                    compassionate virtual care you can trust.
                  </p>
                </div>
              </div>
            </div>

            <div
              id="aboutProfile2"
              style={{
                display: aboutTab === 2 ? "flex" : "none",
                gap: 24,
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 200,
                  height: 200,
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "3px solid var(--blue)",
                }}
              >
                <img
                  src="/assets/alvaro_berrios.jpg"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  alt="Alvaro Berrios"
                />
              </div>
              <div>
                <h2 style={{ marginBottom: 8 }}>Alvaro Berrios, MS, FNP-BC</h2>
                <div
                  style={{
                    fontSize: 14,
                    color: "var(--g500)",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    marginBottom: 20,
                  }}
                >
                  Family Nurse Practitioner · Functional Medicine Practitioner
                </div>
                <p
                  style={{
                    fontSize: 15,
                    lineHeight: 1.7,
                    color: "var(--g700)",
                    marginBottom: 24,
                    maxWidth: 600,
                    marginLeft: "auto",
                    marginRight: "auto",
                  }}
                >
                  Board-certified Family Nurse Practitioner since 2006 with over
                  30 years in the nursing field. As a Functional Medicine
                  Practitioner, Alvaro focuses on restoring health by targeting
                  the root cause of illness — not just the symptoms. Deeply
                  committed to delivering exceptional medical care with an
                  emphasis on both prevention and treatment of disease.
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 24,
                    textAlign: "left",
                    width: "100%",
                  }}
                >
                  <div
                    style={{
                      background: "var(--g50)",
                      padding: 20,
                      borderRadius: 12,
                    }}
                  >
                    <h3
                      style={{
                        fontSize: 15,
                        color: "var(--navy)",
                        marginBottom: 12,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      🎓 Education
                    </h3>
                    <ul
                      style={{
                        listStyle: "none",
                        fontSize: 13,
                        color: "var(--g600)",
                        lineHeight: 1.6,
                        padding: 0,
                        margin: 0,
                      }}
                    >
                      <li style={{ marginBottom: 6 }}>
                        <b>BS:</b> University of Southern California (USC)
                      </li>
                      <li style={{ marginBottom: 6 }}>
                        <b>MS in Nursing / FNP Certificate:</b> Cal State
                        Dominguez Hills
                      </li>
                      <li style={{ marginBottom: 6 }}>
                        <b>Functional Medicine Certificate:</b> The Functional
                        Medicine Academy
                      </li>
                    </ul>
                  </div>
                  <div
                    style={{
                      background: "var(--g50)",
                      padding: 20,
                      borderRadius: 12,
                    }}
                  >
                    <h3
                      style={{
                        fontSize: 15,
                        color: "var(--navy)",
                        marginBottom: 12,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      🩺 Areas of Expertise
                    </h3>
                    <ul
                      style={{
                        listStyle: "none",
                        fontSize: 13,
                        color: "var(--g600)",
                        lineHeight: 1.6,
                        padding: 0,
                        margin: 0,
                      }}
                    >
                      <li style={{ marginBottom: 6 }}>
                        Women&apos;s Health · Pediatrics
                      </li>
                      <li style={{ marginBottom: 6 }}>
                        Acute Care · Urgent Care
                      </li>
                      <li style={{ marginBottom: 6 }}>
                        Family Medicine · Geriatrics
                      </li>
                    </ul>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 24,
                    width: "100%",
                    textAlign: "left",
                    background: "var(--g50)",
                    padding: 20,
                    borderRadius: 12,
                  }}
                >
                  <h3
                    style={{
                      fontSize: 15,
                      color: "var(--navy)",
                      marginBottom: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    🏥 Practice
                  </h3>
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--g600)",
                      lineHeight: 1.6,
                      marginBottom: 8,
                    }}
                  >
                    <b>Founder:</b> Restore Your Health Functional Medicine
                  </p>
                </div>
                <div
                  style={{
                    marginTop: 24,
                    width: "100%",
                    textAlign: "left",
                    background: "var(--g50)",
                    padding: 20,
                    borderRadius: 12,
                  }}
                >
                  <h3
                    style={{
                      fontSize: 15,
                      color: "var(--navy)",
                      marginBottom: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    🌱 Community Impact
                  </h3>
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--g600)",
                      lineHeight: 1.6,
                    }}
                  >
                    Throughout his career, Alvaro has established programs
                    designed to address the healthcare needs of uninsured
                    patients, ensuring that quality care is accessible to all —
                    regardless of insurance status.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {consentOpen ? (
        <div
          className="mo active"
          id="consentModal"
          onClick={() => setConsentOpen(false)}
        >
          <div
            className="modal cm"
            onClick={(event) => event.stopPropagation()}
            style={{ maxWidth: 700 }}
          >
            <h2 style={{ marginBottom: 16, color: "white" }}>
              Privacy, Terms & Consents
            </h2>
            <div
              style={{
                textAlign: "left",
                fontSize: 14,
                lineHeight: 1.6,
                color: "var(--g600)",
                maxHeight: "60vh",
                overflowY: "auto",
                paddingRight: 12,
              }}
            >
              <div
                style={{
                  background: "var(--red-soft)",
                  color: "var(--red)",
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 16,
                  border: "1px solid var(--red)",
                }}
              >
                <b>🚨 NO EMERGENCY CARE:</b> We do NOT treat medical
                emergencies. If you have chest pain, shortage of breath, severe
                bleeding, or any life-threatening emergency, call 911 or go to
                the nearest ER immediately.
              </div>

              <h4 style={{ color: "white", marginBottom: 6 }}>
                1. Telehealth Consent
              </h4>
              <p style={{ marginBottom: 12 }}>
                By using this service, you consent to receive medical care via
                electronic information and communication technologies. You
                understand that telehealth has limitations compared to in-person
                visits, including the inability to perform hands-on physical
                exams.
              </p>

              <h4 style={{ color: "white", marginBottom: 6 }}>
                2. Payment Policy (Cash-Pay Only)
              </h4>
              <p style={{ marginBottom: 12 }}>
                Patriotic Virtual Telehealth is a <b>cash-pay only</b> practice.
                We do not accept or bill commercial insurance, Medicare, or
                Medicaid. All fees are due at the time of service. You agree
                that you will not submit claims to federal healthcare programs
                for these services.
              </p>

              <h4 style={{ color: "white", marginBottom: 6 }}>
                3. HIPAA & Privacy
              </h4>
              <p style={{ marginBottom: 12 }}>
                We are committed to protecting your medical information. We
                utilize HIPAA-compliant secure platforms for all video consults,
                messaging, and data storage. Your information will only be
                shared for treatment, payment, or healthcare operations, or as
                required by law.
              </p>

              <h4 style={{ color: "white", marginBottom: 6 }}>
                4. GLP-1 & Weight Loss
              </h4>
              <p style={{ marginBottom: 12 }}>
                For GLP-1 agonist prescriptions (e.g., Semaglutide/Tirzepatide),
                you acknowledge potential side effects including nausea,
                vomiting, and risk of thyroid C-cell tumors. You confirm you do
                not have a personal or family history of Medullary Thyroid
                Carcinoma (MTC) or MEN 2 syndrome.
              </p>

              <h4 style={{ color: "white", marginBottom: 6 }}>
                5. Radiology Services
              </h4>
              <p style={{ marginBottom: 12 }}>
                <b>Educational Use (Tiers 1, 3, 4):</b> Services labeled
                &quot;Educational&quot; are for informational purposes only and
                do not constitute a formal diagnosis or replace your official
                medical records.
                <br />
                <b>Diagnostic Services (Clinical):</b> Official diagnostic
                reports are provided only for services explicitly labeled
                &quot;Diagnostic&quot; or &quot;Clinical Consult&quot;.
              </p>

              <h4 style={{ color: "white", marginBottom: 6 }}>
                6. Data Usage for Artificial Intelligence & Analytics
              </h4>
              <p style={{ marginBottom: 12 }}>
                By utilizing this platform, you expressly acknowledge and
                consent to the collection, aggregation, and anonymization of
                your de-identified health data and usage patterns. This
                information may be utilized for the purposes of internal
                analytics, quality improvement, and the training, validation, or
                enhancement of artificial intelligence and machine learning
                models, strictly in accordance with applicable laws and
                regulations ensuring patient privacy and data security.
              </p>

              <h4 style={{ color: "white", marginBottom: 6 }}>
                7. SMS Notifications & Communications
              </h4>
              <p style={{ marginBottom: 12 }}>
                Patriotic Virtual Telehealth may send SMS notifications to
                patients who have opted in by texting START to our designated
                number. Messages include appointment booking confirmations,
                upcoming visit reminders, and in-platform notifications such as
                new messages from providers or pending action items.
                <br />
                <br />
                No marketing content will be sent via SMS.
                <br />
                Message and data rates may apply.
                <br />
                Reply STOP at any time to unsubscribe. Reply HELP for support.
              </p>

              <p>
                By clicking &quot;I Understand&quot; below, you acknowledge that
                you have read, understood, and agreed to these terms, policies,
                and consents.
              </p>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => setConsentOpen(false)}
              style={{ width: "100%", marginTop: 20 }}
              type="button"
            >
              I Understand & Agree
            </button>
          </div>
        </div>
      ) : null}

      <div className={`toast ${toastVisible ? "show" : ""}`} id="toast">
        {toastMessage}
      </div>

      <LandingModals
        consultModalOpen={consultModalOpen}
        setConsultModalOpen={setConsultModalOpen}
        authModalOpen={authModalOpen}
        setAuthModalOpen={setAuthModalOpen}
        authMode={authMode}
        setAuthMode={setAuthMode}
        initialService={initialService}
        initialConsultStep={initialConsultStep}
        onLoginSuccess={() => {
          if (authInitiator === "header_login") {
            setInitialService(null);
            router.push("/");
          } else {
            setConsultModalOpen(true);
          }
        }}
        showToast={showToast}
      />
      <Suspense fallback={null}>
        <PaymentStatusHandler
          onSuccess={handlePaymentSuccess}
          onCancel={handlePaymentCancel}
        />
      </Suspense>
    </>
  );
}

export default LandingEmbed;
