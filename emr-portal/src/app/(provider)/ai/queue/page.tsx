"use client";

import React from 'react';
import { Bot, Zap, CheckCircle2, Clock, MoreHorizontal } from 'lucide-react';

export default function AiQueuePage() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-lg text-indigo-600 dark:text-indigo-400">
                        <Bot className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">AI Action Queue</h1>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-brand/10 text-brand rounded-lg text-sm font-bold animate-pulse">
                    <Zap className="w-4 h-4" /> Real-time Analysis Active
                </div>
            </div>

            <div className="space-y-4">
                {[
                    { id: '1', type: 'Lab Insight', patient: 'Wendy Smith', suggestion: 'Abnormal glucose level detected. Recommend HBA1C follow-up titration.', status: 'Pending Review', group: 'Titration' },
                    { id: '2', type: 'Protocol Match', patient: 'John Doe', suggestion: 'Vitals data matches Hypertension Stage 1 protocol. Start ACE inhibitor review.', status: 'High Priority', group: 'Chronic Care' },
                ].map((item, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-500 dark:text-indigo-400">
                                    <Bot className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="text-xs font-black text-indigo-400 uppercase tracking-wider">{item.type}</div>
                                    <div className="font-bold text-slate-800 dark:text-slate-100">{item.patient}</div>
                                </div>
                            </div>
                            <button className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-1">
                                <MoreHorizontal className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700 mb-6 text-sm leading-relaxed">
                            {item.suggestion}
                        </p>

                        <div className="flex justify-between items-center">
                            <div className="flex gap-4">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 dark:text-slate-500">
                                    <Clock className="w-4 h-4" /> Received 10m ago
                                </div>
                                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">
                                    #{item.group}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Dismiss</button>
                                <button className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-brand-600 transition-colors">
                                    <CheckCircle2 className="w-4 h-4" /> Approve Action
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
