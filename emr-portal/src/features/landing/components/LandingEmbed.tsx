"use client";

import { useEffect, useRef, useState, Suspense, useMemo, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { apiFetchJson } from "@/lib/api-client";
import { getApiUrl } from "@/lib/api-origin";
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
      en: "Confidential men's health evaluation with cardiovascular safety screening. All treatments require review and approval by a licensed physician. Prescriptions are issued only when clinically appropriate.",
      es: "Evaluacion confidencial de salud masculina con revision de seguridad cardiovascular. Todos los tratamientos requieren revision y aprobacion de un medico con licencia. Las recetas se emiten solo cuando son clinicamente apropiadas.",
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
      en: "Everything: telehealth visits, specialty programs, priority radiology reviews, and priority scheduling.",
      es: "Todo incluido: visitas de telesalud, programas especializados, revisiones de radiología prioritarias y programación prioritaria.",
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
      en: "Medical Weight Management",
      es: "Manejo Medico del Peso",
    },
    description: {
      en: "Comprehensive medical weight management evaluation with eligibility screening, titration planning, and dietary guidance. Medication cost separate. All treatments require review and approval by a licensed physician. Prescriptions are issued only when clinically appropriate.",
      es: "Evaluacion medica integral para el manejo del peso con evaluacion de elegibilidad, plan de titulacion y orientacion dietetica. El costo del medicamento es aparte. Todos los tratamientos requieren revision y aprobacion de un medico con licencia. Las recetas se emiten solo cuando son clinicamente apropiadas.",
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
      getStarted: "Start My Free Intake",
      dashboard: "Dashboard",
      logout: "Log Out",
    },
    hero: {
      badge: "Board-Certified Physician Oversight",
      titleHtml:
        'Evidence-based treatment plans,<br />reviewed by <span class="gt">board-certified physicians.</span>',
      subtitle:
        "Complete a confidential medical intake. A licensed physician reviews your information and determines whether treatment is appropriate for you. Prescriptions are only issued when clinically indicated.",
      cta: "Start My Free Intake",
      servicesKicker: "Browse Services",
      servicesHeading: "Select a service and begin your evaluation.",
      servicesSub:
        "Complete a secure intake for physician review. All treatments require review and approval by a licensed physician. Prescriptions are issued only when clinically appropriate.",
    },
    safety: [
      "Board-Certified Physicians",
      "No Controlled Substances",
      "Florida-Licensed Providers",
      "HIPAA-Compliant Platform",
      "Pharmacy Partner: Strive Pharmacy (LegitScript Certified)",
    ],
    protocol: {
      eyebrow: "Our Approach",
      titleHtml: "Protocol-driven care.<br />No exceptions.",
      subtitle:
        "Every consultation, treatment request, and imaging review follows strict clinical protocols. Our automated screening helps flag contraindications before care decisions are made.",
      pills: [
        "Structured intake and contraindication screening on every visit",
        "Evidence-based treatment protocols for all services",
        "Board-certified physician review required for every treatment request",
        "No controlled substances are prescribed through this platform",
      ],
    },
    how: {
      eyebrow: "How It Works",
      titleHtml: "Care in four<br />simple steps.",
      subtitle:
        "From first click to physician review, every step is secure and protocol-driven.",
      steps: [
        {
          number: "01",
          title: "Pick Your Service",
          description:
            "Choose from telehealth, weight management, men's health, imaging education, and diagnostic services. Currently accepting patients in Florida.",
        },
        {
          number: "02",
          title: "Complete Intake",
          description:
            "Complete a secure intake. Our system screens for contraindications and other safety concerns before physician review.",
        },
        {
          number: "03",
          title: "Physician Review",
          description:
            "A board-certified physician or radiologist reviews your case and determines whether treatment or follow-up is appropriate.",
        },
        {
          number: "04",
          title: "Care Plan & Next Steps",
          description:
            "If treatment is clinically appropriate, prescriptions are issued by a licensed physician and routed to our pharmacy partner, Strive Pharmacy (LegitScript Certified). Video consults and radiology reviews are delivered securely online.",
        },
      ],
    },
    reviews: {
      eyebrow: "Reviews",
      titleHtml: "Real care experiences,<br />real patients.",
      subtitle:
        "Hear from Florida patients about their care experience with Patriotic Virtual Telehealth.",
    },
    cta: {
      title: "Your health, your schedule.",
      description:
        "Complete a confidential intake and request a consultation. A licensed physician reviews your information and determines whether treatment is appropriate.",
      button: "Request a Consultation",
    },
    footer: {
      brand:
        "Board-certified telehealth and radiology services. Currently accepting patients in Florida. No controlled substances are prescribed through this platform.",
      company: "Company",
      about: "About Us",
      careers: "Careers",
      press: "Press",
      support: "Support",
      faq: "FAQ",
      contact: "Contact",
      privacy: "Privacy Policy",
      copy: "© 2026 Patriotic Virtual Telehealth. All rights reserved.",
      badges:
        "HIPAA Compliant · Florida-Licensed Providers · Board-Certified Physicians · Encrypted",
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
      getStarted: "Comienza Mi Evaluacion",
      dashboard: "Panel",
      logout: "Cerrar Sesión",
    },
    hero: {
      badge: "Supervision de Medicos Certificados",
      titleHtml:
        'Planes de tratamiento basados en evidencia,<br />revisados por <span class="gt">medicos certificados.</span>',
      subtitle:
        "Complete una evaluacion medica confidencial. Un medico con licencia revisa su informacion y determina si el tratamiento es apropiado para usted. Las recetas solo se emiten cuando son clinicamente apropiadas.",
      cta: "Comienza Mi Evaluacion",
      servicesKicker: "Ver Servicios",
      servicesHeading: "Elige un servicio y comienza tu evaluacion.",
      servicesSub:
        "Complete un registro seguro para revision medica. Todos los tratamientos requieren revision y aprobacion por un medico con licencia. Las recetas se emiten solo cuando son clinicamente apropiadas.",
    },
    safety: [
      "Medicos Certificados",
      "Sin Sustancias Controladas",
      "Proveedores con Licencia en Florida",
      "Plataforma Compatible con HIPAA",
      "Farmacia Aliada: Strive Pharmacy (LegitScript Certified)",
    ],
    protocol: {
      eyebrow: "Nuestro Enfoque",
      titleHtml: "Atencion guiada por protocolos.<br />Sin excepciones.",
      subtitle:
        "Cada consulta, solicitud de tratamiento y revision de imagen sigue protocolos clinicos estrictos. Nuestra deteccion automatizada ayuda a identificar contraindicaciones antes de tomar decisiones clinicas.",
      pills: [
        "Registro estructurado y evaluacion de contraindicaciones en cada visita",
        "Protocolos de tratamiento basados en evidencia para todos los servicios",
        "Revision medica certificada requerida para cada solicitud de tratamiento",
        "No se prescriben sustancias controladas en esta plataforma",
      ],
    },
    how: {
      eyebrow: "Como Funciona",
      titleHtml: "Atencion en cuatro<br />pasos sencillos.",
      subtitle:
        "Desde el primer clic hasta la revision medica, cada paso es seguro y guiado por protocolos.",
      steps: [
        {
          number: "01",
          title: "Elige Tu Servicio",
          description:
            "Elige entre telesalud, manejo del peso, salud masculina, educacion en imagenes y servicios diagnosticos. Actualmente aceptamos pacientes en Florida.",
        },
        {
          number: "02",
          title: "Completa tu Registro",
          description:
            "Completa un registro seguro. Nuestro sistema evalua contraindicaciones y otras senales de seguridad antes de la revision medica.",
        },
        {
          number: "03",
          title: "Revision Medica",
          description:
            "Un medico o radiologo certificado revisa su caso y determina si el tratamiento o seguimiento es apropiado.",
        },
        {
          number: "04",
          title: "Plan de Atencion y Siguientes Pasos",
          description:
            "Si el tratamiento es clinicamente apropiado, las recetas son emitidas por un medico con licencia y enviadas a nuestra farmacia aliada, Strive Pharmacy (LegitScript Certified). Las consultas por video y revisiones de radiologia se entregan de forma segura en linea.",
        },
      ],
    },
    reviews: {
      eyebrow: "Opiniones",
      titleHtml: "Experiencias reales,<br />pacientes reales.",
      subtitle:
        "Conozca la experiencia de pacientes de Florida con Patriotic Virtual Telehealth.",
    },
    cta: {
      title: "Tu salud, tu horario.",
      description:
        "Complete un registro confidencial y solicite una consulta. Un medico con licencia revisa su informacion y determina si el tratamiento es apropiado.",
      button: "Solicitar una Consulta",
    },
    footer: {
      brand:
        "Servicios de telesalud y radiologia certificados. Actualmente aceptamos pacientes en Florida. No se prescriben sustancias controladas en esta plataforma.",
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
        "Compatible con HIPAA · Proveedores con Licencia en Florida · Medicos Certificados · Encriptado",
    },
  },
} as const;

