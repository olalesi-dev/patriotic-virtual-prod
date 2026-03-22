"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Puzzle, ArrowLeft, Download, Trash2, ShieldCheck, Star } from 'lucide-react';
import { toast } from 'sonner';

export function PluginsClient() {
    const [installedPlugins, setInstalledPlugins] = useState([
        { id: '1', name: 'Stripe Enhanced Billing', version: '2.4.1', publisher: 'FinTech Integrators', installDate: 'Oct 12, 2025', active: true },
        { id: '2', name: 'Advanced Vitals Graph', version: '1.0.8', publisher: 'MedAnalytics', installDate: 'Nov 05, 2025', active: false },
    ]);

    const marketplace = [
        { id: 'm1', name: 'Mailchimp Sync', description: 'Automatically push patient demographics to Mailchimp lists.', rating: 4.8, installs: '5k+', publisher: 'Marketing Ops' },
        { id: 'm2', name: 'Dexcom G6 Connect', description: 'Real-time blood glucose telemetry mapping.', rating: 4.9, installs: '12k+', publisher: 'Endocrinology Tools' },
    ];

    const togglePlugin = (id: string) => {
        setInstalledPlugins(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p));
        toast.success('Plugin state updated.');
    };

    const uninstallPlugin = (id: string) => {
        if (window.confirm("Are you sure you want to uninstall this plugin? All local data will be deleted.")) {
            setInstalledPlugins(prev => prev.filter(p => p.id !== id));
            toast.success('Plugin uninstalled successfully.');
        }
    };

    const installPlugin = (name: string) => {
        toast.success(`${name} installation initiated.`);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <Link href="/admin/integrations" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-teal-600 transition-colors mb-4">
                        <ArrowLeft className="w-4 h-4" /> Back to Integrations Hub
                    </Link>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
                        <Puzzle className="w-8 h-8 text-teal-600" /> Plugins & Extensions
                    </h1>
                    <p className="text-slate-500 font-medium mt-2">Manage installed third-party modules or install new ones from the marketplace.</p>
                </div>
            </header>

            {/* INSTALLED PLUGINS */}
            <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Installed Plugins</h2>
                {installedPlugins.length === 0 ? (
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 shadow-sm">
                        <Puzzle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-600 dark:text-slate-300">No plugins installed</h3>
                        <p className="text-slate-500">Explore the marketplace below to extend your platform.</p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50">
                                <tr>
                                    <th className="px-6 py-4 font-bold border-b dark:border-slate-700">Plugin Name</th>
                                    <th className="px-6 py-4 font-bold border-b dark:border-slate-700">Version</th>
                                    <th className="px-6 py-4 font-bold border-b dark:border-slate-700">Publisher</th>
                                    <th className="px-6 py-4 font-bold border-b dark:border-slate-700">Installed Date</th>
                                    <th className="px-6 py-4 font-bold border-b dark:border-slate-700">Status</th>
                                    <th className="px-6 py-4 font-bold border-b dark:border-slate-700 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-slate-700 dark:text-slate-300 font-medium">
                                {installedPlugins.map(plugin => (
                                    <tr key={plugin.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900 dark:text-white flex items-center gap-3">
                                            <Puzzle className={`w-5 h-5 ${plugin.active ? 'text-teal-500' : 'text-slate-300'}`} />
                                            {plugin.name}
                                        </td>
                                        <td className="px-6 py-4">{plugin.version}</td>
                                        <td className="px-6 py-4 flex items-center gap-1">
                                            <ShieldCheck className="w-4 h-4 text-emerald-500" /> {plugin.publisher}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">{plugin.installDate}</td>
                                        <td className="px-6 py-4">
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" checked={plugin.active} onChange={() => togglePlugin(plugin.id)} className="sr-only peer" />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-teal-500"></div>
                                            </label>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => uninstallPlugin(plugin.id)}
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg transition-colors font-bold text-xs"
                                            >
                                                <Trash2 className="w-4 h-4 inline-block -mt-0.5 mr-1" />
                                                Uninstall
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* MARKETPLACE */}
            <div className="pt-8">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Marketplace Discover</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {marketplace.map(item => (
                        <div key={item.id} className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl transition-shadow flex flex-col group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                                    <Puzzle className="w-6 h-6" />
                                </div>
                                <div className="flex flex-col items-end">
                                    <div className="flex items-center gap-1 text-xs font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full mb-1">
                                        <Star className="w-3 h-3 fill-current" /> {item.rating}
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{item.installs} Users</span>
                                </div>
                            </div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">{item.name}</h3>
                            <p className="text-sm text-slate-500 leading-relaxed mb-6 flex-1">{item.description}</p>
                            
                            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-4">
                                <div className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                    <ShieldCheck className="w-4 h-4 text-emerald-500" /> By {item.publisher}
                                </div>
                                <button 
                                    onClick={() => installPlugin(item.name)}
                                    className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-bold py-2 px-5 rounded-xl transition-colors text-sm"
                                >
                                    <Download className="w-4 h-4" /> Install
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}
