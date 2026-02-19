"use client";

import React from 'react';
import { Activity, BarChart, TrendingUp, Users, Calendar, AlertCircle } from 'lucide-react';

export default function ClinicalDashboardPage() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                        <Activity className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Clinical Dashboard</h1>
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600">Last 30 Days</button>
                    <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700">Export PDF</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Patient Outcomes', value: '94%', trend: '+2.4%', icon: Activity, color: 'text-emerald-600' },
                    { label: 'Lab Compliance', value: '88%', trend: '+1.2%', icon: Users, color: 'text-blue-600' },
                    { label: 'Avg Titration Time', value: '12d', trend: '-1.5d', icon: Calendar, color: 'text-indigo-600' },
                    { label: 'Alerts Pending', value: '5', trend: 'High', icon: AlertCircle, color: 'text-rose-600' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <stat.icon className={`w-6 h-6 ${stat.color}`} />
                            <span className="text-xs font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">{stat.trend}</span>
                        </div>
                        <div className="text-2xl font-bold text-slate-800">{stat.value}</div>
                        <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">{stat.label}</div>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 min-h-[400px] flex items-center justify-center text-center">
                <div>
                    <BarChart className="w-16 h-16 text-slate-100 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-800 mb-1">Outcomes Analysis</h3>
                    <p className="text-slate-500 max-w-sm mx-auto">Visualizing HIPAA-compliant clinical data and patient health trends over time.</p>
                </div>
            </div>
        </div>
    );
}
