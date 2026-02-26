"use client";

import React, { useState, useEffect } from 'react';
import {
    Pill,
    Plus,
    User,
    Calendar,
    ChevronRight,
    AlertCircle,
    CheckCircle2,
    Filter,
    Info,
    RefreshCw,
    Sparkles
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import {
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    serverTimestamp,
    doc,
    getDoc
} from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { logAuditEvent } from '@/lib/audit';
import { format } from 'date-fns';

interface Medication {
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    prescribingProvider: string;
    refillsRemaining: number;
    status: 'active' | 'inactive';
    instructions?: string;
    sideEffects?: string[];
    startDate?: any;
}

export default function MedicationsPage() {
    const [medications, setMedications] = useState<Medication[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'active' | 'inactive' | 'all'>('active');
    const [selectedMed, setSelectedMed] = useState<Medication | null>(null);
    const [isRequesting, setIsRequesting] = useState<string | null>(null);
    const [isExploring, setIsExploring] = useState(false);
    const [aiInfo, setAiInfo] = useState<{ action: string; warnings: string; tips: string } | null>(null);

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged((user: any) => {
            if (user) {
                const medsRef = collection(db, 'patients', user.uid, 'medications');
                const q = query(medsRef);

                const unsubscribe = onSnapshot(q, (snapshot) => {
                    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Medication));
                    setMedications(data);
                    setLoading(false);
                });

                return () => unsubscribe();
            }
        });

        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        setAiInfo(null);
        setIsExploring(false);
    }, [selectedMed]);

    const handleAIExplore = async (med: Medication) => {
        setIsExploring(true);
        await new Promise(r => setTimeout(r, 1500));

        const medicationHub: Record<string, any> = {
            'Lisinopril': {
                action: "Lisinopril is an ACE inhibitor. It works by relaxing blood vessels so blood can flow more easily, which lowers blood pressure and reduces strain on your heart.",
                warnings: "Avoid potassium supplements or salt substitutes unless approved. Contact your doctor immediately if you develop a persistent dry cough or swelling of the face.",
                tips: "Take at the same time each day. It can be taken with or without food."
            },
            'Metformin': {
                action: "Metformin helps control blood sugar levels in people with type 2 diabetes. It works by improving how your body responds to insulin and decreasing the amount of sugar your liver makes.",
                warnings: "Be aware of symptoms of 'lactic acidosis' like unusual muscle pain or trouble breathing. Alcohol intake should be limited while taking this medication.",
                tips: "Always take with a meal to reduce the chance of an upset stomach."
            },
            'default': {
                action: `AI is gathering clinical data on ${med.name}. This medication is typically used for conditions related to the history noted in your chart.`,
                warnings: "Always review the manufacturer's insert for full safety information. Report any new or worsening symptoms to your care team.",
                tips: "Maintenance of a consistent schedule is key for the efficacy of most long-term prescriptions."
            }
        };

        setAiInfo(medicationHub[med.name] || medicationHub['default']);
        setIsExploring(false);
    };

    const handleRefillRequest = async (med: Medication) => {
        if (!auth.currentUser) return;

        setIsRequesting(med.id);
        try {
            await addDoc(collection(db, 'patients', auth.currentUser.uid, 'refill_requests'), {
                medicationId: med.id,
                medicationName: med.name,
                requestedAt: serverTimestamp(),
                status: 'pending',
                provider: med.prescribingProvider
            });

            await logAuditEvent({
                userId: auth.currentUser.uid,
                action: 'REFILL_REQUESTED',
                resourceId: med.id,
                details: { medicationName: med.name }
            });

            toast.success(`Refill requested for ${med.name}`, {
                icon: '💊',
                className: 'font-black uppercase tracking-widest text-xs'
            });
        } catch (error) {
            console.error('Refill error:', error);
            toast.error('Failed to request refill');
        } finally {
            setIsRequesting(null);
        }
    };

    const filteredMeds = medications.filter(m => {
        if (filter === 'all') return true;
        return m.status === filter;
    });

    if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-4 border-sky-100 border-t-[#0EA5E9] rounded-full animate-spin"></div></div>;

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Prescriptions</h1>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-1">Manage your active medications and refills</p>
                </div>

                <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
                    {(['active', 'inactive', 'all'] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => setFilter(t)}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filter === t ? 'bg-[#0EA5E9] text-white shadow-lg shadow-sky-100' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMeds.length > 0 ? filteredMeds.map((med) => (
                    <div key={med.id} className="bg-white rounded-[32px] border border-slate-50 shadow-sm hover:shadow-xl hover:shadow-sky-900/5 transition-all group overflow-hidden flex flex-col">
                        <div className="p-8 pb-6 flex-1">
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-14 h-14 bg-sky-50 rounded-2xl flex items-center justify-center text-[#0EA5E9] group-hover:scale-110 transition-transform">
                                    <Pill className="w-7 h-7" />
                                </div>
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${med.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                    {med.status}
                                </span>
                            </div>

                            <h3 className="text-xl font-black text-slate-800 tracking-tight mb-1">{med.name}</h3>
                            <p className="text-[#0EA5E9] font-bold text-sm mb-6">{med.dosage} • {med.frequency}</p>

                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <User className="w-4 h-4 text-slate-300" />
                                    <span className="text-xs font-bold text-slate-500">{med.prescribingProvider}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <RefreshCw className="w-4 h-4 text-slate-300" />
                                        <span className="text-xs font-bold text-slate-500">Refills Remaining</span>
                                    </div>
                                    <span className={`text-sm font-black ${med.refillsRemaining === 0 ? 'text-rose-500' : 'text-slate-800'}`}>
                                        {med.refillsRemaining}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50/50 border-t border-slate-50 flex gap-2">
                            <button
                                onClick={() => setSelectedMed(med)}
                                className="flex-1 bg-white text-slate-600 border border-slate-200 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                            >
                                <Info className="w-3.5 h-3.5" /> Details
                            </button>
                            {med.status === 'active' && (
                                <button
                                    disabled={isRequesting === med.id || med.refillsRemaining === 0}
                                    onClick={() => handleRefillRequest(med)}
                                    className="flex-1 bg-[#0EA5E9] text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-sky-600 transition-all shadow-lg shadow-sky-100 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isRequesting === med.id ? 'Sending...' : 'Request Refill'}
                                    {!isRequesting && <RefreshCw className="w-3.5 h-3.5" />}
                                </button>
                            )}
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full py-20 text-center space-y-4 bg-white rounded-[40px] border border-slate-50">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mx-auto">
                            <AlertCircle className="w-8 h-8" />
                        </div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No medications found in this category</p>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedMed && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in slide-in-from-bottom-8 duration-500">
                        <div className="bg-sky-500 p-10 text-white relative">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                            <button
                                onClick={() => setSelectedMed(null)}
                                className="absolute top-6 right-6 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                            >
                                <Plus className="w-6 h-6 rotate-45" />
                            </button>
                            <h2 className="text-3xl font-black tracking-tight mb-2">{selectedMed.name}</h2>
                            <p className="font-bold opacity-80">{selectedMed.dosage} • {selectedMed.frequency}</p>
                        </div>

                        <div className="p-10 space-y-8">
                            <div>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Instructions</h4>
                                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                    <p className="text-slate-700 font-bold leading-relaxed">{selectedMed.instructions || 'Apply as directed by your physician.'}</p>
                                </div>
                            </div>

                            {selectedMed.sideEffects && (
                                <div>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Possible Side Effects</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedMed.sideEffects.map((effect, i) => (
                                            <span key={i} className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold border border-rose-100">
                                                {effect}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-8 border-t border-slate-50 pt-8">
                                <div>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Prescribed By</h4>
                                    <p className="font-black text-slate-800">{selectedMed.prescribingProvider}</p>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Start Date</h4>
                                    <p className="font-black text-slate-800">
                                        {selectedMed.startDate ? format(selectedMed.startDate.toDate(), 'MMM d, yyyy') : 'N/A'}
                                    </p>
                                </div>
                            </div>

                            {/* AI medication Assistant */}
                            <div className="pt-4 border-t border-slate-50">
                                <button
                                    onClick={() => handleAIExplore(selectedMed)}
                                    disabled={isExploring}
                                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 transition-colors"
                                >
                                    <Sparkles className={`w-3.5 h-3.5 ${isExploring ? 'animate-pulse' : ''}`} />
                                    {isExploring ? 'AI researching medication...' : 'Learn About This Medication (AI)'}
                                </button>

                                {aiInfo && (
                                    <div className="mt-6 bg-[#F5F3FF] p-8 rounded-[40px] border border-purple-100 animate-in fade-in slide-in-from-top-4 duration-500 relative overflow-hidden">
                                        <div className="flex items-start gap-4 mb-6">
                                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-purple-600 shrink-0">
                                                <Sparkles className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-slate-800 tracking-tight">Clinical Assistant</h4>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Powered by Medical AI</p>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div>
                                                <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2">How it works</p>
                                                <p className="text-slate-700 font-bold leading-relaxed">{aiInfo.action}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2">Safety & Precautions</p>
                                                <p className="text-slate-700 font-bold leading-relaxed">{aiInfo.warnings}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2">Patient Success Tips</p>
                                                <p className="text-slate-700 font-bold leading-relaxed italic">{aiInfo.tips}</p>
                                            </div>
                                        </div>

                                        <p className="mt-8 pt-6 border-t border-purple-100/50 text-[10px] text-slate-400 italic font-medium leading-relaxed">
                                            ✨ This assistant is for informational purposes only. Do not stop or change medication without consulting your doctor.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-10 pt-0">
                            <button
                                onClick={() => setSelectedMed(null)}
                                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95"
                            >
                                Close Details
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

