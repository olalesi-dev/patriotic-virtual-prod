"use client";

import React, { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { Search, Filter, Clock, Video, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { TelehealthIframeModal } from '@/components/telehealth/TelehealthIframeModal';

interface WaitlistEntry {
    id: string;
    patientId: string;
    patientName: string;
    patientEmail: string;
    serviceKey: string;
    serviceName: string;
    status: string;
    createdAt: Date;
    meetingUrl: string;
    intakeAnswers: Record<string, any>;
    priority: 'high' | 'normal' | 'low';
}

export default function WaitlistPage() {
    const [entries, setEntries] = useState<WaitlistEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterService, setFilterService] = useState('all');
    const [activeCall, setActiveCall] = useState<{ url: string; apptId: string; intake: any; name: string } | null>(null);
    const [, setTick] = useState(0);

    const getTimeElapsed = (date: Date) => {
        const diffMs = Date.now() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return '<1m';
        if (diffMins < 60) return `${diffMins}m`;
        const diffHrs = Math.floor(diffMins / 60);
        const remMins = diffMins % 60;
        if (diffHrs < 24) return `${diffHrs}h ${remMins}m`;
        return `${Math.floor(diffHrs / 24)}d ${diffHrs % 24}h`;
    };

    const enrichFromConsultation = async (apptId: string, data: Record<string, any>) => {
        let patientName = String(data.patient || data.patientName || '').trim() || 'Unknown Patient';
        let patientEmail = data.patientEmail || '';
        let patientUid = data.patientId || data.uid || '';
        let serviceKey = data.serviceKey || data.service || data.type || 'consultation';
        let intakeAnswers: Record<string, any> = data.intakeAnswers || {};
        let meetingUrl = data.meetingUrl || 'https://PVT.doxy.me/patrioticvirtualtelehealth';

        try {
            const consultSnap = await getDoc(doc(db, 'consultations', apptId));
            if (consultSnap.exists()) {
                const cd = consultSnap.data();
                intakeAnswers = cd.intake || intakeAnswers;
                serviceKey = cd.serviceKey || serviceKey;
                patientUid = cd.uid || cd.patientId || patientUid;
                meetingUrl = cd.meetingUrl || meetingUrl;
                const cdName = String(cd.patient || cd.patientName || '').trim();
                if (cdName && cdName !== 'Patient' && !cdName.toLowerCase().includes('unknown')) patientName = cdName;
                if (cd.intake?.firstName) {
                    patientName = `${cd.intake.firstName} ${cd.intake.lastName || ''}`.trim();
                }
                if (cd.intake?.email) patientEmail = cd.intake.email;
                if (cd.patientEmail) patientEmail = cd.patientEmail;
            }
        } catch (_) { /* silent */ }

        if (patientUid && patientName === 'Unknown Patient') {
            try {
                for (const coll of ['users', 'patients']) {
                    const snap = await getDoc(doc(db, coll, patientUid));
                    if (snap.exists()) {
                        const pd = snap.data();
                        const nm = pd.displayName || `${pd.firstName || ''} ${pd.lastName || ''}`.trim() || pd.name;
                        if (nm && !nm.toLowerCase().includes('unknown')) { patientName = nm; break; }
                        patientEmail = patientEmail || pd.email || '';
                    }
                }
            } catch (_) { /* silent */ }
        }

        if (patientName === 'Unknown Patient' && patientEmail) patientName = patientEmail.split('@')[0];

        return { patientName, patientEmail, patientUid, serviceKey, intakeAnswers, meetingUrl };
    };

    useEffect(() => {
        const unsubAuth = auth.onAuthStateChanged((user) => {
            if (!user) return;

            const q = query(
                collection(db, 'appointments'),
                where('status', 'in', ['waitlist', 'PENDING_SCHEDULING'])
            );

            const snapUnsub = onSnapshot(q, async (snap) => {
                const fetched = await Promise.all(snap.docs.map(async (d) => {
                    const data = d.data();
                    let dateObj = new Date();
                    if (data.createdAt?.toDate) dateObj = data.createdAt.toDate();
                    else if (data.updatedAt?.toDate) dateObj = data.updatedAt.toDate();

                    const enriched = await enrichFromConsultation(d.id, data);
                    const svcName = enriched.serviceKey.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
                    const priority: 'high' | 'normal' | 'low' =
                        enriched.serviceKey.includes('diagnostic') || enriched.serviceKey.includes('imaging') ? 'high' : 'normal';

                    return {
                        id: d.id,
                        patientId: enriched.patientUid,
                        patientName: enriched.patientName,
                        patientEmail: enriched.patientEmail,
                        serviceKey: enriched.serviceKey,
                        serviceName: svcName,
                        status: 'Waiting',
                        createdAt: dateObj,
                        meetingUrl: enriched.meetingUrl,
                        intakeAnswers: enriched.intakeAnswers,
                        priority,
                    } satisfies WaitlistEntry;
                }));

                setEntries(fetched.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()));
                setLoading(false);
            });

            return () => snapUnsub();
        });

        return () => unsubAuth();
    }, []);

    // Re-render elapsed times every 60s
    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 60000);
        return () => clearInterval(interval);
    }, []);

    const uniqueServices = Array.from(new Set(entries.map(e => e.serviceKey)));

    const filteredEntries = entries.filter(e => {
        const matchesSearch =
            e.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.patientEmail.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSvc = filterService === 'all' || e.serviceKey === filterService;
        return matchesSearch && matchesSvc;
    });

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 pb-24">
            {/* ── Hero Header ── */}
            <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 md:p-10 text-white shadow-2xl border border-white/5">
                <div className="absolute inset-0 opacity-20"
                    style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #6366f1 0px, transparent 60%), radial-gradient(circle at 10% 80%, #4f46e5 0px, transparent 50%)' }} />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/10">
                                <Clock className="w-5 h-5 text-indigo-300" />
                            </div>
                            <span className="text-indigo-300 font-black uppercase tracking-[0.2em] text-[10px]">Live Queue</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none">Patient Waitlist</h1>
                        <p className="text-slate-400 text-sm font-medium max-w-lg leading-relaxed mt-2">
                            Live triage queue. Patients sorted by arrival time and clinical priority. Click <strong>Admit</strong> to open their telehealth session.
                        </p>
                    </div>

                    {/* Stats chips */}
                    <div className="flex gap-4 shrink-0">
                        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10 text-center min-w-[100px]">
                            <div className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-1">Waiting</div>
                            <div className="text-4xl font-black tabular-nums">{entries.length}</div>
                        </div>
                        <div className="bg-rose-500/10 backdrop-blur-sm rounded-2xl p-5 border border-rose-400/20 text-center min-w-[100px]">
                            <div className="text-[10px] font-black uppercase tracking-widest text-rose-300 mb-1">High Priority</div>
                            <div className="text-4xl font-black tabular-nums text-rose-400">
                                {entries.filter(e => e.priority === 'high').length}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Search & Filter Bar ── */}
            <div className="flex flex-col sm:flex-row gap-3 bg-white rounded-[28px] p-3 shadow-sm border border-slate-100">
                <div className="relative flex-1 group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search by name, email, or service..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 rounded-[20px] text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-200/60 transition-all"
                    />
                </div>
                <div className="relative shrink-0">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Filter className="h-4 w-4 text-slate-400" />
                    </div>
                    <select
                        value={filterService}
                        onChange={(e) => setFilterService(e.target.value)}
                        className="appearance-none pl-11 pr-10 py-3.5 bg-slate-50 rounded-[20px] text-sm font-bold text-slate-600 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-200/60 transition-all cursor-pointer"
                    >
                        <option value="all">All Services</option>
                        {uniqueServices.map(s => (
                            <option key={s} value={s}>
                                {s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ── Waitlist Cards ── */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-28 space-y-4">
                    <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                    <p className="text-slate-400 font-semibold text-sm">Syncing live queue...</p>
                </div>
            ) : filteredEntries.length === 0 ? (
                <div className="bg-white rounded-[32px] border border-dashed border-slate-200 p-24 flex flex-col items-center text-center space-y-5 shadow-sm">
                    <div className="w-24 h-24 bg-emerald-50 rounded-[28px] flex items-center justify-center rotate-2">
                        <CheckCircle className="w-12 h-12 text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-800 mb-2">Queue is Clear</h3>
                        <p className="text-slate-500 text-sm max-w-sm leading-relaxed">
                            {searchTerm || filterService !== 'all'
                                ? 'No patients match your current filters. Try adjusting your search.'
                                : 'No patients are currently waiting. New bookings will appear here in real time.'}
                        </p>
                    </div>
                    {(searchTerm || filterService !== 'all') && (
                        <button
                            onClick={() => { setSearchTerm(''); setFilterService('all'); }}
                            className="text-indigo-600 font-bold text-sm hover:underline"
                        >
                            Clear filters
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredEntries.map((entry, index) => (
                        <div
                            key={entry.id}
                            className="group relative bg-white rounded-[28px] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-900/5 hover:border-indigo-100 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
                        >
                            {/* Priority / 'Up Next' accent bar */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-[28px] transition-all
                                ${entry.priority === 'high' ? 'bg-gradient-to-b from-rose-400 to-rose-600' :
                                    index === 0 ? 'bg-gradient-to-b from-emerald-400 to-emerald-600' :
                                        'bg-gradient-to-b from-indigo-400 to-indigo-600 opacity-0 group-hover:opacity-100'}`}
                            />

                            <div className="p-5 md:p-6 pl-8 flex flex-col md:flex-row gap-5 items-start md:items-center">
                                {/* Wait-time badge */}
                                <div className="w-[72px] h-[72px] rounded-[20px] bg-slate-50 border border-slate-100 flex flex-col items-center justify-center shrink-0 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:text-indigo-400">Wait</span>
                                    <span className="text-lg font-black text-slate-700 group-hover:text-indigo-700 leading-tight mt-0.5">
                                        {getTimeElapsed(entry.createdAt)}
                                    </span>
                                </div>

                                {/* Patient info */}
                                <div className="flex-1 min-w-0 space-y-1.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="text-lg font-black text-slate-800 truncate">{entry.patientName}</h3>
                                        {entry.priority === 'high' && (
                                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 px-2 py-1 rounded-lg border border-rose-100">
                                                <AlertCircle className="w-2.5 h-2.5" /> Priority
                                            </span>
                                        )}
                                        {index === 0 && (
                                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg border border-emerald-100">
                                                ✓ Up Next
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
                                        <span className="text-slate-400 truncate">{entry.patientEmail || '—'}</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-200 shrink-0" />
                                        <span className="text-indigo-500 truncate">{entry.serviceName}</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-200 shrink-0" />
                                        <span className="text-slate-400">
                                            Submitted {entry.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                    </div>
                                </div>

                                {/* Action buttons */}
                                <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-none border-slate-50 shrink-0 md:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <button
                                        onClick={() => { /* Future: open intake drawer */ }}
                                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 px-4 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-colors border border-slate-100"
                                    >
                                        <FileText className="w-3.5 h-3.5" /> Intake
                                    </button>
                                    <button
                                        onClick={() => setActiveCall({
                                            url: 'https://doxy.me/sign-in',
                                            apptId: entry.id,
                                            intake: entry.intakeAnswers,
                                            name: entry.patientName,
                                        })}
                                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-indigo-200 hover:shadow-indigo-300 active:scale-95"
                                    >
                                        <Video className="w-4 h-4" /> Admit
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Telehealth Modal */}
            <TelehealthIframeModal
                isOpen={!!activeCall}
                onClose={() => setActiveCall(null)}
                role="provider"
                videoLink={activeCall?.url || 'https://doxy.me/sign-in'}
                appointmentId={activeCall?.apptId}
                intakeAnswers={activeCall?.intake}
                patientName={activeCall?.name}
            />
        </div>
    );
}
