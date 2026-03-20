"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ClipboardList, Stethoscope, Package, Star, Shield, ChevronRight, X, Check, Lock, Phone, Mail, ExternalLink } from 'lucide-react';

// ─── Brand Constants ─────────────────────────────────────────
const BRAND = {
    navy: '#0A1628',
    gold: '#C9973A',
    goldLight: '#E8B95A',
    cream: '#FDF8F2',
    white: '#FFFFFF',
    mutedText: '#6B7280',
    navyLight: '#152138',
    phone: '(844) 747-4059',
    email: 'hello@patriotictelehealth.com',
    baseUrl: 'https://patriotictelehealth.com',
};

// ─── Types ───────────────────────────────────────────────────
interface AssessmentData {
    bmi: string;
    triedBefore: string;
    conditions: string[];
    email: string;
}

// ─── Hooks ───────────────────────────────────────────────────
function useInView(threshold = 0.15) {
    const ref = useRef<HTMLDivElement>(null);
    const [inView, setInView] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
            { threshold }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, [threshold]);
    return { ref, inView };
}

function useCountUp(target: number, duration = 1800, active = false) {
    const [value, setValue] = useState(0);
    useEffect(() => {
        if (!active) return;
        let start = 0;
        const step = target / (duration / 16);
        const timer = setInterval(() => {
            start = Math.min(start + step, target);
            setValue(Math.floor(start));
            if (start >= target) clearInterval(timer);
        }, 16);
        return () => clearInterval(timer);
    }, [target, duration, active]);
    return value;
}

// ─── SVG Icons ───────────────────────────────────────────────
function PatrioticLogo({ size = 28 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 2L4 8V18C4 24.627 9.373 30 16 30C22.627 30 28 24.627 28 18V8L16 2Z" fill={BRAND.navy} stroke={BRAND.gold} strokeWidth="1.5" />
            <path d="M16 7L13 14H7L12 18L10 25L16 21L22 25L20 18L25 14H19L16 7Z" fill={BRAND.gold} />
        </svg>
    );
}

