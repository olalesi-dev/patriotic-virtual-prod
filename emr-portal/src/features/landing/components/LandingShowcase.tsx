"use client";

import type { CSSProperties, MouseEvent } from "react";

type LandingLocale = "en" | "es";

type LandingShowcaseCopy = {
  hero: {
    badge: string;
    titleHtml: string;
    subtitle: string;
    cta: string;
  };
  safety: ReadonlyArray<string>;
  how: {
    eyebrow: string;
    titleHtml: string;
    subtitle: string;
    steps: ReadonlyArray<{
      number: string;
      title: string;
      description: string;
    }>;
  };
  reviews: {
    eyebrow: string;
    titleHtml: string;
    subtitle: string;
  };
  cta: {
    title: string;
    description: string;
    button: string;
  };
  footer: {
    brand: string;
    company: string;
    about: string;
    careers: string;
    press: string;
    support: string;
    faq: string;
    contact: string;
    privacy: string;
    copy: string;
    badges: string;
  };
};

type LandingShowcaseProps = {
  theme: "dark" | "light";
  locale: LandingLocale;
  copy: LandingShowcaseCopy;
  onPrimaryCta: () => void;
  onServiceStart: (serviceKey: string) => void;
  onShowLanding: (event: MouseEvent<HTMLAnchorElement>) => void;
  onOpenAbout: () => void;
  onShowToast: (message: string) => void;
};

type BentoCard = {
  key: string;
  eyebrow: string;
  title: string;
  description: string;
  price: string;
  image: string;
  tone: "caramel" | "sand" | "cream" | "olive";
  size: "large" | "small";
};

type MedicationCard = {
  key: string;
  title: string;
  description: string;
  price: string;
  image: string;
  flag?: string;
};

type StoryCard = {
  key: string;
  title: string;
  description: string;
  action: string;
  image: string;
};

type TeamCard = {
  title: string;
  role: string;
  image: string;
  description: string;
};

type TestimonialCard = {
  name: string;
  role: string;
  quote: string;
};

function delayStyle(index: number): CSSProperties {
  return {
    ["--pv-delay" as string]: `${index * 0.08}s`,
  };
}

