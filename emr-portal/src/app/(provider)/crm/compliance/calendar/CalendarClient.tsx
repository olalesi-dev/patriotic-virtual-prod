"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar as CalendarIcon, ShieldAlert } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isPast, isToday, differenceInDays } from 'date-fns';

export default function CalendarClient() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [documents, setDocuments] = useState<any[]>([]);

    useEffect(() => {
        const q = query(collection(db, 'crm-compliance', 'data', 'document-records'));
        const unsub = onSnapshot(q, (snapshot) => {
            const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setDocuments(docs);
        });
        return () => unsub();
    }, []);

    // Filter to those with an expiration date
    const expiringDocs = useMemo(() => {
        return documents.filter(d => d.expirationDate).map(d => ({
            ...d,
            expDateObj: new Date(d.expirationDate)
        }));
    }, [documents]);

    const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const handleToday = () => setCurrentDate(new Date());

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = "d";
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-800 p-8 rounded-[36px] shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="space-y-2">
                    <Link href="/crm/compliance" className="text-teal-600 hover:text-teal-700 font-bold text-sm flex items-center gap-1 mb-2">
                        <ArrowLeft className="w-4 h-4" /> Back to List View
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-teal-50 dark:bg-teal-900/30 rounded-2xl flex items-center justify-center border border-teal-100 dark:border-teal-800/50">
                            <CalendarIcon className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                        </div>
                        <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
                            Compliance Calendar
                        </h1>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xl leading-relaxed mt-2 pl-15">
                        Track upcoming document expirations and manage your renewals effectively.
                    </p>
                </div>

                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-2xl border border-slate-100 dark:border-slate-700 max-w-fit">
                    <button onClick={handlePrevMonth} className="p-2.5 rounded-xl hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm transition-all text-slate-600 dark:text-slate-300">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-lg font-black text-slate-800 dark:text-slate-200 min-w-[140px] text-center tracking-tight">
                        {format(currentDate, "MMMM yyyy")}
                    </h2>
                    <button onClick={handleNextMonth} className="p-2.5 rounded-xl hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm transition-all text-slate-600 dark:text-slate-300">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                    <button onClick={handleToday} className="ml-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition">
                        Today
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[32px] shadow-sm overflow-hidden">
                <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20">
                    {weekDays.map(day => (
                        <div key={day} className="py-4 text-center text-xs font-black uppercase tracking-widest text-slate-400">
                            {day}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 grid-rows-5 auto-rows-fr bg-slate-100 dark:bg-slate-700 gap-px">
                    {days.map((day, i) => {
                        const isCurrentMonth = isSameMonth(day, monthStart);
                        const isTodayDate = isToday(day);
                        const dayDocs = expiringDocs.filter(d => isSameDay(d.expDateObj, day));

                        return (
                            <div 
                                key={day.toString()} 
                                className={`min-h-[120px] p-2 flex flex-col transition-colors ${
                                    !isCurrentMonth ? 'bg-slate-50/50 dark:bg-slate-900/30' : 'bg-white dark:bg-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-800/80'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                        isTodayDate ? 'bg-teal-500 text-white shadow-md' : 
                                        !isCurrentMonth ? 'text-slate-400 dark:text-slate-600' : 
                                        'text-slate-700 dark:text-slate-300'
                                    }`}>
                                        {format(day, dateFormat)}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto no-scrollbar">
                                    {dayDocs.map(doc => {
                                        const daysDiff = differenceInDays(doc.expDateObj, new Date());
                                        const isExpired = daysDiff < 0;
                                        const isExpiringThisMonth = isCurrentMonth && (daysDiff >= 0 && daysDiff <= 31);
                                        
                                        let style = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700/50';
                                        
                                        // "Documents expiring in the current month should be highlighted in amber and documents already expired should be highlighted in red." -> Per Phase 15 reqs.
                                        if (isExpired) {
                                            style = 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400';
                                        } else if (isExpiringThisMonth) {
                                            style = 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:border-amber-800 dark:text-amber-400';
                                        }

                                        return (
                                            <Link 
                                                key={doc.id} 
                                                href={`/crm/compliance/${doc.id}`}
                                                className={`text-[10px] font-bold px-2 py-1.5 rounded-lg border leading-tight truncate w-full shadow-sm hover:opacity-80 transition-opacity ${style}`}
                                                title={doc.title}
                                            >
                                                {doc.title || doc.category}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

        </div>
    );
}
