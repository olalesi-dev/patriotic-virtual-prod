"use client";

import React, { useState } from 'react';
import {
    ChevronRight, ChevronDown, BookOpen, Settings, Activity,
    Calendar, Plus, Clock, User, ShieldCheck, FileText,
    AlertCircle, Info, CheckCircle2, MoreHorizontal, Inbox, CreditCard,
    Stethoscope, Pill, ClipboardList, Microscope, BarChart3, LayoutGrid, Zap
} from 'lucide-react';
import { Patient } from '@/lib/data';
import { BillingTab, SoapNoteModal, MedicationsTab, OrdersTab, ImagingTab, LabsVitalsTab, DocumentsTab, EncountersTab, InboxTab } from './PatientDetailComponents';

interface PatientChartProps {
    patient: Patient;
    onBack: () => void;
    onAddNote: (note: any) => void;
}

export function PatientChart({ patient, onBack, onAddNote }: PatientChartProps) {
    const [activeTab, setActiveTab] = useState('Overview');
    const [isSoapModalOpen, setIsSoapModalOpen] = useState(false);

    const handleSaveNote = (note: any) => {
        onAddNote(note);
    };

    const tabs = [
        { id: 'Overview', icon: LayoutGrid },
        { id: 'Clinical', icon: Stethoscope },
        { id: 'Medications/eRx', icon: Pill },
        { id: 'Orders', icon: ClipboardList },
        { id: 'Imaging', icon: Microscope },
        { id: 'Labs & Vitals', icon: BarChart3 },
        { id: 'Documents', icon: FileText },
        { id: 'Encounters', icon: Clock },
        { id: 'Inbox', icon: Inbox },
        { id: 'Billing', icon: CreditCard },
    ];

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden font-sans">
            {/* TOP BANNER */}
            <div className="bg-white border-b border-slate-200 shadow-sm relative z-10">
                <div className="px-8 py-4">
                    <div
                        className="flex items-center gap-1 text-xs text-slate-400 font-bold mb-3 cursor-pointer hover:text-brand transition-colors group"
                        onClick={onBack}
                    >
                        <ChevronRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
                        <span>Back to Registry</span>
                    </div>

                    <div className="flex justify-between items-start">
                        <div className="flex gap-6">
                            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 font-black flex items-center justify-center text-2xl border-2 border-slate-200 dark:border-slate-700 shadow-inner">
                                {patient.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{patient.name}</h1>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${patient.statusColor}`}>
                                        {patient.status}
                                    </span>
                                </div>
                                <div className="flex items-center gap-6 text-sm font-bold text-slate-500">
                                    <span>DOB: {patient.dob} (38y)</span>
                                    <span>Sex: {patient.sex}</span>
                                    <span>MRN: {patient.mrn}</span>
                                    <span>State: {patient.state}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-3">
                            {/* Allergy Banner */}
                            <div className={`px-4 py-2 rounded-xl border flex items-center gap-3 ${patient.allergies.length === 1 && patient.allergies[0] === 'NKDA'
                                ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                : 'bg-red-50 border-red-100 text-red-700'
                                }`}>
                                <ShieldCheck className="w-4 h-4" />
                                <span className="text-xs font-black uppercase tracking-wider">
                                    Allergies: {patient.allergies.join(', ')}
                                </span>
                            </div>

                            {/* Active Alerts */}
                            <div className="flex gap-2">
                                {patient.alerts.map((alert, i) => (
                                    <div key={i} className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight flex items-center gap-1.5 shadow-sm ${alert.type === 'error' ? 'bg-red-600 text-white' :
                                        alert.type === 'warning' ? 'bg-amber-400 text-slate-900' :
                                            'bg-blue-500 text-white'
                                        }`}>
                                        {alert.type === 'error' && <AlertCircle className="w-3 h-3" />}
                                        {alert.type === 'warning' && <Info className="w-3 h-3" />}
                                        {alert.label}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* TAB NAVIGATION */}
                <div className="px-8 flex gap-1 overflow-x-auto no-scrollbar">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-3 text-xs font-black uppercase tracking-widest border-b-4 transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === tab.id
                                ? 'border-brand text-brand bg-brand/5'
                                : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.id}
                        </button>
                    ))}
                </div>
            </div>

            {/* CONTENT AREA */}
            <div className="flex-1 overflow-y-auto bg-slate-50/50 p-8 custom-scrollbar">
                {activeTab === 'Overview' && <OverviewTab patient={patient} />}
                {activeTab === 'Clinical' && <ClinicalTab patient={patient} onNewEncounter={() => setIsSoapModalOpen(true)} />}
                {activeTab === 'Medications/eRx' && <MedicationsTab patient={patient} />}
                {activeTab === 'Orders' && <OrdersTab patient={patient} />}
                {activeTab === 'Imaging' && <ImagingTab patient={patient} />}
                {activeTab === 'Labs & Vitals' && <LabsVitalsTab patient={patient} />}
                {activeTab === 'Billing' && <BillingTab patient={patient} />}
                {activeTab === 'Documents' && (
                    <DocumentsTab patient={patient} />
                )}
                {activeTab === 'Encounters' && <EncountersTab patient={patient} onNewEncounter={() => setIsSoapModalOpen(true)} />}
                {activeTab === 'Inbox' && <InboxTab patient={patient} />}
                {['Overview', 'Clinical', 'Medications/eRx', 'Orders', 'Imaging', 'Labs & Vitals', 'Billing', 'Documents', 'Encounters', 'Inbox'].indexOf(activeTab) === -1 && (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                            {React.createElement(tabs.find(t => t.id === activeTab)?.icon || Info, { className: "w-8 h-8" })}
                        </div>
                        <h3 className="font-bold uppercase tracking-widest text-sm">{activeTab} tab coming soon</h3>
                    </div>
                )}
            </div>

            {isSoapModalOpen && (
                <SoapNoteModal
                    patient={patient}
                    onClose={() => setIsSoapModalOpen(false)}
                    onSave={handleSaveNote}
                />
            )}
        </div>
    );
}

