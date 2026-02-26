"use client";

import React, { useState } from 'react';
import {
    Activity, Users, Calendar, AlertCircle, TrendingUp, ChevronDown,
    Filter, Download, ArrowUpRight, ArrowDownRight, Search,
    ClipboardList, Stethoscope, Beaker, MessageSquare
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

const WEIGHT_LOSS_DATA = [
    { month: 'Month 1', avgLoss: 2.1 },
    { month: 'Month 2', avgLoss: 4.5 },
    { month: 'Month 3', avgLoss: 6.8 },
    { month: 'Month 4', avgLoss: 8.2 },
    { month: 'Month 5', avgLoss: 10.5 },
    { month: 'Month 6', avgLoss: 12.4 },
];

const TITRATION_DATA = [
    { name: 'On-Schedule', value: 74, color: '#4f46e5' },
    { name: 'Behind', value: 26, color: '#e2e8f0' },
];

const OVERDUE_LABS = [
    { name: 'Bobby Doe', mrn: 'MRN-001234', overdue: '12 days', status: 'High Risk' },
    { name: 'Alice Smith', mrn: 'MRN-005678', overdue: '5 days', status: 'Medium' },
    { name: 'Frank Miller', mrn: 'MRN-009012', overdue: '3 days', status: 'Routine' },
];

export default function ClinicalDashboardPage() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">CLINICAL ANALYTICS</h1>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Patient outcomes and compliance monitoring</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                        <button className="px-4 py-2 text-xs font-black uppercase tracking-widest bg-slate-900 text-white rounded-lg shadow-lg shadow-slate-200">GLP-1 Weight Loss</button>
                        <button className="px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">TRT</button>
                    </div>
                    <button className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                        <Filter className="w-4 h-4" /> Filters
                    </button>
                    <button className="flex items-center gap-2 bg-brand text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-brand/20 hover:bg-brand-600 transition-all active:scale-95">
                        <Download className="w-4 h-4" /> Export Report
                    </button>
                </div>
            </div>

            {/* ROW 1: Key Clinical Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Active Patients', value: '47', trend: '+12%', sub: 'Total enrollment', icon: Users, color: 'text-brand', bg: 'bg-brand/10' },
                    { label: 'Avg Weight Loss %', value: '8.2%', trend: '+0.5%', sub: 'Avg across cohort', icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                    { label: 'Lab Compliance', value: '82%', trend: '-2%', sub: 'Completion rate', icon: Beaker, color: 'text-amber-500', bg: 'bg-amber-50' },
                    { label: 'Titration On-Schedule', value: '74%', trend: '+5%', sub: 'Protocol adherence', icon: Calendar, color: 'text-indigo-500', bg: 'bg-indigo-50' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-6">
                            <div className={`w-12 h-12 ${stat.bg} rounded-2xl flex items-center justify-center`}>
                                <stat.icon className={`w-6 h-6 ${stat.color}`} />
                            </div>
                            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black ${stat.trend.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                {stat.trend.startsWith('+') ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                {stat.trend}
                            </div>
                        </div>
                        <div className="text-3xl font-black text-slate-900 tracking-tight">{stat.value}</div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{stat.label}</div>
                        <p className="text-[10px] font-bold text-slate-400 mt-2">{stat.sub}</p>
                    </div>
                ))}
            </div>

            {/* ROW 2: Charts */}
            <div className="grid grid-cols-12 gap-8">
                <div className="col-span-12 lg:col-span-8 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-black text-slate-900 leading-none">WEIGHT LOSS OUTCOMES</h3>
                            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Average % lost by month on program</p>
                        </div>
                        <div className="flex gap-2">
                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400">
                                <span className="w-3 h-3 bg-brand rounded-full"></span> AVG COHORT
                            </div>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={WEIGHT_LOSS_DATA}>
                                <defs>
                                    <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="month"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                    tickFormatter={(val) => `${val}%`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '16px',
                                        border: 'none',
                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                        fontSize: '12px',
                                        fontWeight: '800'
                                    }}
                                />
                                <Area type="monotone" dataKey="avgLoss" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#colorLoss)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="col-span-12 lg:col-span-4 bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-lg font-black text-white leading-none">TITRATION CADENCE</h3>
                        <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest text-indigo-300/60">Schedule Adherence</p>

                        <div className="h-[250px] w-full mt-4 flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={TITRATION_DATA}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={8}
                                        dataKey="value"
                                    >
                                        {TITRATION_DATA.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-x-0 top-[148px] text-center pointer-events-none">
                                <div className="text-4xl font-black text-white">74%</div>
                                <div className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">ON TARGET</div>
                            </div>
                        </div>

                        <div className="mt-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                    <span className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest">On-Schedule</span>
                                </div>
                                <span className="text-[10px] font-black text-white px-2 py-0.5 bg-white/10 rounded">35 Patients</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Behind Schedule</span>
                                </div>
                                <span className="text-[10px] font-black text-white px-2 py-0.5 bg-white/10 rounded">12 Patients</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ROW 3: Tables & Action Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Overdue Labs */}
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500">
                                <AlertCircle className="w-6 h-6" />
                            </div>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Overdue Labs</h3>
                        </div>
                        <button className="text-[10px] font-black text-brand uppercase tracking-widest hover:underline">View All</button>
                    </div>
                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/30">
                                <tr>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Overdue</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Risk Level</th>
                                    <th className="px-8 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {OVERDUE_LABS.map((p, i) => (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-all group">
                                        <td className="px-8 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-slate-900">{p.name}</span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">{p.mrn}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-4">
                                            <span className="text-xs font-black text-rose-500 bg-rose-50 px-2 py-1 rounded-lg">{p.overdue}</span>
                                        </td>
                                        <td className="px-8 py-4">
                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded ${p.status === 'High Risk' ? 'bg-rose-100 text-rose-700' :
                                                    p.status === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                                                }`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-4 text-right">
                                            <button className="p-2 text-slate-300 hover:text-brand transition-colors"><MessageSquare className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Side Effects / AI Insights */}
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-indigo-50/30">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Clinical Insights</h3>
                        </div>
                        <span className="bg-indigo-600 text-white text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest">AI Monitor</span>
                    </div>
                    <div className="p-4 space-y-4">
                        {[
                            { patient: 'David Chen', type: 'Side Effect', details: 'Reporting moderate GI distress via intake bot.', priority: 'High', color: 'rose' },
                            { patient: 'Elena Rossi', type: 'A1C Success', details: 'Projected 1.2% reduction based on glucometer data.', priority: 'Positive', color: 'emerald' },
                            { patient: 'Mark J.', type: 'Adherence', details: 'Missed medication log for 3 consecutive days.', priority: 'Medium', color: 'amber' },
                        ].map((insight, i) => (
                            <div key={i} className="flex gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 cursor-pointer">
                                <div className={`w-2 h-16 rounded-full bg-${insight.color}-500/20 flex flex-col items-center justify-center`}>
                                    <div className={`w-2 h-6 bg-${insight.color}-500 rounded-full`}></div>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className="text-xs font-black text-slate-900">{insight.patient}</h4>
                                        <span className={`text-[9px] font-black uppercase tracking-widest text-${insight.color}-600`}>{insight.priority}</span>
                                    </div>
                                    <p className="text-[11px] font-bold text-slate-500 leading-relaxed mb-2">{insight.details}</p>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded`}>{insight.type}</span>
                                        <span className="text-[8px] font-bold text-slate-300">Logged 4h ago</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
