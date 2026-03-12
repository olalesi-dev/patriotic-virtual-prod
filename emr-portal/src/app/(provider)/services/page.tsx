'use client';

import React, { useState } from 'react';
import { ArrowRight, Pill, Activity, Zap, Clock, Dna, Microscope, FileText, Monitor, Video, Image, BarChart, Building2, Bot, Smartphone, Trophy, Star, Target, HeartPulse, ClipboardList, Lightbulb, Grid, Scan, ShieldCheck, CreditCard } from 'lucide-react';

const SERVICES = [
    {
        icon: <HeartPulse className="w-6 h-6" />,
        color: "bg-rose-100 text-rose-600",
        title: "General Visit",
        description: "Virtual visits for non-emergent health concerns — medication management, wellness checks, health advice. Convenient care from home.",
        price: "$79",
        unit: "/ visit",
        category: "medical"
    },
    {
        icon: <Pill className="w-6 h-6" />,
        color: "bg-teal-100 text-teal-600",
        title: "GLP-1 & Weight Loss",
        description: "Comprehensive medical weight loss evaluation. GLP-1 eligibility screening, personalized titration, dietary guidance. Medication cost separate.",
        price: "$129",
        unit: "/ visit",
        category: "medical"
    },
    {
        icon: <Zap className="w-6 h-6" />,
        color: "bg-amber-100 text-amber-600",
        title: "Erectile Dysfunction",
        description: "Sildenafil, tadalafil & custom compounds — discreetly delivered after cardiovascular safety screening.",
        price: "$79",
        unit: "/ visit",
        category: "medical"
    },
    {
        icon: <Clock className="w-6 h-6" />,
        color: "bg-indigo-100 text-indigo-600",
        title: "Premature Ejaculation",
        description: "Sertraline (SSRI therapy), topical numbing agents & behavioral techniques. Evidence-based, shipped discreetly.",
        price: "$79",
        unit: "/ visit",
        category: "medical"
    },
    {
        icon: <Dna className="w-6 h-6" />,
        color: "bg-purple-100 text-purple-600",
        title: "Testosterone / HRT",
        description: "Comprehensive hormone evaluation for men & women — testosterone, estrogen, progesterone, DHEA, thyroid support & peptides.",
        price: "$149",
        unit: "/ visit",
        category: "medical"
    },
    {
        icon: <Microscope className="w-6 h-6" />,
        color: "bg-cyan-100 text-cyan-600",
        title: "AI-Powered Imaging Analysis",
        description: "Physician-supervised AI interpretation of reports. Educational tools to help you understand findings.",
        price: "$99",
        unit: "/ visit",
        category: "imaging"
    },
    {
        icon: <FileText className="w-6 h-6" />,
        color: "bg-slate-100 text-slate-600",
        title: "Report Interpretation",
        description: "Expert analysis of your existing radiology report. We translate complex medical jargon into plain English.",
        price: "$149",
        unit: "/ visit",
        category: "imaging"
    },
    {
        icon: <Monitor className="w-6 h-6" />,
        color: "bg-blue-100 text-blue-600",
        title: "Standard Imaging Review",
        description: "Complete second-opinion over-read of your X-Ray, Ultrasound, CT, or MRI images by a board-certified radiologist.",
        price: "$249",
        unit: "/ visit",
        category: "imaging"
    },
    {
        icon: <Video className="w-6 h-6" />,
        color: "bg-emerald-100 text-emerald-600",
        title: "Imaging + Video Consult",
        description: "Full imaging review plus a 30 - 60 minute secure video consultation to discuss findings directly with a specialist.",
        price: "$449",
        unit: "/ visit",
        category: "imaging"
    },
    {
        icon: <Image className="w-6 h-6" />,
        color: "bg-orange-100 text-orange-600",
        title: "Single Study Read",
        description: "Official diagnostic report for a single study (CT, XR, US). <24-48h turnaround.",
        price: "$75",
        unit: "/ read",
        category: "imaging"
    },
    {
        icon: <BarChart className="w-6 h-6" />,
        color: "bg-pink-100 text-pink-600",
        title: "Diagnostic Second Opinion",
        description: "Full diagnostic review + written opinion + patient summary for CT, XR, or US.",
        price: "$250",
        unit: "/ consult",
        category: "imaging"
    },
    {
        icon: <Building2 className="w-6 h-6" />,
        color: "bg-slate-800 text-white",
        title: "Facility Contracts",
        description: "Urgent Care & Outpatient contracts. Unlimited reads, SLA, dedicated upload link.",
        price: "$3500",
        unit: "/ mo+",
        category: "imaging"
    },
    {
        icon: <Bot className="w-6 h-6" />,
        color: "bg-violet-100 text-violet-600",
        title: "AI Health Assistant",
        description: "AI-powered health education, symptom guidance & care navigation. Not a substitute for professional medical advice.",
        price: "$29",
        unit: "/ visit",
        category: "imaging"
    },
    {
        icon: <Smartphone className="w-6 h-6" />,
        color: "bg-sky-100 text-sky-600",
        title: "Digital Health Platform",
        description: "Monthly access to digital health tools, educational content & AI-powered navigation features. No clinical services.",
        price: "$19",
        unit: "/ mo",
        category: "imaging"
    },
    {
        icon: <Trophy className="w-6 h-6" />,
        color: "bg-amber-100 text-amber-700 border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100",
        title: "All Access — Elite",
        description: "Everything: telehealth visits, specialty programs, AI health tools, AI imaging, and priority scheduling.",
        price: "$199",
        unit: "/ mo",
        highlight: true,
        category: "plans"
    },
    {
        icon: <Star className="w-6 h-6" />,
        color: "bg-indigo-100 text-indigo-700",
        title: "All Access — Plus",
        description: "Telehealth visits, AI health assistant, AI imaging tools, and priority scheduling in one subscription.",
        price: "$149",
        unit: "/ mo",
        category: "plans"
    },
    {
        icon: <Target className="w-6 h-6" />,
        color: "bg-blue-100 text-blue-700",
        title: "All Access — Core",
        description: "General telehealth, AI health assistant, AI imaging tools & scheduling. Great starter membership.",
        price: "$99",
        unit: "/ mo",
        category: "plans"
    },
    {
        icon: <HeartPulse className="w-6 h-6" />,
        color: "bg-rose-100 text-rose-700",
        title: "Telehealth Premium",
        description: "Unlimited/priority access to general telehealth for non-emergency concerns, clinician visits & digital support.",
        price: "$99",
        unit: "/ mo",
        category: "plans"
    },
    {
        icon: <ClipboardList className="w-6 h-6" />,
        color: "bg-teal-100 text-teal-700",
        title: "Telehealth Standard",
        description: "1 visit/month to general telehealth for non-emergency medical concerns, plus clinician visits & digital support.",
        price: "$59",
        unit: "/ mo",
        category: "plans"
    },
    {
        icon: <Lightbulb className="w-6 h-6" />,
        color: "bg-yellow-100 text-yellow-700",
        title: "Telehealth Basic",
        description: "AI + limited visits for general telehealth. Digital support & care navigation for non-emergency concerns.",
        price: "$29",
        unit: "/ mo",
        category: "plans"
    }
];

