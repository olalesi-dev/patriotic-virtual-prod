"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Activity, Eye, EyeOff, Save, ShieldCheck, AlertTriangle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export function PowerScribeClient() {
    const [serverUrl, setServerUrl] = useState('https://ps360.nuance.com/ps360');
    const [institutionId, setInstitutionId] = useState('INST-987654');
    const [username, setUsername] = useState('admin_radiology');
    const [apiToken, setApiToken] = useState('ps360_eyJhbGciOiJIUzI1NiIsInR5...');
    const [showKey, setShowKey] = useState(false);
    const [autoSync, setAutoSync] = useState(true);

    const logs = Array.from({ length: 3 }, (_, i) => ({
        id: i,
        timestamp: new Date(Date.now() - i * 86400000).toLocaleString(),
        event: 'Report Transcribed',
        status: 'Success',
        details: `Study ID: XR-${8900 + i}`,
    }));

    const handleSave = () => {
        toast.success('PowerScribe 360 settings saved securely');
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <Link href="/admin/integrations" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-teal-600 transition-colors mb-4">
                        <ArrowLeft className="w-4 h-4" /> Back to Integrations Hub
                    </Link>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
                        <Activity className="w-8 h-8 text-teal-600" /> PowerScribe 360
                    </h1>
                    <p className="text-slate-500 font-medium mt-2">Radiology voice dictation and transcription workflow.</p>
                </div>
                <button 
                    onClick={handleSave}
                    className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-teal-500/30 transition-transform active:scale-95"
                >
                    <Save className="w-5 h-5" /> Save Configuration
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
                        
                        <div className="flex gap-4 items-center bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800/50 mb-8">
                            <AlertTriangle className="w-8 h-8 text-amber-500 shrink-0" />
                            <p className="text-sm font-medium text-amber-700 dark:text-amber-400 leading-relaxed">
                                Warning: License expires in 14 days. Please contact your Nuance account representative to renew your API subscription.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Server URL</label>
                                <input 
                                    type="text" 
                                    value={serverUrl}
                                    onChange={(e) => setServerUrl(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 transition-shadow outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Institution ID</label>
                                    <input 
                                        type="text" 
                                        value={institutionId}
                                        onChange={(e) => setInstitutionId(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 transition-shadow outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Username</label>
                                    <input 
                                        type="text" 
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 transition-shadow outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex justify-between">
                                    <span>API Token</span>
                                    <span className="text-xs font-medium text-teal-600">Masked</span>
                                </label>
                                <div className="relative">
                                    <input 
                                        type={showKey ? "text" : "password"} 
                                        value={apiToken}
                                        onChange={(e) => setApiToken(e.target.value)}
                                        className="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 font-mono text-sm dark:text-slate-100 transition-shadow outline-none"
                                    />
                                    <button 
                                        onClick={() => setShowKey(!showKey)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-600 transition-colors p-1"
                                    >
                                        {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={autoSync} 
                                        onChange={(e) => setAutoSync(e.target.checked)} 
                                        className="w-5 h-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500" 
                                    />
                                    <span className="font-bold text-slate-700 dark:text-slate-300">Auto-sync approved reports to PACS</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider text-sm">Overview</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                                <span className="text-slate-500">Sync Status</span>
                                <span className="font-bold text-emerald-600 flex items-center gap-1"><ShieldCheck className="w-4 h-4"/> Active</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                                <span className="text-slate-500">Reports (30d)</span>
                                <span className="font-black text-slate-900 dark:text-white">1,402</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-slate-500">Avg Turnaround</span>
                                <span className="font-black text-slate-900 dark:text-white">12m</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* LOGS */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Activity Log</h2>
                </div>
                <div className="p-6">
                    {logs.map(log => (
                        <div key={log.id} className="flex gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors border-b border-slate-50 dark:border-slate-700 last:border-0">
                            <div className="w-10 h-10 rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-600 flex items-center justify-center shrink-0">
                                <Activity className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-slate-900 dark:text-white">{log.event}</span>
                                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 rounded font-black uppercase">{log.status}</span>
                                </div>
                                <div className="text-sm text-slate-500">{log.details}</div>
                                <div className="text-xs text-slate-400 font-medium mt-1">{log.timestamp}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
