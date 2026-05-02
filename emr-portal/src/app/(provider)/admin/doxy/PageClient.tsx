'use client';

import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, Video, ShieldCheck, ExternalLink, Hash, CheckCircle } from 'lucide-react';

export default function DoxyAdminSettings() {
    const [doxyUrl, setDoxyUrl] = useState('');
    const [clinicName, setClinicName] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/admin/doxy');
            const result = await res.json();
            if (result.success && result.data) {
                setDoxyUrl(result.data.doxyUrl || '');
                setClinicName(result.data.clinicName || '');
                setIsActive(result.data.isActive !== false);
            }
        } catch (error) {
            console.error('Failed to load settings', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        setMessage(null);
        try {
            const res = await fetch('/api/admin/doxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ doxyUrl, clinicName, isActive })
            });
            const result = await res.json();
            
            if (result.success) {
                setMessage({ type: 'success', text: 'Doxy integration settings saved successfully.' });
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed to save settings.' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'An unexpected error occurred while saving.' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center p-12">
                <div className="w-8 h-8 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-8 pb-20">
            {/* Header section with gradient */}
            <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-indigo-900 to-indigo-950 p-8 shadow-xl">
                <div className="absolute top-0 right-0 p-12 opacity-10">
                    <Video className="w-64 h-64 mix-blend-overlay" />
                </div>
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="bg-indigo-500/20 text-indigo-200 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase border border-indigo-500/30">
                                Global Settings
                            </span>
                        </div>
                        <h1 className="text-3xl font-black text-white hover:text-indigo-50 transition-colors">
                            Doxy.me Integration
                        </h1>
                        <p className="text-indigo-200/80 mt-2 max-w-lg font-medium">
                            Configure default telehealth routing for the entire clinic. Provider-specific overrides may bypass these defaults.
                        </p>
                    </div>
                </div>
            </div>

            {/* Form Content */}
            <div className="grid gap-6">
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 dark:border-slate-700">
                    
                    {message && (
                        <div className={`flex items-start gap-3 p-4 rounded-2xl mb-6 border ${
                            message.type === 'success' 
                                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/50' 
                                : 'bg-rose-50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800/50'
                        }`}>
                            {message.type === 'success' ? (
                                <CheckCircle className="w-5 h-5 mt-0.5 shrink-0" />
                            ) : (
                                <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                            )}
                            <p className="text-sm font-semibold">{message.text}</p>
                        </div>
                    )}

                    <div className="space-y-6 max-w-2xl">
                        
                        {/* Integration Status Toggle */}
                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                            <div className="space-y-1">
                                <label className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                    Integration Status
                                </label>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Toggle the global Doxy.me telehealth integration on or off.
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer" 
                                    checked={isActive}
                                    onChange={(e) => setIsActive(e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                            </label>
                        </div>

                        {/* Clinic Name Input */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <Hash className="w-4 h-4 text-slate-400" />
                                Clinic Name (Doxy Room Name)
                            </label>
                            <input
                                type="text"
                                value={clinicName}
                                onChange={(e) => setClinicName(e.target.value)}
                                placeholder="e.g., Patriotic Virtual Telehealth"
                                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-900 dark:text-white"
                            />
                        </div>

                        {/* Doxy URL Input */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <ExternalLink className="w-4 h-4 text-slate-400" />
                                Default Doxy.me Room URL
                            </label>
                            <p className="text-xs text-slate-500 dark:text-slate-400 pb-1">
                                Enter the full https:// link to the primary clinic Doxy room.
                            </p>
                            <div className="relative">
                                <input
                                    type="url"
                                    value={doxyUrl}
                                    onChange={(e) => setDoxyUrl(e.target.value)}
                                    placeholder="https://pvt.doxy.me/virtualtelehealth"
                                    className="w-full pl-4 pr-12 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-900 dark:text-white"
                                />
                                {doxyUrl && (
                                    <a 
                                        href={doxyUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-indigo-500"
                                        title="Test Link"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-700">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-8 py-3.5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98]"
                        >
                            {isSaving ? (
                                <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {isSaving ? 'Saving...' : 'Save Configuration'}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
