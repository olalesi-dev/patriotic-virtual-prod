"use client";

import React from 'react';
import Link from 'next/link';
import {
    Users, Briefcase, Database, BarChart, ClipboardList, ArrowRight, User
} from 'lucide-react';

export default function CrmDashboardClient() {
    const modules = [
        {
            title: 'Patients',
            description: 'Individual telehealth leads and active patients.',
            icon: User,
            href: '/crm/patients',
            color: 'bg-indigo-50 text-indigo-600 border-indigo-100',
            darkColor: 'dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800/50'
        },
        {
            title: 'Facilities',
            description: 'Urgent care centers, hospitals, and B2B partners.',
            icon: Briefcase,
            href: '/crm/facilities',
            color: 'bg-sky-50 text-sky-600 border-sky-100',
            darkColor: 'dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800/50'
        },
        {
            title: 'Vendors',
            description: 'Third-party business relationships and contractors.',
            icon: Users,
            href: '/crm/vendors',
            color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
            darkColor: 'dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50'
        },
        {
            title: 'Campaigns',
            description: 'Marketing and outreach efforts tracking.',
            icon: BarChart,
            href: '/crm/campaigns',
            color: 'bg-amber-50 text-amber-600 border-amber-100',
            darkColor: 'dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50'
        },
        {
            title: 'Grant Proposals',
            description: 'Funding opportunities and submission lifecycle.',
            icon: ClipboardList,
            href: '/crm/grants',
            color: 'bg-rose-50 text-rose-600 border-rose-100',
            darkColor: 'dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800/50'
        }
    ];

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-800 p-8 rounded-[36px] shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center border border-indigo-100 dark:border-indigo-800/50">
                            <Database className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">CRM Dashboard</h1>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xl leading-relaxed mt-2 pl-15">
                        Manage your relationships with patients, B2B facilities, vendors, marketing campaigns, and grant proposals.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modules.map((mod) => (
                    <Link key={mod.href} href={mod.href} className="group flex flex-col justify-between bg-white dark:bg-slate-800 rounded-[32px] border border-slate-100 dark:border-slate-700 p-6 shadow-sm hover:shadow-xl hover:shadow-indigo-900/5 transition-all duration-300 hover:-translate-y-1">
                        <div className="space-y-4">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-transform group-hover:scale-110 ${mod.color} ${mod.darkColor}`}>
                                <mod.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">{mod.title}</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{mod.description}</p>
                            </div>
                        </div>
                        <div className="mt-8 flex items-center text-sm font-bold text-indigo-600 dark:text-indigo-400 group-hover:gap-3 gap-2 transition-all">
                            View {mod.title} <ArrowRight className="w-4 h-4" />
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
