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

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-slate-400" />
                    <h2 className="font-bold text-slate-800 uppercase text-xs tracking-wider">PACS Integration / Orosun</h2>
                </div>

                <div className="p-20 text-center">
                    <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-blue-200">
                        <ImageIcon className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Radiology & Imaging</h3>
                    <p className="text-slate-500 max-w-md mx-auto">Access high-resolution scans and AI-assisted radiology reports via PACS integration.</p>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {['X-Ray', 'MRI', 'CT Scan'].map(type => (
                        <div key={type} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition-colors cursor-pointer group">
                            <div className="text-xs font-black text-slate-400 uppercase mb-1">{type}</div>
                            <div className="font-bold text-slate-700 group-hover:text-blue-600 transition-colors">View Samples</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