const SAFETY_ICON_BACKGROUNDS = [
  "var(--emerald)",
  "var(--blue)",
  "var(--amber)",
  "var(--violet)",
  "var(--navy)",
] as const;
const PROTOCOL_PILL_ICONS = ["🛡", "📋", "⚕️", "🔒"] as const;
const MARQUEE_ITEMS = [
  { icon: "📋", label: "Care Navigation Support" },
  { icon: "🔬", label: "Advanced Radiology Review" },
  { icon: "📱", label: "Digital Health Platform" },
  { icon: "🌴", label: "Available in Florida" },
  { icon: "🩺", label: "General Telehealth" },
  { icon: "💊", label: "Weight Management" },
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
    initials: "PT",
    avatarClass: "ta1",
    quote:
      '"Real patient experiences and reviews are coming soon! Check back later to hear from our community."',
    name: "Coming Soon",
    details: "Patriotic Virtual Telehealth",
  },
] as const;

const NON_PRESCRIBE_REASONS = [
  "If a condition requires in-person evaluation",
  "If requested treatment is not clinically appropriate",
  "If there are contraindications based on medical history",
  "If symptoms indicate a more serious or emergency condition",
  "If the patient is not eligible under physician guidelines",
] as const;

const CLINICAL_SAFETY_MODEL = [
  "All patients complete a structured medical intake",
  "Licensed physicians review every case",
  "Treatments are prescribed only when clinically appropriate",
  "Care decisions follow established medical guidelines",
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
  ready,
}: {
  onSuccess: (
    sessionId: string | null,
    consultationId: string | null,
  ) => boolean | Promise<boolean>;
  onCancel: () => void;
  ready: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const handledStatusRef = useRef<string | null>(null);
  const paymentStatus = searchParams?.get("payment") ?? null;
  const sessionId = searchParams?.get("session_id") ?? null;
  const consultationId = searchParams?.get("consultationId") ?? null;
  const replaceUrlWithoutNavigation = useCallback((url: string) => {
    if (typeof window !== "undefined") {
      window.history.replaceState(window.history.state, "", url);
      return;
    }

    router.replace(url, { scroll: false });
  }, [router]);
  const cleanedUrl = useMemo(() => {
    if (!searchParams) return pathname;
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("payment");
    nextParams.delete("session_id");
    nextParams.delete("consultationId");
    const query = nextParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);
  const successModalUrl = useMemo(() => {
    const nextParams = new URLSearchParams(searchParams?.toString() ?? "");
    nextParams.delete("payment");
    nextParams.delete("session_id");
    nextParams.delete("consultationId");
    nextParams.set("modal", "consult");
    nextParams.set("consultStep", "4");
    const query = nextParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!ready || !paymentStatus || handledStatusRef.current === paymentStatus) {
      return;
    }

    handledStatusRef.current = paymentStatus;

    void (async () => {
      if (paymentStatus === "success") {
        const confirmed = await onSuccess(sessionId, consultationId);
        if (!confirmed) {
          return;
        }
        replaceUrlWithoutNavigation(successModalUrl);
        return;
      }

      if (paymentStatus === "cancelled") {
        onCancel();
        return;
      }

      replaceUrlWithoutNavigation(cleanedUrl);
    })();
  }, [
    cleanedUrl,
    consultationId,
    onCancel,
    onSuccess,
    paymentStatus,
    ready,
    replaceUrlWithoutNavigation,
    sessionId,
    successModalUrl,
  ]);

  return null;
}

