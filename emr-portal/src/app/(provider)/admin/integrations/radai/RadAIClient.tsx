"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Bot, Save, Eye, EyeOff, BarChart2, ShieldCheck, ArrowLeft, Zap } from 'lucide-react';
import { toast } from 'sonner';

export function RadAIClient() {
    const [apiKey, setApiKey] = useState('rai_live_9f8d7e6c5b4a3');
    const [showKey, setShowKey] = useState(false);
    const [modelVersion, setModelVersion] = useState('v4.2-clinical');
    const [autoSuggest, setAutoSuggest] = useState(true);
    const [conciseness, setConciseness] = useState('balanced');

    const logs = Array.from({ length: 4 }, (_, i) => ({
        id: i,
        timestamp: new Date(Date.now() - i * 14400000).toLocaleString(),
        event: 'Impression Generated',
        status: 'Processed',
        details: 'Type: Chest X-RAY • Processing Time: 1.2s',
    }));

    const handleSave = () => {
        toast.success('Rad AI integration active: Settings updated');
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <Link href="/admin/integrations" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-teal-600 transition-colors mb-4">
                        <ArrowLeft className="w-4 h-4" /> Back to Integrations Hub
                    </Link>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
                        <Bot className="w-8 h-8 text-teal-600" /> Rad AI Engine
                    </h1>
                    <p className="text-slate-500 font-medium mt-2">AI-assisted generative radiology reporting and impressions.</p>
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
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex justify-between">
                                    <span>API Key</span>
                                    <span className="text-xs font-medium text-teal-600">Encrypted</span>
                                </label>
                                <div className="relative">
                                    <input 
                                        type={showKey ? "text" : "password"} 
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
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

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Model Version</label>
                                    <select 
                                        value={modelVersion} 
                                        onChange={(e) => setModelVersion(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 transition-shadow outline-none dark:text-slate-200"
                                    >
                                        <option value="v3.0-stable">v3.0 (Stable)</option>
                                        <option value="v4.2-clinical">v4.2 (Clinical)</option>
                                        <option value="latest">Latest (Beta)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Reporting Output</label>
                                    <select 
                                        value={conciseness} 
                                        onChange={(e) => setConciseness(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 transition-shadow outline-none dark:text-slate-200"
                                    >
                                        <option value="verbose">Verbose & Detailed</option>
                                        <option value="balanced">Balanced</option>
                                        <option value="concise">Highly Concise</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                                <label className="flex items-center justify-between cursor-pointer group">
                                    <div>
                                        <div className="font-bold text-slate-700 dark:text-slate-300">Auto-Suggest Mode</div>
                                        <div className="text-sm text-slate-500">Automatically pre-draft impressions when studies load.</div>
                                    </div>
                                    <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoSuggest ? 'bg-teal-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                        <span onClick={() => setAutoSuggest(!autoSuggest)} className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoSuggest ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-3xl p-6 border border-indigo-600 shadow-xl shadow-indigo-500/20 text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-2xl rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700"></div>
                        <h3 className="font-bold text-indigo-100 mb-6 uppercase tracking-wider text-sm flex items-center gap-2">
                            <BarChart2 className="w-4 h-4" /> Usage Metrics
                        </h3>
                        <div className="space-y-5 relative z-10">
                            <div>
                                <div className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">Reports Processed (MTD)</div>
                                <div className="text-4xl font-black">2,840</div>
                            </div>
                            <div className="h-px w-full bg-white/20"></div>
                            <div>
                                <div className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">Avg Turnaround Reduction</div>
                                <div className="text-3xl font-black flex items-center gap-2">
                                    <Zap className="w-6 h-6 text-yellow-300 fill-current" /> 42%
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* EVENT LOG */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Inference Log</h2>
                </div>
                <div className="p-6">
                    {logs.map(log => (
                        <div key={log.id} className="flex gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors border-b border-slate-50 dark:border-slate-700 last:border-0">
                            <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center shrink-0">
                                <Bot className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-slate-900 dark:text-white">{log.event}</span>
                                    <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 rounded font-black uppercase">{log.status}</span>
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
