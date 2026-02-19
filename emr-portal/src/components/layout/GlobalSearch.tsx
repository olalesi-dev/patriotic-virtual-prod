"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Search, User, Clock, X, Command, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PATIENTS, Patient } from '@/lib/data';
import { motion, AnimatePresence } from 'framer-motion';

export function GlobalSearch() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Patient[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [recentPatients, setRecentPatients] = useState<Patient[]>([]);
    const router = useRouter();
    const searchRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Keyboard shortcut Cmd/Ctrl + K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Load recent patients
    useEffect(() => {
        const saved = localStorage.getItem('recent_patients');
        if (saved) {
            try {
                setRecentPatients(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse recent patients');
            }
        }
    }, [isOpen]);

    // Handle outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Mock fuzzy search implementation
    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        setIsLoading(true);
        const timer = setTimeout(() => {
            const searchTerms = query.toLowerCase().split(' ');
            const matched = PATIENTS.filter(p => {
                const searchStr = `${p.name} ${p.mrn} ${p.dob} ${p.phone} ${p.email} ${p.serviceLine}`.toLowerCase();
                return searchTerms.every(term => searchStr.includes(term));
            }).slice(0, 20);

            setResults(matched);
            setIsLoading(false);
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [query]);

    const handleSelectPatient = (patient: Patient) => {
        // Save to recent
        const updatedRecent = [
            patient,
            ...recentPatients.filter(p => p.id !== patient.id)
        ].slice(0, 5);

        localStorage.setItem('recent_patients', JSON.stringify(updatedRecent));
        setRecentPatients(updatedRecent);

        setIsOpen(false);
        setQuery('');
        router.push(`/patients?id=${patient.id}`); // Navigating to patients page with id
    };

    return (
        <div className="relative" ref={searchRef}>
            {/* Search Trigger (Small Input or Icon) */}
            <div
                onClick={() => setIsOpen(true)}
                className="group flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-white dark:hover:bg-slate-700 transition-all w-64"
            >
                <Search className="w-4 h-4 text-slate-400 group-hover:text-brand transition-colors" />
                <span className="text-sm text-slate-400 flex-1 truncate">Patient lookup...</span>
                <div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded text-[10px] text-slate-400 font-medium">
                    <Command className="w-2.5 h-2.5" /> K
                </div>
            </div>

            {/* Floating Search Interface */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="absolute top-0 right-0 w-[500px] mt-0 z-[100] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
                    >
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
                            <Search className={`w-5 h-5 ${isLoading ? 'text-brand animate-spin' : 'text-slate-400'}`} />
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search by name, MRN, DOB, phone, or email..."
                                className="flex-1 bg-transparent border-none outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 font-medium"
                            />
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-400"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="max-h-[400px] overflow-y-auto scrollbar-hide bg-slate-50/50 dark:bg-slate-900/50">
                            {query.trim() === '' ? (
                                <div className="p-2">
                                    {recentPatients.length > 0 && (
                                        <div className="mb-2">
                                            <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Recent Patients</div>
                                            {recentPatients.map(p => (
                                                <SearchResultItem key={p.id} patient={p} onClick={() => handleSelectPatient(p)} icon={Clock} />
                                            ))}
                                        </div>
                                    )}
                                    <div className="px-5 py-8 text-center">
                                        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <User className="w-6 h-6 text-indigo-400" />
                                        </div>
                                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Global Search</h3>
                                        <p className="text-xs text-slate-500 mt-1 max-w-[200px] mx-auto">Quickly find any patient record across the entire practice.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-2">
                                    {results.length > 0 ? (
                                        <>
                                            <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Search Results ({results.length})</div>
                                            {results.map(p => (
                                                <SearchResultItem key={p.id} patient={p} onClick={() => handleSelectPatient(p)} icon={User} />
                                            ))}
                                        </>
                                    ) : (
                                        !isLoading && (
                                            <div className="p-12 text-center text-slate-500 text-sm italic">
                                                No patients found matching "{query}"
                                            </div>
                                        )
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer Tips */}
                        <div className="p-3 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center px-4">
                            <span className="text-[10px] text-slate-400 flex items-center gap-1.5">
                                <span className="p-0.5 border rounded border-slate-200 dark:border-slate-600">Enter</span> to view chart
                            </span>
                            <span className="text-[10px] text-slate-400">
                                Fuzzy matching enabled
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function SearchResultItem({ patient, onClick, icon: Icon }: { patient: Patient; onClick: () => void; icon: any }) {
    return (
        <div
            onClick={onClick}
            className="flex items-center gap-3 p-3 hover:bg-white dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-700 group"
        >
            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-500 transition-colors">
                <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {patient.name}
                    </h4>
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded leading-none ${patient.statusColor}`}>
                        {patient.status}
                    </span>
                </div>
                <div className="flex gap-3 text-[10px] text-slate-500 font-medium mt-0.5">
                    <span>{patient.mrn}</span>
                    <span>•</span>
                    <span>DOB: {patient.dob}</span>
                    <span>•</span>
                    <span className="text-slate-400">{patient.serviceLine}</span>
                </div>
            </div>
        </div>
    );
}
