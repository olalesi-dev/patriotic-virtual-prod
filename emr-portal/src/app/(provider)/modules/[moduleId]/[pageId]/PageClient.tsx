"use client";

import React from 'react';
import { SPECIALTY_MODULES } from '@/lib/module-registry';
import { ArrowLeft, Box, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function ModulePageClient({ moduleId, pageId }: { moduleId: string, pageId: string }) {
    const router = useRouter();
    const module = SPECIALTY_MODULES.find(m => m.id === moduleId);
    const page = module?.pages.find(p => p.id === pageId);

    if (!module || !page) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <p className="text-slate-500">Module or page not found.</p>
            </div>
        );
    }

    const Icon = module.icon;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 dark:bg-indigo-900/20 rounded-full -mr-32 -mt-32 transition-transform duration-700"></div>
                <div className="relative z-10 flex gap-4">
                    <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800 shadow-sm">
                        <Icon className="w-8 h-8" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{page.title}</h1>
                            <span className="bg-sky-100 text-sky-600 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border border-sky-200">{module.name} Module</span>
                        </div>
                        <p className="text-slate-500 font-medium">Manage specific specialized data associated with {page.title.toLowerCase()}.</p>
                    </div>
                </div>
            </header>

            <div className="bg-white dark:bg-slate-800 p-12 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm text-center flex flex-col items-center">
                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-6 border-4 border-emerald-50 dark:border-slate-800">
                    <CheckCircle2 className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{module.name} Active</h2>
                <p className="text-slate-500 mb-8 max-w-md">
                    This specialty clinical workspace has been provisioned and is ready for use. You can now use this page to manage {page.title.toLowerCase()}.
                </p>
            </div>
        </div>
    );
}
