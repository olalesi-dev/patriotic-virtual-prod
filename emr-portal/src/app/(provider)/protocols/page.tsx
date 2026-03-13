"use client";

import React, { useState } from 'react';
import {
    Folder, Star, Plus, FileText, ChevronRight, ChevronDown,
    MoreHorizontal, Calendar, X, Flag, Pencil, Copy, Printer, Trash2,
    Users, Mail, Phone, MapPin
} from 'lucide-react';

const PROTOCOLS = [
    { title: "Second Opinion Imaging – Eligibility Intake", type: "Clinical", date: "Jan 12, 2026" },
    { title: "Consent for Telehealth Consultation", type: "Legal", date: "Dec 23, 2025" },
    { title: "Psychiatrist / PMHNP Parent Intake Ques...", type: "Clinical", date: "Dec 23, 2025" },
    { title: "Practice Policies", type: "Admin", date: "Dec 23, 2025" },
    { title: "Lab Slip", type: "Orders", date: "Dec 23, 2025" },
    { title: "Psychiatrist / PMHNP Intake Note", type: "Clinical", date: "Dec 23, 2025" },
    { title: "Psychiatrist / PMHNP Follow-Up Note (S...", type: "Clinical", date: "Dec 23, 2025" },
    { title: "Psychiatrist / PMHNP Follow-Up Questio...", type: "Clinical", date: "Dec 23, 2025" },
    { title: "Psychiatrist / PMHNP Follow-Up Note", type: "Clinical", date: "Dec 23, 2025" },
    { title: "Psychiatrist / PMHNP Follow-Up Questio...", type: "Clinical", date: "Dec 23, 2025" },
    { title: "Notice of Privacy Practices", type: "Legal", date: "Dec 23, 2025" },
    { title: "Psychiatrist / PMHNP Intake Questionnaire", type: "Clinical", date: "Dec 23, 2025" },
];

