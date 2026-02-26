"use client";

import React from 'react';
import { Microscope, Plus, FlaskConical, Filter } from 'lucide-react';

export default function LabsPage() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                        <Microscope className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Lab Orders</h1>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                        <Filter className="w-4 h-4" /> Filter
                    </button>
                    <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-sm flex items-center gap-2 transition-colors">
                        <Plus className="w-5 h-5" /> Order Lab
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <FlaskConical className="w-4 h-4 text-emerald-500" /> Recent Activity
                    </h3>
                    <div className="space-y-4">
                        {[
                            { patient: 'Wendy Smith', test: 'Complete Blood Count (CBC)', status: 'Resulted', color: 'text-emerald-600 bg-emerald-50' },
                            { patient: 'John Doe', test: 'Metabolic Panel', status: 'In Transit', color: 'text-amber-600 bg-amber-50' },
                        ].map((lab, i) => (
                            <div key={i} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                                <div>
                                    <div className="font-bold text-slate-800">{lab.test}</div>
                                    <div className="text-xs text-slate-500">{lab.patient}</div>
                                </div>
                                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${lab.color}`}>{lab.status}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                        <Microscope className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">Health Gorilla Portal</h3>
                    <p className="text-slate-500 text-sm max-w-[250px]">Diagnostic lab orders and result processing integrated seamlessly.</p>
                </div>
            </div>
        </div>
    );
}
