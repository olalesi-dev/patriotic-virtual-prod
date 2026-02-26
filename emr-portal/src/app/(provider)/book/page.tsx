"use client";

import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Calendar, Clock, User, CreditCard, ChevronRight, CheckCircle2, ShieldCheck, Stethoscope, ChevronLeft } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_mock');

const SERVICES = [
    // ─── Clinical Visits ──────────────────────────────────────────────────────
    { id: 'general-visit', k: 'general_visit', name: 'General Visit', desc: 'Virtual visits for non-emergent health concerns — medication management, wellness checks, health advice. Convenient care from home.', icon: '🩺', price: 79, duration: 'Visit', tab: 'clinical' },
    { id: 'weight-loss', k: 'weight_loss', name: 'GLP-1 & Weight Loss', desc: 'Comprehensive medical weight loss evaluation. GLP-1 eligibility screening, personalized titration, dietary guidance. Medication cost separate.', icon: '💊', price: 129, duration: 'Consult', tab: 'clinical' },
    { id: 'testosterone-hrt', k: 'testosterone_hrt', name: 'Testosterone / HRT', desc: 'Comprehensive hormone evaluation for men & women — testosterone, estrogen, progesterone, DHEA, thyroid support & peptides.', icon: '🧬', price: 149, duration: 'Consult', tab: 'clinical' },

    // ─── Men's Health ──────────────────────────────────────────────────────────
    { id: 'erectile-dysfunction', k: 'erectile_dysfunction', name: 'Erectile Dysfunction', desc: 'Sildenafil, tadalafil & custom compounds — discreetly delivered after cardiovascular safety screening.', icon: '⚡', price: 79, duration: 'Consult', tab: 'mens' },
    { id: 'premature-ejaculation', k: 'premature_ejaculation', name: 'Premature Ejaculation', desc: 'Sertraline (SSRI therapy), topical numbing agents & behavioral techniques. Evidence-based, shipped discreetly.', icon: '⏱️', price: 79, duration: 'Consult', tab: 'mens' },
    { id: 'testosterone-hrt-m', k: 'testosterone_hrt', name: 'Testosterone / HRT (Men)', desc: 'Testosterone optimization for men — evaluation, labs, titration & peptide support.', icon: '🧬', price: 149, duration: 'Consult', tab: 'mens' },

    // ─── Imaging ───────────────────────────────────────────────────────────────
    { id: 'imaging-video', k: 'imaging_video', name: 'Imaging + Video Consult', desc: 'Full imaging review plus a 30 - 60 minute secure video consultation to discuss findings directly with a specialist.', icon: '📹', price: 449, duration: '60 mins', tab: 'imaging' },
    { id: 'standard-imaging', k: 'standard_imaging', name: 'Standard Imaging Review', desc: 'Complete second-opinion over-read of your X-Ray, Ultrasound, CT, or MRI images by a board-certified radiologist.', icon: '🖥️', price: 249, duration: 'Review', tab: 'imaging' },
    { id: 'report-interpretation', k: 'report_interpretation', name: 'Report Interpretation', desc: 'Expert analysis of your existing radiology report. We translate complex medical jargon into plain English.', icon: '📄', price: 149, duration: 'Review', tab: 'imaging' },
    { id: 'diagnostic-single', k: 'diagnostic_single', name: 'Single Study Read', desc: 'Official diagnostic report for a single study (CT, XR, US). <24-48h turnaround.', icon: '🖼️', price: 75, duration: 'Read', tab: 'imaging' },
    { id: 'diagnostic-second', k: 'diagnostic_second', name: 'Diagnostic Second Opinion', desc: 'Full diagnostic review + written opinion + patient summary for CT, XR, or US.', icon: '📊', price: 250, duration: 'Consult', tab: 'imaging' },
    { id: 'diagnostic-facility', k: 'diagnostic_facility', name: 'Facility Contracts', desc: 'Urgent Care & Outpatient contracts. Unlimited reads, SLA, dedicated upload link.', icon: '🏢', price: 3500, duration: '/mo+', tab: 'imaging' },

    // ─── AI & Digital ──────────────────────────────────────────────────────────
    { id: 'ai-imaging', k: 'ai_imaging', name: 'AI-Powered Imaging Analysis', desc: 'Physician-supervised AI interpretation of reports. Educational tools to help you understand findings.', icon: '🔬', price: 99, duration: 'Report', tab: 'ai' },
    { id: 'ai-assistant', k: 'ai_assistant', name: 'AI Health Assistant', desc: 'AI-powered health education, symptom guidance & care navigation. Not a substitute for professional medical advice.', icon: '🤖', price: 29, duration: 'Access', tab: 'ai' },
    { id: 'digital-platform', k: 'digital_platform', name: 'Digital Health Platform', desc: 'Monthly access to digital health tools, educational content & AI-powered navigation features. No clinical services.', icon: '📱', price: 19, duration: '/mo', tab: 'ai' },

    // ─── Memberships ───────────────────────────────────────────────────────────
    { id: 'membership-elite', k: 'membership_elite', name: 'All Access — Elite', desc: 'Everything: telehealth visits, specialty programs, AI health tools, AI imaging, and priority scheduling.', icon: '🏆', price: 199, duration: '/mo', tab: 'memberships' },
    { id: 'membership-plus', k: 'membership_plus', name: 'All Access — Plus', desc: 'Telehealth visits, AI health assistant, AI imaging tools, and priority scheduling in one subscription.', icon: '⭐', price: 149, duration: '/mo', tab: 'memberships' },
    { id: 'membership-core', k: 'membership_core', name: 'All Access — Core', desc: 'General telehealth, AI health assistant, AI imaging tools & scheduling. Great starter membership.', icon: '🎯', price: 99, duration: '/mo', tab: 'memberships' },
    { id: 'telehealth-premium', k: 'telehealth_premium', name: 'Telehealth Premium', desc: 'Unlimited/priority access to general telehealth for non-emergency concerns, clinician visits & digital support.', icon: '⚕️', price: 99, duration: '/mo', tab: 'memberships' },
    { id: 'telehealth-standard', k: 'telehealth_standard', name: 'Telehealth Standard', desc: '1 visit/month to general telehealth for non-emergency medical concerns, plus clinician visits & digital support.', icon: '📋', price: 59, duration: '/mo', tab: 'memberships' },
    { id: 'telehealth-basic', k: 'telehealth_basic', name: 'Telehealth Basic', desc: 'AI + limited visits for general telehealth. Digital support & care navigation for non-emergency concerns.', icon: '💡', price: 29, duration: '/mo', tab: 'memberships' },
];