// ─── Scroll-aware Navbar ──────────────────────────────────────
function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 60);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const scrollTo = (id: string) => {
        setMenuOpen(false);
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <nav
            className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
            style={{
                background: scrolled ? 'rgba(255,255,255,0.98)' : 'transparent',
                backdropFilter: scrolled ? 'blur(12px)' : 'none',
                boxShadow: scrolled ? '0 1px 24px rgba(0,0,0,0.08)' : 'none',
            }}
        >
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                {/* Logo */}
                <div className="flex items-center gap-3">
                    <PatrioticLogo size={32} />
                    <span
                        className="font-bold text-lg tracking-tight"
                        style={{
                            fontFamily: "'DM Sans', sans-serif",
                            color: scrolled ? BRAND.navy : BRAND.gold,
                        }}
                    >
                        Patriotic Telehealth
                    </span>
                </div>

                {/* Desktop nav links */}
                <div className="hidden md:flex items-center gap-8">
                    {[
                        { label: 'Weight Loss', id: 'hero' },
                        { label: 'How It Works', id: 'how-it-works' },
                        { label: 'Pricing', id: 'pricing' },
                        { label: 'FAQ', id: 'faq' },
                    ].map(({ label, id }) => (
                        <button
                            key={id}
                            onClick={() => scrollTo(id)}
                            className="text-sm font-semibold transition-colors hover:opacity-80"
                            style={{ color: scrolled ? BRAND.navy : 'rgba(255,255,255,0.9)' }}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* CTA */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => scrollTo('assessment')}
                        className="hidden md:flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all hover:scale-105 active:scale-95"
                        style={{ background: BRAND.gold, color: BRAND.white }}
                    >
                        Get Started <ChevronRight className="w-4 h-4" />
                    </button>
                    {/* Mobile hamburger */}
                    <button
                        onClick={() => setMenuOpen(v => !v)}
                        className="md:hidden flex flex-col gap-1.5 p-2"
                        aria-label="Menu"
                    >
                        {[0, 1, 2].map(i => (
                            <span
                                key={i}
                                className="block w-5 h-0.5 transition-all"
                                style={{ background: scrolled ? BRAND.navy : BRAND.white }}
                            />
                        ))}
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            {menuOpen && (
                <div
                    className="md:hidden px-6 pb-6 pt-2 space-y-4"
                    style={{ background: BRAND.white }}
                >
                    {[
                        { label: 'Weight Loss', id: 'hero' },
                        { label: 'How It Works', id: 'how-it-works' },
                        { label: 'Pricing', id: 'pricing' },
                        { label: 'FAQ', id: 'faq' },
                    ].map(({ label, id }) => (
                        <button
                            key={id}
                            onClick={() => scrollTo(id)}
                            className="block w-full text-left text-base font-semibold py-2 border-b border-gray-100"
                            style={{ color: BRAND.navy }}
                        >
                            {label}
                        </button>
                    ))}
                    <button
                        onClick={() => scrollTo('assessment')}
                        className="w-full py-3 rounded-full text-sm font-bold"
                        style={{ background: BRAND.gold, color: BRAND.white }}
                    >
                        Get Started
                    </button>
                </div>
            )}
        </nav>
    );
}

// ─── Assessment Modal ─────────────────────────────────────────
function AssessmentModal({ onClose }: { onClose: () => void }) {
    const [step, setStep] = useState(0);
    const [submitted, setSubmitted] = useState(false);
    const [data, setData] = useState<AssessmentData>({
        bmi: '',
        triedBefore: '',
        conditions: [],
        email: '',
    });

    const toggleCondition = (c: string) => {
        setData(prev => ({
            ...prev,
            conditions: prev.conditions.includes(c)
                ? prev.conditions.filter(x => x !== c)
                : [...prev.conditions, c],
        }));
    };

    const canProgress = [
        !!data.bmi,
        !!data.triedBefore,
        true, // conditions optional
        data.email.includes('@'),
    ][step];

    const handleSubmit = () => setSubmitted(true);

    return (
        <div
            className="fixed inset-0 z-[999] flex items-center justify-center p-4"
            style={{ background: 'rgba(10,22,40,0.85)', backdropFilter: 'blur(8px)' }}
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-lg rounded-3xl p-8 md:p-10 shadow-2xl"
                style={{ background: BRAND.white }}
                onClick={e => e.stopPropagation()}
            >
                {/* Close */}
                <button onClick={onClose} className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 transition-colors">
                    <X className="w-5 h-5 text-gray-400" />
                </button>

                {submitted ? (
                    /* Success state */
                    <div className="text-center py-6 space-y-5">
                        <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center" style={{ background: '#D1FAE5' }}>
                            <Check className="w-10 h-10 text-emerald-600" />
                        </div>
                        <h3 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: BRAND.navy }}>
                            You may qualify!
                        </h3>
                        <p className="text-base" style={{ color: BRAND.mutedText }}>
                            A licensed provider will review your profile within <strong>24 hours</strong>. Check your inbox for next steps.
                        </p>
                        <button
                            onClick={onClose}
                            className="px-8 py-3 rounded-full font-bold text-sm"
                            style={{ background: BRAND.gold, color: BRAND.white }}
                        >
                            Done
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Progress bar */}
                        <div className="flex gap-1.5 mb-8">
                            {[0, 1, 2, 3].map(i => (
                                <div
                                    key={i}
                                    className="h-1 flex-1 rounded-full transition-all duration-500"
                                    style={{ background: i <= step ? BRAND.gold : '#E5E7EB' }}
                                />
                            ))}
                        </div>

                        <h3 className="text-xl font-bold mb-6" style={{ fontFamily: "'Playfair Display', serif", color: BRAND.navy }}>
                            {['What is your current BMI range?', 'Have you tried weight loss before?', 'Any relevant health conditions?', "What's your email address?"][step]}
                        </h3>

                        {/* Step 0 — BMI */}
                        {step === 0 && (
                            <div className="space-y-3">
                                {['Under 25', '25–29.9 (Overweight)', '30–34.9 (Obese I)', '35+ (Obese II–III)'].map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => setData(p => ({ ...p, bmi: opt }))}
                                        className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-all text-left font-medium text-sm"
                                        style={{
                                            borderColor: data.bmi === opt ? BRAND.gold : '#E5E7EB',
                                            background: data.bmi === opt ? '#FEF9EE' : BRAND.white,
                                            color: BRAND.navy,
                                        }}
                                    >
                                        <span
                                            className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                                            style={{ borderColor: data.bmi === opt ? BRAND.gold : '#D1D5DB' }}
                                        >
                                            {data.bmi === opt && <span className="w-2.5 h-2.5 rounded-full" style={{ background: BRAND.gold }} />}
                                        </span>
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Step 1 — Tried before */}
                        {step === 1 && (
                            <div className="space-y-3">
                                {['Yes, multiple times', 'Yes, once or twice', 'No, this would be my first'].map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => setData(p => ({ ...p, triedBefore: opt }))}
                                        className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-all text-left font-medium text-sm"
                                        style={{
                                            borderColor: data.triedBefore === opt ? BRAND.gold : '#E5E7EB',
                                            background: data.triedBefore === opt ? '#FEF9EE' : BRAND.white,
                                            color: BRAND.navy,
                                        }}
                                    >
                                        <span
                                            className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                                            style={{ borderColor: data.triedBefore === opt ? BRAND.gold : '#D1D5DB' }}
                                        >
                                            {data.triedBefore === opt && <span className="w-2.5 h-2.5 rounded-full" style={{ background: BRAND.gold }} />}
                                        </span>
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Step 2 — Conditions */}
                        {step === 2 && (
                            <div className="space-y-3">
                                {['Type 2 Diabetes', 'High Blood Pressure', 'High Cholesterol', 'Sleep Apnea', 'None of the above'].map(c => (
                                    <button
                                        key={c}
                                        onClick={() => toggleCondition(c)}
                                        className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-all text-left font-medium text-sm"
                                        style={{
                                            borderColor: data.conditions.includes(c) ? BRAND.gold : '#E5E7EB',
                                            background: data.conditions.includes(c) ? '#FEF9EE' : BRAND.white,
                                            color: BRAND.navy,
                                        }}
                                    >
                                        <span
                                            className="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0"
                                            style={{ borderColor: data.conditions.includes(c) ? BRAND.gold : '#D1D5DB', background: data.conditions.includes(c) ? BRAND.gold : 'transparent' }}
                                        >
                                            {data.conditions.includes(c) && <Check className="w-3 h-3 text-white" />}
                                        </span>
                                        {c}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Step 3 — Email */}
                        {step === 3 && (
                            <div className="space-y-4">
                                <input
                                    type="email"
                                    placeholder="your@email.com"
                                    value={data.email}
                                    onChange={e => setData(p => ({ ...p, email: e.target.value }))}
                                    className="w-full px-5 py-4 rounded-2xl border-2 text-base font-medium outline-none transition-colors"
                                    style={{
                                        borderColor: data.email.includes('@') ? BRAND.gold : '#E5E7EB',
                                        color: BRAND.navy,
                                    }}
                                    autoFocus
                                />
                                <p className="text-xs flex items-center gap-2" style={{ color: BRAND.mutedText }}>
                                    <Lock className="w-3.5 h-3.5 shrink-0" />
                                    HIPAA-secure. We never sell your data. No spam, ever.
                                </p>
                            </div>
                        )}

                        {/* Navigation */}
                        <div className="mt-8 flex gap-3">
                            {step > 0 && (
                                <button
                                    onClick={() => setStep(s => s - 1)}
                                    className="px-6 py-3 rounded-full border-2 font-semibold text-sm transition-all"
                                    style={{ borderColor: '#E5E7EB', color: BRAND.mutedText }}
                                >
                                    Back
                                </button>
                            )}
                            <button
                                onClick={() => step < 3 ? setStep(s => s + 1) : handleSubmit()}
                                disabled={!canProgress}
                                className="flex-1 py-3 rounded-full font-bold text-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{ background: BRAND.gold, color: BRAND.white }}
                            >
                                {step < 3 ? 'Continue →' : 'Submit & Get My Results'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// ─── Section wrapper with fade-in ────────────────────────────
function FadeSection({ children, className = '', delay = 0, id }: {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    id?: string;
}) {
    const { ref, inView } = useInView();
    return (
        <div
            id={id}
            ref={ref}
            className={className}
            style={{
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(32px)',
                transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
            }}
        >
            {children}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────
export default function WeightLossPage() {
    const [showModal, setShowModal] = useState(false);
    const heroRef = useRef<HTMLDivElement>(null);
    const [heroVisible, setHeroVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setHeroVisible(true), 200);
        return () => clearTimeout(timer);
    }, []);

    // Count-up stats
    const lbs = useCountUp(22, 1600, heroVisible);
    const pct = useCountUp(94, 1800, heroVisible);

    const scrollTo = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <div style={{ fontFamily: "'DM Sans', sans-serif", background: BRAND.white }}>
            <Navbar />

            {/* ── 1. HERO ────────────────────────────────── */}
            <section
                id="hero"
                ref={heroRef}
                className="relative min-h-screen flex items-center overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${BRAND.navy} 0%, #152138 60%, #1a2d4d 100%)` }}
            >
                {/* Background texture */}
                <div
                    className="absolute inset-0 opacity-5"
                    style={{
                        backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
                        backgroundSize: '48px 48px',
                    }}
                />
                <div className="absolute top-0 right-0 w-1/2 h-full opacity-10"
                    style={{ background: `radial-gradient(ellipse at 80% 30%, ${BRAND.gold} 0%, transparent 70%)` }} />

                <div className="relative z-10 max-w-7xl mx-auto px-6 py-32 grid md:grid-cols-2 gap-16 items-center w-full">
                    {/* Left — Copy */}
                    <div
                        className="space-y-7"
                        style={{
                            opacity: heroVisible ? 1 : 0,
                            transform: heroVisible ? 'translateX(0)' : 'translateX(-40px)',
                            transition: 'opacity 0.9s ease, transform 0.9s ease',
                        }}
                    >
                        {/* Eyebrow */}
                        <div className="flex flex-wrap items-center gap-3">
                            <span
                                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-[0.2em]"
                                style={{ background: 'rgba(201,151,58,0.15)', color: BRAND.gold, border: `1px solid rgba(201,151,58,0.3)` }}
                            >
                                <Shield className="w-3.5 h-3.5" /> FDA-Approved GLP-1 Program
                            </span>
                            <span
                                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-[0.1em]"
                                style={{ background: 'rgba(16, 185, 129, 0.08)', color: '#00d9a3', border: `1px solid rgba(16, 185, 129, 0.3)` }}
                            >
                                📍 Services currently available in Florida only
                            </span>
                        </div>

                        {/* H1 */}
                        <h1
                            className="text-5xl md:text-6xl lg:text-7xl leading-[1.05] font-bold"
                            style={{ fontFamily: "'Playfair Display', serif", color: BRAND.white }}
                        >
                            Lose weight.<br />
                            <span style={{ color: BRAND.gold }}>Keep it off.</span><br />
                            Finally.
                        </h1>

                        {/* Subheadline */}
                        <p className="text-lg md:text-xl leading-relaxed max-w-lg" style={{ color: 'rgba(255,255,255,0.75)' }}>
                            Personalized GLP-1 prescriptions, licensed providers, and ongoing support — all from home.
                        </p>

                        {/* CTAs */}
                        <div className="flex flex-wrap gap-4">
                            <button
                                onClick={() => scrollTo('assessment')}
                                className="px-8 py-4 rounded-full font-bold text-base transition-all hover:scale-105 active:scale-95"
                                style={{
                                    background: BRAND.gold,
                                    color: BRAND.white,
                                    boxShadow: `0 0 0 0 rgba(201,151,58,0.4)`,
                                    animation: 'pulse-gold 2.5s ease-in-out infinite',
                                }}
                            >
                                See If I Qualify →
                            </button>
                            <button
                                onClick={() => scrollTo('how-it-works')}
                                className="px-8 py-4 rounded-full font-bold text-base transition-all hover:bg-white/10"
                                style={{ border: `2px solid rgba(255,255,255,0.5)`, color: BRAND.white }}
                            >
                                How It Works
                            </button>
                        </div>

                        {/* Social proof strip */}
                        <div className="flex items-center gap-2 pt-2">
                            <div className="flex">
                                {[0,1,2,3,4].map(i => (
                                    <Star key={i} className="w-4 h-4 fill-current" style={{ color: BRAND.gold }} />
                                ))}
                            </div>
                            <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.65)' }}>
                                Trusted by <strong className="text-white">10,000+ patients</strong> | Licensed in Florida &amp; beyond
                            </span>
                        </div>
                    </div>

                    {/* Right — Stats Card */}
                    <div
                        className="flex flex-col gap-5"
                        style={{
                            opacity: heroVisible ? 1 : 0,
                            transform: heroVisible ? 'translateX(0)' : 'translateX(40px)',
                            transition: 'opacity 0.9s ease 0.3s, transform 0.9s ease 0.3s',
                        }}
                    >
                        <div
                            className="rounded-3xl p-8 space-y-7"
                            style={{
                                background: 'rgba(255,255,255,0.04)',
                                border: `1.5px solid rgba(201,151,58,0.4)`,
                                backdropFilter: 'blur(12px)',
                            }}
                        >
                            {/* Stat 1 */}
                            <div className="flex items-start gap-5">
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                                    style={{ background: 'rgba(201,151,58,0.15)' }}>
                                    <span className="text-2xl font-black" style={{ color: BRAND.gold }}>↓</span>
                                </div>
                                <div>
                                    <div className="text-4xl font-black" style={{ color: BRAND.white }}>
                                        {lbs} <span className="text-xl font-bold" style={{ color: BRAND.gold }}>lbs</span>
                                    </div>
                                    <div className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
                                        average lost in 12 weeks
                                    </div>
                                </div>
                            </div>

                            <div className="h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />

                            {/* Stat 2 */}
                            <div className="flex items-start gap-5">
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                                    style={{ background: 'rgba(201,151,58,0.15)' }}>
                                    <span className="text-lg font-black" style={{ color: BRAND.gold }}>★</span>
                                </div>
                                <div>
                                    <div className="text-4xl font-black" style={{ color: BRAND.white }}>
                                        {pct}<span className="text-xl font-bold" style={{ color: BRAND.gold }}>%</span>
                                    </div>
                                    <div className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
                                        of patients report improved energy
                                    </div>
                                </div>
                            </div>

                            <div className="h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />

                            {/* Stat 3 */}
                            <div
                                className="rounded-2xl px-6 py-4 text-center"
                                style={{ background: `linear-gradient(135deg, rgba(201,151,58,0.25) 0%, rgba(201,151,58,0.1) 100%)` }}
                            >
                                <div className="text-2xl font-black" style={{ color: BRAND.gold }}>Starting from $149/mo</div>
                                <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                    All-inclusive: medication + provider + support
                                </div>
                            </div>
                        </div>
                        <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                            Results may vary. Prescription required. Not all patients will qualify.
                        </p>
                    </div>
                </div>

                {/* Scroll indicator */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40">
                    <div className="w-6 h-10 border-2 border-white/40 rounded-full flex items-start justify-center pt-2">
                        <div className="w-1.5 h-2.5 bg-white rounded-full animate-bounce" />
                    </div>
                </div>
            </section>

            {/* ── 2. TRUST BAR ──────────────────────────── */}
            <div style={{ background: BRAND.cream, borderTop: `1px solid rgba(201,151,58,0.15)`, borderBottom: `1px solid rgba(201,151,58,0.15)` }}>
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
                        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: BRAND.mutedText }}>As Seen In</span>
                        {['Forbes', 'Healthline', 'WebMD', 'STAT News'].map(m => (
                            <span key={m} className="text-sm font-black tracking-tight" style={{ color: `${BRAND.navy}80` }}>{m}</span>
                        ))}
                        <div className="w-px h-5 bg-gray-300 hidden md:block" />
                        {['HIPAA Compliant', 'Board-Certified Providers', 'Licensed Pharmacy Partners'].map(t => (
                            <span key={t} className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: BRAND.navy }}>
                                <Check className="w-3.5 h-3.5" style={{ color: BRAND.gold }} /> {t}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── 3. HOW IT WORKS ──────────────────────── */}
            <section id="how-it-works" className="py-24 md:py-32" style={{ background: BRAND.white }}>
                <div className="max-w-7xl mx-auto px-6">
                    <FadeSection className="text-center mb-16">
                        <h2
                            className="text-4xl md:text-5xl font-bold mb-4"
                            style={{ fontFamily: "'Playfair Display', serif", color: BRAND.navy }}
                        >
                            Three steps to your healthiest weight
                        </h2>
                        <p className="text-lg max-w-xl mx-auto" style={{ color: BRAND.mutedText }}>
                            Designed to fit your life. No in-person visits required.
                        </p>
                    </FadeSection>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: <ClipboardList className="w-7 h-7" />,
                                num: '01',
                                title: 'Complete Your Assessment',
                                desc: 'Answer questions about your health history and goals. Takes under 5 minutes. No blood draw required.',
                            },
                            {
                                icon: <Stethoscope className="w-7 h-7" />,
                                num: '02',
                                title: 'Meet Your Provider',
                                desc: 'A licensed clinician reviews your profile and creates your personalized GLP-1 treatment plan.',
                            },
                            {
                                icon: <Package className="w-7 h-7" />,
                                num: '03',
                                title: 'Start Your Treatment',
                                desc: 'Your GLP-1 medication ships discreetly to your door. Ongoing monthly check-ins included.',
                            },
                        ].map((step, i) => (
                            <FadeSection key={i} delay={i * 120}>
                                <div
                                    className="relative rounded-3xl p-8 h-full group hover:-translate-y-1 transition-transform duration-300"
                                    style={{ background: BRAND.cream, border: `1px solid rgba(201,151,58,0.12)` }}
                                >
                                    {/* Number badge */}
                                    <div
                                        className="absolute -top-4 left-8 w-9 h-9 rounded-full flex items-center justify-center text-xs font-black text-white"
                                        style={{ background: BRAND.navy }}
                                    >
                                        {step.num}
                                    </div>
                                    <div
                                        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 mt-4"
                                        style={{ background: `rgba(201,151,58,0.12)`, color: BRAND.gold }}
                                    >
                                        {step.icon}
                                    </div>
                                    <h3 className="text-xl font-bold mb-3" style={{ color: BRAND.navy, fontFamily: "'Playfair Display', serif" }}>
                                        {step.title}
                                    </h3>
                                    <p className="leading-relaxed" style={{ color: BRAND.mutedText }}>{step.desc}</p>
                                </div>
                            </FadeSection>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── 4. MEDICATIONS ───────────────────────── */}
            <section className="py-24 md:py-32" style={{ background: `${BRAND.navy}08` }}>
                <div className="max-w-7xl mx-auto px-6">
                    <FadeSection className="text-center mb-16">
                        <h2
                            className="text-4xl md:text-5xl font-bold mb-4"
                            style={{ fontFamily: "'Playfair Display', serif", color: BRAND.navy }}
                        >
                            GLP-1 Weight Management Medications We Offer
                        </h2>
                        <p className="text-lg max-w-2xl mx-auto" style={{ color: BRAND.mutedText }}>
                            Our providers prescribe based on your health profile, not a one-size-fits-all formula.<br/>
                            <i className="text-sm">*Compounded medications are not evaluated by the FDA for safety, effectiveness, or quality.</i>
                        </p>
                    </FadeSection>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            {
                                name: 'Compounded Semaglutide',
                                sub: 'Compounded',
                                badge: 'Most Popular',
                                price: 'From $149/mo',
                                desc: 'Weekly injection. May help reduce appetite, blood sugar, and body weight when combined with diet and exercise.',
                                hot: true,
                            },
                            {
                                name: 'Compounded Tirzepatide',
                                sub: 'Compounded',
                                badge: 'Highest Efficacy',
                                price: 'From $249/mo',
                                desc: 'Dual-action GIP + GLP-1. Clinically superior weight loss results in head-to-head trials.',
                                hot: false,
                            },
                            {
                                name: 'Wegovy®',
                                sub: 'Brand Name',
                                badge: 'Brand Name',
                                price: 'Insurance may apply',
                                desc: 'FDA-approved semaglutide pen. Covered by select commercial and employer health plans.',
                                hot: false,
                            },
                            {
                                name: 'Zepbound®',
                                sub: 'Brand Name',
                                badge: 'Brand Name',
                                price: 'Insurance may apply',
                                desc: 'FDA-approved tirzepatide. Indicated for BMI ≥30 or ≥27 with weight-related comorbidity.',
                                hot: false,
                            },
                        ].map((med, i) => (
                            <FadeSection key={i} delay={i * 100}>
                                <div
                                    className="rounded-3xl overflow-hidden h-full flex flex-col group hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                                    style={{ background: BRAND.white, border: `1px solid rgba(10,22,40,0.08)` }}
                                >
                                    {/* Header */}
                                    <div className="px-6 py-5" style={{ background: BRAND.navy }}>
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="text-lg font-black text-white">{med.name}</div>
                                                <div className="text-xs font-medium mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{med.sub}</div>
                                            </div>
                                            <span
                                                className="shrink-0 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full"
                                                style={{ background: BRAND.gold, color: BRAND.white }}
                                            >
                                                {med.badge}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-6 flex-1 flex flex-col gap-4">
                                        <div className="text-xl font-black" style={{ color: BRAND.gold }}>{med.price}</div>
                                        <p className="text-sm leading-relaxed flex-1" style={{ color: BRAND.mutedText }}>{med.desc}</p>
                                        <button
                                            onClick={() => setShowModal(true)}
                                            className="flex items-center gap-1 text-sm font-bold transition-all hover:gap-2"
                                            style={{ color: BRAND.gold }}
                                        >
                                            Learn More <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </FadeSection>
                        ))}
                    </div>
                    
                    <FadeSection className="mt-8">
                        <div className="p-4 rounded-xl text-sm text-center" style={{ background: `${BRAND.navy}08`, color: BRAND.mutedText, border: `1px solid ${BRAND.navy}20` }}>
                            <strong>Pharmacy Disclosure:</strong> Compounded medications are prepared by a licensed 503A compounding pharmacy at the direction of a clinical provider. We proudly partner with <strong>Strive Pharmacy</strong> as the dispensing compounding pharmacy, which is PCAB-accredited, NABP-accredited, and LegitScript-certified. For pharmacy support or medication tracking, patients may contact Strive Pharmacy directly at <b>(480) 626-4366</b> or their centralized support line.
                        </div>
                    </FadeSection>
                    
                    <FadeSection className="mt-4">
                        <div className="p-4 rounded-xl text-sm text-center" style={{ background: '#fff1f2', color: '#be123c', border: `1px solid #fda4af` }}>
                            <strong>⚠️ Controlled Substances Disclaimer:</strong> No DEA-Scheduled Controlled Substances (such as Adderall, Xanax, or Phentermine) will be prescribed under any circumstances on this platform. All prescribing is subject to the strict clinical evaluation of our licensed providers.
                        </div>
                    </FadeSection>
                </div>
            </section>

            {/* ── 5. TESTIMONIALS ──────────────────────── */}
            <section className="py-24 md:py-32" style={{ background: BRAND.white }}>
                <div className="max-w-7xl mx-auto px-6">
                    <FadeSection className="text-center mb-16">
                        <h2
                            className="text-4xl md:text-5xl font-bold mb-4"
                            style={{ fontFamily: "'Playfair Display', serif", color: BRAND.navy }}
                        >
                            Real patients. Real results.
                        </h2>
                        <p className="text-lg" style={{ color: BRAND.mutedText }}>
                            Verified patient stories from across Florida and beyond.
                        </p>
                    </FadeSection>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                name: 'Marcus T.',
                                loc: 'Tampa, FL',
                                quote: 'I lost 31 lbs in 4 months. My blood pressure normalized. I feel like myself again for the first time in a decade.',
                                result: 'Lost 31 lbs',
                                time: '4 months',
                            },
                            {
                                name: 'Diane R.',
                                loc: 'Orlando, FL',
                                quote: 'After trying every diet and program, GLP-1 finally worked. The providers actually listened and personalized my plan.',
                                result: 'Lost 18 lbs',
                                time: '3 months',
                            },
                            {
                                name: 'Kevin S.',
                                loc: 'Miami, FL',
                                quote: 'Easy process, fast discreet shipping, and my provider checks in monthly. Worth every penny. I feel 10 years younger.',
                                result: 'Lost 24 lbs',
                                time: '10 weeks',
                            },
                        ].map((t, i) => (
                            <FadeSection key={i} delay={i * 120}>
                                <div
                                    className="rounded-3xl p-8 h-full flex flex-col gap-5 group hover:-translate-y-1 transition-transform duration-300"
                                    style={{ background: BRAND.cream, border: `1px solid rgba(201,151,58,0.15)` }}
                                >
                                    {/* Stars */}
                                    <div className="flex gap-1">
                                        {[0,1,2,3,4].map(j => (
                                            <Star key={j} className="w-4 h-4 fill-current" style={{ color: BRAND.gold }} />
                                        ))}
                                    </div>

                                    {/* Big quote mark */}
                                    <div
                                        className="text-7xl font-serif leading-none -mt-2 -mb-4 select-none"
                                        style={{ color: `${BRAND.gold}30`, fontFamily: "'Playfair Display', serif" }}
                                    >
                                        "
                                    </div>

                                    <p className="text-base leading-relaxed flex-1 italic" style={{ color: `${BRAND.navy}CC` }}>
                                        {t.quote}
                                    </p>

                                    <div className="flex items-end justify-between pt-2 border-t" style={{ borderColor: 'rgba(201,151,58,0.15)' }}>
                                        <div>
                                            <div className="font-black text-sm" style={{ color: BRAND.navy }}>{t.name}</div>
                                            <div className="text-xs mt-0.5" style={{ color: BRAND.mutedText }}>{t.loc}</div>
                                        </div>
                                        <div
                                            className="text-xs font-black px-3 py-1.5 rounded-full"
                                            style={{ background: BRAND.gold, color: BRAND.white }}
                                        >
                                            {t.result} · {t.time}
                                        </div>
                                    </div>
                                </div>
                            </FadeSection>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── 6. PRICING ───────────────────────────── */}
            <section id="pricing" className="py-24 md:py-32" style={{ background: `${BRAND.navy}06` }}>
                <div className="max-w-5xl mx-auto px-6">
                    <FadeSection className="text-center mb-16">
                        <h2
                            className="text-4xl md:text-5xl font-bold mb-4"
                            style={{ fontFamily: "'Playfair Display', serif", color: BRAND.navy }}
                        >
                            Straightforward pricing. No surprises.
                        </h2>
                        <p className="text-lg" style={{ color: BRAND.mutedText }}>
                            All-inclusive: medication, provider visits, messaging, and free shipping.
                        </p>
                    </FadeSection>

                    <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
                        {/* Essential */}
                        <FadeSection>
                            <div
                                className="rounded-3xl p-8 h-full flex flex-col gap-6"
                                style={{ background: BRAND.white, border: `1.5px solid rgba(10,22,40,0.12)` }}
                            >
                                <div>
                                    <div className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: BRAND.mutedText }}>Essential Plan</div>
                                    <div className="text-5xl font-black" style={{ color: BRAND.navy }}>$149<span className="text-lg font-bold text-gray-400">/mo</span></div>
                                </div>
                                <div className="space-y-3 flex-1">
                                    {[
                                        'Semaglutide (generic)',
                                        'Monthly provider check-in',
                                        'Unlimited secure messaging',
                                        'Free discreet shipping',
                                        'Progress tracking dashboard',
                                    ].map(f => (
                                        <div key={f} className="flex items-center gap-3 text-sm font-medium" style={{ color: BRAND.navy }}>
                                            <Check className="w-4 h-4 shrink-0" style={{ color: BRAND.gold }} />
                                            {f}
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setShowModal(true)}
                                    className="w-full py-4 rounded-2xl font-bold text-sm transition-all hover:scale-105 active:scale-95"
                                    style={{ background: BRAND.navy, color: BRAND.white }}
                                >
                                    Get Started
                                </button>
                            </div>
                        </FadeSection>

                        {/* Premium */}
                        <FadeSection delay={120}>
                            <div
                                className="rounded-3xl p-8 h-full flex flex-col gap-6 relative"
                                style={{ background: BRAND.navy, border: `2px solid ${BRAND.gold}` }}
                            >
                                {/* Badge */}
                                <div
                                    className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider"
                                    style={{ background: BRAND.gold, color: BRAND.white }}
                                >
                                    Most Comprehensive
                                </div>

                                <div>
                                    <div className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: `${BRAND.gold}99` }}>Premium Plan</div>
                                    <div className="text-5xl font-black text-white">$299<span className="text-lg font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>/mo</span></div>
                                </div>
                                <div className="space-y-3 flex-1">
                                    {[
                                        'Tirzepatide (generic)',
                                        'Bi-weekly provider video visits',
                                        'Priority messaging (same-day)',
                                        'Lab work coordination',
                                        'Nutritional coaching add-on',
                                        'Free discreet shipping',
                                        'Progress tracking dashboard',
                                    ].map(f => (
                                        <div key={f} className="flex items-center gap-3 text-sm font-medium text-white">
                                            <Check className="w-4 h-4 shrink-0" style={{ color: BRAND.gold }} />
                                            {f}
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setShowModal(true)}
                                    className="w-full py-4 rounded-2xl font-bold text-sm transition-all hover:scale-105 active:scale-95"
                                    style={{ background: BRAND.gold, color: BRAND.white }}
                                >
                                    Get Started
                                </button>
                            </div>
                        </FadeSection>
                    </div>

                    <FadeSection>
                        <p className="text-center text-xs mt-8 max-w-2xl mx-auto leading-relaxed" style={{ color: BRAND.mutedText }}>
                            Prices shown are for medication + provider services. Brand-name medications (Wegovy®, Zepbound®) may be covered by insurance.{' '}
                            <button className="underline hover:opacity-80" style={{ color: BRAND.gold }}>We'll help you check.</button>
                        </p>
                    </FadeSection>
                </div>
            </section>

            {/* ── 7. FAQ ───────────────────────────────── */}
            <section id="faq" className="py-24 md:py-32" style={{ background: BRAND.white }}>
                <div className="max-w-3xl mx-auto px-6">
                    <FadeSection className="text-center mb-14">
                        <h2
                            className="text-4xl md:text-5xl font-bold mb-4"
                            style={{ fontFamily: "'Playfair Display', serif", color: BRAND.navy }}
                        >
                            Common questions
                        </h2>
                    </FadeSection>

                    <div className="space-y-4">
                        {[
                            {
                                q: 'Do I need to visit a clinic in person?',
                                a: 'No. Everything happens online — your assessment, provider consultation, prescription, and ongoing check-ins. Your medication ships directly to you.',
                            },
                            {
                                q: 'How quickly will I see results?',
                                a: 'Most patients notice appetite changes within the first 1–4 weeks. Significant weight loss (10–15% body weight) typically occurs over 3–6 months of consistent treatment.',
                            },
                            {
                                q: 'Are GLP-1 medications safe?',
                                a: 'The active ingredients, semaglutide and tirzepatide, have been extensively studied in their FDA-approved, brand-name formulations. While compounded medications themselves are not FDA-approved, they are prepared in state-licensed pharmacies using strictly sourced, high-quality ingredients. Your provider will review your full health history to confirm safety and appropriateness.',
                            },
                            {
                                q: 'Will my insurance cover this?',
                                a: 'Generic GLP-1 medications are typically not covered by insurance. Brand-name Wegovy® and Zepbound® may be covered by select commercial plans. We can help you check your benefits.',
                            },
                            {
                                q: 'What if I want to stop treatment?',
                                a: 'You can cancel anytime — no contracts or cancellation fees. Your provider will advise on how to taper your medication safely.',
                            },
                        ].map((item, i) => (
                            <FaqItem key={i} q={item.q} a={item.a} delay={i * 60} />
                        ))}
                    </div>
                </div>
            </section>

            {/* ── 8. ASSESSMENT CTA ────────────────────── */}
            <section
                id="assessment"
                className="py-24 md:py-32 relative overflow-hidden"
                style={{ background: BRAND.navy }}
            >
                <div
                    className="absolute inset-0 opacity-5"
                    style={{
                        backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
                        backgroundSize: '48px 48px',
                    }}
                />
                <div
                    className="absolute top-0 left-0 w-full h-full opacity-10"
                    style={{ background: `radial-gradient(ellipse at 20% 50%, ${BRAND.gold} 0%, transparent 60%)` }}
                />
                <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
                    <FadeSection className="space-y-8">
                        <div>
                            <h2
                                className="text-4xl md:text-6xl font-bold mb-5"
                                style={{ fontFamily: "'Playfair Display', serif", color: BRAND.white }}
                            >
                                Find out if GLP-1 is right for you.
                            </h2>
                            <p className="text-lg md:text-xl" style={{ color: 'rgba(255,255,255,0.65)' }}>
                                Takes 3 minutes. No commitment required. A licensed provider reviews every submission.
                            </p>
                        </div>

                        <button
                            onClick={() => setShowModal(true)}
                            className="inline-flex items-center gap-3 px-10 py-5 rounded-full text-lg font-black transition-all hover:scale-105 active:scale-95"
                            style={{
                                background: BRAND.gold,
                                color: BRAND.white,
                                boxShadow: `0 0 40px rgba(201,151,58,0.4)`,
                            }}
                        >
                            Start Free Assessment <ChevronRight className="w-6 h-6" />
                        </button>

                        <div className="flex flex-wrap items-center justify-center gap-6">
                            <span className="flex items-center gap-2 text-sm font-medium" style={{ color: 'rgba(255,255,255,0.55)' }}>
                                <Lock className="w-4 h-4" style={{ color: BRAND.gold }} /> HIPAA-secure
                            </span>
                            <span className="flex items-center gap-2 text-sm font-medium" style={{ color: 'rgba(255,255,255,0.55)' }}>
                                <Shield className="w-4 h-4" style={{ color: BRAND.gold }} /> No credit card required to start
                            </span>
                        </div>
                    </FadeSection>
                </div>
            </section>

            {/* ── 9. FOOTER ────────────────────────────── */}
            <footer
                className="py-16 px-6"
                style={{ background: '#060F1C', borderTop: `1px solid rgba(201,151,58,0.1)` }}
            >
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between gap-10 mb-12">
                        {/* Brand */}
                        <div className="space-y-4 max-w-sm">
                            <div className="flex items-center gap-3">
                                <PatrioticLogo size={30} />
                                <span className="font-bold text-base" style={{ color: BRAND.gold, fontFamily: "'DM Sans', sans-serif" }}>
                                    Patriotic Telehealth
                                </span>
                            </div>
                            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                Modern telehealth for modern Americans. Licensed providers, FDA-approved medications, delivered to your door.
                            </p>
                            <div className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                <Phone className="w-4 h-4" /> {BRAND.phone}
                            </div>
                            <div className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                <Mail className="w-4 h-4" /> {BRAND.email}
                            </div>
                        </div>

                        {/* Links */}
                        <div className="flex flex-wrap gap-x-16 gap-y-8">
                            <div className="space-y-3">
                                <div className="text-xs font-black uppercase tracking-widest" style={{ color: BRAND.gold }}>Programs</div>
                                {['Weight Loss', 'GLP-1 Overview', 'Semaglutide', 'Tirzepatide'].map(l => (
                                    <div key={l}>
                                        <a href="#" className="text-sm hover:opacity-80 transition-opacity" style={{ color: 'rgba(255,255,255,0.5)' }}>{l}</a>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-3">
                                <div className="text-xs font-black uppercase tracking-widest" style={{ color: BRAND.gold }}>Legal</div>
                                <div>
                                    <a href="/privacy-policy" className="text-sm hover:opacity-80 transition-opacity" style={{ color: 'rgba(255,255,255,0.5)' }}>Privacy Policy</a>
                                </div>
                                <div>
                                    <a href="/terms" className="text-sm hover:opacity-80 transition-opacity" style={{ color: 'rgba(255,255,255,0.5)' }}>Terms of Service</a>
                                </div>
                                <div>
                                    <a href="/npp" className="text-sm hover:opacity-80 transition-opacity" style={{ color: 'rgba(255,255,255,0.5)' }}>Notice of Privacy Practices</a>
                                </div>
                                <div>
                                    <a href="/telehealth-consent" className="text-sm hover:opacity-80 transition-opacity" style={{ color: 'rgba(255,255,255,0.5)' }}>Telehealth Consent</a>
                                </div>
                                <div>
                                    <a href="mailto:hello@patriotictelehealth.com" className="text-sm hover:opacity-80 transition-opacity" style={{ color: 'rgba(255,255,255,0.5)' }}>hello@patriotictelehealth.com</a>
                                </div>
                                <div className="text-sm" style={{ color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>
                                    📞 (202) 215-0636
                                </div>
                                <div className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                    📍 176 NW 25th St, Miami, FL 33127
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Disclaimer */}
                    <div
                        className="pt-8 space-y-4"
                        style={{ borderTop: `1px solid rgba(255,255,255,0.06)` }}
                    >
                        <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.25)' }}>
                            Patriotic Telehealth is not a pharmacy. Prescriptions are fulfilled by licensed pharmacy partners. GLP-1 medications require a valid prescription from a licensed provider. Results may vary. Not all patients will be determined eligible. This website is for informational purposes only and does not constitute medical advice.
                        </p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                            © 2025 Patriotic Telehealth. All rights reserved.
                        </p>
                    </div>
                </div>
            </footer>

            {/* Pulse keyframe */}
            <style>{`
                @keyframes pulse-gold {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(201,151,58,0.4); }
                    50% { box-shadow: 0 0 0 12px rgba(201,151,58,0); }
                }
            `}</style>

            {/* Assessment Modal */}
            {showModal && <AssessmentModal onClose={() => setShowModal(false)} />}
        </div>
    );
}

// ─── FAQ Item ─────────────────────────────────────────────────
function FaqItem({ q, a, delay = 0 }: { q: string; a: string; delay?: number }) {
    const [open, setOpen] = useState(false);
    const { ref, inView } = useInView();
    return (
        <div
            ref={ref}
            style={{
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(20px)',
                transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
            }}
        >
            <div
                className="rounded-2xl overflow-hidden"
                style={{ border: `1.5px solid ${open ? BRAND.gold + '40' : 'rgba(10,22,40,0.08)'}`, transition: 'border-color 0.3s' }}
            >
                <button
                    onClick={() => setOpen(v => !v)}
                    className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                    style={{ background: open ? '#FEF9EE' : BRAND.white }}
                >
                    <span className="font-bold text-base" style={{ color: BRAND.navy }}>{q}</span>
                    <span
                        className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300"
                        style={{ background: open ? BRAND.gold : 'rgba(10,22,40,0.06)', transform: open ? 'rotate(45deg)' : 'none' }}
                    >
                        <span className="text-lg font-black" style={{ color: open ? BRAND.white : BRAND.navy, lineHeight: 1 }}>+</span>
                    </span>
                </button>
                {open && (
                    <div className="px-6 pb-5" style={{ background: '#FEF9EE' }}>
                        <p className="text-sm leading-relaxed" style={{ color: BRAND.mutedText }}>{a}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
