"use client";

import React, { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, query, onSnapshot, getDocs, doc, setDoc, deleteDoc, where, orderBy } from 'firebase/firestore';
import { useAuthUser } from '@/hooks/useAuthUser';
import {
    Clock, Plus, Calendar as CalendarIcon, Save, Trash2, Edit2, CheckCircle2, AlertCircle, Search, X, CalendarDays, ArrowLeft
} from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { toast } from 'sonner';
import Link from 'next/link';

interface TimesheetEntry {
    date: string; // YYYY-MM-DD
    hours: number;
    type: 'Regular' | 'Overtime' | 'Vacation' | 'Sick' | 'Holiday';
    notes: string;
}

interface Timesheet {
    id: string;
    userId: string;
    userName: string;
    weekStart: string; // YYYY-MM-DD (Sunday)
    entries: TimesheetEntry[];
    status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected';
    totalHours: number;
    createdAt: number;
}

export default function TimesheetsClient() {
    const { user, isReady } = useAuthUser();
    const [userRole, setUserRole] = useState<string>('staff');
    const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSheet, setEditingSheet] = useState<Timesheet | null>(null);

    // Initial empty week
    const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date()));
    const [editEntries, setEditEntries] = useState<TimesheetEntry[]>([]);

    useEffect(() => {
        if (!user) return;
        
        // Fetch role
        getDocs(query(collection(db, 'users'), where('email', '==', user.email))).then(snap => {
            if (!snap.empty) {
                const udata = snap.docs[0].data();
                setUserRole(udata.role || 'staff');
            }
        });

        const isAdmin = userRole === 'admin' || userRole === 'systems admin';

        let q;
        if (isAdmin) {
            q = query(collection(db, 'crm_timesheets'), orderBy('createdAt', 'desc'));
        } else {
            q = query(collection(db, 'crm_timesheets'), where('userId', '==', user.uid));
        }

        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Timesheet));
            // Sort client-side if missing index
            setTimesheets(data.sort((a,b) => b.createdAt - a.createdAt));
            setLoading(false);
        }, err => {
            console.error(err);
            setLoading(false);
        });

        return () => unsub();
    }, [user, userRole]);

    const handleOpenModal = (sheet?: Timesheet) => {
        if (sheet) {
            setEditingSheet(sheet);
            setCurrentWeekStart(new Date(sheet.weekStart + 'T00:00:00'));
            setEditEntries(sheet.entries || []);
        } else {
            setEditingSheet(null);
            const wStart = startOfWeek(new Date());
            setCurrentWeekStart(wStart);
            
            // Build 7 empty days
            const empty: TimesheetEntry[] = Array.from({ length: 7 }).map((_, i) => {
                const d = addDays(wStart, i);
                return {
                    date: format(d, 'yyyy-MM-dd'),
                    hours: 0,
                    type: 'Regular',
                    notes: ''
                };
            });
            setEditEntries(empty);
        }
        setIsModalOpen(true);
    };

    const handleSave = async (status: Timesheet['status']) => {
        if (!user) return;
        
        const total = editEntries.reduce((sum, e) => sum + (Number(e.hours) || 0), 0);
        
        const payload: Partial<Timesheet> = {
            userId: editingSheet?.userId || user.uid,
            userName: editingSheet?.userName || user.displayName || user.email || 'Unknown',
            weekStart: format(currentWeekStart, 'yyyy-MM-dd'),
            entries: editEntries,
            status,
            totalHours: total,
            createdAt: editingSheet?.createdAt || Date.now(),
        };

        const docId = editingSheet?.id || `ts_${user.uid}_${payload.weekStart}`;

        try {
            await setDoc(doc(db, 'crm_timesheets', docId), payload, { merge: true });
            toast.success(`Timesheet ${status.toLowerCase()} successfully`);
            setIsModalOpen(false);
        } catch (err) {
            console.error(err);
            toast.error('Failed to save timesheet');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this timesheet?')) return;
        try {
            await deleteDoc(doc(db, 'crm_timesheets', id));
            toast.success('Deleted');
        } catch (err) {
            console.error(err);
            toast.error('Failed to delete');
        }
    };

    const changeWeek = (offset: number) => {
        const newStart = addDays(currentWeekStart, offset * 7);
        setCurrentWeekStart(newStart);
        
        // Rebuild entries matching the new week lengths
        const newEntries: TimesheetEntry[] = Array.from({ length: 7 }).map((_, i) => {
            const d = addDays(newStart, i);
            const dateStr = format(d, 'yyyy-MM-dd');
            // preserve existing if matching
            const exist = editEntries.find(e => e.date === dateStr);
            return exist || {
                date: dateStr,
                hours: 0,
                type: 'Regular',
                notes: ''
            };
        });
        setEditEntries(newEntries);
    };

    const updateEntry = (index: number, field: keyof TimesheetEntry, value: any) => {
        const copy = [...editEntries];
        copy[index] = { ...copy[index], [field]: value };
        setEditEntries(copy);
    };

    if (!isReady) return <div className="p-8 text-center text-slate-500 font-bold animate-pulse">Loading auth...</div>;

    const isAdmin = userRole === 'admin' || userRole === 'systems admin';

    const filteredSheets = timesheets.filter(t => 
        t.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.weekStart.includes(searchTerm)
    );

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-24">
            
            <div className="flex items-center gap-2 text-sm font-bold text-slate-400 mb-2">
                <Link href="/crm" className="hover:text-indigo-500 transition-colors flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> CRM</Link>
                <span>/</span>
                <span className="text-slate-600 dark:text-slate-300">Time Sheets</span>
            </div>

            {/* Header */}
            <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-950 p-8 md:p-10 text-white shadow-2xl border border-white/5">
                <div className="absolute inset-0 opacity-20"
                    style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #a855f7 0px, transparent 60%), radial-gradient(circle at 10% 80%, #6366f1 0px, transparent 50%)' }} />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/10">
                                <Clock className="w-5 h-5 text-purple-300" />
                            </div>
                            <span className="text-purple-300 font-black uppercase tracking-[0.2em] text-[10px]">Staff Management</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none">Time Sheets</h1>
                        <p className="text-indigo-200 text-sm font-medium max-w-lg leading-relaxed mt-2">
                            Log hours, vacation, and sick days. Admins can review, approve, and finalize payroll records.
                        </p>
                    </div>

                    <button 
                        onClick={() => handleOpenModal()}
                        className="bg-white hover:bg-white/90 text-indigo-900 px-6 py-4 rounded-[20px] font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-xl shadow-black/20 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> New Timesheet
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="bg-white dark:bg-slate-800 rounded-[32px] border border-slate-100 dark:border-slate-700 p-6 shadow-sm min-h-[400px]">
                
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
                    <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">Recent Logs</h2>
                    
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Filter Name/Date..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-purple-500/50 outline-none placeholder:text-slate-400 transition-all"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12"><div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-purple-500 animate-spin" /></div>
                ) : filteredSheets.length === 0 ? (
                    <div className="text-center py-20 px-4 border-2 border-dashed border-slate-100 dark:border-slate-700/50 rounded-3xl">
                        <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h3 className="text-lg font-black text-slate-500">No timesheets found</h3>
                        <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">Click "New Timesheet" to start logging hours.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-700/50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <th className="px-4 py-3">Staff Name</th>
                                    <th className="px-4 py-3">Week Starting</th>
                                    <th className="px-4 py-3">Total Hrs</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30 text-sm">
                                {filteredSheets.map(ts => (
                                    <tr key={ts.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors group">
                                        <td className="px-4 py-4 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex justify-center items-center text-xs font-black">
                                                {ts.userName.charAt(0)}
                                            </div>
                                            {ts.userName}
                                        </td>
                                        <td className="px-4 py-4 font-semibold text-slate-600 dark:text-slate-400">
                                            <CalendarIcon className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                                            {ts.weekStart}
                                        </td>
                                        <td className="px-4 py-4 font-black tabular-nums text-slate-700 dark:text-slate-300">
                                            {ts.totalHours} <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">hrs</span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border
                                                ${ts.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30' :
                                                  ts.status === 'Submitted' ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/30' :
                                                  ts.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/30' :
                                                  'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800'}`
                                            }>
                                                {ts.status === 'Approved' ? <CheckCircle2 className="w-2.5 h-2.5"/> : ts.status === 'Rejected' ? <AlertCircle className="w-2.5 h-2.5"/> : <Clock className="w-2.5 h-2.5"/>}
                                                {ts.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleOpenModal(ts)} className="p-2 text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/30 rounded-xl transition-colors">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            {isAdmin && ts.status === 'Draft' && (
                                                 <button onClick={() => handleDelete(ts.id)} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-colors ml-1">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-4xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/30 shrink-0">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
                                    {editingSheet ? `Edit Timesheet` : 'New Timesheet'}
                                </h2>
                                <p className="text-sm font-semibold text-slate-500">Weekly Activity Log</p>
                            </div>
                            <div className="flex items-center gap-3">
                                {/* Week Navigator */}
                                <div className="flex bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 shadow-sm">
                                    <button onClick={() => changeWeek(-1)} className="p-1 px-3 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 font-bold text-xs">-1 Wk</button>
                                    <div className="px-4 py-1 border-x border-slate-200 dark:border-slate-700 font-black text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                        <CalendarIcon className="w-3.5 h-3.5 text-purple-500" />
                                        {format(currentWeekStart, 'MMM d, yyyy')}
                                    </div>
                                    <button onClick={() => changeWeek(1)} className="p-1 px-3 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 font-bold text-xs">+1 Wk</button>
                                </div>

                                <button onClick={() => setIsModalOpen(false)} className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 flex justify-center items-center text-slate-400 hover:text-slate-600 transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
                            
                            <div className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 p-4 rounded-xl border border-purple-100 dark:border-purple-800/40 text-sm font-semibold flex items-center justify-between">
                                <span>Ensure all hours are accurately reflecting actual work times. Vacation and Sick leaves must be pre-approved.</span>
                                
                                {isAdmin && editingSheet && (
                                    <div className="flex items-center gap-2">
                                        <div className="text-xs font-black uppercase">Admin Overrides:</div>
                                        <button onClick={() => handleSave('Approved')} className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black uppercase rounded-lg">Approve</button>
                                        <button onClick={() => handleSave('Rejected')} className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-black uppercase rounded-lg">Reject</button>
                                    </div>
                                )}
                            </div>

                            {/* 7 Days Grid */}
                            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
                                <table className="w-full text-left bg-white dark:bg-slate-800">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                                        <tr className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 dark:border-slate-700">
                                            <th className="p-3 w-40">Day</th>
                                            <th className="p-3 w-32">Hours</th>
                                            <th className="p-3 w-40">Type</th>
                                            <th className="p-3">Tasks / Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                        {editEntries.map((entry, idx) => {
                                            const d = new Date(entry.date + 'T00:00:00');
                                            return (
                                                <tr key={entry.date} className="hover:bg-slate-50 dark:hover:bg-slate-900/20">
                                                    <td className="p-3">
                                                        <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">{format(d, 'EEEE')}</div>
                                                        <div className="text-xs font-semibold text-slate-400">{format(d, 'MMM d, yyyy')}</div>
                                                    </td>
                                                    <td className="p-3">
                                                        <input 
                                                            type="number" 
                                                            min="0" max="24" step="0.5"
                                                            value={entry.hours || ''} 
                                                            onChange={e => updateEntry(idx, 'hours', parseFloat(e.target.value))}
                                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                                                            placeholder="0"
                                                        />
                                                    </td>
                                                    <td className="p-3">
                                                        <select
                                                            value={entry.type}
                                                            onChange={e => updateEntry(idx, 'type', e.target.value)}
                                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-400/50 cursor-pointer"
                                                        >
                                                            <option>Regular</option>
                                                            <option>Overtime</option>
                                                            <option>Vacation</option>
                                                            <option>Sick</option>
                                                            <option>Holiday</option>
                                                        </select>
                                                    </td>
                                                    <td className="p-3">
                                                        <input 
                                                            type="text" 
                                                            value={entry.notes}
                                                            onChange={e => updateEntry(idx, 'notes', e.target.value)}
                                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-transparent focus:border-slate-200 dark:focus:border-slate-600 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-400/20"
                                                            placeholder="Details of work or reason..."
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot className="bg-slate-50 dark:bg-slate-900/80 font-black border-t-2 border-slate-200 dark:border-slate-700">
                                        <tr>
                                            <td className="p-4 text-right pr-6 uppercase text-xs tracking-widest text-slate-500">Totals</td>
                                            <td className="p-4 text-xl text-purple-600 dark:text-purple-400 tabular-nums">
                                                {editEntries.reduce((s,e) => s + (Number(e.hours)||0), 0)} <span className="text-xs uppercase text-purple-400 dark:text-purple-500 tracking-widest">Hrs</span>
                                            </td>
                                            <td colSpan={2}></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3 shrink-0">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-[16px] border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-black uppercase tracking-widest text-xs transition-colors">
                                Cancel
                            </button>
                            <button onClick={() => handleSave('Draft')} className="px-6 py-3 rounded-[16px] bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-black uppercase tracking-widest text-xs transition-colors shadow-lg shadow-slate-900/10 flex flex-center gap-2">
                                <Save className="w-4 h-4" /> Save Draft
                            </button>
                            <button onClick={() => handleSave('Submitted')} className="px-8 py-3 rounded-[16px] bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-xl shadow-purple-900/20 flex flex-center gap-2">
                                <CheckCircle2 className="w-4 h-4" /> Submit to Review
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
