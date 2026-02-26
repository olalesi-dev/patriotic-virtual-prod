"use client";

import React, { useState, useRef, useEffect } from 'react';
import {
    Calendar, Layout, ChevronDown, Filter, Zap, CreditCard,
    Plus, FileText, BookOpen, X, Clock, ChevronRight, Search,
    Pill, RotateCcw, History as HistoryIcon, ExternalLink, Check, CheckCircle2,
    ArrowUpRight, Ban, Edit3, MoreVertical, FlaskConical, UserPlus, ClipboardCheck, AlertCircle, Info, MoreHorizontal,
    Monitor, Upload, Activity, Shield, Eye, ShieldCheck, FileBadge, FileSearch, Share2, Microscope, Stethoscope,
    Scale, Thermometer, Droplets, Download, TrendingDown, TrendingUp, Heart, Sparkles, LucideIcon, Send, Paperclip, Smile, Phone, Video
} from 'lucide-react';

export function MedicationsTab({ patient }: { patient: any }) {
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [selectedMedForTitration, setSelectedMedForTitration] = useState<any>(null);

    const activeMeds = patient.activeMedications || [];
    const pendingMeds = [
        { name: 'Ozempic', dosage: '0.25mg', route: 'SQ', frequency: 'Weekly', status: 'Sent', date: '2026-02-18' }
    ];
    const historicalMeds = [
        { name: 'Metformin', dosage: '500mg', route: 'PO', frequency: 'Daily', status: 'Discontinued', date: '2025-10-12' },
        { name: 'Lisinopril', dosage: '10mg', route: 'PO', frequency: 'Daily', status: 'Completed', date: '2025-08-05' }
    ];

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* TOP ACTIONS BAR */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-brand">
                <div className="flex flex-wrap items-center gap-3">
                    <button className="bg-brand hover:bg-brand-600 text-white font-bold py-2.5 px-6 rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-brand/20 transition-all active:scale-95">
                        <Plus className="w-4 h-4" /> New Prescription
                    </button>
                    <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-6 rounded-xl text-sm flex items-center gap-2 transition-all">
                        <RotateCcw className="w-4 h-4" /> Refill Selected
                    </button>
                    <button className="bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold py-2.5 px-6 rounded-xl text-sm flex items-center gap-2 transition-all border border-amber-100">
                        <Zap className="w-4 h-4" /> AI Titrate
                    </button>
                </div>
                <div className="flex items-center gap-3">
                    <button className="text-slate-500 hover:text-slate-800 font-bold text-sm flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-slate-50 transition-all">
                        <HistoryIcon className="w-4 h-4 text-slate-400" /> Rx History
                    </button>
                    <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all">
                        DoseSpot Portal <ExternalLink className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* SECTION 1: ACTIVE MEDICATIONS */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                            <Pill className="w-5 h-5 text-emerald-600" />
                        </div>
                        <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Active Medications</h2>
                    </div>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-full uppercase tracking-widest">
                        {activeMeds.length} CURRENT
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                <th className="px-6 py-4">Drug Information</th>
                                <th className="px-6 py-4">Protocol & Frequency</th>
                                <th className="px-6 py-4">Titration Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {activeMeds.length > 0 ? activeMeds.map((med: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-5">
                                        <div className="font-bold text-slate-900 text-sm mb-0.5">{med.name}</div>
                                        <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
                                            <span>{med.dosage}</span>
                                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                            <span>{med.route || 'PO'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="text-sm font-bold text-slate-700 mb-0.5">{med.frequency}</div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase">Start: {med.startDate || '2026-01-15'}</div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2">
                                            <div className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded border border-amber-100">
                                                Next: 2026-03-01
                                            </div>
                                            <Zap className="w-3 h-3 text-amber-400" />
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => setSelectedMedForTitration(med)}
                                                className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                                title="Titrate"
                                            >
                                                <Zap className="w-4 h-4 fill-amber-500" />
                                            </button>
                                            <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-all group-hover:text-slate-600">
                                                <RotateCcw className="w-4 h-4" />
                                            </button>
                                            <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-all group-hover:text-slate-600">
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                            <button className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-all">
                                                <Ban className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-sm font-medium">
                                        No active medications found for this patient.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* SECTION 2: PENDING PRESCRIPTIONS */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-amber-50/30">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                            <Clock className="w-5 h-5 text-amber-600" />
                        </div>
                        <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Pending Prescriptions</h2>
                    </div>
                </div>
                <div className="p-6">
                    {pendingMeds.length > 0 ? (
                        <div className="space-y-4">
                            {pendingMeds.map((med, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 border-l-4 border-l-amber-400">
                                    <div className="flex items-center gap-6">
                                        <div>
                                            <div className="font-bold text-slate-900 text-sm">{med.name} {med.dosage}</div>
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Sent: {med.date}</div>
                                        </div>
                                        <div className="h-8 w-px bg-slate-200"></div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                                            <span className="text-xs font-black text-amber-700 uppercase tracking-widest">{med.status} (DoseSpot)</span>
                                        </div>
                                    </div>
                                    <button className="text-xs font-bold text-brand hover:underline">Track Status</button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-400 text-sm font-medium">No pending prescriptions</div>
                    )}
                </div>
            </div>

            {/* SECTION 3: PRESCRIPTION HISTORY */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <button
                    onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                    className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                            <HistoryIcon className="w-5 h-5 text-slate-500" />
                        </div>
                        <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Prescription History</h2>
                    </div>
                    <ChevronDown className={`w-6 h-6 text-slate-400 transition-transform duration-300 ${isHistoryOpen ? 'rotate-180' : ''}`} />
                </button>

                {isHistoryOpen && (
                    <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-300">
                        <div className="space-y-3">
                            {historicalMeds.map((med, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-6">
                                        <div className="opacity-60">
                                            <div className="font-bold text-slate-900 text-sm">{med.name} {med.dosage}</div>
                                            <div className="text-[10px] font-black text-slate-400 uppercase">{med.date}</div>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${med.status === 'Discontinued' ? 'bg-red-50 text-red-600' : 'bg-slate-200 text-slate-600'
                                            }`}>
                                            {med.status}
                                        </span>
                                    </div>
                                    <button className="text-[10px] font-black text-brand uppercase tracking-widest hover:underline">View Rx</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* AI TITRATION PANEL */}
            {selectedMedForTitration && (
                <TitrationPanel
                    medication={selectedMedForTitration}
                    onClose={() => setSelectedMedForTitration(null)}
                />
            )}
        </div>
    );
}

function TitrationPanel({ medication, onClose }: { medication: any, onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-[120] flex justify-end">
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            ></div>
            <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
                <div className="p-8 border-b border-slate-100 bg-amber-50/50">
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
                            <Zap className="w-6 h-6 text-amber-600 fill-amber-500" />
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-all border border-transparent hover:border-amber-200">
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">AI Titration Engine</h2>
                    <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Running protocol analysis...</p>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                    <div className="p-6 bg-slate-900 rounded-3xl text-white">
                        <div className="text-[10px] font-black text-brand uppercase tracking-widest mb-2">Current Regimen</div>
                        <div className="text-xl font-bold mb-1">{medication.name}</div>
                        <div className="text-sm font-medium text-white/70">{medication.dosage} • {medication.frequency}</div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-slate-800 font-bold uppercase text-sm tracking-tight">
                            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                            <span>Recommendation</span>
                        </div>
                        <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl">
                            <div className="text-emerald-800 font-bold mb-2">Increase to 0.5mg SQ Weekly</div>
                            <p className="text-xs text-emerald-700/80 leading-relaxed font-medium">
                                Patient has tolerated 0.25mg for 4 weeks with no significant GI distress. Weight loss plateaud at -2.4 lbs over last 14 days. Glycemic markers suggest capacity for higher dose.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-slate-800 font-bold uppercase text-sm tracking-tight">
                            <FileText className="w-4 h-4 text-slate-400" />
                            <span>Clinical Reasoning</span>
                        </div>
                        <div className="space-y-3">
                            <ReasonItem text="GI Symptoms Index: 0.1 (Minimal)" />
                            <ReasonItem text="BMI Change: -0.4% (Below target)" />
                            <ReasonItem text="Lab Compliance: Up to date" />
                        </div>
                    </div>
                </div>

                <div className="p-8 bg-slate-50 border-t border-slate-100 space-y-3">
                    <button
                        onClick={() => {
                            alert('Prescription approved and sent to DoseSpot!');
                            onClose();
                        }}
                        className="w-full py-4 bg-brand text-white font-black rounded-2xl shadow-xl shadow-brand/20 hover:bg-brand-600 transition-all flex items-center justify-center gap-2 group"
                    >
                        Approve & Prescribe <Check className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </button>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => {
                                alert('Dose modification interface coming soon!');
                            }}
                            className="py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-50 transition-all"
                        >
                            Modify Dose
                        </button>
                        <button
                            onClick={() => {
                                if (confirm('Are you sure you want to reject this AI recommendation?')) {
                                    onClose();
                                }
                            }}
                            className="py-3 bg-white border border-slate-200 text-red-600 font-bold rounded-xl text-sm hover:bg-red-50 transition-all"
                        >
                            Reject
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ReasonItem({ text }: { text: string }) {
    return (
        <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
            <div className="w-1.5 h-1.5 bg-brand rounded-full"></div>
            {text}
        </div>
    );
}

export function OrdersTab({ patient }: { patient: any }) {
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
    const [orderType, setOrderType] = useState<'lab' | 'referral' | 'other'>('lab');

    const orders = patient.orders || [];
    const pendingOrders = orders.filter((o: any) => ['Ordered', 'Sent', 'In Progress'].includes(o.status));
    const resultedOrders = orders.filter((o: any) => o.status === 'Resulted');

    const handleNewOrder = (type: 'lab' | 'referral' | 'other') => {
        setOrderType(type);
        setIsNewOrderModalOpen(true);
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* TOP ACTIONS BAR */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-brand">
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => handleNewOrder('lab')}
                        className="bg-brand hover:bg-brand-600 text-white font-bold py-2.5 px-6 rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-brand/20 transition-all active:scale-95"
                    >
                        <FlaskConical className="w-4 h-4" /> New Lab Order
                    </button>
                    <button
                        onClick={() => handleNewOrder('referral')}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-6 rounded-xl text-sm flex items-center gap-2 transition-all"
                    >
                        <UserPlus className="w-4 h-4" /> New Referral
                    </button>
                    <button
                        onClick={() => handleNewOrder('other')}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-6 rounded-xl text-sm flex items-center gap-2 transition-all"
                    >
                        <Plus className="w-4 h-4" /> Other Order
                    </button>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                        className="text-slate-500 hover:text-slate-800 font-bold text-sm flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-slate-50 transition-all"
                    >
                        <HistoryIcon className="w-4 h-4 text-slate-400" /> View Order History
                    </button>
                </div>
            </div>

            {/* SECTION 1: PENDING ORDERS */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
                            <Clock className="w-5 h-5 text-brand" />
                        </div>
                        <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Pending Orders</h2>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                <th className="px-6 py-4">Order Type</th>
                                <th className="px-6 py-4">Description</th>
                                <th className="px-6 py-4">Date Ordered</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Ordered By</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {pendingOrders.length > 0 ? pendingOrders.map((order: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-5 capitalize font-bold text-slate-700 text-sm">{order.type}</td>
                                    <td className="px-6 py-5 text-sm font-medium text-slate-900">{order.description}</td>
                                    <td className="px-6 py-5 text-sm text-slate-500">{order.date}</td>
                                    <td className="px-6 py-5">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${order.status === 'Ordered' ? 'bg-blue-50 text-blue-600' :
                                            order.status === 'Sent' ? 'bg-amber-50 text-amber-600' :
                                                'bg-indigo-50 text-indigo-600'
                                            }`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 text-sm font-medium text-slate-600">{order.orderedBy}</td>
                                    <td className="px-6 py-5 text-right">
                                        <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg group-hover:text-slate-600">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm font-medium">
                                        No pending orders
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* SECTION 2: LAB ORDERS */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                            <FlaskConical className="w-5 h-5 text-emerald-600" />
                        </div>
                        <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Recent Lab Results</h2>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                <th className="px-6 py-4">Test Description</th>
                                <th className="px-6 py-4">Result Date</th>
                                <th className="px-6 py-4">Ordered By</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {resultedOrders.filter((o: any) => o.type === 'lab').length > 0 ? resultedOrders.filter((o: any) => o.type === 'lab').map((order: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-5">
                                        <div className="font-bold text-slate-900 text-sm">{order.description}</div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase">Tests: {order.tests?.join(', ')}</div>
                                    </td>
                                    <td className="px-6 py-5 text-sm text-slate-500 font-medium">{order.date}</td>
                                    <td className="px-6 py-5 text-sm font-medium text-slate-600">{order.orderedBy}</td>
                                    <td className="px-6 py-5">
                                        <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded text-[10px] font-bold uppercase tracking-widest">Resulted</span>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <button className="text-brand text-xs font-bold hover:underline">View Report</button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm font-medium">
                                        No recent lab results
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODALS */}
            {isNewOrderModalOpen && (
                <NewOrderModal
                    type={orderType}
                    patient={patient}
                    onClose={() => setIsNewOrderModalOpen(false)}
                />
            )}
        </div>
    );
}

function NewOrderModal({ type, patient, onClose }: { type: 'lab' | 'referral' | 'other', patient: any, onClose: () => void }) {
    const [selectedPanel, setSelectedPanel] = useState<string | null>(null);
    const [urgency, setUrgency] = useState('Routine');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const labPanels = [
        { name: 'GLP-1 Panel', tests: 'CMP, A1C, Lipid, TSH' },
        { name: 'TRT Panel', tests: 'Total T, Free T, E2, CBC, CMP, PSA, Lipid' },
        { name: 'Hair Loss Panel', tests: 'TSH, Ferritin, DHEA-S, ANA' },
        { name: 'Basic Metabolic', tests: 'BMP' },
        { name: 'Comprehensive Metabolic', tests: 'CMP' }
    ];

    const handleSubmit = () => {
        setIsSubmitting(true);
        setTimeout(() => {
            alert('Order submitted successfully and transmitted to Health Gorilla!');
            setIsSubmitting(false);
            onClose();
        }, 800);
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${type === 'lab' ? 'bg-emerald-100 text-emerald-600' :
                            type === 'referral' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'
                            }`}>
                            {type === 'lab' ? <FlaskConical className="w-5 h-5" /> :
                                type === 'referral' ? <UserPlus className="w-5 h-5" /> : <ClipboardCheck className="w-5 h-5" />}
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                                New {type === 'lab' ? 'Lab Order' : type === 'referral' ? 'Referral' : 'Order'}
                            </h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{patient.name} • {patient.mrn}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-all border border-transparent hover:border-slate-200">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {type === 'lab' && (
                        <>
                            <div className="space-y-4">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Select Order Set</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {labPanels.map((panel, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setSelectedPanel(panel.name)}
                                            className={`text-left p-4 rounded-2xl border transition-all group ${selectedPanel === panel.name ? 'border-brand bg-brand/5' : 'border-slate-200 hover:border-brand hover:bg-brand/5'
                                                }`}
                                        >
                                            <div className={`font-bold text-sm ${selectedPanel === panel.name ? 'text-brand' : 'text-slate-900 group-hover:text-brand'}`}>{panel.name}</div>
                                            <div className="text-[10px] text-slate-500 mt-1">{panel.tests}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Individual Lab Search</label>
                                <div className="relative">
                                    <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                                    <input
                                        type="text"
                                        placeholder="Search by test name or LOINC code..."
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all font-medium"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Diagnosis</label>
                                    <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none font-medium">
                                        {patient.problemList && patient.problemList.length > 0 ? (
                                            patient.problemList.map((p: any, i: number) => (
                                                <option key={i} value={p.code}>{p.code} - {p.description}</option>
                                            ))
                                        ) : (
                                            <option disabled>No problems listed</option>
                                        )}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Urgency</label>
                                    <div className="flex gap-2">
                                        {['Routine', 'Stat'].map(u => (
                                            <button
                                                key={u}
                                                onClick={() => setUrgency(u)}
                                                className={`flex-1 py-3 rounded-xl border text-xs font-bold transition-all ${urgency === u ? 'border-brand bg-brand text-white' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                                                    }`}
                                            >
                                                {u}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lab Facility</label>
                                <div className="p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600">
                                            <Layout className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-900">Quest Diagnostics #1234</div>
                                            <div className="text-[10px] text-slate-500">Health Gorilla Network</div>
                                        </div>
                                    </div>
                                    <button className="text-xs font-bold text-brand">Change</button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Instructions</label>
                                <textarea
                                    placeholder="e.g. Fasting 12 hours required..."
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm h-24 focus:outline-none"
                                ></textarea>
                            </div>
                        </>
                    )}

                    {type === 'referral' && (
                        <>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Referral Type</label>
                                <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none">
                                    <option>Specialist</option>
                                    <option>Imaging</option>
                                    <option>PT / Occupational Therapy</option>
                                    <option>Home Health</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Referring To</label>
                                <div className="relative">
                                    <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                                    <input
                                        type="text"
                                        placeholder="Search provider or facility..."
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason / ICD-10</label>
                                <textarea
                                    placeholder="Clinical reason for referral and diagnosis codes..."
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm h-32 focus:outline-none"
                                ></textarea>
                            </div>
                        </>
                    )}

                    {type === 'other' && (
                        <>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Type</label>
                                <input
                                    type="text"
                                    placeholder="e.g. DME, Patient Education, Prior Auth..."
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</label>
                                <textarea
                                    placeholder="Detailed description of the order..."
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm h-32 focus:outline-none"
                                ></textarea>
                            </div>
                        </>
                    )}
                </div>

                <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                    <button onClick={onClose} className="flex-1 py-4 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-100 transition-all">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className={`flex-[2] py-4 text-white font-black rounded-2xl shadow-xl shadow-brand/20 transition-all flex items-center justify-center gap-2 group ${isSubmitting ? 'bg-brand/70 cursor-not-allowed' : 'bg-brand hover:bg-brand-600'
                            }`}
                    >
                        {isSubmitting ? (
                            <>Processing...</>
                        ) : (
                            <>Submit Order <Check className="w-5 h-5 group-hover:scale-110 transition-transform" /></>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function ImagingTab({ patient }: { patient: any }) {
    const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'pacs'>('list');
    const [isPacsLoading, setIsPacsLoading] = useState(false);
    const imaging = patient.imaging || [];

    const handleViewPacs = () => {
        setIsPacsLoading(true);
        setViewMode('pacs');
        setTimeout(() => setIsPacsLoading(false), 1200);
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* TOP ACTIONS BAR */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-brand">
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => setIsNewOrderModalOpen(true)}
                        className="bg-brand hover:bg-brand-600 text-white font-bold py-2.5 px-6 rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-brand/20 transition-all active:scale-95"
                    >
                        <Plus className="w-4 h-4" /> New Imaging Order
                    </button>
                    <button
                        onClick={() => viewMode === 'list' ? handleViewPacs() : setViewMode('list')}
                        className={`font-bold py-2.5 px-6 rounded-xl text-sm flex items-center gap-2 transition-all ${viewMode === 'pacs' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                    >
                        <Monitor className="w-4 h-4" /> {viewMode === 'pacs' ? 'View as List' : 'View in PACS'}
                    </button>
                    <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-6 rounded-xl text-sm flex items-center gap-2 transition-all">
                        <Upload className="w-4 h-4" /> Upload External Study
                    </button>
                </div>
            </div>

            {viewMode === 'list' ? (
                <>
                    {/* SECTION 1: IMAGING RESULTS */}
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                                    <Monitor className="w-5 h-5 text-indigo-600" />
                                </div>
                                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Imaging Results</h2>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                        <th className="px-6 py-4">Study / Modality</th>
                                        <th className="px-6 py-4">Body Part</th>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Facility</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {imaging.length > 0 ? imaging.map((img: any, i: number) => (
                                        <tr key={i} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-5">
                                                <div className="font-bold text-slate-900 text-sm">{img.modality} Scan</div>
                                                <div className="text-[10px] font-black text-slate-400 uppercase">ID: {img.id}</div>
                                            </td>
                                            <td className="px-6 py-5 text-sm font-bold text-slate-700">{img.bodyPart}</td>
                                            <td className="px-6 py-5 text-sm text-slate-500 font-medium">{img.date}</td>
                                            <td className="px-6 py-5 text-sm font-medium text-slate-600">{img.facility}</td>
                                            <td className="px-6 py-5">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${img.status === 'Reported' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                                                    }`}>
                                                    {img.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={handleViewPacs}
                                                        className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-lg hover:bg-indigo-100 transition-all uppercase tracking-widest"
                                                    >
                                                        View Images
                                                    </button>
                                                    <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg">
                                                        <FileText className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm font-medium">
                                                No imaging studies found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <div className="bg-slate-900 rounded-[2.5rem] overflow-hidden aspect-video relative group border-[8px] border-slate-800 shadow-2xl">
                    <div className="absolute inset-0 bg-[url('https://ohif.org/img/ohif-viewer.png')] bg-cover bg-center opacity-40 mix-blend-luminosity"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>

                    {isPacsLoading && (
                        <div className="absolute inset-0 z-10 bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
                            <div className="w-16 h-16 border-4 border-brand/20 border-t-brand rounded-full animate-spin mb-4"></div>
                            <p className="text-white font-bold text-sm uppercase tracking-widest">Initialising PACS...</p>
                        </div>
                    )}

                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12">
                        <div className="w-20 h-20 bg-brand/20 rounded-3xl flex items-center justify-center mb-6 animate-pulse border border-brand/30">
                            <Monitor className="w-10 h-10 text-brand" />
                        </div>
                        <h2 className="text-3xl font-black text-white tracking-tight uppercase mb-2">OHIF Zero-Footprint Viewer</h2>
                        <p className="text-slate-400 text-sm max-w-md font-medium leading-relaxed">
                            Connecting to GCP Cloud Healthcare API DICOM store... Secure, clinical-grade viewing directly in the browser.
                        </p>

                        <div className="mt-8 flex gap-4">
                            <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700">
                                <Activity className="w-4 h-4 text-emerald-500" />
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">DICOMweb Connected</span>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700">
                                <Shield className="w-4 h-4 text-brand" />
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">HIPAA Compliant</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => setViewMode('list')}
                        className="absolute top-8 left-8 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl text-white transition-all border border-white/10"
                    >
                        <ChevronRight className="w-5 h-5 rotate-180" />
                    </button>

                    <div className="absolute bottom-8 right-8 flex items-center gap-3">
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Powered by Orosun PACS</span>
                    </div>
                </div>
            )}

            {/* MODALS */}
            {isNewOrderModalOpen && (
                <ImagingOrderModal
                    patient={patient}
                    onClose={() => setIsNewOrderModalOpen(false)}
                />
            )}
        </div>
    );
}

function ImagingOrderModal({ patient, onClose }: { patient: any, onClose: () => void }) {
    const [modality, setModality] = useState('MRI');
    const [selectedBodyPart, setSelectedBodyPart] = useState('');
    const [urgency, setUrgency] = useState('Routine');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedSet, setSelectedSet] = useState<string | null>(null);

    const bodyParts: any = {
        'MRI': ['Brain', 'Spine', 'Knee', 'Shoulder', 'Abdomen'],
        'CT': ['Head', 'Chest', 'Abdomen/Pelvis', 'Sinus'],
        'X-ray': ['Chest', 'Hand', 'Foot', 'Knee', 'Spine'],
        'Ultrasound': ['Abdomen', 'Pelvis', 'Vascular', 'Breast'],
        'DEXA': ['Full Body', 'Hip/Spine'],
        'Mammogram': ['Screening', 'Diagnostic']
    };

    const orderSets = [
        { name: 'Weight Loss Screening', desc: 'DEXA Body Composition', modality: 'DEXA', bodyPart: 'Full Body' },
        { name: 'TRT Monitoring', desc: 'Protocol Reference (No Imaging)', modality: 'MRI', bodyPart: 'Brain' },
        { name: 'Hair Loss Workup', desc: 'Scalp Dermoscopy referral', modality: 'Ultrasound', bodyPart: 'Vascular' }
    ];

    const handleSetSelect = (set: any) => {
        setSelectedSet(set.name);
        setModality(set.modality);
        setSelectedBodyPart(set.bodyPart);
    };

    const handleSubmit = () => {
        setIsSubmitting(true);
        setTimeout(() => {
            alert('Imaging order submitted to Orosun Health network!');
            setIsSubmitting(false);
            onClose();
        }, 800);
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                            <Monitor className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">New Imaging Order</h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">{patient.name} • {patient.mrn}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-all border border-transparent hover:border-slate-200">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <div className="space-y-4">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Imaging Order Sets</label>
                        <div className="grid grid-cols-3 gap-3">
                            {orderSets.map((set, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSetSelect(set)}
                                    className={`text-left p-4 rounded-2xl border transition-all group ${selectedSet === set.name ? 'border-brand bg-brand/5' : 'border-slate-200 hover:border-indigo-500 hover:bg-indigo-50'
                                        }`}
                                >
                                    <div className={`font-bold text-[10px] uppercase tracking-tight leading-tight ${selectedSet === set.name ? 'text-brand' : 'text-slate-900 group-hover:text-indigo-600'}`}>{set.name}</div>
                                    <div className="text-[9px] text-slate-500 mt-1 leading-tight">{set.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Modality</label>
                            <select
                                value={modality}
                                onChange={(e) => {
                                    const newModality = e.target.value;
                                    setModality(newModality);
                                    setSelectedBodyPart(bodyParts[newModality][0]);
                                    setSelectedSet(null);
                                }}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none font-bold"
                            >
                                {Object.keys(bodyParts).map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Body Part</label>
                            <select
                                value={selectedBodyPart || (bodyParts[modality] ? bodyParts[modality][0] : '')}
                                onChange={(e) => {
                                    setSelectedBodyPart(e.target.value);
                                    setSelectedSet(null);
                                }}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none font-bold"
                            >
                                {bodyParts[modality]?.map((p: string) => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contrast</label>
                            <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none">
                                <option>Without Contrast</option>
                                <option>With Contrast</option>
                                <option>With & Without</option>
                                <option>N/A</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Urgency</label>
                            <div className="flex gap-2">
                                {['Routine', 'Stat'].map(u => (
                                    <button
                                        key={u}
                                        onClick={() => setUrgency(u)}
                                        className={`flex-1 py-3 rounded-xl border text-xs font-bold transition-all ${urgency === u ? 'border-brand bg-brand text-white' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                                            }`}
                                    >
                                        {u}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Clinical Indication / Reason</label>
                        <textarea
                            placeholder="Reason for study and clinical background..."
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm h-32 focus:outline-none"
                        ></textarea>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Diagnosis Codes (ICD-10)</label>
                        <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                            <input
                                type="text"
                                placeholder="Search diagnosis..."
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                    <button onClick={onClose} className="flex-1 py-4 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-100 transition-all">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className={`flex-[2] py-4 text-white font-black rounded-2xl shadow-xl shadow-brand/20 transition-all flex items-center justify-center gap-2 group ${isSubmitting ? 'bg-brand/70 cursor-not-allowed' : 'bg-brand hover:bg-brand-600'
                            }`}
                    >
                        {isSubmitting ? 'Submitting...' : 'Send Order'} <Check className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export function BillingTab({ patient }: { patient: any }) {
    const billing = patient.billing || {
        subscription: { plan: 'No Active Plan', status: 'Cancelled', nextBillingDate: 'N/A', amount: 0 },
        balance: 0.00,
        history: []
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* TOP STATS BAR */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm border-l-4 border-l-brand">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Account Balance</div>
                    <div className="text-3xl font-black text-slate-900">${billing.balance.toFixed(2)}</div>
                    <div className="text-[10px] font-bold text-emerald-600 mt-1 uppercase tracking-tight">Account in good standing</div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Subscription</div>
                    <div className="text-xl font-black text-slate-900 truncate">{billing.subscription.plan}</div>
                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest mt-2 ${billing.subscription.status === 'Active' ? 'bg-emerald-50 text-emerald-600' :
                        billing.subscription.status === 'Past Due' ? 'bg-amber-50 text-amber-600' :
                            'bg-slate-100 text-slate-500'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${billing.subscription.status === 'Active' ? 'bg-emerald-500' :
                            billing.subscription.status === 'Past Due' ? 'bg-amber-500' :
                                'bg-slate-400'
                            }`}></span>
                        {billing.subscription.status}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Next Billing Date</div>
                    <div className="text-xl font-black text-slate-900">{billing.subscription.nextBillingDate}</div>
                    <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">Recurring: ${billing.subscription.amount.toFixed(2)}</div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-center gap-2">
                    <button onClick={() => alert("Stripe Portal would open here.")} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-2 rounded-xl text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2">
                        <ExternalLink className="w-3 h-3" /> Stripe Dashboard
                    </button>
                    <button onClick={() => alert("Apply Credit modal would open here.")} className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-black py-2 rounded-xl text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2">
                        <Plus className="w-3 h-3" /> Add Credit
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* PAYMENT HISTORY */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Payment History</h3>
                                <p className="text-xs text-slate-500 font-medium tracking-wide">All transactions processed via Stripe</p>
                            </div>
                            <button onClick={() => alert("Generate Invoice flow started.")} className="bg-brand hover:bg-brand-600 text-white font-black py-2.5 px-6 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-brand/20 transition-all active:scale-95 uppercase tracking-widest">
                                <Zap className="w-4 h-4" /> Create Invoice
                            </button>
                        </div>

                        <div className="flex-1">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction</th>
                                        <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                        <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                        <th className="px-8 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                                        <th className="px-8 py-4"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {billing.history.length > 0 ? billing.history.map((item: any) => (
                                        <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                                            <td className="px-8 py-6">
                                                <div className="text-sm font-black text-slate-900">{item.description}</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">ID: {item.id}</div>
                                            </td>
                                            <td className="px-8 py-6 text-sm font-bold text-slate-600">{item.date}</td>
                                            <td className="px-8 py-6">
                                                <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${item.status === 'Paid' ? 'bg-emerald-50 text-emerald-600' :
                                                    item.status === 'Pending' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                                                    }`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-right text-sm font-black text-slate-900">${item.amount.toFixed(2)}</td>
                                            <td className="px-8 py-6 text-right">
                                                <button className="p-2 bg-slate-50 text-slate-400 hover:text-brand hover:bg-brand/5 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                                    <Download className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} className="py-24 text-center">
                                                <div className="flex flex-col items-center">
                                                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                                                        <CreditCard className="w-8 h-8 text-slate-200" />
                                                    </div>
                                                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">No payment history</h4>
                                                    <p className="text-xs text-slate-400 font-medium">Transactions will appear here once processed.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* SIDEBAR - SERVICE ASSIGNMENTS */}
                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center">
                                <ClipboardCheck className="w-5 h-5 text-brand" />
                            </div>
                            <h3 className="font-black text-slate-900 uppercase tracking-tight">Assigned Services</h3>
                        </div>

                        <div className="space-y-4">
                            {[
                                { name: `${patient.serviceLine || 'Primary'} Membership`, price: patient.billing?.subscription?.amount ? `$${patient.billing.subscription.amount} / mo` : '$299 / mo', status: 'Included' },
                                { name: 'Clinical Consultation', price: '$150 / ea', status: 'Active' },
                                { name: 'Lab Processing', price: '$45 / ea', status: 'As Needed' }
                            ].map((service, i) => (
                                <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-sm font-black text-slate-900">{service.name}</span>
                                        <span className="text-[10px] font-black text-brand uppercase tracking-widest">{service.price}</span>
                                    </div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{service.status}</div>
                                </div>
                            ))}
                        </div>

                        <button onClick={() => alert("Add Service modal would open here.")} className="w-full mt-6 py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs font-black uppercase tracking-widest hover:border-brand hover:text-brand hover:bg-brand/5 transition-all">
                            Add Service
                        </button>
                    </div>

                    {/* PAYMENT METHODS */}
                    <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl shadow-slate-200 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700"></div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 text-white mb-6">
                                <CreditCard className="w-6 h-6" />
                                <h3 className="font-black uppercase tracking-tight">Primary Payment</h3>
                            </div>

                            <div className="bg-white/10 p-5 rounded-2xl border border-white/20 mb-6">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="w-10 h-6 bg-white/20 rounded"></div>
                                    <div className="text-[10px] font-black text-white/50 uppercase tracking-widest underline decoration-white/20">Default</div>
                                </div>
                                <div className="text-lg font-mono text-white tracking-widest uppercase mb-1">••••  ••••  ••••  4242</div>
                                <div className="flex justify-between items-end">
                                    <div className="text-[10px] font-bold text-white/50 uppercase">Exp: 12/28</div>
                                    <div className="text-[10px] font-black text-white uppercase tracking-widest">VISA</div>
                                </div>
                            </div>

                            <button onClick={() => alert("Payment Method Update flow started.")} className="w-full py-3 bg-white text-slate-900 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95">
                                Change Method
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function DocumentationTab({ notes }: { notes: any[] }) {
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                    <FileText className="w-5 h-5 text-slate-400" />
                    <span>Clinical Documentation ({notes?.length || 0})</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input type="text" placeholder="Search documentation..." className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all font-medium" />
                    </div>
                    <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50"><Filter className="w-4 h-4 text-slate-500" /></button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {notes?.map((note, i) => (
                    <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:border-brand/40 transition-all group">
                        <div className="p-5 border-b border-slate-50 bg-slate-50/30">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-bold text-brand uppercase tracking-wider">{note.type || 'Clinical Note'}</span>
                                <span className="text-[10px] font-bold text-slate-400">{note.date}</span>
                            </div>
                            <h3 className="font-bold text-slate-900 group-hover:text-brand transition-colors truncate">SOAP Encounter Note</h3>
                        </div>
                        <div className="p-5">
                            <div className="text-xs text-slate-500 mb-4 line-clamp-3 leading-relaxed">
                                {note.subjective || "No summary available for this clinical encounter."}
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-cyan-100 flex items-center justify-center text-[10px] font-bold text-cyan-700">DO</div>
                                    <span className="text-[10px] font-bold text-slate-600">Dayo Olufolaju</span>
                                </div>
                                <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">Signed</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {(!notes || notes.length === 0) && (
                <div className="text-center py-24 bg-white rounded-xl border-2 border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BookOpen className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-slate-800 font-bold mb-1">No clinical notes yet</h3>
                    <p className="text-slate-400 text-sm mb-6">Create your first clinical encounter note for this patient.</p>
                    <button className="bg-brand text-white px-6 py-2.5 rounded-lg font-bold text-sm shadow-md hover:bg-brand-600 transition-all">+ Start clinical note</button>
                </div>
            )}
        </div>
    )
}

export function SoapNoteModal({ onClose, onSave, patient }: { onClose: () => void, onSave: (note: any) => void, patient: any }) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSigned, setIsSigned] = useState(false);
    const [signature, setSignature] = useState('');

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        serviceLine: patient.serviceLine || 'General',
        encounterType: 'Initial',
        visitModality: 'Video',
        chiefComplaint: '',
        hpi: '',
        ros: {} as Record<string, boolean>,
        vitals: {
            wt: patient.vitalsHistory?.[0]?.weight || '',
            bp: patient.vitalsHistory?.[0]?.bp || '',
            hr: patient.vitalsHistory?.[0]?.hr || '',
            temp: '',
            bmi: patient.vitalsHistory?.[0]?.bmi || ''
        },
        physicalExam: '',
        assessment: '',
        diagnoses: [] as string[],
        planMedications: '',
        planLabs: [] as string[],
        planImaging: '',
        followUp: '4wk',
        patientEducation: '',
        cptCode: '',
        attestation: true,
        addenda: [] as { text: string, timestamp: string }[]
    });

    const [newAddendum, setNewAddendum] = useState('');

    const rosOptions = [
        { system: 'Constitutional', symptoms: ['Fatigue', 'Fever', 'Weight Loss'] },
        { system: 'HEENT', symptoms: ['Headache', 'Vision Changes', 'Sore Throat'] },
        { system: 'CV', symptoms: ['Chest Pain', 'Palpitations', 'Edema'] },
        { system: 'Respiratory', symptoms: ['Cough', 'Shortness of Breath'] },
        { system: 'GI', symptoms: ['Nausea', 'Abdominal Pain', 'Diarrhea'] },
        { system: 'Neuro', symptoms: ['Dizziness', 'Numbness', 'Weakness'] }
    ];

    const COMMON_ICD10 = [
        { code: 'E66.9', description: 'Obesity, unspecified' },
        { code: 'E66.01', description: 'Morbid obesity' },
        { code: 'E11.9', description: 'Type 2 diabetes' },
        { code: 'R73.03', description: 'Prediabetes' },
        { code: 'E88.81', description: 'Metabolic syndrome' },
        { code: 'I10', description: 'Hypertension' },
        { code: 'E78.5', description: 'Hyperlipidemia' }
    ];

    const COMMON_LABS = [
        'CMP (Comprehensive Metabolic Panel)',
        'CBC (Complete Blood Count)',
        'HbA1c',
        'Lipid Panel',
        'TSH (Thyroid Stimulating Hormone)',
        'Free T3 / Free T4',
        'Vitamin D',
        'Insulin, Fasting'
    ];

    const handleAiScribe = async () => {
        setIsGenerating(true);
        // Simulate AI processing
        await new Promise(resolve => setTimeout(resolve, 2500));

        const firstName = patient.name.split(' ')[0];
        const age = 38; // Mock age

        // Mock AI-generated content based on patient data
        setFormData((prev: any) => ({
            ...prev,
            chiefComplaint: `${patient.serviceLine || 'Medical'} follow-up and management.`,
            hpi: `${firstName} is a ${age}yo ${patient.sex?.toLowerCase() || 'patient'} presenting for follow-up. Reports positive progress. No significant side effects from current protocol. Appetite suppression remains effective. Sleep and energy levels are stable.`,
            physicalExam: 'Video visit performed. Patient appears well, alert, and in no acute distress. Affect is normal. Speech is normal. No visible peripheral edema.',
            assessment: `${patient.serviceLine || 'Medical'} protocol progressing well. Clinical markers indicate positive response.`,
            diagnoses: ['E66.9 Obesity, unspecified', 'E11.9 Type 2 diabetes mellitus without complications'],
            planMedications: `Continue current protocol as tolerated. Titrate as per clinical guidelines.`,
            cptCode: '99214 - FU (Ext)',
            patientEducation: 'Discussed high-protein diet, hydration, and exercise.'
        }));

        setIsGenerating(false);
    };

    const handleSign = () => {
        if (!signature) {
            alert('Please enter your signature to lock the note.');
            return;
        }
        setIsSigned(true);
    };

    const handleSave = () => {
        if (!isSigned) {
            if (!confirm('Note is not signed. Save as draft?')) return;
        }
        onSave({
            ...formData,
            status: isSigned ? 'Signed' : 'Draft',
            author: signature,
            timestamp: new Date().toISOString()
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
                {/* HEADER SECTION */}
                <div className="px-10 py-6 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-brand rounded-2xl flex items-center justify-center shadow-xl shadow-brand/20">
                            <Stethoscope className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-2xl font-black text-slate-900 leading-none">CLINICAL ENCOUNTER</h2>
                                {isSigned && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded uppercase tracking-widest">SIGNED</span>}
                            </div>
                            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-[0.1em]">
                                {patient.name} • MRN: {patient.mrn} • {formData.date} • {formData.visitModality} VISIT
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="grid grid-cols-2 gap-3">
                            <EncounterSelect label="Service Line" value={formData.serviceLine}
                                options={['GLP-1', 'TRT', 'Hair Loss', 'Men\'s Health', 'General']}
                                onChange={(v: any) => setFormData({ ...formData, serviceLine: v })} />
                            <EncounterSelect label="Encounter Type" value={formData.encounterType}
                                options={['Initial', 'Follow-up', 'Titration Review', 'Lab Review', 'Refill']}
                                onChange={(v: any) => setFormData({ ...formData, encounterType: v })} />
                        </div>

                        <button
                            onClick={handleAiScribe}
                            disabled={isGenerating || isSigned}
                            className={`h-[48px] px-6 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg ${isGenerating ? 'bg-indigo-100 text-indigo-400 cursor-wait' :
                                isSigned ? 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none' :
                                    'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-indigo-200'
                                }`}
                        >
                            {isGenerating ? <div className="w-4 h-4 border-2 border-indigo-400 border-t-white rounded-full animate-spin"></div> : <Sparkles className="w-4 h-4" />}
                            {isGenerating ? 'AI SCRIBING...' : 'GENERATE WITH AI'}
                        </button>

                        <button onClick={onClose} className="p-3 hover:bg-white rounded-full transition-all border border-transparent hover:border-slate-200">
                            <X className="w-6 h-6 text-slate-400" />
                        </button>
                    </div>
                </div>

                {/* MAIN DOCUMENTATION AREA */}
                <div className="flex-1 overflow-y-auto p-10 bg-white custom-scrollbar grid grid-cols-12 gap-10">

                    {/* LEFT PANEL: SUBJECTIVE & OBJECTIVE */}
                    <div className="col-span-12 lg:col-span-7 space-y-12">
                        {/* SUBJECTIVE */}
                        <EncounterSection title="I. Subjective" icon={UserPlus} color="text-brand">
                            <div className="space-y-6">
                                <EncounterField label="Chief Complaint" placeholder="Patient's primary concern..."
                                    value={formData.chiefComplaint} onChange={(v: any) => setFormData({ ...formData, chiefComplaint: v })} disabled={isSigned} />
                                <EncounterField label="History of Present Illness (HPI)" placeholder="Details of current symptoms, duration, severity..."
                                    textarea value={formData.hpi} onChange={(v: any) => setFormData({ ...formData, hpi: v })} disabled={isSigned} />

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Review of Systems (ROS)</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        {rosOptions.map(sys => (
                                            <div key={sys.system} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                <div className="font-bold text-xs text-slate-800 mb-2">{sys.system}</div>
                                                <div className="flex flex-wrap gap-2">
                                                    {sys.symptoms.map(sym => (
                                                        <button
                                                            key={sym}
                                                            onClick={() => {
                                                                if (isSigned) return;
                                                                setFormData((prev: any) => ({
                                                                    ...prev,
                                                                    ros: { ...prev.ros, [sym]: !prev.ros[sym] }
                                                                }))
                                                            }}
                                                            className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${formData.ros[sym] ? 'bg-brand text-white' : 'bg-white text-slate-500 border border-slate-200 hover:border-brand'
                                                                }`}
                                                        >
                                                            {sym}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </EncounterSection>

                        {/* OBJECTIVE */}
                        <EncounterSection title="II. Objective" icon={Activity} color="text-emerald-500">
                            <div className="space-y-8">
                                <div className="grid grid-cols-5 gap-4">
                                    <VitalsInput label="Wt (lbs)" value={formData.vitals.wt} onChange={(v: any) => setFormData({ ...formData, vitals: { ...formData.vitals, wt: v } })} disabled={isSigned} />
                                    <VitalsInput label="BP" value={formData.vitals.bp} onChange={(v: any) => setFormData({ ...formData, vitals: { ...formData.vitals, bp: v } })} disabled={isSigned} />
                                    <VitalsInput label="HR" value={formData.vitals.hr} onChange={(v: any) => setFormData({ ...formData, vitals: { ...formData.vitals, hr: v } })} disabled={isSigned} />
                                    <VitalsInput label="Temp" value={formData.vitals.temp} onChange={(v: any) => setFormData({ ...formData, vitals: { ...formData.vitals, temp: v } })} disabled={isSigned} />
                                    <VitalsInput label="BMI" value={formData.vitals.bmi} readOnly disabled={isSigned} />
                                </div>

                                <EncounterField label="Physical Exam / Observations" placeholder="Objective findings seen during video visit..."
                                    textarea value={formData.physicalExam} onChange={(v: any) => setFormData({ ...formData, physicalExam: v })} disabled={isSigned} />

                                <div className="grid grid-cols-2 gap-6 pt-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Current Medications</label>
                                        <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-2">
                                            {patient.activeMedications?.map((m: any, i: number) => (
                                                <div key={i} className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                                    <Pill className="w-3 h-3 text-indigo-500" /> {m.name} {m.dosage}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Recent Lab Results</label>
                                        <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-2">
                                            {patient.labsHistory?.[0]?.results.slice(0, 3).map((r: any, i: number) => (
                                                <div key={i} className={`flex items-center justify-between text-xs font-bold ${r.status === 'Abnormal' ? 'text-red-500' : 'text-slate-700'}`}>
                                                    <span>{r.test}</span>
                                                    <span>{r.value} {r.unit}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </EncounterSection>
                    </div>

                    {/* RIGHT PANEL: ASSESSMENT & PLAN */}
                    <div className="col-span-12 lg:col-span-5 space-y-12">
                        {/* ASSESSMENT */}
                        <EncounterSection title="III. Assessment" icon={ShieldCheck} color="text-amber-500">
                            <div className="space-y-6">
                                <EncounterField label="Clinical Assessment" placeholder="Overall impression..."
                                    textarea value={formData.assessment} onChange={(v: any) => setFormData({ ...formData, assessment: v })} disabled={isSigned} />

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Diagnoses (ICD-10)</label>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.diagnoses.map(d => (
                                            <span key={d} className="px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-black rounded-lg border border-amber-100 flex items-center gap-2">
                                                {d}
                                                {!isSigned && <button onClick={() => setFormData({ ...formData, diagnoses: formData.diagnoses.filter(x => x !== d) })}><X className="w-3 h-3" /></button>}
                                            </span>
                                        ))}
                                        {!isSigned && (
                                            <div className="flex flex-wrap gap-2 pt-2">
                                                {COMMON_ICD10.filter(item => !formData.diagnoses.includes(`${item.code} ${item.description}`)).map(item => (
                                                    <button
                                                        key={item.code}
                                                        onClick={() => setFormData({ ...formData, diagnoses: [...formData.diagnoses, `${item.code} ${item.description}`] })}
                                                        className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black rounded-lg border border-dashed border-slate-300 hover:bg-brand/5 hover:border-brand/40 hover:text-brand transition-all"
                                                    >
                                                        + {item.code}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </EncounterSection>

                        {/* PLAN */}
                        <EncounterSection title="IV. Plan" icon={ClipboardCheck} color="text-indigo-500">
                            <div className="space-y-6">
                                <EncounterField label="Plan - Medications" placeholder="Dose changes, new Rx, instructions..."
                                    value={formData.planMedications} onChange={(v: any) => setFormData({ ...formData, planMedications: v })} disabled={isSigned} />

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Orders (Labs/Imaging)</label>
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {formData.planLabs.map(lab => (
                                                <span key={lab} className="px-2 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-lg flex items-center gap-1 border border-indigo-100">
                                                    {lab}
                                                    {!isSigned && <button onClick={() => setFormData({ ...formData, planLabs: formData.planLabs.filter(l => l !== lab) })}><X className="w-3 h-3" /></button>}
                                                </span>
                                            ))}
                                            {!isSigned && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {COMMON_LABS.filter(l => !formData.planLabs.includes(l)).slice(0, 4).map(lab => (
                                                        <button
                                                            key={lab}
                                                            onClick={() => setFormData({ ...formData, planLabs: [...formData.planLabs, lab] })}
                                                            className="px-2 py-0.5 bg-slate-50 text-slate-400 text-[9px] font-bold rounded-md border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                                                        >
                                                            + {lab.split(' (')[0]}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <EncounterSelect label="Follow-up" value={formData.followUp}
                                        options={['2wk', '4wk', '8wk', '12wk', 'PRN']}
                                        onChange={(v: any) => setFormData({ ...formData, followUp: v })} />
                                </div>

                                <EncounterField label="Patient Education" textarea placeholder="Topics discussed, handouts provided..."
                                    value={formData.patientEducation} onChange={(v: any) => setFormData({ ...formData, patientEducation: v })} disabled={isSigned} />
                            </div>
                        </EncounterSection>

                        {/* SIGNATURE & BILLING */}
                        <div className="p-8 bg-slate-900 rounded-[2rem] text-white shadow-xl shadow-slate-200">
                            <h3 className="text-lg font-black uppercase tracking-tight mb-6">Execution & Billing</h3>
                            <div className="space-y-6">
                                <EncounterSelect label="CPT Code" value={formData.cptCode} dark
                                    options={['99203 - Initial', '99204 - Initial (Ext)', '99213 - FU', '99214 - FU (Ext)']}
                                    onChange={(v: any) => setFormData({ ...formData, cptCode: v })} />

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telehealth Attestation</label>
                                    <p className="text-[10px] text-white/50 leading-relaxed italic border-l-2 border-brand/40 pl-3">
                                        "I, the provider, attest that this encounter was performed via synchronous audiovisual technology. The patient was located in {patient.state} at the time of the visit."
                                    </p>
                                </div>

                                <div className="space-y-2 pt-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Provider Electronic Signature</label>
                                    <div className="relative">
                                        <Edit3 className="w-4 h-4 text-white/30 absolute left-4 top-3.5" />
                                        <input
                                            type="text"
                                            placeholder="Type full name + credentials"
                                            value={signature}
                                            onChange={(e: any) => setSignature(e.target.value)}
                                            readOnly={isSigned}
                                            className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand/40 transition-all font-mono"
                                        />
                                    </div>
                                    <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest mt-1">Valid signature locks this legal document.</p>
                                </div>

                                {!isSigned ? (
                                    <button
                                        onClick={handleSign}
                                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl transition-all shadow-lg shadow-emerald-950 flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle2 className="w-5 h-5" /> SIGN & LOCK NOTE
                                    </button>
                                ) : (
                                    <div className="w-full py-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black rounded-2xl flex items-center justify-center gap-2">
                                        <ShieldCheck className="w-5 h-5" /> DOCUMENT SIGNED
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ADDENDA SECTION */}
                        {(isSigned || formData.addenda.length > 0) && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <HistoryIcon className="w-4 h-4" /> Addenda
                                    </h3>
                                </div>
                                <div className="space-y-4">
                                    {formData.addenda.map((ad, i) => (
                                        <div key={i} className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl">
                                            <p className="text-xs font-medium text-slate-700 leading-relaxed">{ad.text}</p>
                                            <div className="mt-2 text-[9px] font-black text-amber-600 uppercase tracking-widest">— Added {ad.timestamp}</div>
                                        </div>
                                    ))}
                                    {isSigned && (
                                        <div className="space-y-2">
                                            <textarea
                                                placeholder="Add post-signature note..."
                                                value={newAddendum}
                                                onChange={(e: any) => setNewAddendum(e.target.value)}
                                                className="w-full h-20 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none"
                                            />
                                            <button
                                                onClick={() => {
                                                    if (!newAddendum.trim()) return;
                                                    setFormData((prev: any) => ({
                                                        ...prev,
                                                        addenda: [...prev.addenda, { text: newAddendum, timestamp: new Date().toLocaleString() }]
                                                    }));
                                                    setNewAddendum('');
                                                }}
                                                className="px-4 py-2 bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-900 transition-all"
                                            >
                                                Add Addendum
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* MODAL FOOTER */}
                <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Saved: Just now</span>
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={onClose} className="px-8 py-3 rounded-xl text-slate-600 font-bold text-sm bg-white border border-slate-200 hover:bg-slate-50 transition-all">Discard Changes</button>
                        <button onClick={handleSave} className="bg-brand text-white px-10 py-3 rounded-xl font-black text-sm shadow-xl shadow-brand/20 hover:bg-brand-600 hover:-translate-y-0.5 active:translate-y-0 transition-all uppercase tracking-widest">
                            {isSigned ? 'Close & Save Final' : 'Save as Draft'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function EncounterSection({ title, icon: Icon, color, children }: any) {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 border-b-2 border-slate-50 pb-3">
                <Icon className={`w-6 h-6 ${color}`} />
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{title}</h3>
            </div>
            {children}
        </div>
    );
}

function EncounterField({ label, placeholder, value, onChange, textarea, disabled }: any) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
            {textarea ? (
                <textarea
                    placeholder={placeholder}
                    value={value}
                    onChange={(e: any) => onChange(e.target.value)}
                    disabled={disabled}
                    className="w-full h-32 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/10 focus:border-brand transition-all resize-none disabled:opacity-70 disabled:bg-slate-50"
                />
            ) : (
                <input
                    type="text"
                    placeholder={placeholder}
                    value={value}
                    onChange={(e: any) => onChange(e.target.value)}
                    disabled={disabled}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/10 focus:border-brand transition-all disabled:opacity-70 disabled:bg-slate-50"
                />
            )}
        </div>
    );
}

function EncounterSelect({ label, value, options, onChange, dark }: any) {
    return (
        <div className="space-y-2">
            <label className={`text-[10px] font-black ${dark ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-widest`}>{label}</label>
            <select
                value={value}
                onChange={(e: any) => onChange(e.target.value)}
                className={`w-full p-3 ${dark ? 'bg-white/5 border-white/10 text-white font-bold' : 'bg-slate-50 border-slate-100 text-slate-900 font-bold'} rounded-xl text-xs focus:outline-none transition-all`}
            >
                <option value="">Select...</option>
                {options.map((o: any) => <option key={o} value={o}>{o}</option>)}
            </select>
        </div>
    );
}

function VitalsInput({ label, value, onChange, readOnly, disabled }: any) {
    return (
        <div className="space-y-2 text-center">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]">{label}</label>
            <input
                type="text"
                value={value}
                onChange={(e: any) => onChange?.(e.target.value)}
                readOnly={readOnly}
                disabled={disabled}
                placeholder="--"
                className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-center text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-50"
            />
        </div>
    );
}

export function LabsVitalsTab({ patient }: { patient: any }) {
    const [selectedPanel, setSelectedPanel] = useState('All');
    const [interpretingLab, setInterpretingLab] = useState<any>(null);
    const labs = patient.labsHistory || [];
    const vitals = patient.vitalsHistory?.[0] || {};
    const weightHistory = patient.vitalsHistory || [];

    const weightTrend = weightHistory.map((v: any) => v.weight).reverse();
    const baselineWeight = weightTrend[0] || 0;
    const currentWeight = weightTrend[weightTrend.length - 1] || 0;
    const weightChange = currentWeight - baselineWeight;
    const weightChangePct = baselineWeight ? ((weightChange / baselineWeight) * 100).toFixed(1) : 0;

    const getBmiClass = (bmi: number) => {
        if (!bmi) return '--';
        if (bmi < 18.5) return 'Underweight';
        if (bmi < 25) return 'Normal';
        if (bmi < 30) return 'Overweight';
        if (bmi < 35) return 'Obese Class I';
        if (bmi < 40) return 'Obese Class II';
        return 'Obese Class III';
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* TOP ACTIONS BAR */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-brand">
                <div className="flex flex-wrap items-center gap-3">
                    <button className="bg-brand hover:bg-brand-600 text-white font-bold py-2.5 px-6 rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-brand/20 transition-all active:scale-95">
                        <Scale className="w-4 h-4" /> Enter Vitals
                    </button>
                    <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-6 rounded-xl text-sm flex items-center gap-2 transition-all">
                        <Plus className="w-4 h-4" /> Manual Lab Entry
                    </button>
                    <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-6 rounded-xl text-sm flex items-center gap-2 transition-all">
                        <FlaskConical className="w-4 h-4" /> Order Labs
                    </button>
                </div>
                <div className="flex items-center gap-3">
                    <button className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-2.5 px-6 rounded-xl text-sm flex items-center gap-2 transition-all border border-indigo-100">
                        <Sparkles className="w-4 h-4" /> AI Interpret All
                    </button>
                    <button className="bg-white hover:bg-slate-50 text-slate-600 font-bold py-2.5 px-6 rounded-xl text-sm flex items-center gap-2 transition-all border border-slate-200">
                        <Download className="w-4 h-4" /> Export History
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* SECTION 1: WEIGHT TREND */}
                <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200 p-8 flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                                <Scale className="w-6 h-6 text-brand" /> Weight Journey
                            </h2>
                            <p className="text-xs text-slate-500 font-medium mt-1 uppercase tracking-widest">Primary GLP-1 Outcome Metric</p>
                        </div>
                        <div className="text-right">
                            <div className={`text-2xl font-black ${Number(weightChange) <= 0 ? 'text-emerald-600' : 'text-rose-600'} flex items-center justify-end gap-2`}>
                                {Number(weightChange) <= 0 ? <TrendingDown className="w-6 h-6" /> : <TrendingUp className="w-6 h-6" />}
                                {Math.abs(Number(weightChange))} lbs ({weightChangePct}%)
                            </div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Loss from Baseline</div>
                        </div>
                    </div>

                    <div className="flex-1 min-h-[250px] relative flex items-end gap-2">
                        {weightTrend.map((w: number, i: number) => {
                            const max = Math.max(...weightTrend);
                            const min = Math.min(...weightTrend);
                            const range = max - min;
                            const height = range === 0 ? 50 : ((w - min) / range) * 80 + 20;
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center group">
                                    <div className="text-[10px] font-bold text-slate-900 opacity-0 group-hover:opacity-100 transition-opacity mb-2 bg-brand/10 px-2 py-0.5 rounded-full">{w} lbs</div>
                                    <div
                                        style={{ height: `${height}%` }}
                                        className={`w-full rounded-t-xl transition-all duration-500 shadow-sm ${i === weightTrend.length - 1 ? 'bg-brand shadow-lg shadow-brand/20' : 'bg-brand/20 group-hover:bg-brand/40'}`}
                                    ></div>
                                    <div className="mt-4 text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                        {weightHistory[weightHistory.length - 1 - i].date.split('-').slice(1).join('/')}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* SECTION 2: CURRENT VITALS CARDS */}
                <div className="space-y-4">
                    <VitalCard icon={Scale} label="Current Weight" value={`${vitals.weight || '--'} lbs`} trend={weightChange < 0 ? `${weightChange} lbs` : weightChange > 0 ? `+${weightChange} lbs` : 'Stable'} color="brand" />
                    <VitalCard icon={Activity} label="Body Mass Index" value={vitals.bmi || '--'} subValue={getBmiClass(vitals.bmi)} color="indigo" />
                    <VitalCard icon={Heart} label="Blood Pressure" value={vitals.bp || '--'} trend="Stable" color="rose" />
                    <VitalCard icon={Thermometer} label="Heart Rate" value={`${vitals.hr || '--'} bpm`} trend="-2 bpm" color="orange" />
                </div>
            </div>

            {/* SECTION 3: LAB RESULTS */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                            <Droplets className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Biomarkers & Lab Panels</h2>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">Health Gorilla Integration Active</p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {['All', 'GLP-1', 'Metabolic', 'Hormonal'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setSelectedPanel(tab)}
                                className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${selectedPanel === tab ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                <th className="px-8 py-5">Biomarker</th>
                                <th className="px-8 py-5">Value</th>
                                <th className="px-8 py-5">Reference Range</th>
                                <th className="px-8 py-5">Date</th>
                                <th className="px-8 py-5">Status</th>
                                <th className="px-8 py-5 text-right">Insight</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {labs.length > 0 ? labs
                                .filter((p: any) => {
                                    if (selectedPanel === 'All') return true;
                                    const panelLower = p.panel.toLowerCase();
                                    const selectedLower = selectedPanel.toLowerCase();
                                    return panelLower.includes(selectedLower) || (selectedPanel === 'GLP-1' && panelLower.includes('glp'));
                                })
                                .flatMap((p: any) => p.results.map((r: any) => ({ ...r, date: p.date })))
                                .map((res: any, i: number) => (
                                    <tr key={i} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="font-bold text-slate-900 text-sm">{res.test}</div>
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">LOINC: 23456-7</div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className={`text-sm font-black ${res.status === 'Abnormal' ? 'text-rose-600' : 'text-slate-900'}`}>
                                                {res.value} <span className="text-[10px] text-slate-400 font-bold">{res.unit}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-sm text-slate-500 font-medium">{res.range}</td>
                                        <td className="px-8 py-6 text-sm text-slate-500 font-medium">{res.date}</td>
                                        <td className="px-8 py-6">
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${res.status === 'Abnormal' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                                                }`}>
                                                {res.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <button
                                                onClick={() => setInterpretingLab(res)}
                                                className={`p-2 rounded-lg transition-all group-hover:scale-110 ${interpretingLab?.test === res.test ? 'bg-brand text-white shadow-lg' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                                            >
                                                <Sparkles className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                <tr>
                                    <td colSpan={6} className="px-8 py-12 text-center text-slate-400 text-sm font-medium italic">
                                        No biomarkers available for this selection
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* AI INTERPRETATION PANEL */}
            {interpretingLab && (
                <div className="bg-gradient-to-br from-indigo-900 via-brand-900 to-brand-800 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden animate-in slide-in-from-top-4 duration-500">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                    <div className="relative z-10 flex flex-col md:flex-row gap-8">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10">
                                    <Sparkles className="w-6 h-6 text-brand-300" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tight">AI Lab Interpretation</h3>
                                    <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Analysis for {interpretingLab.test} ({interpretingLab.value} {interpretingLab.unit})</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="p-5 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                                    <h4 className="text-[10px] font-black text-brand-300 uppercase tracking-widest mb-2">Clinical Assessment</h4>
                                    <p className="text-sm leading-relaxed text-white/90">
                                        The value of {interpretingLab.value} {interpretingLab.unit} is {interpretingLab.status === 'Abnormal' ? 'outside' : 'within'} the expected reference range. Considering the patient's current {patient.serviceLine} protocol and GLP-1 therapy, this indicates {interpretingLab.status === 'Abnormal' ? 'a need for titration review.' : 'excellent physiological response to treatment.'}
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
                                        <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Next Steps</h4>
                                        <ul className="text-xs space-y-2 text-white/80">
                                            <li>• Maintain current dosage</li>
                                            <li>• Repeat labs in 4 weeks</li>
                                        </ul>
                                    </div>
                                    <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
                                        <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-2">Provider Action</h4>
                                        <button className="mt-2 w-full py-2 bg-brand text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-brand/20">Add to SOAP Note</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setInterpretingLab(null)}
                            className="bg-white/10 hover:bg-white/20 p-4 rounded-3xl self-start transition-all border border-white/10"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            )}

            {/* SECTION 4: LAB HISTORY TIMELINE */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                        <HistoryIcon className="w-6 h-6 text-slate-400" /> Lab Draw Timeline
                    </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {labs.map((draw: any, i: number) => (
                        <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex items-center justify-between mb-4">
                                <div className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    {draw.date}
                                </div>
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 transition-transform group-hover:rotate-12">
                                    <FlaskConical className="w-4 h-4" />
                                </div>
                            </div>
                            <h4 className="font-extrabold text-slate-900 mb-1">{draw.panel}</h4>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                                {draw.results.length} Biomarkers Recorded
                            </div>
                            <div className="flex -space-x-2">
                                {draw.results.slice(0, 3).map((_: any, j: number) => (
                                    <div key={j} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-600 uppercase">
                                        {j === 0 ? 'HB' : j === 1 ? 'GL' : 'AL'}
                                    </div>
                                ))}
                                {draw.results.length > 3 && (
                                    <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-400">
                                        +{draw.results.length - 3}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export function DocumentsTab({ patient }: { patient: any }) {
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIntake, setSelectedIntake] = useState<any>(null); // For the modal

    const staticDocs = patient.documents || [];
    const consultDocs = (patient.rawConsultations || []).map((c: any) => ({
        id: c.id,
        name: `${c.symptom || 'General'} Intake Form`,
        category: 'Intake Forms',
        type: 'Patient Submission',
        date: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'Unknown',
        size: 'System Record',
        rawData: c
    }));

    const documents = [...consultDocs, ...staticDocs];
    const categories = ['All', 'Intake Forms', 'Consent Forms', 'Lab Results', 'Imaging Reports', 'Clinical Notes', 'Prior Auth', 'Patient-Uploaded', 'Other'];

    const filteredDocs = documents.filter((doc: any) => {
        const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;
        const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.type.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const getIcon = (category: string) => {
        switch (category) {
            case 'Intake Forms': return ClipboardCheck;
            case 'Consent Forms': return ShieldCheck;
            case 'Lab Results': return FlaskConical;
            case 'Imaging Reports': return Microscope;
            case 'Clinical Notes': return FileText;
            case 'Prior Auth': return FileBadge;
            case 'Patient-Uploaded': return Upload;
            default: return FileText;
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* TOP ACTIONS BAR */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-brand">
                <div className="flex flex-wrap items-center gap-3">
                    <button className="bg-brand hover:bg-brand-600 text-white font-bold py-2.5 px-6 rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-brand/20 transition-all active:scale-95">
                        <Upload className="w-4 h-4" /> Upload Document
                    </button>
                    <div className="flex items-center gap-2 p-1 bg-slate-50 rounded-xl border border-slate-200">
                        <button
                            onClick={() => alert("Consent Generation Wizard would open here.")}
                            className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-brand transition-colors"
                        >
                            Generate Consent
                        </button>
                        <div className="w-px h-4 bg-slate-200"></div>
                        <button
                            onClick={() => alert("SOAP Note PDF Generator would open here.")}
                            className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-brand transition-colors"
                        >
                            Generate SOAP PDF
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3" />
                        <input
                            type="text"
                            placeholder="Search documents..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm w-64 focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all font-medium"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* CATEGORIES SIDEBAR */}
                <div className="space-y-2">
                    <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Categories</h3>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${selectedCategory === cat
                                ? 'bg-brand text-white shadow-lg shadow-brand/20'
                                : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-brand'
                                }`}
                        >
                            <span className="text-sm font-bold">{cat}</span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${selectedCategory === cat ? 'bg-white/20' : 'bg-slate-100 text-slate-400'}`}>
                                {cat === 'All' ? documents.length : documents.filter((d: any) => d.category === cat).length}
                            </span>
                        </button>
                    ))}
                </div>

                {/* DOCUMENTS GRID */}
                <div className="lg:col-span-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredDocs.length > 0 ? filteredDocs.map((doc: any) => {
                            const Icon = getIcon(doc.category);
                            return (
                                <div key={doc.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full -mr-12 -mt-12 group-hover:bg-brand/5 transition-colors"></div>
                                    <div className="relative z-10">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm ${doc.category === 'Consent Forms' ? 'bg-emerald-50 text-emerald-600' :
                                                doc.category === 'Lab Results' ? 'bg-indigo-50 text-indigo-600' :
                                                    doc.category === 'Imaging Reports' ? 'bg-rose-50 text-rose-600' :
                                                        'bg-slate-50 text-slate-600'
                                                }`}>
                                                <Icon className="w-6 h-6" />
                                            </div>
                                            <div className="flex gap-1">
                                                <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg hover:text-brand transition-all">
                                                    <Download className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (doc.category === 'Intake Forms') {
                                                            setSelectedIntake(doc.rawData);
                                                        } else {
                                                            alert(`Previewing ${doc.name}...`);
                                                        }
                                                    }}
                                                    className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg hover:text-brand transition-all"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => alert(`Opening share dialog for ${doc.name}...`)}
                                                    className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg hover:text-brand transition-all"
                                                >
                                                    <Share2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <h4 className="font-extrabold text-slate-900 mb-1 group-hover:text-brand transition-colors">{doc.name}</h4>
                                        <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest mt-3">
                                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {doc.date}</span>
                                            <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                            <span>{doc.type}</span>
                                            <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                            <span>{doc.size}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="col-span-full py-24 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                                <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6">
                                    <FileSearch className="w-10 h-10 text-slate-200" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">No documents found</h3>
                                <p className="text-slate-500 text-sm max-w-xs font-medium">There are no files uploaded or generated in this category yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {selectedIntake && (
                <IntakeModal
                    intakeData={selectedIntake}
                    patientName={patient.name}
                    onClose={() => setSelectedIntake(null)}
                />
            )}
        </div>
    );
}

function IntakeModal({ intakeData, patientName, onClose }: { intakeData: any, patientName: string, onClose: () => void }) {
    if (!intakeData) return null;
    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex flex-col items-center justify-center">
                            <ClipboardCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Patient Intake Form</h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{patientName} • {intakeData.symptom || 'General Consultation'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-all border border-transparent hover:border-slate-200">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                    {intakeData.answers ? (
                        Object.entries(intakeData.answers).map(([key, value], i) => (
                            <div key={i} className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-2">Question {i + 1}</p>
                                <p className="text-sm font-bold text-slate-800 mb-4">{key}</p>
                                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm text-sm text-slate-700 font-medium whitespace-pre-wrap">
                                    {String(value)}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 text-slate-400 font-medium">No answers recorded.</div>
                    )}
                </div>
            </div>
        </div>
    );
}

export function EncountersTab({ patient, onNewEncounter }: { patient: any, onNewEncounter: () => void }) {
    const [selectedType, setSelectedType] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const encounters = patient.recentEncounters || [];

    // Mock extended encounter data for demo
    const detailedEncounters = encounters.map((enc: any, i: number) => {
        let type = 'Acute';
        if (enc.title.includes('Consult') || enc.title.includes('Intake')) type = 'Initial Consult';
        else if (enc.title.includes('Follow') || enc.title.includes('Review')) type = 'Follow-up';

        let summary = 'Routine clinical encounter.';
        if (type === 'Initial Consult') summary = 'Patient presenting for intake. Comprehensive history taken. Treatment plan initiated.';
        else if (type === 'Follow-up') summary = 'Patient tracking well on current protocol. No acute distress.';

        // Override for demo purposes if specific titles exist
        if (enc.title.includes('GLP-1')) summary = 'Follow-up for weight management. Patient reports 5lb loss. No side effects reported. Increasing dose to 0.5mg.';
        if (enc.title.includes('Initial Consult')) summary = 'Patient presenting for GLP-1 weight loss management. Discussed risks/benefits of semaglutide. Started on 0.25mg weekly.';

        return {
            ...enc,
            id: `ENC-${1000 + i}`,
            type,
            serviceLine: 'Primary Care',
            status: i === 0 && new Date(enc.date).toDateString() === new Date().toDateString() ? 'Draft' : 'Signed',
            summary
        };
    });

    const filteredEncounters = detailedEncounters.filter((enc: any) => {
        const matchesType = selectedType === 'All' || enc.type === selectedType;
        const matchesSearch = enc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            enc.provider.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesType && matchesSearch;
    });

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* TOP ACTIONS BAR */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-brand">
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={onNewEncounter}
                        className="bg-brand hover:bg-brand-600 text-white font-black py-2.5 px-6 rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-brand/20 transition-all active:scale-95"
                    >
                        <Plus className="w-4 h-4" /> New Encounter
                    </button>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3" />
                        <input
                            type="text"
                            placeholder="Search encounters..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm w-64 focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all font-medium"
                        />
                    </div>
                </div>
            </div>

            {/* FILTERS */}
            <div className="flex gap-2 pb-2 overflow-x-auto">
                {['All', 'Initial Consult', 'Follow-up'].map(type => (
                    <button
                        key={type}
                        onClick={() => setSelectedType(type)}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${selectedType === type ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'}`}
                    >
                        {type}
                    </button>
                ))}
            </div>

            {/* ENCOUNTERS LIST */}
            <div className="space-y-4">
                {filteredEncounters.length > 0 ? filteredEncounters.map((enc: any) => (
                    <div key={enc.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden cursor-pointer" onClick={() => alert(`Opening encounter ${enc.id}...`)}>
                        <div className="absolute top-0 left-0 w-1 h-full bg-brand group-hover:w-2 transition-all"></div>
                        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex flex-col items-center justify-center border border-slate-100 group-hover:border-brand/20 transition-colors">
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                                        {enc.date.split('-')[1]}/{enc.date.split('-')[2]}
                                    </span>
                                    <span className="text-xl font-black text-slate-900">
                                        {enc.date.split('-')[0]}
                                    </span>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-lg font-black text-slate-900 group-hover:text-brand transition-colors">{enc.title}</h3>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${enc.status === 'Signed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                            {enc.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                                        <div className="flex items-center gap-1">
                                            <Stethoscope className="w-3.5 h-3.5" />
                                            {enc.provider}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Activity className="w-3.5 h-3.5" />
                                            {enc.serviceLine}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 md:max-w-xl">
                                <p className="text-xs text-slate-600 font-medium leading-relaxed line-clamp-2">
                                    {enc.summary}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="p-2 bg-slate-50 text-slate-400 hover:text-brand hover:bg-brand/5 rounded-xl transition-all">
                                    <Edit3 className="w-4 h-4" />
                                </button>
                                <button className="p-2 bg-slate-50 text-slate-400 hover:text-brand hover:bg-brand/5 rounded-xl transition-all">
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="py-24 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6">
                            <HistoryIcon className="w-10 h-10 text-slate-200" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">No encounters found</h3>
                        <p className="text-slate-500 text-sm max-w-xs font-medium">Try adjusting your filters or search terms.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export function InboxTab({ patient }: { patient: any }) {
    const [messages, setMessages] = useState<any[]>(patient.messages || [
        { id: 1, type: 'received', text: "Hi Dr. Olufolaju, I've been feeling a bit nauseous after the last dose increase. Is this normal?", timestamp: '10:30 AM', date: 'Today' },
        { id: 2, type: 'sent', text: "Hi Bobby, yes that can be a common side effect given the titration schedule. Try eating smaller meals and let's monitor it for another 24 hours.", timestamp: '10:45 AM', date: 'Today' }
    ]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = () => {
        if (!newMessage.trim()) return;
        setMessages([...messages, { id: Date.now(), type: 'sent', text: newMessage, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), date: 'Today' }]);
        setNewMessage('');
    };

    const suggestions = [
        "Please schedule a follow-up appointment.",
        "Your lab results have been reviewed.",
        "It is time to refill your prescription.",
        "Please monitor your blood pressure daily."
    ];

    return (
        <div className="max-w-[1600px] mx-auto h-[calc(100vh-250px)] animate-in fade-in slide-in-from-bottom-4 duration-500 flex gap-6">
            {/* THREAD LIST (Left Sidebar) */}
            <div className="w-80 bg-white rounded-[2rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden hidden md:flex">
                <div className="p-4 border-b border-slate-100">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Active Threads</h3>
                    <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input type="text" placeholder="Search messages..." className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all" />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                    <button className="w-full text-left p-3 rounded-2xl bg-brand/5 border border-brand/10 shadow-sm flex items-start gap-3 transition-all">
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs shrink-0">
                            {patient.name.split(' ').map((n: string) => n[0]).join('')}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-bold text-slate-900 truncate">{patient.name}</span>
                                <span className="text-[10px] font-bold text-slate-400">10:45 AM</span>
                            </div>
                            <p className="text-xs text-slate-500 truncate font-medium">{messages[messages.length - 1]?.text || 'No messages yet'}</p>
                        </div>
                    </button>
                    {/* Placeholder for other threads */}
                    {[1, 2].map((_, i) => (
                        <button key={i} className="w-full text-left p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 flex items-start gap-3 transition-all opacity-60">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 font-bold text-xs shrink-0">
                                JD
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-bold text-slate-900 truncate">Jane Doe</span>
                                    <span className="text-[10px] font-bold text-slate-400">Yesterday</span>
                                </div>
                                <p className="text-xs text-slate-500 truncate font-medium">appointment confirmation...</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* CHAT AREA (Main) */}
            <div className="flex-1 bg-white rounded-[2rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden relative">
                {/* Header */}
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand/10 text-brand flex items-center justify-center font-black shadow-inner">
                            {patient.name.split(' ').map((n: string) => n[0]).join('')}
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-slate-900">{patient.name}</h2>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Online Now</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button className="p-2 text-slate-400 hover:text-brand hover:bg-slate-50 rounded-xl transition-all" title="Start Video Call">
                            <Video className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-slate-400 hover:text-brand hover:bg-slate-50 rounded-xl transition-all" title="Call Patient">
                            <Phone className="w-4 h-4" />
                        </button>
                        <div className="w-px h-4 bg-slate-200 mx-1"></div>
                        <button className="p-2 text-slate-400 hover:text-brand hover:bg-slate-50 rounded-xl transition-all">
                            <MoreVertical className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 custom-scrollbar">
                    <div className="flex justify-center">
                        <span className="px-3 py-1 bg-slate-100 text-slate-400 rounded-full text-[10px] font-bold uppercase tracking-widest">Today</span>
                    </div>
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.type === 'sent' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] ${msg.type === 'sent'
                                ? 'bg-brand text-white rounded-2xl rounded-tr-sm shadow-lg shadow-brand/20'
                                : 'bg-white text-slate-700 border border-slate-100 rounded-2xl rounded-tl-sm shadow-sm'
                                } p-4 relative group`}>
                                <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                                <span className={`text-[10px] font-bold mt-2 block ${msg.type === 'sent' ? 'text-brand-100' : 'text-slate-300'}`}>
                                    {msg.timestamp}
                                </span>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* AI Suggestions */}
                <div className="px-6 pb-2 pt-2 bg-white border-t border-slate-100 overflow-x-auto whitespace-nowrap scrollbar-hide">
                    <div className="flex gap-2">
                        <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-brand mr-2">
                            <Sparkles className="w-3 h-3" /> AI Suggests:
                        </div>
                        {suggestions.map((suggestion, i) => (
                            <button
                                key={i}
                                onClick={() => setNewMessage(suggestion)}
                                className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 text-xs font-bold hover:bg-brand hover:text-white hover:border-brand transition-all active:scale-95"
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-slate-100">
                    <div className="flex items-end gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200 focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all">
                        <button className="p-2 text-slate-400 hover:text-brand bg-white rounded-xl shadow-sm border border-slate-100 transition-all hover:-translate-y-0.5" title="Attach File">
                            <Paperclip className="w-5 h-5" />
                        </button>
                        <textarea
                            value={newMessage}
                            onChange={(e) => {
                                setNewMessage(e.target.value);
                                e.target.style.height = 'auto';
                                e.target.style.height = `${e.target.scrollHeight}px`;
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                    const target = e.target as HTMLTextAreaElement;
                                    target.style.height = 'auto';
                                }
                            }}
                            placeholder="Type a secure message..."
                            className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium text-slate-900 placeholder:text-slate-400 resize-none py-2 max-h-32 focus:outline-none"
                            rows={1}
                        />
                        <button className="p-2 text-slate-400 hover:text-brand hover:bg-white rounded-xl transition-all">
                            <Smile className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleSendMessage}
                            disabled={!newMessage.trim()}
                            className="p-2 bg-brand text-white rounded-xl shadow-lg shadow-brand/20 hover:bg-brand-600 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95 hover:-translate-y-0.5"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="text-center mt-2">
                        <p className="text-[10px] text-slate-400 font-medium flex items-center justify-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            Secure HIPAA-compliant messaging. No PHI will be sent via email notification.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function VitalCard({ icon: Icon, label, value, subValue, trend, color }: { icon: LucideIcon, label: string, value: any, subValue?: string, trend?: string, color: string }) {
    const colors: any = {
        brand: 'bg-brand/10 text-brand border-brand/20',
        indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
        rose: 'bg-rose-50 text-rose-600 border-rose-100',
        orange: 'bg-orange-50 text-orange-600 border-orange-100'
    };

    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-brand/40 transition-all group">
            <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 ${colors[color].split(' ')[0]} ${colors[color].split(' ')[1]} rounded-xl flex items-center justify-center transition-transform group-hover:scale-110`}>
                    <Icon className="w-5 h-5" />
                </div>
                {trend && (
                    <div className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${trend.includes('-') ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'}`}>
                        {trend}
                    </div>
                )}
            </div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</div>
            <div className="text-2xl font-black text-slate-900">{value}</div>
            {subValue && <div className="text-[10px] font-bold text-slate-500 mt-1 uppercase">{subValue}</div>}
        </div>
    );
}
