"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import {
    Plus, Search, User, Briefcase, Users, BarChart, ClipboardList,
    Database, ArrowRight, Activity, Filter
} from 'lucide-react';
import { format } from 'date-fns';

const ENTITY_CONFIG = {
    patients: { title: 'Patients', icon: User, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/30' },
    facilities: { title: 'Facilities', icon: Briefcase, color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-900/30' },
    vendors: { title: 'Vendors', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
    campaigns: { title: 'Campaigns', icon: BarChart, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/30' },
    grants: { title: 'Grant Proposals', icon: ClipboardList, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/30' }
};

interface CrmEntity {
    id: string;
    name: string;
    status: string;
    assignedOwner: string;
    tags: string[];
    lastActivityDate?: Timestamp | Date;
    [key: string]: any;
}

export default function CrmEntityListClient({ entityType }: { entityType: string }) {
    const router = useRouter();
    const [entities, setEntities] = useState<CrmEntity[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const config = ENTITY_CONFIG[entityType as keyof typeof ENTITY_CONFIG] || ENTITY_CONFIG.patients;
    const Icon = config.icon;

    useEffect(() => {
        // According to our CRM data model: db.collection('crm').doc('data').collection(entityType)
        const q = query(
            collection(db, 'crm', 'data', entityType),
            orderBy('lastActivityDate', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as CrmEntity[];
            setEntities(data);
            setLoading(false);
        }, (err) => {
            console.error('Fetch CRM entities error:', err);
            // Ignore missing index error and just load what we can if indexes aren't built yet
            setLoading(false);
        });

        // Safe fallback without ordering if it initially fails on missing index
        const qFallback = query(collection(db, 'crm', 'data', entityType));
        const unsubscribeFallback = onSnapshot(qFallback, (snapshot) => {
             const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as CrmEntity[];
            
            // Client-side sort if it's the fallback
            data.sort((a,b) => {
                const msA = a.lastActivityDate && 'toMillis' in a.lastActivityDate ? a.lastActivityDate.toMillis() : 0;
                const msB = b.lastActivityDate && 'toMillis' in b.lastActivityDate ? b.lastActivityDate.toMillis() : 0;
                return msB - msA;
            });
            setEntities(data);
            setLoading(false);
        });

        return () => {
            unsubscribe();
            unsubscribeFallback();
        };
    }, [entityType]);

    const filtered = entities.filter(e =>
        e.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.assignedOwner?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.tags || []).join(' ').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusColor = (status: string) => {
        const s = status?.toLowerCase() || '';
        if (s.includes('active') || s.includes('won') || s.includes('approved')) return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200';
        if (s.includes('pending') || s.includes('progress')) return 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200';
        if (s.includes('closed') || s.includes('lost') || s.includes('rejected')) return 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200';
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200';
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-24">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-8 rounded-[36px] shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border border-slate-100 dark:border-slate-700 shadow-sm ${config.bg}`}>
                        <Icon className={`w-7 h-7 ${config.color}`} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{config.title}</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{entities.length} total records found</p>
                    </div>
                </div>
                <div className="shrink-0 flex gap-3">
                    <button 
                        onClick={() => router.push(`/crm/${entityType}/new`)}
                        className="bg-[#0EA5E9] hover:bg-sky-600 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-sky-100 dark:shadow-sky-900/20 active:scale-95 transition-all flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Add New
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-[24px] shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                        type="text"
                        placeholder="Search by name, status, owner, or tags..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-[16px] py-3.5 pl-12 pr-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/50 transition-all placeholder:text-slate-400"
                    />
                </div>
                <button className="flex items-center gap-2 px-5 py-3.5 rounded-[16px] bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 font-bold text-sm tracking-wide hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors w-full md:w-auto">
                    <Filter className="w-4 h-4" /> Filters
                </button>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 uppercase text-[10px] font-black tracking-widest border-b border-slate-100 dark:border-slate-700/50">
                                <th className="p-5 pl-8 font-black">Name</th>
                                <th className="p-5 font-black">Status</th>
                                <th className="p-5 font-black hidden lg:table-cell">Owner</th>
                                <th className="p-5 font-black hidden xl:table-cell">Tags</th>
                                <th className="p-5 font-black hidden md:table-cell">Last Activity</th>
                                <th className="p-5 pr-8"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-10 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-8 h-8 border-4 border-slate-200 border-t-sky-500 rounded-full animate-spin mb-3"></div>
                                            <p className="font-bold text-sm">Loading data...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-16 text-center text-slate-400">
                                       <Database className="w-10 h-10 mx-auto opacity-20 mb-3" />
                                       <p className="font-bold text-sm">No records found.</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(entity => (
                                    <tr 
                                        key={entity.id} 
                                        className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors group cursor-pointer"
                                        onClick={() => router.push(`/crm/${entityType}/${entity.id}`)}
                                    >
                                        <td className="p-5 pl-8">
                                            <p className="font-black text-slate-800 dark:text-slate-100">{entity.name || 'Unnamed Record'}</p>
                                        </td>
                                        <td className="p-5">
                                            <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border ${getStatusColor(entity.status)}`}>
                                                {entity.status || 'NEW'}
                                            </span>
                                        </td>
                                        <td className="p-5 hidden lg:table-cell text-sm font-semibold text-slate-600 dark:text-slate-400">
                                            {entity.assignedOwner || 'Unassigned'}
                                        </td>
                                        <td className="p-5 hidden xl:table-cell">
                                            <div className="flex gap-1.5 flex-wrap">
                                                {(entity.tags || []).slice(0, 3).map((tag: string) => (
                                                    <span key={tag} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-widest rounded-md border border-slate-200 dark:border-slate-700">
                                                        {tag}
                                                    </span>
                                                ))}
                                                {(entity.tags?.length > 3) && <span className="text-[10px] font-bold text-slate-400">+{entity.tags.length - 3}</span>}
                                            </div>
                                        </td>
                                        <td className="p-5 hidden md:table-cell">
                                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-semibold">
                                                <Activity className="w-3.5 h-3.5" />
                                                {entity.lastActivityDate && 'toDate' in entity.lastActivityDate 
                                                    ? format(entity.lastActivityDate.toDate(), 'MMM d, yyyy') 
                                                    : 'No History'}
                                            </div>
                                        </td>
                                        <td className="p-5 pr-8 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 ml-auto shadow-sm">
                                                <ArrowRight className="w-4 h-4" />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
