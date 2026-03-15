"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import {
    Users, Briefcase, Database, BarChart, ClipboardList, ArrowRight, User, AlertTriangle, Calendar
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

interface VendorAlert {
    id: string;
    name: string;
    contractEndDate: string | any;
    daysUntilExpiration: number;
}

export default function CrmDashboardClient() {
    const [expiringVendors, setExpiringVendors] = useState<VendorAlert[]>([]);
    
    useEffect(() => {
        const q = query(collection(db, 'crm', 'data', 'vendors'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const now = new Date();
            const alerts: VendorAlert[] = [];
            
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.contractEndDate && data.status !== 'Inactive' && data.status !== 'Archived') {
                    // Try to parse contractEndDate
                    let endDate: Date | null = null;
                    if (data.contractEndDate?.toDate) {
                        endDate = data.contractEndDate.toDate();
                    } else if (typeof data.contractEndDate === 'string') {
                        endDate = new Date(data.contractEndDate);
                    }
                    
                    if (endDate && !isNaN(endDate.getTime())) {
                        const days = differenceInDays(endDate, now);
                        // Show if expiring within 90 days (and not already expired for more than 30 days)
                        if (days <= 90 && days >= -30) {
                            alerts.push({
                                id: doc.id,
                                name: data.name || 'Unnamed Vendor',
                                contractEndDate: endDate,
                                daysUntilExpiration: days
                            });
                        }
                    }
                }
            });
            
            alerts.sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration);
            setExpiringVendors(alerts);
        }, (err) => {
            console.error('Fetch vendors error (Dashboard):', err);
        });

        return () => unsubscribe();
    }, []);

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
            
            {expiringVendors.length > 0 && (
                <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 p-6 rounded-[24px] shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                        <h2 className="text-lg font-black text-slate-800 dark:text-slate-200 tracking-tight">Action Required: Expiring Vendors</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {expiringVendors.map(v => (
                            <Link 
                                href={`/crm/vendors/${v.id}`} 
                                key={v.id}
                                className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-rose-100 dark:border-rose-800/50 hover:shadow-md transition-shadow group flex items-start justify-between"
                            >
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">{v.name}</h3>
                                    <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                        <Calendar className="w-3.5 h-3.5" />
                                        Ends: {format(new Date(v.contractEndDate), 'MMM d, yyyy')}
                                    </div>
                                </div>
                                <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${v.daysUntilExpiration <= 30 ? 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/50 dark:text-rose-300 dark:border-rose-800' : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-800'}`}>
                                    {v.daysUntilExpiration < 0 ? 'Expired' : `${v.daysUntilExpiration} days`}
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

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
