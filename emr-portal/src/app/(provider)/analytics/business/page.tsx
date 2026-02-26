"use client";

import React, { useState } from 'react';
import {
    TrendingUp, DollarSign, PieChart, ArrowUpRight, ArrowDownRight,
    Target, Zap, Filter, Download, Calendar, Users,
    Briefcase, CreditCard, ShoppingBag, Clock, Activity, BarChart
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart as RePieChart, Pie, Cell,
    BarChart as ReBarChart, Bar, Legend, AreaChart, Area
} from 'recharts';

const REVENUE_DATA = [
    { month: 'Mar 25', mrr: 12000 },
    { month: 'Apr 25', mrr: 13500 },
    { month: 'May 25', mrr: 14200 },
    { month: 'Jun 25', mrr: 15800 },
    { month: 'Jul 25', mrr: 16500 },
    { month: 'Aug 25', mrr: 17200 },
    { month: 'Sep 25', mrr: 18800 },
];

const CHANNEL_DATA = [
    { name: 'Instagram', patients: 145 },
    { name: 'Google Ads', patients: 98 },
    { name: 'Referral', patients: 67 },
    { name: 'Direct', patients: 42 },
];

const SERVICE_DATA = [
    { name: 'Weight Loss', value: 65, color: '#4f46e5' },
    { name: 'HRT', value: 20, color: '#06b6d4' },
    { name: 'General', value: 15, color: '#e2e8f0' },
];

const RETENTION_DATA = [
    { month: 'Month 1', retention: 100 },
    { month: 'Month 2', retention: 98 },
    { month: 'Month 3', retention: 94 },
    { month: 'Month 4', retention: 92 },
    { month: 'Month 5', retention: 88 },
    { month: 'Month 6', retention: 85 },
];

export default function BusinessDashboardPage() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">BUSINESS ANALYTICS</h1>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Growth, revenue, and operational efficiency</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                        <button className="px-4 py-2 text-xs font-black uppercase tracking-widest bg-emerald-600 text-white rounded-lg shadow-lg shadow-emerald-200">Growth View</button>
                        <button className="px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">Unit Economics</button>
                    </div>
                    <button className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                        <Filter className="w-4 h-4" /> Filters
                    </button>
                    <button className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95">
                        <Download className="w-4 h-4" /> Export Data
                    </button>
                </div>
            </div>

            {/* ROW 1: Revenue Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'MRR', value: '$18,800', trend: '+14%', sub: 'Monthly Recurring', icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                    { label: 'Avg Rev / Patient', value: '$400', trend: '+2.5%', sub: 'Per month', icon: CreditCard, color: 'text-brand', bg: 'bg-brand/10' },
                    { label: 'Monthly Churn', value: '6%', trend: '-1.2%', sub: 'Patient cancellation', icon: PieChart, color: 'text-rose-500', bg: 'bg-rose-50' },
                    { label: 'Patient LTV', value: '$6,667', trend: '+18%', sub: 'Lifetime Value (est)', icon: Target, color: 'text-indigo-500', bg: 'bg-indigo-50' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-6">
                            <div className={`w-12 h-12 ${stat.bg} rounded-2xl flex items-center justify-center`}>
                                <stat.icon className={`w-6 h-6 ${stat.color}`} />
                            </div>
                            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black ${stat.trend.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
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
                {/* MRR Trend */}
                <div className="col-span-12 lg:col-span-6 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-black text-slate-900 leading-none uppercase tracking-tight">MRR Trend</h3>
                            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Revenue growth over 12 months</p>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={REVENUE_DATA}>
                                <defs>
                                    <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={(val) => `$${val / 1000}k`} />
                                <Tooltip />
                                <Area type="monotone" dataKey="mrr" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorMrr)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Acquisition Channels */}
                <div className="col-span-12 lg:col-span-6 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-black text-slate-900 leading-none uppercase tracking-tight">Acquisition Channels</h3>
                            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">New patients by source</p>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ReBarChart data={CHANNEL_DATA} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" axisLine={false} tickLine={false} hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                                <Tooltip />
                                <Bar dataKey="patients" fill="#4f46e5" radius={[0, 10, 10, 0]} barSize={32} />
                            </ReBarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* ROW 3: Operational Metrics & Service Revenue */}
            <div className="grid grid-cols-12 gap-8">
                {/* Revenue by Service Line */}
                <div className="col-span-12 lg:col-span-4 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col">
                    <h3 className="text-lg font-black text-slate-900 leading-none uppercase tracking-tight mb-8">Revenue by Service</h3>
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <RePieChart>
                                    <Pie data={SERVICE_DATA} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                        {SERVICE_DATA.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </RePieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-full space-y-3 mt-4">
                            {SERVICE_DATA.map((s, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }}></div>
                                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{s.name}</span>
                                    </div>
                                    <span className="text-xs font-black text-slate-900">{s.value}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Operational Grid */}
                <div className="col-span-12 lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                        { label: 'Patient CAC', value: '$124.50', sub: 'Cost per acquisition', icon: ShoppingBag, color: 'text-emerald-500' },
                        { label: 'Signup to Appointment', value: '1.4 days', sub: 'Speed to care', icon: Clock, color: 'text-indigo-500' },
                        { label: 'Appointment to Rx', value: '25 min', sub: 'Clinical efficiency', icon: Activity, color: 'text-brand' },
                        { label: 'AI Acceptance Rate', value: '92%', sub: 'Scribe/Titration acceptance', icon: Zap, color: 'text-amber-500' },
                    ].map((m, i) => (
                        <div key={i} className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-6">
                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                                <m.icon className={`w-6 h-6 ${m.color}`} />
                            </div>
                            <div>
                                <div className="text-xl font-black text-slate-900 tracking-tight">{m.value}</div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.label}</div>
                                <p className="text-[9px] font-bold text-slate-400 mt-0.5">{m.sub}</p>
                            </div>
                        </div>
                    ))}

                    {/* Retention / Cohort Preview */}
                    <div className="md:col-span-2 bg-indigo-600 p-8 rounded-[2rem] shadow-xl shadow-indigo-200 flex items-center justify-between text-white overflow-hidden relative">
                        <div className="relative z-10">
                            <h3 className="text-lg font-black leading-none uppercase tracking-tight">COHORT RETENTION</h3>
                            <p className="text-xs font-bold text-indigo-100 mt-1 opacity-80 uppercase tracking-widest">6-Month average retention</p>
                            <div className="text-4xl font-black mt-4">85%</div>
                        </div>
                        <div className="flex-1 max-w-[300px] h-[100px] relative z-10 hidden md:block">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={RETENTION_DATA}>
                                    <Line type="monotone" dataKey="retention" stroke="#fff" strokeWidth={3} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="absolute -right-8 -bottom-8 opacity-10">
                            <TrendingUp className="w-48 h-48" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