function OverviewTab({ patient }: { patient: Patient }) {
    return (
        <div className="grid grid-cols-12 gap-8 max-w-[1600px] mx-auto">
            {/* LEFT COLUMN (60%) */}
            <div className="col-span-12 lg:col-span-7 space-y-8">
                {/* Problem List */}
                <Section icon={Activity} title="Problem List" action="+ Add Diagnosis">
                    <div className="space-y-3">
                        {patient.problemList && patient.problemList.length > 0 ? (
                            patient.problemList.map((p, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow group">
                                    <div className="flex items-center gap-4">
                                        <div className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-[10px] font-black text-slate-500 font-mono">
                                            {p.code}
                                        </div>
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{p.description}</span>
                                    </div>
                                    <MoreHorizontal className="w-4 h-4 text-slate-300 group-hover:text-slate-500 cursor-pointer" />
                                </div>
                            ))
                        ) : (
                            <div className="p-4 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                No active problems recorded.
                            </div>
                        )}
                    </div>
                </Section>

                {/* Active Medications */}
                <Section icon={Pill} title="Active Medications" action="View All" accentColor="text-indigo-500">
                    <div className="space-y-3">
                        {patient.activeMedications && patient.activeMedications.length > 0 ? (
                            patient.activeMedications.map((m, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                                            <Pill className="w-5 h-5 text-indigo-500" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-black text-slate-800 dark:text-slate-100">{m.name}</div>
                                            <div className="text-xs text-slate-400 font-bold">{m.dosage} • {m.frequency}</div>
                                        </div>
                                    </div>
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                </div>
                            ))
                        ) : (
                            <div className="p-4 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                No active medications recorded.
                            </div>
                        )}
                    </div>
                </Section>

                {/* Recent Encounters */}
                <Section icon={Clock} title="Recent Encounters" action="View All" accentColor="text-amber-500">
                    <div className="space-y-3">
                        {patient.recentEncounters && patient.recentEncounters.length > 0 ? (
                            patient.recentEncounters.map((e, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-4">
                                        <div className="text-xs font-black text-slate-400 w-24">
                                            {new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{e.title}</div>
                                            <div className="text-xs text-brand font-black tracking-tight">{e.provider}</div>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-300" />
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-slate-400 text-sm font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                No recent encounters recorded.
                            </div>
                        )}
                    </div>
                </Section>

                {/* Upcoming Appointments */}
                <Section icon={Calendar} title="Upcoming Appointments" action="Schedule Appointment" accentColor="text-blue-500">
                    <div className="space-y-3">
                        {patient.upcomingAppointments && patient.upcomingAppointments.length > 0 ? (
                            patient.upcomingAppointments.map((a, i) => (
                                <div key={i} className="flex items-center justify-between p-5 bg-indigo-600 rounded-3xl text-white shadow-lg shadow-indigo-200">
                                    <div className="flex items-center gap-6">
                                        <div className="text-center">
                                            <div className="text-[10px] font-black uppercase tracking-widest opacity-70">
                                                {new Date(a.date).toLocaleDateString('en-US', { month: 'short' })}
                                            </div>
                                            <div className="text-2xl font-black">
                                                {new Date(a.date).toLocaleDateString('en-US', { day: 'numeric' })}
                                            </div>
                                        </div>
                                        <div className="w-px h-10 bg-white/20"></div>
                                        <div>
                                            <div className="text-lg font-black">{a.time} - {a.title}</div>
                                            <div className="text-xs font-bold bg-white/20 inline-block px-2 py-0.5 rounded mt-1">{a.type}</div>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-6 h-6" />
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center bg-slate-100/50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 shadow-sm">
                                No upcoming appointments scheduled
                            </div>
                        )}
                    </div>
                </Section>
            </div>

            {/* RIGHT COLUMN (40%) */}
            <div className="col-span-12 lg:col-span-5 space-y-8">
                {/* Demographics Card */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-none">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Demographics</h3>
                        <button className="text-xs text-brand font-black hover:underline">Edit</button>
                    </div>

                    <div className="grid grid-cols-2 gap-y-6">
                        <DataField label="Name" value={patient.name} />
                        <DataField label="DOB" value={patient.dob} />
                        <DataField label="Age / Sex" value={`38y / ${patient.sex}`} />
                        <DataField label="State" value={patient.state} />
                        <DataField label="Primary Concern" value={patient.serviceLine} />
                        <DataField label="Phone" value={patient.phone} />
                        <DataField label="Email" value={patient.email} />
                        <DataField label="Care Team" value={patient.careTeam && patient.careTeam.length > 0 ? patient.careTeam[0].name : 'Not assigned'} />
                    </div>

                    <div className="mt-8 pt-8 border-t border-slate-50 dark:border-slate-700">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Preferred Pharmacy</h4>
                        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700">
                            <div className="text-sm font-bold text-slate-800 dark:text-slate-100">CVS Pharmacy #04432</div>
                            <div className="text-xs text-slate-500 mt-1">123 Health St, New York, NY 10001</div>
                        </div>
                    </div>
                </div>

                {/* Weight Trend */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-none">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Weight Trend</h3>
                        <span className="text-xs font-black text-emerald-500">-15 lbs (last 60d)</span>
                    </div>

                    <div className="h-24 flex items-end gap-2 px-2">
                        {patient.weightTrend && patient.weightTrend.length > 0 ? (
                            patient.weightTrend.map((v, i) => {
                                const maxVal = Math.max(...patient.weightTrend!, 1);
                                return (
                                    <div
                                        key={i}
                                        className="flex-1 bg-brand rounded-t-lg transition-all hover:bg-brand-600 relative group"
                                        style={{ height: `${(v / maxVal) * 100}%` }}
                                    >
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity font-bold whitespace-nowrap z-20">
                                            {v} lbs
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-slate-300 text-xs font-bold border-2 border-dashed border-slate-100 rounded-xl h-full">
                                No weight data available
                            </div>
                        )}
                    </div>
                    <div className="mt-4 flex justify-between text-[10px] font-black text-slate-300 uppercase tracking-widest">
                        <span>Baseline</span>
                        <span>Current</span>
                    </div>
                </div>

                {/* Consent Status */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-none">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Consent Status</h3>
                        <button className="text-xs text-brand font-black hover:underline">View All</button>
                    </div>
                    <div className="space-y-4">
                        {patient.consents.map((c, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    {c.status === 'Signed' || c.status === 'Acknowledged' ? (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    ) : (
                                        <Clock className="w-5 h-5 text-slate-300" />
                                    )}
                                    <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{c.title}</div>
                                </div>
                                <div className="text-[10px] font-black text-slate-400">{c.date}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tags / Notes */}
                <div className="bg-slate-900 p-8 rounded-[2rem] text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand/20 rounded-full -translate-y-16 translate-x-16 blur-3xl"></div>
                    <h3 className="text-lg font-black uppercase tracking-tight mb-4 relative z-10">Care Notes (Internal)</h3>
                    <div className="flex flex-wrap gap-2 mb-6 relative z-10">
                        {patient.tags?.map((t, i) => (
                            <span key={i} className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${t.color}`}>
                                {t.label}
                            </span>
                        ))}
                        <span className="px-3 py-1 rounded-full text-[10px] font-black bg-white/10 text-white/70 uppercase tracking-tighter">VIP Member</span>
                    </div>
                    <p className="text-sm text-white/60 font-medium italic relative z-10">
                        "Patient prefers morning telehealth slots. Referred by Dr. Smith. Primary language is Spanish but prefers English for clinical documentation."
                    </p>
                </div>
            </div>
        </div>
    );
}

function ClinicalTab({ patient, onNewEncounter }: { patient: Patient; onNewEncounter: () => void }) {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Clinical Header Actions */}
            <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-200 shadow-sm border-l-4 border-l-brand">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-brand/10 rounded-2xl flex items-center justify-center">
                        <Stethoscope className="w-6 h-6 text-brand" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Clinical Documentation</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Manage medical records and encounters</p>
                    </div>
                </div>
                <button
                    onClick={onNewEncounter}
                    className="bg-brand hover:bg-brand-600 text-white font-black py-3 px-8 rounded-2xl text-xs flex items-center gap-2 shadow-xl shadow-brand/20 transition-all uppercase tracking-widest active:scale-95"
                >
                    <Plus className="w-4 h-4" /> Start New Encounter
                </button>
            </div>

            <div className="grid grid-cols-12 gap-8 max-w-[1600px] mx-auto">
                <div className="col-span-12 lg:col-span-4 space-y-8">
                    <Section title="Problem List" icon={Activity}>
                        <div className="space-y-3">
                            {patient.problemList && patient.problemList.length > 0 ? (
                                patient.problemList.map((p, i) => (
                                    <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div>
                                            <div className="text-xs font-black text-brand uppercase">{p.code}</div>
                                            <div className="text-sm font-bold text-slate-800">{p.description}</div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 text-center text-slate-400 text-sm font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                    No active problems recorded.
                                </div>
                            )}
                        </div>
                    </Section>
                </div>
                <div className="col-span-12 lg:col-span-8 space-y-8">
                    <Section title="Medical History" icon={ClipboardList}>
                        <div className="grid grid-cols-2 gap-8 p-4">
                            <DataField label="Social History" value="Non-smoker, Social Alcohol, Active lifestyle" />
                            <DataField label="Surgical History" value="Appendectomy (2015), Knee Arthroscopy (2018)" />
                            <DataField label="Family History" value="HTN (Father), Type 2 Diabetes (Mother)" />
                            <DataField label="Immunizations" value="Up to date (COVID-19, Flu, Tdap)" />
                            <DataField label="Last Eye Exam" value="2025-05-12" />
                            <DataField label="Last Physical" value="2025-11-20" />
                        </div>
                    </Section>
                </div>
            </div>
        </div>
    );
}

function Section({ icon: Icon, title, children, action, accentColor = "text-brand" }: any) {
    return (
        <div className="bg-white dark:bg-slate-800 p-6 lg:p-8 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-none">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <Icon className={`w-6 h-6 ${accentColor}`} />
                    <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight uppercase">{title}</h3>
                </div>
                {action && (
                    <button className="text-xs font-black text-brand uppercase tracking-widest hover:underline">{action}</button>
                )}
            </div>
            {children}
        </div>
    );
}

function DataField({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{value}</div>
        </div>
    );
}
