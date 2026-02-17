import React from 'react';
import { ArrowRight, Pill, Activity, Zap, Clock, Dna, Microscope, FileText, Monitor, Video, Image, BarChart, Building2, Bot, Smartphone, Trophy, Star, Target, HeartPulse, ClipboardList, Lightbulb } from 'lucide-react';

const SERVICES = [
    {
        icon: <HeartPulse className="w-6 h-6" />,
        color: "bg-rose-100 text-rose-600",
        title: "General Visit",
        description: "Virtual visits for non-emergent health concerns — medication management, wellness checks, health advice. Convenient care from home.",
        price: "$79",
        unit: "/ visit"
    },
    {
        icon: <Pill className="w-6 h-6" />,
        color: "bg-teal-100 text-teal-600",
        title: "GLP-1 & Weight Loss",
        description: "Comprehensive medical weight loss evaluation. GLP-1 eligibility screening, personalized titration, dietary guidance. Medication cost separate.",
        price: "$129",
        unit: "/ visit"
    },
    {
        icon: <Zap className="w-6 h-6" />,
        color: "bg-amber-100 text-amber-600",
        title: "Erectile Dysfunction",
        description: "Sildenafil, tadalafil & custom compounds — discreetly delivered after cardiovascular safety screening.",
        price: "$79",
        unit: "/ visit"
    },
    {
        icon: <Clock className="w-6 h-6" />,
        color: "bg-indigo-100 text-indigo-600",
        title: "Premature Ejaculation",
        description: "Sertraline (SSRI therapy), topical numbing agents & behavioral techniques. Evidence-based, shipped discreetly.",
        price: "$79",
        unit: "/ visit"
    },
    {
        icon: <Dna className="w-6 h-6" />,
        color: "bg-purple-100 text-purple-600",
        title: "Testosterone / HRT",
        description: "Comprehensive hormone evaluation for men & women — testosterone, estrogen, progesterone, DHEA, thyroid support & peptides.",
        price: "$149",
        unit: "/ visit"
    },
    {
        icon: <Microscope className="w-6 h-6" />,
        color: "bg-cyan-100 text-cyan-600",
        title: "AI-Powered Imaging Analysis",
        description: "Physician-supervised AI interpretation of reports. Educational tools to help you understand findings.",
        price: "$99",
        unit: "/ visit"
    },
    {
        icon: <FileText className="w-6 h-6" />,
        color: "bg-slate-100 text-slate-600",
        title: "Report Interpretation",
        description: "Expert analysis of your existing radiology report. We translate complex medical jargon into plain English.",
        price: "$149",
        unit: "/ visit"
    },
    {
        icon: <Monitor className="w-6 h-6" />,
        color: "bg-blue-100 text-blue-600",
        title: "Standard Imaging Review",
        description: "Complete second-opinion over-read of your X-Ray, Ultrasound, CT, or MRI images by a board-certified radiologist.",
        price: "$249",
        unit: "/ visit"
    },
    {
        icon: <Video className="w-6 h-6" />,
        color: "bg-emerald-100 text-emerald-600",
        title: "Imaging + Video Consult",
        description: "Full imaging review plus a 30 - 60 minute secure video consultation to discuss findings directly with a specialist.",
        price: "$449",
        unit: "/ visit"
    },
    {
        icon: <Image className="w-6 h-6" />,
        color: "bg-orange-100 text-orange-600",
        title: "Single Study Read",
        description: "Official diagnostic report for a single study (CT, XR, US). <24-48h turnaround.",
        price: "$75",
        unit: "/ read"
    },
    {
        icon: <BarChart className="w-6 h-6" />,
        color: "bg-pink-100 text-pink-600",
        title: "Diagnostic Second Opinion",
        description: "Full diagnostic review + written opinion + patient summary for CT, XR, or US.",
        price: "$250",
        unit: "/ consult"
    },
    {
        icon: <Building2 className="w-6 h-6" />,
        color: "bg-slate-800 text-white",
        title: "Facility Contracts",
        description: "Urgent Care & Outpatient contracts. Unlimited reads, SLA, dedicated upload link.",
        price: "$3500",
        unit: "/ mo+"
    },
    {
        icon: <Bot className="w-6 h-6" />,
        color: "bg-violet-100 text-violet-600",
        title: "AI Health Assistant",
        description: "AI-powered health education, symptom guidance & care navigation. Not a substitute for professional medical advice.",
        price: "$29",
        unit: "/ visit"
    },
    {
        icon: <Smartphone className="w-6 h-6" />,
        color: "bg-sky-100 text-sky-600",
        title: "Digital Health Platform",
        description: "Monthly access to digital health tools, educational content & AI-powered navigation features. No clinical services.",
        price: "$19",
        unit: "/ mo"
    },
    {
        icon: <Trophy className="w-6 h-6" />,
        color: "bg-amber-100 text-amber-700 border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100",
        title: "All Access — Elite",
        description: "Everything: telehealth visits, specialty programs, AI health tools, AI imaging, and priority scheduling.",
        price: "$199",
        unit: "/ mo",
        highlight: true
    },
    {
        icon: <Star className="w-6 h-6" />,
        color: "bg-indigo-100 text-indigo-700",
        title: "All Access — Plus",
        description: "Telehealth visits, AI health assistant, AI imaging tools, and priority scheduling in one subscription.",
        price: "$149",
        unit: "/ mo"
    },
    {
        icon: <Target className="w-6 h-6" />,
        color: "bg-blue-100 text-blue-700",
        title: "All Access — Core",
        description: "General telehealth, AI health assistant, AI imaging tools & scheduling. Great starter membership.",
        price: "$99",
        unit: "/ mo"
    },
    {
        icon: <HeartPulse className="w-6 h-6" />,
        color: "bg-rose-100 text-rose-700",
        title: "Telehealth Premium",
        description: "Unlimited/priority access to general telehealth for non-emergency concerns, clinician visits & digital support.",
        price: "$99",
        unit: "/ mo"
    },
    {
        icon: <ClipboardList className="w-6 h-6" />,
        color: "bg-teal-100 text-teal-700",
        title: "Telehealth Standard",
        description: "1 visit/month to general telehealth for non-emergency medical concerns, plus clinician visits & digital support.",
        price: "$59",
        unit: "/ mo"
    },
    {
        icon: <Lightbulb className="w-6 h-6" />,
        color: "bg-yellow-100 text-yellow-700",
        title: "Telehealth Basic",
        description: "AI + limited visits for general telehealth. Digital support & care navigation for non-emergency concerns.",
        price: "$29",
        unit: "/ mo"
    }
];

