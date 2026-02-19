"use client";

import React from 'react';
import { TrendingUp, DollarSign, PieChart, ArrowUpRight, Target, Zap } from 'lucide-react';

export default function BusinessDashboardPage() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Business Dashboard</h1>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    {['Quarter', 'Month', 'Week'].map(tab => (
                        <button key={tab} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${tab === 'Month' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>{tab}</button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'MRR', value: '$42,500', trend: '+12%', icon: DollarSign, color: 'text-emerald-500' },
                    { label: 'Avg Acquisition', value: '$85.20', trend: '-5%', icon: Target, color: 'text-blue-500' },
                    { label: 'Net Churn', value: '1.2%', trend: '-0.3%', icon: PieChart, color: 'text-indigo-500' },
                    { label: 'Active Members', value: '342', trend: '+28', icon: Zap, color: 'text-amber-500' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                        <div className="flex justify-between items-center mb-4">
                            <stat.icon className={`w-5 h-5 ${stat.color}`} />
                            <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
                        </div>
                        <div className="text-2xl font-black text-slate-800 tracking-tight">{stat.value}</div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{stat.label}</div>
                        <div className={`text-xs font-bold mt-2 ${stat.trend.startsWith('+') ? 'text-emerald-600' : 'text-emerald-600'}`}>{stat.trend} from last month</div>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mb-6 text-emerald-200">
                    <PieChart className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Revenue & Churn Analysis</h3>
                <p className="text-slate-500 max-w-md mx-auto">Track clinical growth, acquisition costs, and subscription revenue in real-time.</p>
            </div>
        </div>
    );
}
