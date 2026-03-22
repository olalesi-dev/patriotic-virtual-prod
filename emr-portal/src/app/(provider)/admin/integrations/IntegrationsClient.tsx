"use client";

import React from 'react';
import Link from 'next/link';
import { Network, Video, DatabaseZap, Activity, Bot, Puzzle, Key, ChevronRight, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

export function IntegrationsClient() {
    const integrations = [
        {
            id: 'doxy',
            name: 'Doxy.me',
            description: 'Telehealth video consultations and virtual waiting room.',
            icon: Video,
            status: 'Connected',
            lastSync: 'Real-time',
            href: '/admin/integrations/doxy'
        },
        {
            id: 'radiantlogiq',
            name: 'RadiantLogiq',
            description: 'Enterprise data exchange and API synchronization.',
            icon: DatabaseZap,
            status: 'Connected',
            lastSync: '2 minutes ago',
            href: '/admin/integrations/radiantlogiq'
        },
        {
            id: 'powerscribe',
            name: 'PowerScribe 360',
            description: 'Radiology voice dictation and transcription.',
            icon: Activity,
            status: 'Expiring Soon',
            lastSync: '1 hour ago',
            href: '/admin/integrations/powerscribe'
        },
        {
            id: 'radai',
            name: 'Rad AI',
            description: 'AI generation for radiology impression reports.',
            icon: Bot,
            status: 'Connected',
            lastSync: '15 minutes ago',
            href: '/admin/integrations/radai'
        },
        {
            id: 'plugins',
            name: 'Plugins Marketplace',
            description: 'Third-party community modules and platform extensions.',
            icon: Puzzle,
            status: '2 Active',
            lastSync: '',
            href: '/admin/integrations/plugins'
        },
        {
            id: 'apis',
            name: 'API Keys Manager',
            description: 'Developer access credentials and webhooks.',
            icon: Key,
            status: '5 Active Keys',
            lastSync: '',
            href: '/admin/integrations/apis'
        }
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
                        <Network className="w-8 h-8 text-teal-600" /> Integrations Hub
                    </h1>
                    <p className="text-slate-500 font-medium mt-2">Manage third-party connections, API keys, and platform extensions.</p>
                </div>
            </header>

            {/* DASHBOARD SUMMARY */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Active</h3>
                        <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-xl text-slate-500"><Network className="w-5 h-5"/></div>
                    </div>
                    <p className="text-4xl font-black text-slate-900 dark:text-white">6</p>
                </div>
                <div className="bg-gradient-to-br from-teal-500 to-teal-700 p-6 rounded-3xl border border-teal-600 shadow-lg shadow-teal-500/20 text-white flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <h3 className="text-sm font-bold text-teal-100 uppercase tracking-wider">Connected</h3>
                        <div className="bg-white/20 p-2 rounded-xl text-white"><CheckCircle2 className="w-5 h-5"/></div>
                    </div>
                    <p className="text-4xl font-black text-white relative z-10">4</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-3xl border border-amber-200 dark:border-amber-800/50 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-sm font-bold text-amber-700 dark:text-amber-500 uppercase tracking-wider">Expiring/Errors</h3>
                        <div className="bg-amber-100 dark:bg-amber-900/50 p-2 rounded-xl text-amber-600 dark:text-amber-400"><AlertTriangle className="w-5 h-5"/></div>
                    </div>
                    <p className="text-4xl font-black text-amber-700 dark:text-amber-500">1</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-3xl border border-emerald-200 dark:border-emerald-800/50 flex flex-col justify-center items-center text-center">
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-4 relative">
                        <div className="absolute inset-0 bg-emerald-400 rounded-full blur-md opacity-40 animate-pulse"></div>
                        <CheckCircle2 className="w-8 h-8 relative z-10" />
                    </div>
                    <h3 className="text-sm font-bold text-emerald-700 dark:text-emerald-500 uppercase tracking-widest">Global Status</h3>
                    <p className="font-black text-emerald-900 dark:text-emerald-300 mt-1">All Systems Nominal</p>
                </div>
            </div>

            {/* INTEGRATION GRID */}
            <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Connected Integrations</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {integrations.map((integration) => (
                        <div key={integration.id} className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:border-teal-300 dark:hover:border-teal-700 transition-all duration-300 flex flex-col group overflow-hidden">
                            <div className="p-6 flex-1 flex flex-col relative z-10">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-14 h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center shadow-inner border border-slate-100 dark:border-slate-800 text-teal-600 group-hover:scale-110 transition-transform duration-300">
                                        <integration.icon className="w-7 h-7" />
                                    </div>
                                    <div className={`px-3 py-1 text-xs font-bold rounded-full border shadow-sm ${
                                        integration.status === 'Connected' 
                                            ? 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800' 
                                            : integration.status === 'Expiring Soon'
                                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                                                : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                    }`}>
                                        {integration.status}
                                    </div>
                                </div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{integration.name}</h3>
                                <p className="text-sm text-slate-500 leading-relaxed flex-1">{integration.description}</p>
                                
                                {integration.lastSync && (
                                    <div className="mt-6 flex items-center gap-2 text-xs font-bold text-slate-400">
                                        <Clock className="w-3.5 h-3.5" /> Last Sync: {integration.lastSync}
                                    </div>
                                )}
                            </div>
                            <Link href={integration.href} className="border-t border-slate-100 dark:border-slate-700 p-4 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                                <span>Configure Settings</span>
                                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
