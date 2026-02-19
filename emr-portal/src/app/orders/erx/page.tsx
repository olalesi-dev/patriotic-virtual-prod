"use client";

import React from 'react';
import { Pill, Plus, ExternalLink, ShieldCheck } from 'lucide-react';

export default function ErxPage() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl">
                <div className="flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-indigo-600" />
                    <span className="text-sm font-semibold text-indigo-900">DoseSpot Integration Active</span>
                </div>
                <button className="flex items-center gap-2 text-indigo-600 text-xs font-bold hover:underline">
                    View Provider Dashboard <ExternalLink className="w-3 h-3" />
                </button>
            </div>

            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="bg-rose-100 p-2 rounded-lg text-rose-600">
                        <Pill className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">eRx / Prescriptions</h1>
                </div>
                <button className="bg-brand hover:bg-brand-600 text-white font-bold py-2.5 px-4 rounded-lg shadow-sm flex items-center gap-2 transition-colors">
                    <Plus className="w-5 h-5" /> New Prescription
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="font-bold text-slate-800">Pending Refills</h2>
                    <span className="bg-rose-100 text-rose-700 text-xs font-bold px-2 py-1 rounded-full">2 Actions Required</span>
                </div>
                <div className="p-12 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                        <Pill className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">Prescription Queue</h3>
                    <p className="text-slate-500 max-w-sm mx-auto">Track medication history and manage electronic prescriptions through DoseSpot.</p>
                </div>
            </div>
        </div>
    );
}