const TABS = [
    { id: 'medical', label: 'Medical Board', icon: <HeartPulse className="w-4 h-4" /> },
    { id: 'imaging', label: 'Imaging & AI', icon: <Scan className="w-4 h-4" /> },
    { id: 'plans', label: 'Memberships', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'all', label: 'All Services', icon: <Grid className="w-4 h-4" /> },
];

export default function ServicesPage() {
    const [activeTab, setActiveTab] = useState('all');
    const [activeCategory, setActiveCategory] = useState('All Services'); // Changed from activeTab to activeCategory

    const filteredServices = activeCategory === 'All Services'
        ? SERVICES
        : SERVICES.filter(s => s.category === activeCategory);

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] font-sans bg-slate-50 dark:bg-slate-900 relative overflow-hidden">
            <div className="px-8 pt-8 pb-4 space-y-8 overflow-y-auto h-full">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 italic tracking-tight uppercase">Medical Services & Plans</h2>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-xl text-sm font-bold uppercase tracking-widest">
                            Select a category to explore specialized care options
                        </p>
                    </div>
                </div>

                {/* Tabs Bar */}
                <div className="flex items-center gap-1 p-1 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl w-fit border border-slate-200 dark:border-slate-700">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all
                                ${activeTab === tab.id
                                    ? 'bg-white dark:bg-slate-700 text-brand shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-600'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-900/50'
                                }
                            `}
                        >
                            <span className={activeTab === tab.id ? 'text-brand' : 'text-slate-400 dark:text-slate-500'}>
                                {tab.icon}
                            </span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {filteredServices.map((service, index) => (
                        <div
                            key={index}
                            className={`group relative bg-white dark:bg-slate-800 border rounded-2xl p-6 transition-all hover:shadow-xl hover:-translate-y-1.5 flex flex-col h-full ${service.highlight
                                ? 'border-amber-200 dark:border-amber-900 shadow-md ring-2 ring-amber-50 dark:ring-amber-900/20'
                                : 'border-slate-200 dark:border-slate-700 shadow-sm'
                                }`}
                        >
                            {/* Icon Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-110 duration-300 ${service.color.includes('rose') ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-500' :
                                        service.color.includes('teal') ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-500' :
                                            service.color.includes('amber') ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-500' :
                                                service.color.includes('indigo') ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500' :
                                                    service.color.includes('purple') ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-500' :
                                                        service.color.includes('cyan') ? 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-500' :
                                                            service.color.includes('blue') ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-500' :
                                                                service.color.includes('emerald') ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500' :
                                                                    service.color.includes('orange') ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-500' :
                                                                        service.color.includes('pink') ? 'bg-pink-50 dark:bg-pink-900/30 text-pink-500' :
                                                                            service.color.includes('violet') ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-500' :
                                                                                service.color.includes('sky') ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-500' :
                                                                                    service.color.includes('yellow') ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-500' :
                                                                                        'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                    }`}>
                                    {service.icon}
                                </div>
                                {service.highlight && (
                                    <span className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider">
                                        Best Value
                                    </span>
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 mb-6">
                                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 mb-2 group-hover:text-brand transition-colors">
                                    {service.title}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                                    {service.description}
                                </p>
                            </div>

                            {/* Footer (Price + Action) */}
                            <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                <div>
                                    <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">{service.price}</span>
                                    <span className="text-xs text-slate-400 dark:text-slate-500 font-bold ml-1 uppercase">{service.unit.replace('/ ', '')}</span>
                                </div>
                                <button className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:bg-brand group-hover:text-white group-hover:shadow-lg group-hover:shadow-brand/30 transition-all duration-300">
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredServices.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-600">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                            <Grid className="w-8 h-8" />
                        </div>
                        <p className="text-lg font-medium">No services found in this category.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