// The three hand-picked popular cards
const POPULAR_IDS = new Set(['imaging-video', 'membership-elite', 'weight-loss']);



const INTAKE_QUESTIONS: any = {
    general_visit: [{ k: 'chiefComplaint', l: 'What brings you in today?', t: 'i', p: 'Describe your concerns' }, { k: 'symptomDuration', l: 'How long have you had these concerns?', t: 'i', p: 'e.g. 3 days, 2 weeks' }, { k: 'currentMedications', l: 'Current medications?', t: 'i', p: 'List all medications' }, { k: 'allergies', l: 'Drug allergies?', t: 'i', p: 'List allergies or "None"' }],
    weight_loss: [{ k: 'currentWeight', l: 'Current weight (lbs)?', t: 'i', p: 'e.g. 210' }, { k: 'height', l: 'Height (inches)?', t: 'i', p: 'e.g. 68' }, { k: 'previousWeightLoss', l: 'Prior weight loss attempts?', t: 'i', p: 'Describe past efforts' }, { k: 'hasMedullaryThyroidCancer', l: 'History of medullary thyroid carcinoma?', t: 'yn' }, { k: 'hasMEN2', l: 'History of MEN2 syndrome?', t: 'yn' }, { k: 'hasPancreatitis', l: 'History of pancreatitis?', t: 'yn' }, { k: 'isPregnant', l: 'Pregnant or planning pregnancy?', t: 'yn' }],
    erectile_dysfunction: [{ k: 'symptomDuration', l: 'How long have you experienced ED?', t: 'i', p: 'e.g. 6 months' }, { k: 'takesNitrates', l: 'Take nitrate medications (nitroglycerin, isosorbide)?', t: 'yn' }, { k: 'recentStroke', l: 'Stroke in past 6 months?', t: 'yn' }, { k: 'recentMI', l: 'Heart attack in past 6 months?', t: 'yn' }, { k: 'hasCardiovascularDisease', l: 'Cardiovascular disease?', t: 'yn' }, { k: 'currentMedications', l: 'Current medications?', t: 'i', p: 'List all medications' }],
    premature_ejaculation: [{ k: 'symptomDuration', l: 'How long have you experienced PE?', t: 'i', p: 'e.g. 1 year' }, { k: 'hasSeizureDisorder', l: 'Seizure disorder?', t: 'yn' }, { k: 'onMAOIs', l: 'Take MAOI medications?', t: 'yn' }, { k: 'hasBipolar', l: 'Bipolar disorder?', t: 'yn' }, { k: 'currentMedications', l: 'Current medications?', t: 'i', p: 'List all medications' }],
    testosterone_hrt: [{ k: 'symptoms', l: 'What symptoms are you experiencing?', t: 'i', p: 'Fatigue, low libido, weight gain, hot flashes, brain fog...' }, { k: 'gender', l: 'Biological sex?', t: 'i', p: 'Male or Female' }, { k: 'hasRecentLabs', l: 'Had hormone labs in the last 6 months?', t: 'yn' }, { k: 'hasProstateCancer', l: 'History of prostate cancer? (Men)', t: 'yn' }, { k: 'hasBreastCancer', l: 'History of breast cancer?', t: 'yn' }, { k: 'hasBloodClottingDisorder', l: 'Blood clotting disorder or history of DVT/PE?', t: 'yn' }, { k: 'hasLiverDisease', l: 'Liver disease?', t: 'yn' }, { k: 'isPregnant', l: 'Pregnant or nursing? (Women)', t: 'yn' }, { k: 'currentMedications', l: 'Current medications?', t: 'i', p: 'List all medications' }],
    membership_elite: [{ k: 'primaryGoal', l: 'What is your primary health goal?', t: 'i', p: 'e.g. Weight loss, hormone balance, general wellness' }, { k: 'symptomDuration', l: 'Any specific symptoms currently?', t: 'i', p: 'Describe any issues' }, { k: 'medicalHistory', l: 'Any chronic medical conditions?', t: 'i', p: 'List conditions' }, { k: 'currentMedications', l: 'Current medications?', t: 'i', p: 'List all medications' }, { k: 'allergies', l: 'Drug allergies?', t: 'i', p: 'List allergies or "None"' }],
    imaging_video: [{ k: 'imagingType', l: 'What type of imaging (MRI, CT, X-Ray)?', t: 'i', p: 'e.g. MRI of Knee' }, { k: 'imagingDate', l: 'Date of exam?', t: 'i', p: 'Approximate date' }, { k: 'reasonForConsult', l: 'Primary reason for consultation?', t: 'i', p: 'What would you like the doctor to review?' }],
    digital_platform: [{ k: 'goals', l: 'Primary health goals?', t: 'i', p: 'Education, tracking, navigation details' }, { k: 'accessDevice', l: 'Do you have a smartphone or computer?', t: 'yn' }],
    ai_imaging: [{ k: 'examType', l: 'Type of imaging exam?', t: 'i', p: 'e.g. Brain MRI, Chest CT' }, { k: 'hasDigitalFiles', l: 'Do you have the digital image files (DICOM)?', t: 'yn' }],
    report_interpretation: [{ k: 'reportSummary', l: 'Briefly describe the report findings:', t: 'i', p: 'What did the report say?' }, { k: 'mainQuestion', l: 'What is your main question about the report?', t: 'i' }],
    standard_imaging: [{ k: 'bodyPart', l: 'Body part imaged?', t: 'i', p: 'e.g. Left Knee' }, { k: 'symptoms', l: 'Current symptoms?', t: 'i', p: 'Pain, swelling, etc.' }, { k: 'reasonForReview', l: 'Reason for second opinion?', t: 'i' }],
    diagnostic_single: [{ k: 'modality', l: 'Modality (XR, US, CT)?', t: 'i' }, { k: 'bodyPart', l: 'Body part?', t: 'i' }, { k: 'indication', l: 'Reason for exam (Clinical Indication)?', t: 'i' }],
    diagnostic_second: [{ k: 'originalFinding', l: 'Original diagnosis/finding?', t: 'i' }, { k: 'discrepancyConcern', l: 'Do you suspect a misdiagnosis?', t: 'yn' }, { k: 'specificQuestion', l: 'Specific question for radiologist?', t: 'i' }],
    diagnostic_facility: [{ k: 'facilityName', l: 'Facility Name?', t: 'i' }, { k: 'monthlyVolume', l: 'Estimated monthly volume?', t: 'i' }, { k: 'modalities', l: 'Modalities needed?', t: 'i', p: 'XR, US, CT, MRI' }, { k: 'contactName', l: 'Contact Person?', t: 'i' }],
    ai_assistant: [{ k: 'healthFocus', l: 'Primary area of health interest?', t: 'i', p: 'e.g. Heart health, Lab interpretation' }, { k: 'techComfort', l: 'Comfort with technology?', t: 'i', p: 'High, Medium, Low' }],
    membership_plus: [{ k: 'healthGoals', l: 'What are your health goals?', t: 'i' }, { k: 'chronicConditions', l: 'Do you manage any chronic conditions?', t: 'i', p: 'Diabetes, Hypertension, etc.' }, { k: 'currentMeds', l: 'Current medications?', t: 'i' }],
    membership_core: [{ k: 'healthGoals', l: 'What are your health goals?', t: 'i' }, { k: 'primaryCareNeeds', l: 'Looking for primary care support?', t: 'yn' }],
    telehealth_premium: [{ k: 'chiefComplaint', l: 'Reason for visit?', t: 'i' }, { k: 'symptomDuration', l: 'Duration of symptoms?', t: 'i' }, { k: 'medications', l: 'Current medications?', t: 'i' }, { k: 'allergies', l: 'Allergies?', t: 'i' }],
    telehealth_standard: [{ k: 'chiefComplaint', l: 'Reason for visit?', t: 'i' }, { k: 'symptomDuration', l: 'Duration of symptoms?', t: 'i' }],
    telehealth_basic: [{ k: 'chiefComplaint', l: 'Reason for visit?', t: 'i' }, { k: 'symptomDuration', l: 'Duration of symptoms?', t: 'i' }]
};

