"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Network, DatabaseZap, Eye, EyeOff, Save, RefreshCw, Activity, AlertTriangle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useUserProfile } from '@/hooks/useUserProfile';

export function RadiantLogiqClient() {
    const profile = useUserProfile();
    const [environment, setEnvironment] = useState('production');
    const [endpoint, setEndpoint] = useState('https://api.radiantlogiq.com/v1');
    const [apiKey, setApiKey] = useState('rl_live_8f7d92ja0s8df7g6h5j4k3l2z1x0c9');
    const [webhookUrl, setWebhookUrl] = useState('https://patriotic-virtual-backend-189906910824.us-central1.run.app/webhooks/radiant');
    const [showKey, setShowKey] = useState(false);
    const [testing, setTesting] = useState(false);
    const [status, setStatus] = useState<null | 'success' | 'error'>(null);

    const logs = Array.from({ length: 5 }, (_, i) => ({
        id: i,
        timestamp: new Date(Date.now() - i * 3600000).toLocaleString(),
        type: i % 2 === 0 ? 'Data Sync' : 'Webhook Received',
        status: i === 3 ? 'Failed' : 'Success',
        message: i === 3 ? 'Connection timeout' : 'Operation completed normally',
        admin: 'System'
    }));

    const handleTest = async () => {
        setTesting(true);
        setStatus(null);
        // Simulate API call
        setTimeout(() => {
            setTesting(false);
            setStatus('success');
            toast.success('Connection test successful');
        }, 1500);
    };

    const handleSave = () => {
        toast.success('RadiantLogiq settings saved successfully');
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <Link href="/admin/integrations" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-teal-600 transition-colors mb-4">
                        <ArrowLeft className="w-4 h-4" /> Back to Integrations Hub
                    </Link>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
                        <DatabaseZap className="w-8 h-8 text-teal-600" /> RadiantLogiq Integration
                    </h1>
                    <p className="text-slate-500 font-medium mt-2">Enterprise synchronization and data mapping capabilities.</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={handleTest}
                        disabled={testing}
                        className="flex items-center gap-2 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-teal-500 text-slate-700 dark:text-slate-300 px-6 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50"
                    >
                        {testing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Activity className="w-5 h-5" />}
                        Test Connection
                    </button>
                    <button 
                        onClick={handleSave}
                        className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-teal-500/30 transition-transform active:scale-95"
                    >
                        <Save className="w-5 h-5" /> Save Configuration
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">Connection Settings</h2>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Environment</label>
                                <div className="flex gap-3 relative">
                                    <button 
                                        className={`flex-1 py-3 px-4 rounded-xl border-2 font-bold transition-all ${environment === 'staging' ? 'border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                                        onClick={() => setEnvironment('staging')}
                                    >
                                        Staging
                                    </button>
                                    <button 
                                        className={`flex-1 py-3 px-4 rounded-xl border-2 font-bold transition-all ${environment === 'production' ? 'border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                                        onClick={() => setEnvironment('production')}
                                    >
                                        Production
                                    </button>
                                    {environment === 'production' && (
                                        <div className="absolute top-1 right-2 w-3 h-3 bg-red-500 rounded-full animate-pulse blur-[2px]" title="Live Env"></div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">API Endpoint URL</label>
                                <input 
                                    type="text" 
                                    value={endpoint}
                                    onChange={(e) => setEndpoint(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 font-mono text-sm dark:text-slate-100 transition-shadow outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex justify-between">
                                    <span>Live API Key</span>
                                    <span className="text-xs font-medium text-amber-500 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" /> Stored in Secret Manager
                                    </span>
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

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Webhook URL</label>
                                <input 
                                    type="text" 
                                    value={webhookUrl}
                                    onChange={(e) => setWebhookUrl(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 font-mono text-sm dark:text-slate-100 transition-shadow outline-none text-slate-500 opacity-80"
                                />
                                <p className="text-xs text-slate-500 mt-2 font-medium">Use this endpoint in RadiantLogiq to send real-time data back to the EMR.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider text-sm flex items-center justify-between">
                            Status
                            {status === 'success' && <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>}
                        </h3>
                        <div className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 ${
                            status === 'success' 
                                ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/50' 
                                : 'bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-700'
                        }`}>
                            {status === 'success' ? (
                                <>
                                    <DatabaseZap className="w-8 h-8 text-emerald-500" />
                                    <span className="font-black text-emerald-700 dark:text-emerald-400">Connected</span>
                                </>
                            ) : (
                                <>
                                    <Network className="w-8 h-8 text-slate-400" />
                                    <span className="font-black text-slate-500">Untested</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* SYNC LOGS AREA */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Activity & Sync Log</h2>
                    <span className="text-xs font-bold bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300 px-3 py-1 rounded-full border border-teal-200 dark:border-teal-800">Last 50 Events</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900">
                            <tr>
                                <th className="px-8 py-4 font-bold border-b dark:border-slate-700">Timestamp</th>
                                <th className="px-8 py-4 font-bold border-b dark:border-slate-700">Event</th>
                                <th className="px-8 py-4 font-bold border-b dark:border-slate-700">Status</th>
                                <th className="px-8 py-4 font-bold border-b dark:border-slate-700">Message</th>
                                <th className="px-8 py-4 font-bold border-b dark:border-slate-700">Initiated By</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-slate-700 dark:text-slate-300 font-medium bg-white dark:bg-slate-800">
                            {logs.map(log => (
                                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-8 py-4 whitespace-nowrap">{log.timestamp}</td>
                                    <td className="px-8 py-4">{log.type}</td>
                                    <td className="px-8 py-4">
                                        <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                            log.status === 'Success' 
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                        }`}>
                                            {log.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-4 text-slate-500 max-w-xs truncate">{log.message}</td>
                                    <td className="px-8 py-4 flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700">
                                            {log.admin.charAt(0)}
                                        </div>
                                        {log.admin}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
