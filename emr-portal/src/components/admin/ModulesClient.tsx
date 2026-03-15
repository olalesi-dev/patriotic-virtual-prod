import React, { useState } from 'react';
import { ShieldCheck, ArrowLeft, Settings, Info, Box } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SPECIALTY_MODULES } from '@/lib/module-registry';
import { usePracticeModules } from '@/hooks/usePracticeModules';
import { toast } from 'sonner';

export function ModulesClient() {
    const router = useRouter();
    const { enabledModules, toggleModule } = usePracticeModules();
    const [isUpdating, setIsUpdating] = useState<string | null>(null);

    const handleToggle = async (moduleId: string, currentEnabled: boolean) => {
        setIsUpdating(moduleId);
        try {
            await toggleModule(moduleId, !currentEnabled);
        } finally {
            setIsUpdating(null);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 dark:bg-slate-900/50 rounded-full -mr-32 -mt-32 transition-transform duration-700"></div>
                <div className="relative z-10 flex gap-4">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-2xl flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <Box className="w-8 h-8 text-slate-500" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Specialty Modules</h1>
                            <span className="bg-sky-100 text-sky-600 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border border-sky-200">Admin</span>
                        </div>
                        <p className="text-slate-500 font-medium">Enable or disable specialized clinical and CRM modules for your practice.</p>
                    </div>
                </div>
                <div className="relative z-10 flex flex-wrap gap-3">
                    <button
                        onClick={() => router.push('/settings')}
                        className="px-6 py-2.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-2"
                    >
                        <Settings className="w-4 h-4" /> Global Settings
                    </button>
                    <button
                        onClick={() => router.back()}
                        className="px-6 py-2.5 bg-slate-100 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-200 transition-all flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" /> Go Back
                    </button>
                </div>
            </header>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-6 flex items-start gap-4">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-xl flex items-center justify-center shrink-0">
                    <Info className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                    <h3 className="font-bold text-amber-900 dark:text-amber-300">Module Configuration</h3>
                    <p className="text-sm text-amber-700 dark:text-amber-500/80 mt-1">
                        When a module is enabled, its specific tools and navigation routes will become visible across the entire EMR platform instantly. Placeholder views will be provisioned.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {SPECIALTY_MODULES.map((module) => {
                    const isEnabled = enabledModules.includes(module.id);
                    const isChanging = isUpdating === module.id;
                    const Icon = module.icon;

                    return (
                        <div key={module.id} className={`bg-white dark:bg-slate-800 rounded-3xl border-2 transition-all group ${isEnabled ? 'border-indigo-500 shadow-xl shadow-indigo-100/50' : 'border-slate-200 dark:border-slate-700 shadow-sm hover:border-slate-300'}`}>
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isEnabled ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 dark:bg-slate-900 text-slate-400'}`}>
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={isEnabled}
                                            onChange={() => handleToggle(module.id, isEnabled)}
                                            disabled={isChanging}
                                        />
                                        <div className={`w-11 h-6 rounded-full peer peer-focus:ring-4 peer-focus:ring-indigo-300 transition-colors ${isEnabled ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'} after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${isEnabled ? 'after:translate-x-full after:border-white' : 'after:border-gray-300'}`}></div>
                                    </label>
                                </div>
                                <h3 className={`text-lg font-black tracking-tight mb-2 ${isEnabled ? 'text-indigo-900 dark:text-indigo-400' : 'text-slate-900 dark:text-white'}`}>
                                    {module.name}
                                </h3>
                                <p className="text-sm text-slate-500 font-medium mb-6">
                                    {module.description}
                                </p>
                                
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Included Pages:</h4>
                                    <ul className="space-y-1.5">
                                        {module.pages.map(page => (
                                            <li key={page.id} className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${isEnabled ? 'bg-indigo-500' : 'bg-slate-300'}`}></div>
                                                {page.title}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                            <div className={`p-4 rounded-b-[1.7rem] flex items-center justify-center border-t ${isEnabled ? 'bg-indigo-50 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700'}`}>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isEnabled ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                                    {isEnabled ? 'Module Active' : 'Module Disabled'}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