export function LandingEmbed() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [locale, setLocale] = useState<LandingLocale>("en");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [aboutTab, setAboutTab] = useState<1 | 2 | 3>(1);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false);
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
  const urlModal = searchParams?.get("modal") ?? null;
  const urlConsultService = searchParams?.get("consultService") ?? null;
  const urlConsultStep = useMemo(() => {
    const rawStep = searchParams?.get("consultStep") ?? "";
    const parsed = Number.parseInt(rawStep, 10);
    if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 5) {
      return parsed;
    }
    return 1;
  }, [searchParams]);

  const copy = COPY[locale];

  const replaceLandingUrl = (mutate: (params: URLSearchParams) => void) => {
    const currentUrl = typeof window !== "undefined"
      ? new URL(window.location.href)
      : new URL(`${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`, "https://patriotic-virtual-emr.web.app");
    const nextParams = new URLSearchParams(currentUrl.search);
    mutate(nextParams);
    const query = nextParams.toString();
    const nextUrl = query ? `${pathname}?${query}` : pathname;

    if (typeof window !== "undefined") {
      window.history.replaceState(window.history.state, "", nextUrl);
      return;
    }

    router.replace(nextUrl, { scroll: false });
  };

  const syncConsultModalUrl = (options: {
    open: boolean;
    step?: number;
    service?: string | null;
  }) => {
    const nextStep = options.step ?? 1;
    const nextService = options.service ?? null;

    setConsultModalOpen(options.open);
    setInitialConsultStep(nextStep);
    setInitialService(nextService);

    replaceLandingUrl((params) => {
      if (options.open) {
        params.set("modal", "consult");
        params.set("consultStep", String(nextStep));
        if (nextService) {
          params.set("consultService", nextService);
        } else {
          params.delete("consultService");
        }
        return;
      }

      if (params.get("modal") === "consult") {
        params.delete("modal");
      }
      params.delete("consultStep");
      params.delete("consultService");
    });
  };

  const getPendingConsultationId = () => {
    if (typeof window === "undefined") {
      return null;
    }

    return window.sessionStorage.getItem("pendingConsultationId")
      || window.localStorage.getItem("pendingConsultationId");
  };

  const clearPendingConsultationId = () => {
    if (typeof window === "undefined") {
      return;
    }

    window.sessionStorage.removeItem("pendingConsultationId");
    window.localStorage.removeItem("pendingConsultationId");
  };

  useEffect(() => {
    const shouldOpenConsult = urlModal === "consult";
    setConsultModalOpen((current) => current === shouldOpenConsult ? current : shouldOpenConsult);
    setInitialConsultStep((current) => current === urlConsultStep ? current : urlConsultStep);
    setInitialService((current) => current === urlConsultService ? current : urlConsultService);
  }, [urlConsultService, urlConsultStep, urlModal]);

  const handlePaymentSuccess = async (sessionId: string | null, consultationId: string | null) => {
    const resolvedConsultationId = consultationId || getPendingConsultationId();

    if (!sessionId || !resolvedConsultationId) {
      console.error('Missing Stripe return details after checkout.', { sessionId, consultationId: resolvedConsultationId });
      showToast("We couldn't finalize the checkout return. Please contact support if you were charged.");
      return false;
    }

    if (!auth.currentUser) {
      showToast("Sign in again to finish confirming your payment.");
      setAuthInitiator("header_login");
      setAuthMode("login");
      setAuthModalOpen(true);
      return false;
    }

    try {
      const token = await auth.currentUser.getIdToken();
      await apiFetchJson(getApiUrl('/api/v1/payments/confirm-telehealth-session'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: {
          sessionId,
          consultationId: resolvedConsultationId,
        },
      });
      clearPendingConsultationId();
    } catch (error) {
      console.error('Failed to confirm telehealth checkout session:', error);
      showToast("Your payment succeeded, but we couldn't finalize the consultation automatically. Please contact support.");
      return false;
    }

    setInitialConsultStep(4);
    setConsultModalOpen(true);
    return true;
  };

  const handlePaymentCancel = () => {
    clearPendingConsultationId();
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
        setAuthReady(true);
        return;
      }

      setIsAuthenticated(true);
      setDashboardHref("/dashboard");
      setAuthReady(true);

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
    setInitialConsultStep(1);
    if (!isAuthenticated) {
      setAuthInitiator("header_get_started");
      setAuthMode("register");
      setAuthModalOpen(true);
    } else {
      syncConsultModalUrl({ open: true, step: 1, service: null });
    }
  };

  const handleServiceStart = (serviceKey: string) => {
    setMobileMenuOpen(false);
    setInitialService(serviceKey);
    setInitialConsultStep(1);
    setAuthInitiator("service_card");
    syncConsultModalUrl({ open: true, step: 1, service: serviceKey });
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

  const isLightTheme = theme === "light";
  const techSectionStyles = {
    section: {
      padding: "80px 0",
      background: isLightTheme ? "var(--g50)" : "#020617",
    },
    eyebrow: {
      color: isLightTheme ? "var(--blue)" : "#93c5fd",
    },
    title: {
      maxWidth: "800px",
      color: isLightTheme ? "var(--navy)" : "#ffffff",
    },
    subtitle: {
      maxWidth: "800px",
      marginBottom: "32px",
      color: isLightTheme ? "#475569" : "#cbd5e1",
    },
    card: {
      background: isLightTheme ? "#ffffff" : "#0f172a",
      padding: "24px",
      borderRadius: "16px",
      border: isLightTheme
        ? "1px solid #d1d5db"
        : "1px solid rgba(148, 163, 184, 0.24)",
      display: "flex",
      gap: "16px",
      alignItems: "flex-start",
      marginBottom: "24px",
      maxWidth: "800px",
      boxShadow: isLightTheme
        ? "0 10px 28px rgba(15, 23, 42, 0.08)"
        : "0 16px 36px rgba(2, 6, 23, 0.42)",
    },
    iconBadge: {
      width: "48px",
      height: "48px",
      borderRadius: "14px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "24px",
      flexShrink: 0,
      background: isLightTheme
        ? "rgba(59, 130, 246, 0.12)"
        : "rgba(96, 165, 250, 0.16)",
    },
    cardTitle: {
      fontSize: "16px",
      marginBottom: "8px",
      color: isLightTheme ? "var(--navy)" : "#f8fafc",
    },
    cardText: {
      fontSize: "14px",
      color: isLightTheme ? "#475569" : "#cbd5e1",
      margin: 0,
    },
    footnote: {
      fontSize: "13px",
      color: isLightTheme ? "#64748b" : "#94a3b8",
      fontStyle: "italic",
      margin: 0,
      maxWidth: "800px",
    },
  } as const;

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
              <source src="/assets/pick2.mp4" type="video/mp4" />
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
                <div
                  className="hero-badge"
                  style={{
                    background: "rgba(16, 185, 129, 0.08)",
                    borderColor: "rgba(16, 185, 129, 0.3)",
                    color: "#00d9a3",
                    marginLeft: "8px",
                  }}
                >
                  <span>
                    {locale === "en"
                      ? "Currently accepting patients in Florida."
                      : "Actualmente aceptamos pacientes en Florida."}
                  </span>
                </div>
                <div
                  className="hero-badge"
                  style={{
                    background: "rgba(245, 158, 11, 0.08)",
                    borderColor: "rgba(245, 158, 11, 0.3)",
                    color: "#fde68a",
                    marginLeft: "8px",
                  }}
                >
                  <span>
                    {locale === "en"
                      ? "No Controlled Substances Prescribed"
                      : "No Se Prescriben Sustancias Controladas"}
                  </span>
                </div>
                <h1 dangerouslySetInnerHTML={{ __html: copy.hero.titleHtml }} />
                <p className="hero-sub">{copy.hero.subtitle}</p>
                <p
                  className="hero-sub"
                  style={{ fontSize: "0.85em", color: "var(--g400)" }}
                >
                  Powered by RadiantLogiq, an AI-driven clinical platform for
                  decision support and workflow optimization. RadiantLogiq is a
                  member of the NVIDIA Inception program.
                </p>
                <div className="hero-ctas">
                  <button
                    className="btn btn-primary btn-large"
                    onClick={handlePrimaryCta}
                    type="button"
                  >
                    {copy.hero.cta}
                  </button>
                </div>
                <p
                  className="hero-sub"
                  style={{
                    fontSize: "0.85em",
                    color: "#fcd34d",
                    marginTop: "12px",
                  }}
                >
                  {locale === "en"
                    ? "For medical emergencies, call 911. This platform does not treat acute or serious conditions."
                    : "Para emergencias medicas, llame al 911. Esta plataforma no trata condiciones agudas o graves."}
                </p>
                <div
                  style={{
                    marginTop: "16px",
                    fontSize: "0.9em",
                    color: "var(--g400)",
                    textAlign: "center",
                    maxWidth: "560px",
                  }}
                >
                  Our platform integrates advanced clinical software and AI to
                  support efficient, high-quality care delivery.
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
                  <p
                    style={{
                      fontSize: "12px",
                      color: "var(--g400)",
                      marginTop: "8px",
                    }}
                  >
                    {locale === "en"
                      ? "For medical emergencies, call 911. This platform does not treat acute or serious conditions."
                      : "Para emergencias medicas, llame al 911. Esta plataforma no trata condiciones agudas o graves."}
                  </p>
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
                <p
                  style={{
                    fontSize: "12px",
                    color: "var(--g400)",
                    marginTop: "12px",
                  }}
                >
                  {locale === "en"
                    ? "*Results vary by individual. Weight loss outcomes depend on adherence to treatment plan, lifestyle modifications, and physician-determined eligibility. Not all patients are candidates for GLP-1 therapy."
                    : "*Los resultados varian segun cada persona. Los resultados de perdida de peso dependen de la adherencia al plan de tratamiento, las modificaciones del estilo de vida y la elegibilidad determinada por el medico. No todos los pacientes son candidatos para la terapia con GLP-1."}
                </p>
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

        <section className="how-section" id="when-we-do-not-prescribe">
          <div className="container">
            <div className="sec-eye eye-blue">
              <div className="eye-line" style={{ background: "var(--blue)" }} />
              <span>
                {locale === "en"
                  ? "When We Do Not Prescribe"
                  : "Cuando No Prescribimos"}
              </span>
            </div>
            <h2 className="sec-title">
              {locale === "en"
                ? "When We Do Not Prescribe"
                : "Cuando No Prescribimos"}
            </h2>
            <p className="sec-sub">
              {locale === "en"
                ? "Treatment decisions are based on physician judgment, medical history, and patient safety."
                : "Las decisiones de tratamiento se basan en el juicio medico, la historia clinica y la seguridad del paciente."}
            </p>
            <div className="steps-grid">
              {NON_PRESCRIBE_REASONS.map((reason, index) => (
                <div className="step" key={reason}>
                  <div className="step-acc" />
                  <div className="step-num">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <p>
                    {locale === "en"
                      ? reason
                      : [
                          "Si una condicion requiere una evaluacion en persona",
                          "Si el tratamiento solicitado no es clinicamente apropiado",
                          "Si existen contraindicaciones segun la historia clinica",
                          "Si los sintomas indican una condicion mas grave o una emergencia",
                          "Si el paciente no es elegible segun las guias medicas",
                        ][index]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="how-section" id="clinical-safety-model">
          <div className="container">
            <div className="sec-eye eye-em">
              <div className="eye-line" />
              <span>
                {locale === "en"
                  ? "Clinical Safety Model"
                  : "Modelo de Seguridad Clinica"}
              </span>
            </div>
            <h2 className="sec-title">
              {locale === "en"
                ? "Clinical Safety Model"
                : "Modelo de Seguridad Clinica"}
            </h2>
            <p className="sec-sub">
              {locale === "en"
                ? "Every case follows a structured review process designed to support safe, consistent care."
                : "Cada caso sigue un proceso estructurado de revision para apoyar una atencion segura y consistente."}
            </p>
            <div className="steps-grid">
              {CLINICAL_SAFETY_MODEL.map((item, index) => (
                <div className="step" key={item}>
                  <div className="step-acc" />
                  <div className="step-num">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <p>
                    {locale === "en"
                      ? item
                      : [
                          "Todos los pacientes completan un registro medico estructurado",
                          "Medicos con licencia revisan cada caso",
                          "Los tratamientos solo se prescriben cuando son clinicamente apropiados",
                          "Las decisiones de atencion siguen guias medicas establecidas",
                        ][index]}
                  </p>
                </div>
              ))}
            </div>
            <p className="sec-sub" style={{ marginTop: 20 }}>
              {locale === "en"
                ? "Clinicians are supported by AI-powered clinical decision tools to enhance safety and consistency of care."
                : "Los clinicos cuentan con herramientas de decision clinica impulsadas por IA para mejorar la seguridad y la consistencia de la atencion."}
            </p>
          </div>
        </section>

        <section
          className="tech-section"
          id="technology-platform"
          style={techSectionStyles.section}
        >
          <div className="container">
            <div className="sec-eye eye-blue">
              <div className="eye-line" style={{ background: "var(--blue)" }} />
              <span style={techSectionStyles.eyebrow}>
                Technology & Platform
              </span>
            </div>
            <h2 className="sec-title" style={techSectionStyles.title}>
              Powered by RadiantLogiq
            </h2>
            <p className="sec-sub" style={techSectionStyles.subtitle}>
              Patriotic Virtual Telehealth is powered by RadiantLogiq, a
              physician-founded clinical platform designed to enhance care
              delivery through workflow optimization and intelligent data
              processing. RadiantLogiq supports scalable telehealth operations
              today, with ongoing development of advanced clinical decision
              support tools for healthcare providers.
            </p>
            <div style={techSectionStyles.card}>
              <div aria-hidden="true" style={techSectionStyles.iconBadge}>
                🔒
              </div>
              <div>
                <h3 style={techSectionStyles.cardTitle}>
                  Secure Medication Management
                </h3>
                <p style={techSectionStyles.cardText}>
                  We utilize a secure, integrated e-prescribing platform
                  (DoseSpot) to support safe, compliant, and efficient
                  medication management.
                </p>
              </div>
            </div>
            <p style={techSectionStyles.footnote}>
              * For providers and health systems, RadiantLogiq is being
              developed to support workflow optimization and clinical decision
              support.
            </p>
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
                  <div
                    style={{
                      marginTop: "12px",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#b45309",
                      background: "#fef3c7",
                      padding: "8px 12px",
                      borderRadius: "6px",
                    }}
                  >
                    <span style={{ fontSize: "14px", marginRight: "4px" }}>
                      ⚠️
                    </span>{" "}
                    For Educational Purposes Only. Not a diagnostic service.
                  </div>
                  <div className="rpt" style={{ marginTop: "20px" }}>
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
                  <div
                    style={{
                      marginTop: "12px",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#b45309",
                      background: "#fef3c7",
                      padding: "8px 12px",
                      borderRadius: "6px",
                    }}
                  >
                    <span style={{ fontSize: "14px", marginRight: "4px" }}>
                      ⚠️
                    </span>{" "}
                    For Educational Purposes Only. Not a diagnostic service.
                  </div>
                  <div className="rpt" style={{ marginTop: "20px" }}>
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
                  <div
                    style={{
                      marginTop: "12px",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#b45309",
                      background: "#fef3c7",
                      padding: "8px 12px",
                      borderRadius: "6px",
                    }}
                  >
                    <span style={{ fontSize: "14px", marginRight: "4px" }}>
                      ⚠️
                    </span>{" "}
                    For Educational Purposes Only. Not a diagnostic service.
                  </div>
                  <div className="rpt" style={{ marginTop: "20px" }}>
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
                  <div
                    style={{
                      marginTop: "12px",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#b45309",
                      background: "#fef3c7",
                      padding: "8px 12px",
                      borderRadius: "6px",
                    }}
                  >
                    <span style={{ fontSize: "14px", marginRight: "4px" }}>
                      ⚠️
                    </span>{" "}
                    For Educational Purposes Only. Not a diagnostic service.
                  </div>
                  <div className="rpt" style={{ marginTop: "20px" }}>
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
                <a href="/faq">{copy.footer.faq}</a>
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
                <a href="/terms">Terms of Service</a>
                <a href="/privacy-policy">{copy.footer.privacy}</a>
                <a href="/npp" target="_blank">
                  Notice of Privacy Practices
                </a>
                <a href="/telehealth-consent" target="_blank">
                  Telehealth Consent
                </a>
                <span
                  style={{
                    color: "#9ca3af",
                    fontSize: "14px",
                    marginTop: "12px",
                    display: "block",
                  }}
                >
                  📞 (321) 204-0902
                  <br />
                  📍 176 NW 25th St, Miami, FL 33127
                </span>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gap: "10px",
                marginTop: "24px",
                paddingTop: "24px",
                borderTop: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "#cbd5e1",
                  fontSize: "13px",
                  lineHeight: 1.6,
                }}
              >
                {locale === "en"
                  ? "For medical emergencies, call 911. This platform does not treat acute or serious conditions."
                  : "Para emergencias medicas, llame al 911. Esta plataforma no trata condiciones agudas o graves."}
              </p>
              <p
                style={{
                  margin: 0,
                  color: "#cbd5e1",
                  fontSize: "13px",
                  lineHeight: 1.6,
                }}
              >
                {locale === "en"
                  ? "All treatments are prescribed, when appropriate, by board-certified physicians licensed in applicable states."
                  : "Todos los tratamientos se prescriben, cuando es apropiado, por medicos certificados con licencia en los estados correspondientes."}
              </p>
              <p
                style={{
                  margin: 0,
                  color: "#cbd5e1",
                  fontSize: "13px",
                  lineHeight: 1.6,
                }}
              >
                Pharmacy Partner: Strive Pharmacy (LegitScript Certified)
              </p>
            </div>

            <div className="footer-bottom">
              <span>{copy.footer.copy}</span>
              <span>{copy.footer.badges}</span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "16px",
                marginTop: "24px",
                paddingTop: "24px",
                borderTop: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <img
                  src="/assets/nvidia-inception.jpg"
                  alt="NVIDIA Inception Program member badge"
                  style={{ maxHeight: "30px", width: "auto" }}
                />
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#e5e7eb",
                      fontWeight: 500,
                    }}
                  >
                    Powered by RadiantLogiq
                  </span>
                  <span style={{ fontSize: "12px", color: "#9ca3af" }}>
                    Member, NVIDIA Inception Program
                  </span>
                </div>
              </div>
              <p
                style={{
                  fontSize: "10px",
                  color: "#6b7280",
                  maxWidth: "600px",
                  margin: 0,
                  textAlign: "right",
                }}
              >
                © 2025 NVIDIA, the NVIDIA logo, and NVIDIA Inception Program are
                trademarks and/or registered trademarks of NVIDIA Corporation in
                the U.S. and other countries.
              </p>
            </div>

            <p
              style={{
                fontSize: "0.75rem",
                color: "#9ca3af",
                textAlign: "center",
                maxWidth: "48rem",
                margin: "2rem auto 0",
              }}
            >
              {locale === "en"
                ? "All treatments require review and approval by a licensed physician. Prescriptions are issued only when clinically appropriate."
                : "Todos los tratamientos requieren revision y aprobacion por un medico con licencia. Las recetas se emiten solo cuando son clinicamente apropiadas."}
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
              <button
                id="aboutTab3"
                onClick={() => setAboutTab(3)}
                style={getAboutTabStyle(aboutTab === 3)}
                type="button"
              >
                L. Lue Winston, APRN
              </button>
            </div>

            <div
              style={{
                textAlign: "center",
                marginBottom: "32px",
                padding: "16px",
                background: "var(--blue-soft)",
                borderRadius: "12px",
              }}
            >
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--navy)",
                  margin: 0,
                  fontWeight: 500,
                }}
              >
                Built by a physician-led team, RadiantLogiq is designed to
                improve efficiency and scalability in modern healthcare
                delivery.
              </p>
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
                    Strive Pharmacy (LegitScript-certified and NABP-accredited)
                    and Empower Pharmacy as our compounding pharmacy partners.
                    Our licensed providers exclusively review and approve all
                    prescriptions before securely transmitting them to these
                    accredited pharmacies, ensuring you receive the highest
                    quality, most reliable medications when appropriate for your
                    personalized treatment plan. Together, these partnerships
                    help us deliver safe, coordinated, and compassionate virtual
                    care you can trust.
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

            {/* PROFILE: L. LUE WINSTON */}
            <div
              id="aboutProfile3"
              style={{
                display: aboutTab === 3 ? "flex" : "none",
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
                  src="/assets/l_lue_winston.jpg"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  alt="L. Lue Winston"
                />
              </div>
              <div>
                <h2 style={{ marginBottom: 8 }}>
                  La Donna L. Lue Winston, MSN, APRN, SCRN
                </h2>
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
                  Adult-Gerontology Acute Care Nurse Practitioner
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
                  Board-certified Adult-Gerontology Acute Care Nurse Practitioner (AGACNP-BC) and Stroke Certified Nurse with over 15 years in the nursing field. La Donna is dedicated to evidence-based practice, improving patient outcomes through comprehensive care plans, and providing expert clinical guidance in critical care and stroke programs.
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
                        margin: 0,
                        padding: 0,
                      }}
                    >
                      <li style={{ marginBottom: 6 }}>
                        <b>Post Master's APRN:</b> Nova Southeastern University
                      </li>
                      <li style={{ marginBottom: 6 }}>
                        <b>MS in Nursing Ed:</b> Phoenix University
                      </li>
                      <li style={{ marginBottom: 6 }}>
                        <b>BS in Biology:</b> Nova Southeastern University
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
                        margin: 0,
                        padding: 0,
                      }}
                    >
                      <li style={{ marginBottom: 6 }}>Acute Care · Critical Care</li>
                      <li style={{ marginBottom: 6 }}>Stroke & Neurological Care</li>
                      <li style={{ marginBottom: 6 }}>Quality Assurance & Compliance</li>
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
                    🤝 Leadership & Affiliations
                  </h3>
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--g600)",
                      lineHeight: 1.6,
                      marginBottom: 8,
                    }}
                  >
                    <b>President:</b> Broward County Chapter of AACN (2022-2023, 2025-2026)
                    <br />
                    <b>Board Member:</b> Miami VHA APRN Council Board
                    <br />
                    <b>Stroke Coordinator:</b> Miami Veterans Health Administration
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
                    La Donna is deeply committed to community health, actively participating in breast cancer walks, food drives, and conducting stroke health screenings. She also serves as clinical adjunct faculty, educating future nurses.
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
                4. Weight Management Treatments
              </h4>
              <p style={{ marginBottom: 12 }}>
                For GLP-1 agonist prescriptions (e.g., Semaglutide/Tirzepatide),
                you acknowledge potential side effects including nausea,
                vomiting, and risk of thyroid C-cell tumors. You confirm you do
                not have a personal or family history of Medullary Thyroid
                Carcinoma (MTC) or MEN 2 syndrome. All treatments require review
                and approval by a licensed physician. Prescriptions are issued
                only when clinically appropriate.
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
        onConsultClose={() => syncConsultModalUrl({ open: false })}
        onConsultStepChange={(step) => syncConsultModalUrl({
          open: true,
          step,
          service: initialService,
        })}
        onConsultServiceChange={(service) => syncConsultModalUrl({
          open: true,
          step: initialConsultStep,
          service,
        })}
        authModalOpen={authModalOpen}
        setAuthModalOpen={setAuthModalOpen}
        isAuthenticated={isAuthenticated}
        authMode={authMode}
        setAuthMode={setAuthMode}
        initialService={initialService}
        initialConsultStep={initialConsultStep}
        onLoginSuccess={() => {
          if (authInitiator === "header_login") {
            setInitialService(null);
            setInitialConsultStep(1);
            router.push("/");
          } else {
            setInitialConsultStep(
              authInitiator === "service_card" && initialService ? 2 : 1,
            );
            setConsultModalOpen(true);
          }
        }}
        onOpenRegister={() => {
          setConsultModalOpen(false);
          setAuthInitiator("service_card");
          setAuthMode("register");
          setAuthModalOpen(true);
        }}
        onOpenLogin={() => {
          setConsultModalOpen(false);
          setAuthInitiator("service_card");
          setAuthMode("login");
          setAuthModalOpen(true);
        }}
        showToast={showToast}
      />
      <Suspense fallback={null}>
        <PaymentStatusHandler
          onSuccess={handlePaymentSuccess}
          onCancel={handlePaymentCancel}
          ready={authReady}
        />
      </Suspense>
    </>
  );
}

export default LandingEmbed;