export function LandingShowcase({
  theme,
  locale,
  copy,
  onPrimaryCta,
  onServiceStart,
  onShowLanding,
  onOpenAbout,
  onShowToast,
}: LandingShowcaseProps) {
  const isSpanish = locale === "es";

  const heroCards: BentoCard[] = [
    {
      key: "weight_loss",
      eyebrow: isSpanish ? "Perdida de peso" : "Weight loss",
      title: isSpanish
        ? "Comienza tu plan medico para perder peso"
        : "Start your medical weight plan",
      description: isSpanish
        ? "Evaluacion clinica, guia de estilo de vida y revisiones de tratamiento."
        : "Clinical evaluation, lifestyle guidance, and treatment review.",
      price: isSpanish ? "Desde $129" : "From $129",
      image: "/assets/landing/pen-placeholder.svg",
      tone: "caramel",
      size: "large",
    },
    {
      key: "imaging_video",
      eyebrow: isSpanish ? "Imagenes y consulta" : "Imaging + consult",
      title: isSpanish
        ? "Habla sobre tus hallazgos con un especialista"
        : "Talk through your findings with a specialist",
      description: isSpanish
        ? "Revision educativa de imagenes y video consulta segura."
        : "Educational imaging review and a secure video consult.",
      price: isSpanish ? "Desde $449" : "From $449",
      image: "/assets/dr_osunsade_new.jpg",
      tone: "sand",
      size: "large",
    },
    {
      key: "erectile_dysfunction",
      eyebrow: isSpanish ? "Salud masculina" : "Men's health",
      title: isSpanish
        ? "Atencion discreta para la salud masculina"
        : "Discreet care for men's health",
      description: isSpanish
        ? "Evaluacion guiada por protocolos con revision medica."
        : "Protocol-driven evaluation with physician review.",
      price: isSpanish ? "Desde $79" : "From $79",
      image: "/assets/landing/pill-placeholder.svg",
      tone: "cream",
      size: "small",
    },
    {
      key: "general_visit",
      eyebrow: isSpanish ? "Visitas virtuales" : "General telehealth",
      title: isSpanish
        ? "Atencion virtual para necesidades cotidianas"
        : "Virtual care for everyday concerns",
      description: isSpanish
        ? "Seguimiento, orientacion y manejo de sintomas no urgentes."
        : "Follow-up, guidance, and non-urgent symptom management.",
      price: isSpanish ? "Desde $79" : "From $79",
      image: "/assets/landing/phone-placeholder.svg",
      tone: "olive",
      size: "small",
    },
  ];

  const medicationCards: MedicationCard[] = [
    {
      key: "weight_loss",
      title: isSpanish ? "Plan GLP-1" : "GLP-1 plan",
      description: isSpanish
        ? "Revision de elegibilidad, titulacion y apoyo continuo."
        : "Eligibility review, titration planning, and ongoing support.",
      price: isSpanish ? "Evaluacion desde $129" : "Evaluation from $129",
      image: "/assets/landing/pen-placeholder.svg",
      flag: isSpanish ? "Alta demanda" : "High demand",
    },
    {
      key: "membership_elite",
      title: isSpanish ? "Membresia Elite" : "Elite membership",
      description: isSpanish
        ? "Visitas, herramientas de IA y acceso prioritario en un solo plan."
        : "Visits, AI tools, and priority access in one plan.",
      price: isSpanish ? "Desde $199/mes" : "From $199/mo",
      image: "/assets/landing/bottle-placeholder.svg",
      flag: isSpanish ? "Todo en uno" : "All-in-one",
    },
    {
      key: "erectile_dysfunction",
      title: isSpanish ? "Salud masculina" : "Men's health",
      description: isSpanish
        ? "Evaluacion confidencial con evaluacion de seguridad."
        : "Confidential evaluation with safety screening.",
      price: isSpanish ? "Desde $79" : "From $79",
      image: "/assets/landing/pill-placeholder.svg",
    },
    {
      key: "general_visit",
      title: isSpanish ? "Visita general" : "General visit",
      description: isSpanish
        ? "Atencion rapida para necesidades no urgentes."
        : "Fast virtual care for non-urgent needs.",
      price: isSpanish ? "Desde $79" : "From $79",
      image: "/assets/landing/phone-placeholder.svg",
    },
  ];

  const storyCards: StoryCard[] = [
    {
      key: "erectile_dysfunction",
      title: isSpanish
        ? "Visitas confidenciales de salud masculina"
        : "Confidential men's health visits",
      description: isSpanish
        ? "Atencion discreta con seguimiento claro y pasos definidos."
        : "Discreet care with clear follow-up and next steps.",
      action: isSpanish ? "Explorar salud masculina" : "Explore men's health",
      image: "/assets/landing/bottle-placeholder.svg",
    },
    {
      key: "ai_imaging",
      title: isSpanish
        ? "Revision de imagenes impulsada por IA"
        : "AI-supported imaging review",
      description: isSpanish
        ? "Explicaciones sencillas para hallazgos complejos."
        : "Plain-language explanations for complex findings.",
      action: isSpanish ? "Ver servicios de imagenes" : "See imaging services",
      image: "/assets/landing/phone-placeholder.svg",
    },
  ];

  const imagingServices: MedicationCard[] = [
    {
      key: "ai_imaging",
      title: isSpanish ? "Analisis de imagenes con IA" : "AI imaging analysis",
      description: isSpanish
        ? "Apoyo educativo supervisado por medicos."
        : "Physician-supervised educational support.",
      price: isSpanish ? "Desde $99" : "From $99",
      image: "/assets/landing/phone-placeholder.svg",
    },
    {
      key: "report_interpretation",
      title: isSpanish
        ? "Interpretacion de informes"
        : "Report interpretation",
      description: isSpanish
        ? "Traduccion clara de terminos radiologicos complejos."
        : "Clear translation of complex radiology language.",
      price: isSpanish ? "Desde $149" : "From $149",
      image: "/assets/landing/pill-placeholder.svg",
    },
    {
      key: "diagnostic_facility",
      title: isSpanish ? "Soluciones para instalaciones" : "Facility solutions",
      description: isSpanish
        ? "Lecturas diagnosticas y soporte para clinicas y urgent care."
        : "Diagnostic reads and support for clinics and urgent care teams.",
      price: isSpanish ? "Planes personalizados" : "Custom plans",
      image: "/assets/landing/pen-placeholder.svg",
    },
  ];

  const featurePoints = [
    isSpanish
      ? "Selecciona un servicio y completa una evaluacion segura."
      : "Choose a service and complete a secure evaluation.",
    isSpanish
      ? "Los medicos revisan la historia clinica y la elegibilidad."
      : "Physicians review your history and determine eligibility.",
    isSpanish
      ? "Seguimiento y proximos pasos dentro de una experiencia clara."
      : "Follow-up and next steps stay inside one clear experience.",
  ];

  const teamCards: TeamCard[] = [
    {
      title: "Olalesi Osunsade, MD",
      role: isSpanish
        ? "Radiologo certificado"
        : "Board-certified radiologist",
      image: "/assets/dr_osunsade_new.jpg",
      description: isSpanish
        ? "Revision educativa de imagenes, segundas opiniones y soluciones para instalaciones."
        : "Educational imaging review, second opinions, and facility solutions.",
    },
    {
      title: "Alvaro Berrios, MS, FNP-BC",
      role: isSpanish
        ? "Nurse practitioner"
        : "Family nurse practitioner",
      image: "/assets/alvaro_berrios.jpg",
      description: isSpanish
        ? "Atencion centrada en prevencion, seguimiento y manejo integral."
        : "Care focused on prevention, follow-up, and whole-person management.",
    },
    {
      title: isSpanish ? "Equipo de coordinacion" : "Care coordination team",
      role: isSpanish
        ? "Acceso, seguimiento y soporte"
        : "Access, follow-up, and support",
      image: "/assets/familyimage.png",
      description: isSpanish
        ? "Diseñado para que cada paso se sienta claro y moderno."
        : "Built so every step feels clear, responsive, and modern.",
    },
  ];

  const testimonials: TestimonialCard[] = [
    {
      name: "Coming Soon",
      role: isSpanish
        ? "Patriotic Virtual Telehealth"
        : "Patriotic Virtual Telehealth",
      quote: isSpanish
        ? "¡Las experiencias y reseñas reales de pacientes llegarán pronto! Vuelve más tarde para escuchar a nuestra comunidad."
        : "Real patient experiences and reviews are coming soon! Check back later to hear from our community.",
    },
  ];

  return (
    <main id="landingPage" className={`pv-showcase pv-theme-${theme}`}>
      <section className="pv-top-ribbon">
        <div className="container pv-top-ribbon__inner">
          <span>
            {isSpanish
              ? "Atencion moderna, guiada por medicos y diseñada para moverse contigo."
              : "Modern physician-led care, designed to move with you."}
          </span>
          <a href="#how-it-works">
            {isSpanish ? "Ver como funciona" : "See how it works"}
          </a>
        </div>
      </section>

      <section className="pv-hero" id="services">
        <div className="container">
          <div className="pv-hero-grid">
            <div className="pv-hero-copy">
              <div className="pv-badge-row">
                <span className="pv-hero-badge pv-hero-badge--primary">
                  {copy.hero.badge}
                </span>
                <span className="pv-hero-badge">
                  {isSpanish
                    ? "Pacientes en Florida"
                    : "Currently serving Florida patients"}
                </span>
              </div>

              <h1
                className="pv-hero-title"
                dangerouslySetInnerHTML={{ __html: copy.hero.titleHtml }}
              />
              <p className="pv-hero-subtitle">{copy.hero.subtitle}</p>
              <p className="pv-hero-meta">
                {isSpanish
                  ? "Selecciona un servicio, completa la evaluacion y recibe proximos pasos claros cuando el tratamiento sea apropiado."
                  : "Pick a service, complete your intake, and get clear next steps when treatment is appropriate."}
              </p>

              <div className="pv-hero-actions">
                <button
                  className="btn btn-primary btn-large"
                  onClick={onPrimaryCta}
                  type="button"
                >
                  {copy.hero.cta}
                </button>
                <a className="pv-link-button" href="#radiology">
                  {isSpanish ? "Explorar imagenes" : "Explore imaging"}
                </a>
              </div>

              <div className="pv-proof-strip">
                {copy.safety.map((item, index) => (
                  <div
                    className="pv-proof-card"
                    key={item}
                    style={delayStyle(index)}
                  >
                    <span className="pv-proof-dot" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pv-hero-bento" aria-label="Featured services">
              {heroCards.map((card, index) => (
                <button
                  className={`pv-hero-card pv-hero-card--${card.size} pv-tone-${card.tone}`}
                  key={card.key}
                  onClick={() => onServiceStart(card.key)}
                  style={delayStyle(index)}
                  type="button"
                >
                  <div className="pv-card-copy">
                    <span className="pv-card-eyebrow">{card.eyebrow}</span>
                    <h3>{card.title}</h3>
                    <p>{card.description}</p>
                    <span className="pv-card-price">{card.price}</span>
                  </div>
                  <div className="pv-card-media">
                    <img alt="" src={card.image} />
                  </div>
                  <span className="pv-card-arrow">+</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="pv-stage-section">
        <div className="container">
          <div className="pv-stage-shell">
            <div className="pv-stage-copy">
              <span className="pv-section-kicker">
                {isSpanish ? "Recorridos destacados" : "Featured journeys"}
              </span>
              <h2 className="pv-section-title">
                {isSpanish
                  ? "Una experiencia de atencion que se siente actual desde el primer clic."
                  : "A care experience that feels current from the first click."}
              </h2>
              <p className="pv-section-subtitle">
                {isSpanish
                  ? "Disenado con el ritmo editorial, los bloques bento y el enfoque visual que te gusto, pero adaptado a Patriotic Virtual Telehealth."
                  : "Built with the editorial rhythm, bento layout, and visual polish you liked, but tuned for Patriotic Virtual Telehealth."}
              </p>
              <div className="pv-stage-points">
                {featurePoints.map((point) => (
                  <div className="pv-stage-point" key={point}>
                    <span className="pv-stage-point__icon" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
              <button
                className="btn btn-white btn-large"
                onClick={onPrimaryCta}
                type="button"
              >
                {isSpanish ? "Comenzar ahora" : "Start now"}
              </button>
            </div>

            <div className="pv-stage-visual" aria-hidden="true">
              <div className="pv-stage-beam" />
              <img
                className="pv-stage-pen"
                src="/assets/landing/pen-placeholder.svg"
                alt=""
              />
              <img
                className="pv-stage-pill pv-stage-pill--a"
                src="/assets/landing/pill-placeholder.svg"
                alt=""
              />
              <img
                className="pv-stage-pill pv-stage-pill--b"
                src="/assets/landing/pill-placeholder.svg"
                alt=""
              />
              <div className="pv-stage-note">
                {isSpanish
                  ? "Medicacion, coaching y seguimiento si es clinicamente apropiado."
                  : "Medication, coaching, and follow-up if clinically appropriate."}
              </div>
            </div>
          </div>

          <div className="pv-meds-grid">
            {medicationCards.map((card, index) => (
              <button
                className="pv-med-card"
                key={card.key}
                onClick={() => onServiceStart(card.key)}
                style={delayStyle(index)}
                type="button"
              >
                {card.flag ? <span className="pv-med-flag">{card.flag}</span> : null}
                <div className="pv-med-media">
                  <img alt="" src={card.image} />
                </div>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
                <span className="pv-med-price">{card.price}</span>
              </button>
            ))}
          </div>

          <p className="pv-footnote">
            {isSpanish
              ? "Los resultados varian. La elegibilidad del tratamiento y los resultados dependen de la revision medica, los antecedentes y el seguimiento del plan."
              : "Results vary. Treatment eligibility and outcomes depend on physician review, medical history, and follow-through."}
          </p>
        </div>
      </section>

      <section className="pv-paired-section">
        <div className="container">
          <div className="pv-paired-grid">
            <article className="pv-panel pv-panel--science">
              <div className="pv-panel-top">
                <span className="pv-panel-badge">
                  {isSpanish ? "Seguridad primero" : "Screening first"}
                </span>
                <a href="#how-it-works">
                  {isSpanish ? "Ver pasos" : "See the steps"}
                </a>
              </div>
              <h3>
                {isSpanish
                  ? "Cada solicitud comienza con el filtro correcto."
                  : "Every request starts with the right screening."}
              </h3>
              <p>
                {isSpanish
                  ? "Contraindicaciones, historia clinica y elegibilidad estatal se revisan antes de cualquier decision."
                  : "Contraindications, medical history, and state eligibility are reviewed before any care decision is made."}
              </p>
              <div className="pv-panel-diagram" aria-hidden="true">
                <div className="pv-panel-callout pv-panel-callout--left">
                  {isSpanish ? "Historia clinica" : "Medical history"}
                </div>
                <div className="pv-panel-callout pv-panel-callout--right">
                  {isSpanish ? "Revision medica" : "Physician review"}
                </div>
                <img src="/assets/landing/pill-placeholder.svg" alt="" />
              </div>
            </article>

            <article className="pv-panel pv-panel--consult">
              <span className="pv-panel-badge">
                {isSpanish ? "Imagenes y especialistas" : "Imaging + specialists"}
              </span>
              <h3>
                {isSpanish
                  ? "Explicaciones claras para hallazgos complejos."
                  : "Clearer explanations for complex findings."}
              </h3>
              <p>
                {isSpanish
                  ? "Servicios educativos de radiologia y video consultas para pacientes y clinicas."
                  : "Educational radiology services and video consults for patients and clinics."}
              </p>
              <div className="pv-panel-photo">
                <img
                  src="/assets/dr_osunsade_new.jpg"
                  alt="Physician specialist"
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={() => onServiceStart("imaging_video")}
                type="button"
              >
                {isSpanish ? "Explorar imagenes" : "Explore imaging"}
              </button>
            </article>
          </div>
        </div>
      </section>

      <section className="pv-family-section">
        <div className="container">
          <div className="pv-family-hero">
            <div className="pv-family-copy">
              <span className="pv-section-kicker">
                {isSpanish ? "Atencion diaria" : "Everyday care"}
              </span>
              <h2 className="pv-section-title">
                {isSpanish
                  ? "Atencion medica moderna que encaja en la vida real."
                  : "Modern medical care that fits real life."}
              </h2>
              <p className="pv-section-subtitle">
                {isSpanish
                  ? "Telesalud, salud masculina y seguimiento continuo dentro de una experiencia simple."
                  : "Telehealth, men's health, and ongoing follow-up inside one simple experience."}
              </p>
              <div className="pv-family-actions">
                <button
                  className="btn btn-white"
                  onClick={onPrimaryCta}
                  type="button"
                >
                  {isSpanish ? "Comenzar" : "Get started"}
                </button>
                <button
                  className="pv-link-button pv-link-button--dark"
                  onClick={() => onServiceStart("general_visit")}
                  type="button"
                >
                  {isSpanish ? "Ver visitas virtuales" : "See telehealth visits"}
                </button>
              </div>
            </div>
            <div className="pv-family-media">
              <div className="pv-family-line" aria-hidden="true" />
              <img
                src="/assets/familyimage.png"
                alt="Patient care lifestyle placeholder"
              />
            </div>
          </div>

          <div className="pv-family-card-grid">
            {storyCards.map((card, index) => (
              <button
                className="pv-story-card"
                key={card.key}
                onClick={() => onServiceStart(card.key)}
                style={delayStyle(index)}
                type="button"
              >
                <div className="pv-story-copy">
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                  <span>{card.action}</span>
                </div>
                <div className="pv-story-media">
                  <img alt="" src={card.image} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="pv-imaging-section" id="radiology">
        <div className="container">
          <div className="pv-imaging-shell">
            <div className="pv-imaging-copy">
              <span className="pv-section-kicker">
                {isSpanish ? "Radiologia y diagnostico" : "Radiology and diagnostics"}
              </span>
              <h2 className="pv-section-title">
                {isSpanish
                  ? "Servicios de imagenes con una narrativa mucho mas clara."
                  : "Imaging services with a much clearer story."}
              </h2>
              <p className="pv-section-subtitle">
                {isSpanish
                  ? "Revision educativa de imagenes para pacientes y opciones diagnosticas para clinicas y urgent care."
                  : "Educational imaging review for patients and diagnostic options for clinics and urgent care teams."}
              </p>
              <button
                className="btn btn-primary"
                onClick={() => onServiceStart("ai_imaging")}
                type="button"
              >
                {isSpanish ? "Ver opciones de imagenes" : "View imaging options"}
              </button>
            </div>

            <div className="pv-imaging-stage">
              <img
                className="pv-imaging-stage__photo"
                src="/assets/dr_osunsade_new.jpg"
                alt="Radiology specialist"
              />
              <div className="pv-floating-chip pv-floating-chip--one">
                {isSpanish ? "Video consulta segura" : "Secure video consult"}
              </div>
              <div className="pv-floating-chip pv-floating-chip--two">
                {isSpanish ? "Lecturas para instalaciones" : "Facility reads"}
              </div>
              <div className="pv-floating-chip pv-floating-chip--three">
                {isSpanish
                  ? "Explicado en lenguaje claro"
                  : "Explained in plain language"}
              </div>
            </div>
          </div>

          <div className="pv-imaging-service-grid">
            {imagingServices.map((service, index) => (
              <button
                className="pv-imaging-service"
                key={service.key}
                onClick={() => onServiceStart(service.key)}
                style={delayStyle(index)}
                type="button"
              >
                <div className="pv-imaging-service__media">
                  <img alt="" src={service.image} />
                </div>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                <span>{service.price}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="pv-process-section" id="how-it-works">
        <div className="container">
          <span className="pv-section-kicker">{copy.how.eyebrow}</span>
          <h2
            className="pv-section-title"
            dangerouslySetInnerHTML={{ __html: copy.how.titleHtml }}
          />
          <p className="pv-section-subtitle">{copy.how.subtitle}</p>

          <div className="pv-process-grid">
            {copy.how.steps.map((step, index) => (
              <article
                className="pv-step-card"
                key={step.number}
                style={delayStyle(index)}
              >
                <span className="pv-step-number">{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="pv-team-section" id="clinicians">
        <div className="container">
          <span className="pv-section-kicker">
            {isSpanish ? "Equipo y soporte" : "Team and support"}
          </span>
          <h2 className="pv-section-title">
            {isSpanish
              ? "Atencion construida por clinicos y soporte que responde."
              : "Care built by clinicians, with support that responds."}
          </h2>
          <p className="pv-section-subtitle">
            {isSpanish
              ? "Un lenguaje visual mas fuerte no cambia la mision: mantener la experiencia clara, segura y centrada en el paciente."
              : "A stronger visual system does not change the mission: keep the experience clear, safe, and patient-centered."}
          </p>

          <div className="pv-team-grid">
            {teamCards.map((card, index) => (
              <article
                className="pv-team-card"
                key={card.title}
                style={delayStyle(index)}
              >
                <div className="pv-team-image">
                  <img alt={card.title} src={card.image} />
                </div>
                <div className="pv-team-copy">
                  <h3>{card.title}</h3>
                  <span>{card.role}</span>
                  <p>{card.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="pv-testimonials-section" id="testimonials">
        <div className="container">
          <span className="pv-section-kicker">{copy.reviews.eyebrow}</span>
          <h2
            className="pv-section-title"
            dangerouslySetInnerHTML={{ __html: copy.reviews.titleHtml }}
          />
          <p className="pv-section-subtitle">{copy.reviews.subtitle}</p>
          <div className="pv-testimonial-grid">
            {testimonials.map((testimonial, index) => (
              <article
                className="pv-testimonial-card"
                key={testimonial.name}
                style={delayStyle(index)}
              >
                <div className="pv-testimonial-stars">5.0</div>
                <p>{testimonial.quote}</p>
                <div className="pv-testimonial-meta">
                  <strong>{testimonial.name}</strong>
                  <span>{testimonial.role}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="pv-final-cta">
        <div className="container">
          <div className="pv-guide-card">
            <div className="pv-guide-copy">
              <span className="pv-section-kicker">
                {isSpanish ? "Siguiente paso" : "Next step"}
              </span>
              <h2 className="pv-section-title">{copy.cta.title}</h2>
              <p className="pv-section-subtitle">{copy.cta.description}</p>
              <button
                className="btn btn-primary btn-large"
                onClick={onPrimaryCta}
                type="button"
              >
                {copy.cta.button}
              </button>
            </div>
            <div className="pv-guide-media">
              <img
                src="/assets/familyimage.png"
                alt="Warm lifestyle placeholder"
              />
            </div>
          </div>
        </div>
      </section>

      <footer className="pv-footer">
        <div className="container">
          <div className="pv-footer-grid">
            <div className="pv-footer-brand">
              <a href="#" className="nav-logo" onClick={onShowLanding}>
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
              <p>{copy.footer.brand}</p>
            </div>

            <div className="pv-footer-links">
              <h4>{copy.footer.company}</h4>
              <a
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  onOpenAbout();
                }}
              >
                {copy.footer.about}
              </a>
              <a
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  onShowToast(
                    isSpanish
                      ? "La pagina de carreras estara disponible pronto."
                      : "Careers page coming soon!",
                  );
                }}
              >
                {copy.footer.careers}
              </a>
              <a
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  onShowToast(
                    isSpanish
                      ? "La pagina de prensa estara disponible pronto."
                      : "Press page coming soon!",
                  );
                }}
              >
                {copy.footer.press}
              </a>
            </div>

            <div className="pv-footer-links">
              <h4>{copy.footer.support}</h4>
              <a href="/faq">{copy.footer.faq}</a>
              <a
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  onShowToast("Contact support: support@patriotictelehealth.com");
                }}
              >
                {copy.footer.contact}
              </a>
              <a href="/terms">Terms of Service</a>
              <a href="/privacy-policy">{copy.footer.privacy}</a>
            </div>
          </div>

          <div className="pv-footer-meta">
            <p>
              {isSpanish
                ? "Para emergencias medicas, llama al 911. Esta plataforma no trata condiciones agudas o potencialmente mortales."
                : "For medical emergencies, call 911. This platform does not treat acute or life-threatening conditions."}
            </p>
            <p>{copy.footer.badges}</p>
            <p>{copy.footer.copy}</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
