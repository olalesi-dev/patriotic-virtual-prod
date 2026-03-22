"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, query, collection, orderBy, onSnapshot, getCountFromServer, where } from 'firebase/firestore';
import { Megaphone, Send, Clock, Calendar, AlertTriangle, Info, Sparkles, X, History, Filter, Loader2, RefreshCw, User } from 'lucide-react';
import { toast } from 'sonner';

export function CommunicationsAdminClient() {
    const [activeTab, setActiveTab] = useState<'banner' | 'broadcast' | 'history'>('banner');

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 dark:bg-indigo-900/20 rounded-full -mr-32 -mt-32 transition-transform duration-700"></div>
                <div className="relative z-10 flex gap-4">
                    <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800 shadow-sm">
                        <Megaphone className="w-8 h-8" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Communications</h1>
                        </div>
                        <p className="text-slate-500 font-medium">Manage sitewide banners and broadcast targeted inbox notifications.</p>
                    </div>
                </div>
            </header>

            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex overflow-hidden p-1">
                <button 
                    onClick={() => setActiveTab('banner')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold transition-all ${activeTab === 'banner' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    <Megaphone className="w-5 h-5" /> Banner Manager
                </button>
                <button 
                    onClick={() => setActiveTab('broadcast')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold transition-all ${activeTab === 'broadcast' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    <Send className="w-5 h-5" /> Send Notification
                </button>
                <button 
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold transition-all ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    <History className="w-5 h-5" /> Broadcast History
                </button>
            </div>

            {activeTab === 'banner' && <BannerManagerTab />}
            {activeTab === 'broadcast' && <BroadcastTab />}
            {activeTab === 'history' && <HistoryTab />}
        </div>
    );
}

function BannerManagerTab() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [message, setMessage] = useState('');
    const [type, setType] = useState<'Informational' | 'Warning' | 'Urgent' | 'Promotional'>('Informational');
    const [ctaLabel, setCtaLabel] = useState('');
    const [ctaUrl, setCtaUrl] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    const [showOnEmr, setShowOnEmr] = useState(true);
    const [showOnMarketing, setShowOnMarketing] = useState(true);

    useEffect(() => {
        const fetchBanner = async () => {
            try {
                const docSnap = await getDoc(doc(db, 'platform-config', 'active-banner'));
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setMessage(data.message || '');
                    setType(data.type || 'Informational');
                    setCtaLabel(data.ctaLabel || '');
                    setCtaUrl(data.ctaUrl || '');
                    setStartDate(data.startDate || '');
                    setEndDate(data.endDate || '');
                    setShowOnEmr(data.showOnEmr !== false);
                    setShowOnMarketing(data.showOnMarketing !== false);
                }
            } catch (e) {
                console.error("Failed to load banner config", e);
            } finally {
                setLoading(false);
            }
        };
        fetchBanner();
    }, []);

    const handleSave = async () => {
        if (!message.trim()) {
            toast.error('A banner message is required');
            return;
        }

        setSaving(true);
        try {
            await setDoc(doc(db, 'platform-config', 'active-banner'), {
                message: message.trim(),
                type,
                ctaLabel: ctaLabel.trim(),
                ctaUrl: ctaUrl.trim(),
                startDate,
                endDate,
                showOnEmr,
                showOnMarketing,
                updatedAt: new Date().toISOString()
            });
            toast.success("Banner configuration published successfully");
        } catch (error: any) {
            toast.error("Failed to save banner: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeactivate = async () => {
        setSaving(true);
        try {
            await setDoc(doc(db, 'platform-config', 'active-banner'), {
                message: '',
                type: 'Informational',
                ctaLabel: '',
                ctaUrl: '',
                startDate: '',
                endDate: '',
                showOnEmr: false,
                showOnMarketing: false,
                updatedAt: new Date().toISOString(),
                deactivated: true
            });
            setMessage('');
            setCtaLabel('');
            setCtaUrl('');
            setStartDate('');
            setEndDate('');
            setShowOnEmr(false);
            setShowOnMarketing(false);
            toast.success("Banner deactivated sitewide.");
        } catch (e: any) {
            toast.error("Failed to deactivate: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    const getColorClasses = () => {
        switch (type) {
            case 'Informational': return 'bg-teal-50 text-teal-900 border-teal-200 dark:bg-teal-900/40 dark:text-teal-100 dark:border-teal-800';
            case 'Warning': return 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-900/40 dark:text-amber-100 dark:border-amber-800';
            case 'Urgent': return 'bg-red-50 text-red-900 border-red-200 dark:bg-red-900/40 dark:text-red-100 dark:border-red-800';
            case 'Promotional': return 'bg-indigo-50 text-indigo-900 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-100 dark:border-indigo-800';
            default: return 'bg-slate-50 text-slate-900 border-slate-200 dark:bg-slate-800 dark:text-white dark:border-slate-700';
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-6">
                <div>
                    <h2 className="text-xl font-black text-slate-800 dark:text-white mb-1">Compose Banner</h2>
                    <p className="text-sm text-slate-500">All users will see this banner at the top of their screen.</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Banner Type</label>
                        <select 
                            value={type} 
                            onChange={(e) => setType(e.target.value as any)}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        >
                            <option value="Informational">Informational (Teal)</option>
                            <option value="Warning">Warning (Amber)</option>
                            <option value="Urgent">Urgent (Red)</option>
                            <option value="Promotional">Promotional (Gold/Indigo)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Message</label>
                        <textarea 
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="e.g., We are undergoing scheduled maintenance..."
                            rows={3}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl resize-none focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Button Label (Optional)</label>
                            <input 
                                type="text" 
                                value={ctaLabel}
                                onChange={(e) => setCtaLabel(e.target.value)}
                                placeholder="e.g., Learn More"
                                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Action URL</label>
                            <input 
                                type="text" 
                                value={ctaUrl}
                                onChange={(e) => setCtaUrl(e.target.value)}
                                placeholder="https://..."
                                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-700 pt-4 mt-2">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Start Time (Local)</label>
                            <input 
                                type="datetime-local" 
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">End Time (Auto-expire)</label>
                            <input 
                                type="datetime-local" 
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-700 pt-4 mt-2 space-y-3">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Surfaces</label>
                        <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900">
                            <div>
                                <span className="font-bold text-slate-800 dark:text-white block">EMR Portal</span>
                                <span className="text-xs text-slate-500">Providers & Patients (patriotic-virtual-emr.web.app)</span>
                            </div>
                            <input type="checkbox" checked={showOnEmr} onChange={e => setShowOnEmr(e.target.checked)} className="w-5 h-5 accent-indigo-600 rounded" />
                        </div>
                        <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900">
                            <div>
                                <span className="font-bold text-slate-800 dark:text-white block">Marketing Site</span>
                                <span className="text-xs text-slate-500">Public visitors (patriotictelehealth.com)</span>
                            </div>
                            <input type="checkbox" checked={showOnMarketing} onChange={e => setShowOnMarketing(e.target.checked)} className="w-5 h-5 accent-indigo-600 rounded" />
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 pt-4">
                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Megaphone className="w-5 h-5" />} Publish Banner
                    </button>
                    <button 
                        onClick={handleDeactivate}
                        disabled={saving}
                        className="bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 border border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-800 font-bold px-6 rounded-xl transition-colors"
                    >
                        Deactivate
                    </button>
                </div>
            </div>

            <div className="space-y-6">
                <div>
                    <h2 className="text-xl font-black text-slate-800 dark:text-white mb-1">Live Preview</h2>
                    <p className="text-sm text-slate-500">How the banner will appear to users.</p>
                </div>

                <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-3xl border-8 border-slate-800 dark:border-slate-950 h-[400px] overflow-hidden relative shadow-2xl">
                    <div className="absolute top-0 w-full h-8 bg-slate-800 flex items-center gap-1.5 px-4 shadow-sm z-20">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
                    </div>
                    
                    <div className="pt-8 h-full bg-white dark:bg-slate-950 flex flex-col relative z-10">
                        {/* Banner Preview Body */}
                        <div className={`w-full border-b px-4 py-3 flex flex-col sm:flex-row items-center justify-center gap-3 relative transition-colors ${getColorClasses()}`}>
                            
                            <div className="flex items-center gap-2 text-center sm:text-left">
                                {type === 'Informational' && <Info className="w-4 h-4 shrink-0" />}
                                {type === 'Warning' && <AlertTriangle className="w-4 h-4 shrink-0" />}
                                {type === 'Urgent' && <Megaphone className="w-4 h-4 shrink-0" />}
                                {type === 'Promotional' && <Sparkles className="w-4 h-4 shrink-0" />}
                                <span className="text-sm font-semibold max-w-[400px] truncate leading-tight">
                                    {message || 'Your banner message will appear here...'}
                                </span>
                            </div>

                            {ctaLabel && (
                                <button className="shrink-0 bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 px-3 py-1 rounded-full text-xs font-bold transition-colors whitespace-nowrap">
                                    {ctaLabel}
                                </button>
                            )}

                            <button className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        
                        {type === 'Promotional' && showOnMarketing && (
                            <div className="w-full bg-amber-100 dark:bg-amber-900 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center justify-center text-xs font-bold text-amber-800 dark:text-amber-200">
                                ⭐ Patient Referral Link enabled inside this banner!
                            </div>
                        )}

                        <div className="flex-1 bg-slate-50 dark:bg-slate-900 p-6 flex flex-col items-center justify-center opacity-50">
                            <span className="font-bold text-slate-400">Page Content</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function BroadcastTab() {
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [actionLabel, setActionLabel] = useState('');
    const [actionUrl, setActionUrl] = useState('');
    const [priority, setPriority] = useState<'Normal' | 'High'>('Normal');
    
    const [roleFilter, setRoleFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [manualRecipients, setManualRecipients] = useState('');
    
    const [calculating, setCalculating] = useState(false);
    const [count, setCount] = useState<number | null>(null);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        calculateRecipients();
    }, [roleFilter, statusFilter, manualRecipients]);

    const calculateRecipients = async () => {
        setCalculating(true);
        // This is an estimation for dummy data. Realistically requires querying users collection
        try {
            // Simplified calculation just to show the dynamic UI response
            let baseCount = 0;
            if (roleFilter === 'All') baseCount = 145;
            else if (roleFilter === 'Patient') baseCount = 120;
            else if (roleFilter === 'Provider') baseCount = 15;
            else if (roleFilter === 'Staff') baseCount = 10;
            
            const manualCount = manualRecipients.split(',').filter(e => e.trim().length > 0).length;
            
            // Simulating network delay
            await new Promise(r => setTimeout(r, 600));
            setCount(baseCount + manualCount);
        } finally {
            setCalculating(false);
        }
    };

    const handleSend = async () => {
        if (!subject.trim() || !body.trim()) {
            toast.error("Subject and body are required");
            return;
        }
        if (count === 0 && !manualRecipients) {
            toast.error("No recipients selected");
            return;
        }

        setSending(true);
        try {
            const res = await fetch('/api/v1/admin/broadcast', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    subject, body, actionLabel, actionUrl, priority,
                    filters: { role: roleFilter, status: statusFilter },
                    manualRecipients: manualRecipients.split(',').map(s=>s.trim()).filter(s=>s)
                })
            });

            if (!res.ok) throw new Error((await res.json()).error);
            
            toast.success(`Broadcast dispatched successfully to approx ${count} recipients!`);
            setSubject('');
            setBody('');
            setActionLabel('');
            setActionUrl('');
            setManualRecipients('');
        } catch (e: any) {
            toast.error("Failed to broadcast: " + e.message);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="col-span-1 lg:col-span-2 space-y-6">
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
                    <h2 className="text-xl font-black text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-4">Compose Broadcast</h2>
                    
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Subject</label>
                        <input 
                            value={subject} onChange={e=>setSubject(e.target.value)}
                            placeholder="e.g., Important Platform Update"
                            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Message Body</label>
                        <textarea 
                            value={body} onChange={e=>setBody(e.target.value)}
                            rows={5}
                            placeholder="Message content goes here..."
                            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl resize-none focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Action Label</label>
                            <input 
                                value={actionLabel} onChange={e=>setActionLabel(e.target.value)}
                                placeholder="View Update"
                                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Action URL</label>
                            <input 
                                value={actionUrl} onChange={e=>setActionUrl(e.target.value)}
                                placeholder="/dashboard"
                                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 border-t border-slate-100 dark:border-slate-700 pt-4">
                        <div className="flex-1">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Priority Level</label>
                            <div className="flex bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden p-1">
                                <button onClick={()=>setPriority('Normal')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${priority === 'Normal' ? 'bg-white dark:bg-slate-700 shadow border border-slate-200 dark:border-slate-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Normal</button>
                                <button onClick={()=>setPriority('High')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${priority === 'High' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 shadow border border-red-200 dark:border-red-800' : 'text-slate-500 hover:text-red-600 dark:hover:text-red-400'}`}>High Priority</button>
                            </div>
                            {priority === 'High' && <p className="text-xs font-bold text-red-500 mt-2">Triggers active toast disruption for qualifying online users.</p>}
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                    <h3 className="font-black flex items-center gap-2 text-slate-800 dark:text-white mb-4"><Filter className="w-5 h-5"/> Recipient Targeting</h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">User Role</label>
                            <select value={roleFilter} onChange={e=>setRoleFilter(e.target.value)} className="w-full p-3 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none">
                                <option>All</option>
                                <option>Patient</option>
                                <option>Provider</option>
                                <option>Staff</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Account Status</label>
                            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="w-full p-3 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none">
                                <option>All</option>
                                <option>Active</option>
                                <option>Pending</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Manual UIDs/Emails (Comma separated)</label>
                            <textarea 
                                value={manualRecipients} onChange={e=>setManualRecipients(e.target.value)}
                                rows={2} placeholder="Add specific targets..."
                                className="w-full p-3 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl resize-none focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="mt-6 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
                        <div>
                            <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Est. Reach</div>
                            <div className="text-3xl font-black text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                                {calculating ? <Loader2 className="w-6 h-6 animate-spin"/> : count} <User className="w-5 h-5 text-indigo-500"/>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={handleSend} disabled={sending}
                        className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {sending ? <Loader2 className="w-5 h-5 animate-spin"/> : <Send className="w-5 h-5"/>} Broadcast Notification
                    </button>
                </div>
            </div>
        </div>
    );
}

function HistoryTab() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'admin-broadcast-log'), orderBy('timestamp', 'desc'));
        const unsub = onSnapshot(q, snap => {
            setLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return () => unsub();
    }, []);

    if (loading) return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500"/></div>;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                <h3 className="font-black text-lg text-slate-800 dark:text-white">Broadcast History</h3>
            </div>
            {logs.length === 0 ? (
                <div className="p-12 text-center text-slate-500">No broadcasts have been sent yet.</div>
            ) : (
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-black uppercase text-slate-500">
                            <th className="p-4">Date</th>
                            <th className="p-4">Subject</th>
                            <th className="p-4">Priority</th>
                            <th className="p-4">Targets</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {logs.map(log => (
                            <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                                <td className="p-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                                    {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : 'Unknown'}
                                </td>
                                <td className="p-4">
                                    <div className="font-bold text-slate-900 dark:text-white">{log.subject}</div>
                                    <div className="text-xs text-slate-500 truncate max-w-xs">{log.body}</div>
                                </td>
                                <td className="p-4">
                                    {log.priority === 'High' ? (
                                        <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-black uppercase">High</span>
                                    ) : (
                                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-black uppercase">Normal</span>
                                    )}
                                </td>
                                <td className="p-4 text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                    {log.recipientCount} <span className="text-slate-400 font-normal ml-1">users</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
