"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, arrayUnion, Timestamp } from 'firebase/firestore';
import {
    Plus, Search, User as UserIcon, Briefcase, Users, BarChart, ClipboardList,
    Database, ArrowRight, Activity, Filter, LayoutGrid, List, MoreVertical, Calendar as CalendarIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const ENTITY_CONFIG = {
    patients: { title: 'Patients', icon: UserIcon, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/30' },
    facilities: { title: 'Facilities', icon: Briefcase, color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-900/30' },
    vendors: { title: 'Vendors', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
    campaigns: { title: 'Campaigns', icon: BarChart, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/30' },
    grants: { title: 'Grant Proposals', icon: ClipboardList, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/30' }
};

const PIPELINE_STAGES: Record<string, string[]> = {
    patients: ['New Lead', 'Contacted', 'Consultation Scheduled', 'Active Patient', 'Churned'],
    facilities: ['Prospecting', 'Demo Scheduled', 'Contract Sent', 'Active Partner', 'Inactive'],
    vendors: ['Active', 'Pending', 'Expiring Soon', 'Inactive'],
    campaigns: ['Draft', 'Active', 'Paused', 'Completed'],
    grants: ['Active', 'Pending', 'Archived'],
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
    const [viewMode, setViewMode] = useState<'table' | 'kanban' | 'calendar'>('table');

    const config = ENTITY_CONFIG[entityType as keyof typeof ENTITY_CONFIG] || ENTITY_CONFIG.patients;
    const Icon = config.icon;
    const stages = PIPELINE_STAGES[entityType] || ['Active', 'Pending', 'Archived'];

    useEffect(() => {
        const q = query(
            collection(db, 'crm', 'data', entityType),
            orderBy('lastActivityDate', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data()
            })) as CrmEntity[];
            setEntities(data);
            setLoading(false);
        }, (err) => {
            console.error('Fetch CRM entities error:', err);
            setLoading(false);
        });

        const qFallback = query(collection(db, 'crm', 'data', entityType));
        const unsubscribeFallback = onSnapshot(qFallback, (snapshot) => {
             const data = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data()
            })) as CrmEntity[];
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

    const handleInlineEdit = async (id: string, field: string, value: string, oldValue: string) => {
        if (value === oldValue) return;
        try {
            const docRef = doc(db, 'crm', 'data', entityType, id);
            const currentUser = auth.currentUser;
            const author = currentUser?.displayName || currentUser?.email || 'Unknown User';
            
            const activityEntry = {
                action: 'Field Updated',
                details: `Changed ${field} from "${oldValue}" to "${value}"`,
                author,
                timestamp: Timestamp.now()
            };

            await updateDoc(docRef, {
                [field]: value,
                lastActivityDate: serverTimestamp(),
                activityLog: arrayUnion(activityEntry)
            });
            toast.success('Record updated successfully');
        } catch (error) {
            console.error("Inline edit failed:", error);
            toast.error('Failed to update record');
        }
    };

    const getStatusColor = (status: string) => {
        const s = status?.toLowerCase() || '';
        if (s.includes('active') || s.includes('won') || s.includes('approved') || s.includes('partner')) return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200';
        if (s.includes('pending') || s.includes('progress') || s.includes('scheduled')) return 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200';
        if (s.includes('closed') || s.includes('lost') || s.includes('rejected') || s.includes('churned') || s.includes('inactive')) return 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200';
        if (s.includes('contacted') || s.includes('prospecting') || s.includes('contract')) return 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200';
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200';
    };

    const renderKanban = () => {
        return (
            <div className="flex gap-6 overflow-x-auto pb-6 snap-x">
                {stages.map(stage => {
                    const stageEntities = filtered.filter(e => {
                        // fuzzy match status, or if no status mapping then put in first column
                        if (!e.status && stage === stages[0]) return true;
                        return e.status === stage;
                    });
                    
                    return (
                        <div key={stage} className="min-w-[320px] w-[320px] shrink-0 snap-start">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-black text-slate-800 dark:text-slate-200 text-sm">{stage}</h3>
                                <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold px-2 py-0.5 rounded-full">
                                    {stageEntities.length}
                                </span>
                            </div>
                            <div className="space-y-4">
                                {stageEntities.map(entity => (
                                    <div key={entity.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all cursor-pointer group" onClick={() => router.push(`/crm/${entityType}/${entity.id}`)}>
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-slate-800 dark:text-slate-100 line-clamp-1">{entity.name || 'Unnamed'}</h4>
                                            <button className="text-slate-400 hover:text-sky-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); router.push(`/crm/${entityType}/${entity.id}`); }}>
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                        
                                        <div className="flex flex-col gap-2 mt-3" onClick={e => e.stopPropagation()}>
                                            <select 
                                                value={entity.status || stage} 
                                                onChange={(e) => handleInlineEdit(entity.id, 'status', e.target.value, entity.status || stage)}
                                                className={`text-[10px] font-black uppercase tracking-widest rounded-lg border px-2 py-1 outline-none ${getStatusColor(entity.status || stage)}`}
                                            >
                                                {stages.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                            
                                            <input 
                                                value={entity.assignedOwner || ''}
                                                onChange={(e) => handleInlineEdit(entity.id, 'assignedOwner', e.target.value, entity.assignedOwner || '')}
                                                placeholder="Assign Owner..."
                                                className="text-xs bg-transparent border-none outline-none text-slate-500 dark:text-slate-400 p-0 font-medium"
                                                onBlur={(e) => handleInlineEdit(entity.id, 'assignedOwner', e.target.value, entity.assignedOwner || '')}
                                            />
                                        </div>
                                        
                                        <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase">
                                            <Activity className="w-3 h-3" />
                                            {entity.lastActivityDate && 'toDate' in entity.lastActivityDate 
                                                ? format(entity.lastActivityDate.toDate(), 'MMM d, yyyy') 
                                                : 'No History'}
                                        </div>
                                    </div>
                                ))}
                                {stageEntities.length === 0 && (
                                    <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl h-24 flex items-center justify-center text-slate-400 text-xs font-bold">
                                        No items
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };
    const renderCalendar = () => {
        // Very lightweight pseudo-calendar view showing the current month
        const today = new Date();
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

        return (
            <div className="bg-white dark:bg-slate-800 rounded-[32px] p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex justify-between items-center mb-6 px-2">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{format(today, 'MMMM yyyy')}</h2>
                </div>
                <div className="grid grid-cols-7 gap-4">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <div key={d} className="text-center text-xs font-black uppercase text-slate-400 mb-2">{d}</div>
                    ))}
                    {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} className="h-24"></div>)}
                    {days.map(d => {
                        const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                        // find campaigns with start/end date intersecting this day, but for now just match start date
                        const dayEvents = filtered.filter(e => {
                            let eventDateStr = '';
                            if (e.startDate) eventDateStr = e.startDate;
                            else if (e.lastActivityDate) {
                                const d = (e.lastActivityDate as any).toDate ? (e.lastActivityDate as any).toDate() : (e.lastActivityDate as Date);
                                eventDateStr = format(d, 'yyyy-MM-dd');
                            }
                            return eventDateStr === dateString;
                        });
                        
                        return (
                            <div key={d} className="h-32 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-2 bg-slate-50/50 dark:bg-slate-900/20 overflow-y-auto">
                                <div className="text-right text-xs font-bold text-slate-400 mb-1">{d}</div>
                                <div className="space-y-1">
                                    {dayEvents.map(ev => (
                                        <div 
                                            key={ev.id} 
                                            onClick={() => router.push(`/crm/${entityType}/${ev.id}`)}
                                            className="text-[10px] font-bold p-1 rounded bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 truncate cursor-pointer hover:bg-sky-200 dark:hover:bg-sky-800 transition-colors"
                                        >
                                            {ev.name || 'Unnamed'}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };


    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-24">
            
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
                        <Plus className="w-4 h-4" /> Quick Add
                    </button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="bg-white dark:bg-slate-800 p-2 rounded-[20px] shadow-sm border border-slate-100 dark:border-slate-700 flex flex-1 w-full max-w-md">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-[14px] py-2.5 pl-10 pr-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/50 transition-all placeholder:text-slate-400"
                        />
                    </div>
                </div>
                
                <div className="flex p-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <button 
                        onClick={() => setViewMode('table')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${viewMode === 'table' ? 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        <List className="w-4 h-4" /> Table
                    </button>
                    <button 
                        onClick={() => setViewMode('kanban')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${viewMode === 'kanban' ? 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        <LayoutGrid className="w-4 h-4" /> Kanban
                    </button>
                    {entityType === 'campaigns' && (
                        <button 
                            onClick={() => setViewMode('calendar')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${viewMode === 'calendar' ? 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            <CalendarIcon className="w-4 h-4" /> Calendar
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="p-10 text-center text-slate-400 flex flex-col items-center">
                    <div className="w-8 h-8 border-4 border-slate-200 border-t-sky-500 rounded-full animate-spin mb-3"></div>
                    <p className="font-bold text-sm">Loading data...</p>
                </div>
            ) : viewMode === 'kanban' ? (
                renderKanban()
            ) : viewMode === 'calendar' && entityType === 'campaigns' ? (
                renderCalendar()
            ) : (
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
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-16 text-center text-slate-400">
                                        <Database className="w-10 h-10 mx-auto opacity-20 mb-3" />
                                        <p className="font-bold text-sm">No records found.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map(entity => (
                                        <tr key={entity.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors group cursor-pointer" onClick={() => router.push(`/crm/${entityType}/${entity.id}`)}>
                                            <td className="p-5 pl-8 font-black text-slate-800 dark:text-slate-100">{entity.name || 'Unnamed'}</td>
                                            <td className="p-5" onClick={e => e.stopPropagation()}>
                                                <select 
                                                    value={entity.status || (stages[0] || 'Unknown')} 
                                                    onChange={(e) => handleInlineEdit(entity.id, 'status', e.target.value, entity.status || stages[0])}
                                                    className={`cursor-pointer px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border outline-none ${getStatusColor(entity.status || stages[0])}`}
                                                >
                                                    {stages.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </td>
                                            <td className="p-5 hidden lg:table-cell" onClick={e => e.stopPropagation()}>
                                                <input 
                                                    value={entity.assignedOwner || ''}
                                                    onChange={(e) => handleInlineEdit(entity.id, 'assignedOwner', e.target.value, entity.assignedOwner || '')}
                                                    placeholder="Assign Owner..."
                                                    className="w-full text-sm font-semibold text-slate-600 dark:text-slate-400 bg-transparent border-none outline-none focus:ring-2 focus:ring-sky-100 rounded px-2"
                                                    onBlur={(e) => handleInlineEdit(entity.id, 'assignedOwner', e.target.value, entity.assignedOwner || '')}
                                                />
                                            </td>
                                            <td className="p-5 hidden xl:table-cell">
                                                <div className="flex gap-1.5 flex-wrap">
                                                    {(entity.tags || []).slice(0, 3).map((tag: string) => (
                                                        <span key={tag} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-widest rounded-md border border-slate-200 dark:border-slate-700">{tag}</span>
                                                    ))}
                                                    {(entity.tags?.length > 3) && <span className="text-[10px] font-bold text-slate-400">+{entity.tags.length - 3}</span>}
                                                </div>
                                            </td>
                                            <td className="p-5 hidden md:table-cell text-slate-500 dark:text-slate-400 text-xs font-semibold">
                                                <div className="flex items-center gap-2">
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
            )}
        </div>
    );
}