export default function BookingPage() {
    const [step, setStep] = useState(1);
    const [selectedService, setSelectedService] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'popular' | 'all' | 'telehealth' | 'imaging' | 'memberships'>('popular');
    const [patientName, setPatientName] = useState('');
    const [selectedDate, setSelectedDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
    const [selectedTime, setSelectedTime] = useState('09:00');
    const [intakeAnswers, setIntakeAnswers] = useState<any>({});
    const [loading, setLoading] = useState(false);

    // Filter services based on active tab; popular tab shows only the 3 chosen; all tab pins them first
    const getTabServices = () => {
        if (activeTab === 'popular') return SERVICES.filter(s => POPULAR_IDS.has(s.id));
        if (activeTab === 'all') {
            const popular = SERVICES.filter(s => POPULAR_IDS.has(s.id));
            const rest = SERVICES.filter(s => !POPULAR_IDS.has(s.id));
            return [...popular, ...rest];
        }
        return SERVICES.filter(s => s.tab === activeTab);
    };

    const visibleServices = getTabServices();

    const handleBooking = async () => {
        setLoading(true);
        let appointmentId = '';
        try {
            // First create a pending appointment with intake data
            const docRef = await addDoc(collection(db, 'appointments'), {
                patient: patientName,
                service: selectedService.name,
                date: selectedDate,
                time: selectedTime,
                type: 'video',
                status: 'pending',
                intakeData: intakeAnswers,
                createdAt: serverTimestamp()
            });
            appointmentId = docRef.id;

            const res = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    service: selectedService.name,
                    price: selectedService.price,
                    patientName,
                    date: selectedDate,
                    time: selectedTime,
                    appointmentId: appointmentId
                })
            });
            const { id } = await res.json();
            const stripe = await stripePromise;
            await (stripe as any)?.redirectToCheckout({ sessionId: id });
        } catch (err) {
            console.error(err);
            alert('Stripe is in mock mode (no keys found). Redirecting to dummy success page...');
            // Need a generic fallback for local dev / un-configured Stripe
            window.location.href = `/book/success?patientName=${encodeURIComponent(patientName)}&service=${encodeURIComponent(selectedService.name)}&date=${selectedDate}&time=${selectedTime}&appointmentId=${appointmentId}`;
        }
    };

    const handleServiceSelect = (svc: any) => {
        setSelectedService(svc);
        setIntakeAnswers({});
        setStep(2);
    };

    const handleIntakeSubmit = () => {
        // Validation could be added here
        setStep(3);
    };

    return (
        <div className="min-h-screen bg-[#0A0F1C] text-white py-12 px-4 selection:bg-brand selection:text-white">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-4">
                        <ShieldCheck size={12} /> Secure Booking Portal
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Book Your Consultation</h1>
                    <p className="text-slate-400 font-medium max-w-lg mx-auto">Professional healthcare, delivered to your screen. From urgent care to radiology reads, find the specialized care you need.</p>
                </div>

                {/* Progress Bar */}
                <div className="flex items-center justify-between mb-12 max-w-xl mx-auto relative px-4 text-[10px] font-black uppercase tracking-widest">
                    <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-800 -translate-y-1/2 -z-10 mx-10"></div>

                    {[
                        { num: 1, label: 'Service' },
                        { num: 2, label: 'Intake' },
                        { num: 3, label: 'Details' },
                        { num: 4, label: 'Confirm' }
                    ].map(s => (
                        <div key={s.num} className="flex flex-col items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${step >= s.num ? 'bg-indigo-600 border-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.5)]' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>{s.num}</div>
                            <span className={step >= s.num ? 'text-indigo-400' : 'text-slate-500'}>{s.label}</span>
                        </div>
                    ))}
                </div>

                {/* STEP 1: SELECT SERVICE */}
                {step === 1 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

                        {/* Tab Bar */}
                        <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
                            {[
                                { id: 'popular', label: '⭐ Popular' },
                                { id: 'clinical', label: '🩺 Clinical Visits' },
                                { id: 'mens', label: '⚡ Men\'s Health' },
                                { id: 'imaging', label: '🔬 Imaging' },
                                { id: 'ai', label: '🤖 AI & Digital' },
                                { id: 'memberships', label: '🏆 Memberships' },
                                { id: 'all', label: 'All Services' },
                            ].map(tab => {
                                const isActive = activeTab === tab.id;
                                const isPopular = tab.id === 'popular';
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        style={isActive && isPopular ? {
                                            background: 'rgba(201,168,76,0.1)',
                                            color: '#d4aa50',
                                            borderColor: 'rgba(201,168,76,0.3)',
                                        } : {}}
                                        className={`whitespace-nowrap px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest border transition-all ${isActive
                                            ? isPopular
                                                ? '' // styles applied via style prop
                                                : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                                            : 'border-slate-800 text-slate-500 bg-slate-900/50 hover:border-slate-700 hover:text-slate-300'
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Service Grid */}
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {visibleServices.map((s) => {
                                const isPopular = POPULAR_IDS.has(s.id);
                                const isSelected = selectedService?.id === s.id;
                                return (
                                    <div
                                        key={s.id}
                                        onClick={() => handleServiceSelect(s)}
                                        style={isPopular ? {
                                            background: isSelected ? undefined : '#151208',
                                            borderColor: isSelected
                                                ? 'rgba(201,168,76,0.55)'
                                                : 'rgba(201,168,76,0.35)',
                                        } : {}}
                                        className={`group p-6 flex flex-col justify-between rounded-3xl border cursor-pointer transition-all hover:scale-[1.02] active:scale-95 ${isSelected
                                            ? isPopular
                                                ? 'shadow-lg'
                                                : 'border-indigo-500 bg-indigo-500/5 shadow-lg shadow-indigo-500/10'
                                            : isPopular
                                                ? ''
                                                : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-800/50'
                                            }`}
                                        onMouseEnter={e => {
                                            if (isPopular && !isSelected) {
                                                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(201,168,76,0.55)';
                                            }
                                        }}
                                        onMouseLeave={e => {
                                            if (isPopular && !isSelected) {
                                                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(201,168,76,0.35)';
                                            }
                                        }}
                                    >
                                        <div>
                                            {/* Popular badge */}
                                            {isPopular && (
                                                <div className="mb-3">
                                                    <span
                                                        style={{
                                                            color: '#c9a84c',
                                                            borderColor: 'rgba(201,168,76,0.25)',
                                                            background: 'rgba(201,168,76,0.07)',
                                                        }}
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-widest"
                                                    >
                                                        ⭐ Popular
                                                    </span>
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between mb-4">
                                                <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-xl group-hover:bg-indigo-500/20 transition-colors">
                                                    {s.icon}
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm font-black text-indigo-400">${s.price}</div>
                                                    <div className="text-[10px] font-bold text-slate-500 uppercase">{s.duration}</div>
                                                </div>
                                            </div>

                                            <h3
                                                style={isPopular ? { color: '#e8dfc0' } : {}}
                                                className={`text-lg font-black mb-2 ${!isPopular ? 'text-white' : ''}`}
                                            >
                                                {s.name}
                                            </h3>
                                            <p className="text-sm text-slate-400 font-medium mb-6 leading-relaxed line-clamp-3">{s.desc}</p>
                                        </div>

                                        {/* CTA button */}
                                        <button
                                            style={isPopular && !isSelected ? {
                                                borderColor: 'rgba(201,168,76,0.35)',
                                                background: 'rgba(201,168,76,0.07)',
                                                color: '#d4aa50',
                                            } : {}}
                                            className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${isSelected
                                                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 border-transparent'
                                                : isPopular
                                                    ? '' // styles via style prop
                                                    : 'bg-slate-800 text-slate-400 border-transparent group-hover:bg-indigo-600 group-hover:text-white'
                                                }`}
                                        >
                                            Select Service
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* STEP 2: INTAKE QUESTIONS */}
                {step === 2 && selectedService && (
                    <div className="max-w-2xl mx-auto p-8 rounded-[40px] bg-slate-900/50 border border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-xl">
                        <div className="mb-8 pb-6 border-b border-slate-800">
                            <h2 className="text-2xl font-black text-white">Patient Intake</h2>
                            <p className="text-sm text-indigo-400 font-bold mt-1">For: {selectedService.name}</p>
                            <p className="text-slate-400 text-sm mt-2">Please answer the following questions to help us prepare for your visit.</p>
                        </div>

                        <div className="space-y-6">
                            {INTAKE_QUESTIONS[selectedService.k]?.length > 0 ? (
                                INTAKE_QUESTIONS[selectedService.k].map((q: any, i: number) => (
                                    <div key={i} className="space-y-2">
                                        <label className="text-sm font-bold text-slate-300 block">{q.l}</label>
                                        {q.t === 'yn' || q.type === 'yn' ? (
                                            <div className="flex gap-4">
                                                <label className="flex-1 flex items-center justify-center gap-2 cursor-pointer p-4 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-800 transition-colors">
                                                    <input type="radio" name={q.k} value="Yes" className="text-indigo-500 focus:ring-indigo-500 w-4 h-4 bg-slate-900 border-slate-700"
                                                        onChange={(e) => setIntakeAnswers({ ...intakeAnswers, [q.k]: e.target.value })}
                                                        checked={intakeAnswers[q.k] === 'Yes'}
                                                    /> <span className="text-sm font-bold text-white">Yes</span>
                                                </label>
                                                <label className="flex-1 flex items-center justify-center gap-2 cursor-pointer p-4 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-800 transition-colors">
                                                    <input type="radio" name={q.k} value="No" className="text-indigo-500 focus:ring-indigo-500 w-4 h-4 bg-slate-900 border-slate-700"
                                                        onChange={(e) => setIntakeAnswers({ ...intakeAnswers, [q.k]: e.target.value })}
                                                        checked={intakeAnswers[q.k] === 'No'}
                                                    /> <span className="text-sm font-bold text-white">No</span>
                                                </label>
                                            </div>
                                        ) : (
                                            <input
                                                type="text"
                                                placeholder={q.p || "Your answer..."}
                                                value={intakeAnswers[q.k] || ''}
                                                onChange={(e) => setIntakeAnswers({ ...intakeAnswers, [q.k]: e.target.value })}
                                                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-4 px-6 text-white font-medium placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                                            />
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-slate-400 italic text-sm p-4 bg-slate-800/30 rounded-xl border border-slate-800">No specific intake questions for this service.</div>
                            )}

                            <div className="pt-8 flex gap-4">
                                <button onClick={() => setStep(1)} className="w-[120px] bg-slate-800 text-slate-300 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-700 transition-all flex items-center justify-center gap-2">
                                    <ChevronLeft size={16} /> Back
                                </button>
                                <button
                                    onClick={handleIntakeSubmit}
                                    className="flex-1 bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:bg-indigo-500 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    Continue <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}


                {/* STEP 3: PATIENT DETAILS & TIME */}
                {step === 3 && (
                    <div className="max-w-xl mx-auto p-8 rounded-[40px] bg-slate-900/50 border border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-xl">
                        <div className="mb-8 pb-6 border-b border-slate-800">
                            <h2 className="text-2xl font-black text-white">Appointment Details</h2>
                            <p className="text-slate-400 text-sm mt-2">When should we schedule this?</p>
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <User size={12} /> Full Name / Patient Id
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter your name"
                                    value={patientName}
                                    onChange={(e) => setPatientName(e.target.value)}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl py-4 px-6 text-white font-bold placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        <Calendar size={12} /> Select Date
                                    </label>
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl py-4 px-6 text-white font-bold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all [color-scheme:dark]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        <Clock size={12} /> Select Time
                                    </label>
                                    <select
                                        value={selectedTime}
                                        onChange={(e) => setSelectedTime(e.target.value)}
                                        className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl py-4 px-6 text-white font-bold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                                    >
                                        {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="pt-8 flex gap-4">
                                <button onClick={() => setStep(2)} className="w-[120px] bg-slate-800 text-slate-300 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-700 transition-all flex items-center justify-center gap-2">
                                    <ChevronLeft size={16} /> Back
                                </button>
                                <button
                                    disabled={!patientName}
                                    onClick={() => setStep(4)}
                                    className="flex-1 bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:bg-indigo-500 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    Review <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 4: CONFIRM & STRIPE */}
                {step === 4 && selectedService && (
                    <div className="max-w-xl mx-auto p-8 rounded-[40px] bg-slate-900 border border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-500 text-center shadow-2xl">
                        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400 mx-auto mb-8 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                            <CreditCard size={32} />
                        </div>
                        <h2 className="text-2xl font-black mb-2">Confirm Your Appointment</h2>
                        <p className="text-slate-400 text-sm font-medium mb-12">Review your selection before secure checkout.</p>

                        <div className="bg-slate-800/30 rounded-3xl p-6 text-left space-y-4 border border-slate-800 mb-12 shadow-inner">
                            <div className="flex justify-between items-center pb-4 border-b border-slate-800/50">
                                <span className="text-[10px] font-black text-slate-500 uppercase">Service</span>
                                <span className="font-bold flex items-center gap-2"><span className="text-xl">{selectedService.icon}</span> {selectedService.name}</span>
                            </div>
                            <div className="flex justify-between items-center pb-4 border-b border-slate-800/50">
                                <span className="text-[10px] font-black text-slate-500 uppercase">Patient</span>
                                <span className="font-bold text-indigo-300">{patientName}</span>
                            </div>
                            <div className="flex justify-between items-center pb-4 border-b border-slate-800/50">
                                <span className="text-[10px] font-black text-slate-500 uppercase">Date & Time</span>
                                <span className="font-bold">{format(new Date(selectedDate), 'MMM d, yyyy')} @ {selectedTime}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2">
                                <span className="text-[10px] font-black text-slate-500 uppercase">Total Due</span>
                                <span className="text-2xl font-black text-emerald-400">${selectedService.price}</span>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button onClick={() => setStep(3)} className="w-[120px] bg-slate-800 text-slate-300 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-700 transition-all flex items-center justify-center gap-2">
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                onClick={handleBooking}
                                disabled={loading}
                                className="flex-1 bg-emerald-500 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:bg-emerald-400 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? 'Redirecting...' : 'Review & Pay'}
                            </button>
                        </div>
                    </div>
                )}

            </div>

            {/* Float Logos */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-8 opacity-20 pointer-events-none">
                <div className="flex items-center gap-2 text-xs font-black grayscale"><ShieldCheck size={16} /> HIPAA COMPLIANT</div>
                <div className="flex items-center gap-2 text-xs font-black grayscale"><CheckCircle2 size={16} /> POWERED BY STRIPE</div>
            </div>
        </div>
    );
}
