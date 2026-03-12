"use client";

import React from 'react';
import { Scan, Image as ImageIcon, Plus, Monitor } from 'lucide-react';

export default function ImagingPage() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                        <Scan className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Imaging Orders</h1>
                </div>
                <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-sm flex items-center gap-2 transition-colors">
                    <Plus className="w-5 h-5" /> Request Scan
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-slate-400" />
                    <h2 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-xs tracking-wider">PACS Integration / Orosun</h2>
                </div>

                <div className="p-20 text-center">
                    <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6 text-blue-200 dark:text-blue-700">
                        <ImageIcon className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Radiology &amp; Imaging</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">Access high-resolution scans and AI-assisted radiology reports via PACS integration.</p>
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {['X-Ray', 'MRI', 'CT Scan'].map(type => (
                        <div key={type} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-blue-300 dark:hover:border-blue-600 transition-colors cursor-pointer group">
                            <div className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase mb-1">{type}</div>
                            <div className="font-bold text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">View Samples</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