export default function ProtocolsPage() {
    const [selectedProtocol, setSelectedProtocol] = useState<any>(null);

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] font-sans bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-900 relative overflow-hidden text-slate-900 dark:text-white dark:text-slate-100">

            <div className="p-8 space-y-8 overflow-y-auto h-full">

                {/* PAGE HEADER */}
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white dark:text-slate-100 flex items-center gap-2">
                        Clinical Protocols <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Standardized workflows and document protocols for your practice</p>
                </div>

                {/* FOLDERS SECTION */}
                <div>
                    <div className="flex items-center gap-2 mb-4 bg-slate-100/50 dark:bg-slate-800/50 p-2 rounded-lg w-fit">
                        <Folder className="w-5 h-5 text-slate-500 dark:text-slate-400 fill-slate-500 dark:fill-slate-400" />
                        <span className="font-bold text-slate-800 dark:text-slate-100 dark:text-slate-200">Groups</span>
                        <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    </div>

                    <div className="flex gap-6">
                        {/* Intake Folder Card */}
                        <div className="bg-white dark:bg-slate-800 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 shadow-sm w-72 hover:shadow-md transition-shadow cursor-pointer group">
                            <div className="flex items-start gap-3 mb-2">
                                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                                    <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-slate-900 dark:text-white dark:text-slate-100">Intake</h3>
                                        <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold px-1.5 py-0.5 rounded">Active</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-1">
                                        12 Protocols • Edited Dec 23, 2025
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Add Folder Button */}
                        <button className="w-72 bg-white dark:bg-slate-800 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 border-dashed flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm group">
                            <div className="w-10 h-10 bg-brand rounded-full flex items-center justify-center text-white shadow-lg shadow-brand/30 group-hover:scale-110 transition-transform">
                                <Plus className="w-6 h-6" />
                            </div>
                        </button>
                    </div>
                </div>

                {/* PROTOCOLS SECTION */}
                <div className="pt-4">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2 bg-slate-100/50 dark:bg-slate-800/50 p-2 rounded-lg">
                            <FileText className="w-5 h-5 text-slate-500 dark:text-slate-400 fill-slate-500 dark:fill-slate-400" />
                            <span className="font-bold text-slate-800 dark:text-slate-100 dark:text-slate-200">Defined Protocols</span>
                            <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        </div>
                        <button className="text-brand text-sm font-bold flex items-center gap-1 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-3 py-1.5 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 dark:border-slate-700 bg-white dark:bg-slate-800 dark:bg-slate-800 dark:text-indigo-400">
                            View all <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
                        {PROTOCOLS.map((protocol, i) => (
                            <div
                                key={i}
                                onClick={() => setSelectedProtocol(protocol)}
                                className="bg-white dark:bg-slate-800 dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-36 justify-between group"
                            >
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-slate-100 dark:text-slate-200 text-sm leading-snug line-clamp-2 mb-1 group-hover:text-brand dark:group-hover:text-indigo-400 transition-colors">
                                        {protocol.title}
                                    </h3>
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                                        {protocol.type} • Edited {protocol.date}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 mt-auto">
                                    <div className="w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 flex items-center justify-center text-[9px] font-bold border border-cyan-200 dark:border-cyan-800">
                                        OO
                                    </div>
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 dark:text-slate-300">Practice HQ</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* PROTOCOL DETAIL OVERLAY */}
            {selectedProtocol && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-900 w-full max-w-6xl h-[90vh] rounded-xl shadow-2xl overflow-hidden animate-scale-up flex border dark:border-slate-800">

                        {/* LEFT SIDEBAR */}
                        <div className="w-80 bg-white dark:bg-slate-800 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 dark:border-slate-700 p-8 flex flex-col h-full relative z-10">
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-6">
                                <Folder className="w-4 h-4" />
                                <span className="text-sm font-bold">Standard Workflow</span>
                                <div className="flex-1"></div>
                                <Star className="w-4 h-4 hover:fill-amber-400 text-slate-400 dark:text-slate-500 cursor-pointer" />
                                <Flag className="w-4 h-4 text-slate-400 dark:text-slate-500 hover:text-red-500 cursor-pointer" />
                            </div>

                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white dark:text-slate-100 leading-tight mb-2">
                                {selectedProtocol.title}
                            </h2>
                            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mb-8">
                                {selectedProtocol.type} • Edited {selectedProtocol.date}
                            </p>

                            <button className="w-full bg-brand hover:bg-brand-600 text-white font-bold py-3 rounded-lg shadow-sm mb-4 transition-colors">
                                Launch Protocol
                            </button>
                            <button className="w-full text-brand dark:text-indigo-400 font-bold text-sm hover:underline">
                                Edit Workflow
                            </button>

                            <div className="mt-auto pt-6 flex items-center gap-3 border-t border-slate-100 dark:border-slate-700 dark:border-slate-700">
                                <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-bold border border-indigo-200 dark:border-indigo-800">
                                    P
                                </div>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 dark:text-slate-300">Patriotic Systems</span>
                            </div>
                        </div>

                        {/* RIGHT CONTENT (WORKFLOW PREVIEW) */}
                        <div className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-900 relative">
                            {/* Toolbar */}
                            <div className="h-16 bg-white dark:bg-slate-800 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 dark:border-slate-700 flex items-center justify-end px-6 gap-2 shadow-sm z-20">
                                <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400"><Pencil className="w-5 h-5" /></button>
                                <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400"><Copy className="w-5 h-5" /></button>
                                <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400"><Printer className="w-5 h-5" /></button>
                                <button className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded"><Trash2 className="w-5 h-5" /></button>
                                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-2"></div>
                                <button onClick={() => setSelectedProtocol(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-12">
                                <div className="bg-white dark:bg-slate-800 dark:bg-slate-800 max-w-3xl mx-auto min-h-[800px] shadow-sm border border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded-xl p-12 relative">
                                    <div className="space-y-6">
                                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-lg">
                                            <h4 className="text-indigo-900 dark:text-indigo-100 font-bold text-sm mb-2">Protocol Definition</h4>
                                            <p className="text-indigo-700 dark:text-indigo-300 text-xs">Standardized operational procedure for clinical review and documentation.</p>
                                        </div>
                                        <div className="h-4 bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-900 w-full rounded"></div>
                                        <div className="h-4 bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-900 w-3/4 rounded"></div>
                                        <div className="h-4 bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-900 w-1/2 rounded"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