export default function ServicesPage() {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-slate-900">Medical Services & Plans</h2>
                <p className="text-slate-500 mt-1">Select a service to schedule an appointment or manage your subscription.</p>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {SERVICES.map((service, index) => (
                    <div
                        key={index}
                        className={`group relative bg-white border rounded-2xl p-6 transition-all hover:shadow-lg hover:-translate-y-1 flex flex-col h-full ${service.highlight
                            ? 'border-amber-200 shadow-md ring-1 ring-amber-100'
                            : 'border-slate-200 shadow-sm'
                            }`}
                    >
                        {/* Icon Header */}
                        <div className="flex items-start justify-between mb-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${service.color}`}>
                                {service.icon}
                            </div>
                            {service.highlight && (
                                <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">
                                    Best Value
                                </span>
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 mb-6">
                            <h3 className="font-bold text-lg text-slate-900 mb-2 group-hover:text-brand transition-colors">
                                {service.title}
                            </h3>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                {service.description}
                            </p>
                        </div>

                        {/* Footer (Price + Action) */}
                        <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                            <div>
                                <span className="text-lg font-bold text-slate-900">{service.price}</span>
                                <span className="text-xs text-slate-400 font-medium">{service.unit}</span>
                            </div>
                            <button className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-brand group-hover:text-white transition-all">
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
