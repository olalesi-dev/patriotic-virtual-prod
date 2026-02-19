"use client";

import React, { useState, useEffect } from 'react';
import { Search, History, Star, User, Clock, ArrowRight } from 'lucide-react';
import { PATIENTS, Patient } from '@/lib/data';
import { useRouter } from 'next/navigation';

export default function PatientSearchPage() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Patient[]>([]);
    const [recentPatients, setRecentPatients] = useState<Patient[]>([]);
    const router = useRouter();

    useEffect(() => {
        const saved = localStorage.getItem('recent_patients');
        if (saved) {
            try {
                setRecentPatients(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse recent patients');
            }
        }
    }, []);

    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }
        const searchTerms = query.toLowerCase().split(' ');
        const matched = PATIENTS.filter(p => {
            const searchStr = `${p.name} ${p.mrn} ${p.dob} ${p.phone} ${p.email}`.toLowerCase();
            return searchTerms.every(term => searchStr.includes(term));
        });
        setResults(matched);
    }, [query]);

    const handleSelectPatient = (patient: Patient) => {
        const updatedRecent = [
            patient,
            ...recentPatients.filter(p => p.id !== patient.id)
        ].slice(0, 5);
        localStorage.setItem('recent_patients', JSON.stringify(updatedRecent));
        router.push(`/patients?id=${patient.id}`);
    };

    return (
        <div className="flex flex-col gap-8 max-w-6xl mx-auto py-8 px-4">
            <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Global Patient Search</h1>
                    <p className="text-slate-500 mt-1">Search the entire practice registry by name, MRN, DOB, or contact info.</p>
                </div>
                <div className="flex gap-2">
                    <button className="px-5 py-2.5 bg-brand text-white rounded-xl text-sm font-bold shadow-lg shadow-brand/20 hover:scale-105 transition-all active:scale-95">
                        Advanced Filters
                    </button>
                </div>
            </div>

            <div className="relative group w-full">
                <Search className="w-8 h-8 text-slate-400 absolute left-6 top-6 group-focus-within:text-brand transition-all duration-300" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Start typing to search patients..."
                    className="w-full pl-18 pr-8 py-7 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl text-2xl font-medium focus:outline-none focus:border-brand focus:ring-8 focus:ring-brand/5 shadow-xl shadow-slate-200/50 dark:shadow-none transition-all placeholder:text-slate-300"
                    autoFocus
                />
            </div>

            {query.trim() !== '' && (
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden divide-y divide-slate-50 dark:divide-slate-700">
                    <div className="px-8 py-4 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                        <span className="text-xs font-black uppercase tracking-widest text-slate-400">Search Results ({results.length})</span>
                    </div>
                    {results.length > 0 ? (
                        results.map(p => (
                            <div
                                key={p.id}
                                onClick={() => handleSelectPatient(p)}
                                className="px-8 py-5 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-all flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center font-black text-slate-500 group-hover:bg-brand group-hover:text-white transition-all transform group-hover:rotate-3">
                                        {p.name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100 group-hover:text-brand transition-colors">{p.name}</h4>
                                        <div className="flex gap-4 text-sm text-slate-500 mt-1">
                                            <span><strong className="text-slate-400 font-medium italic">MRN:</strong> {p.mrn}</span>
                                            <span><strong className="text-slate-400 font-medium italic">DOB:</strong> {p.dob}</span>
                                            <span className="text-brand/70 font-bold">{p.serviceLine}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-tight ${p.statusColor}`}>
                                        {p.status}
                                    </span>
                                    <ArrowRight className="w-6 h-6 text-slate-200 group-hover:text-brand group-hover:translate-x-2 transition-all" />
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-20 text-center">
                            <h3 className="text-slate-400 italic text-lg">No patients found matching your search.</h3>
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                            <Clock className="w-5 h-5 text-indigo-500" />
                        </div>
                        <h3 className="font-black text-lg text-slate-800 dark:text-slate-100 uppercase tracking-tight">Recent</h3>
                    </div>
                    {recentPatients.length > 0 ? (
                        <div className="space-y-4">
                            {recentPatients.map(p => (
                                <div
                                    key={p.id}
                                    onClick={() => handleSelectPatient(p)}
                                    className="flex items-center gap-4 p-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-2xl cursor-pointer transition-all border border-transparent hover:border-slate-100"
                                >
                                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                                        {p.name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{p.name}</div>
                                        <div className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">{p.mrn}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-400 italic py-4">No recent patients yet</p>
                    )}
                </div>

                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                            <Star className="w-5 h-5 text-amber-500" />
                        </div>
                        <h3 className="font-black text-lg text-slate-800 dark:text-slate-100 uppercase tracking-tight">Pinned</h3>
                    </div>
                    <div className="py-8 text-center bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-700">
                        <p className="text-sm text-slate-400 font-medium">No pinned patients</p>
                        <button className="text-xs text-brand font-bold mt-2 hover:underline">How to pin?</button>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                            <User className="w-5 h-5 text-emerald-500" />
                        </div>
                        <h3 className="font-black text-lg text-slate-800 dark:text-slate-100 uppercase tracking-tight">My Active</h3>
                    </div>
                    <div className="space-y-4">
                        {PATIENTS.slice(0, 3).map(p => (
                            <div
                                key={p.id}
                                onClick={() => handleSelectPatient(p)}
                                className="flex items-center gap-4 p-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-2xl cursor-pointer transition-all border border-transparent hover:border-slate-100"
                            >
                                <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                    {p.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{p.name}</div>
                                    <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-tight">{p.status}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
