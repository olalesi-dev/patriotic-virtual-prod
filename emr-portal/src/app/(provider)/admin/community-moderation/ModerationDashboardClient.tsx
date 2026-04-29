"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ShieldAlert, AlertTriangle, CheckCircle, Search, Activity, Trash2, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

type ModerationLogItem = {
    id: string;
    documentId: string;
    collectionName: string;
    text: string;
    mediaUrl: string | null;
    authorName: string;
    authorId: string;
    aiRiskLevel: 'low' | 'medium' | 'high';
    category: string;
    reason: string;
    actionTaken: string;
    timestamp: any;
    resolved: boolean;
};

export function ModerationDashboardClient() {
    const [logs, setLogs] = useState<ModerationLogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'flagged' | 'pending' | 'all'>('flagged');

    useEffect(() => {
        const q = query(
            collection(db, 'community-moderation-log'),
            orderBy('timestamp', 'desc')
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const loaded = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as ModerationLogItem[];
            setLogs(loaded);
            setLoading(false);
        });

        return () => unsub();
    }, []);

    const flaggedLogs = logs.filter(log => log.aiRiskLevel === 'high' && !log.resolved);
    const pendingLogs = logs.filter(log => log.aiRiskLevel === 'medium' && !log.resolved);

    const getDisplayedLogs = () => {
        if (activeTab === 'flagged') return flaggedLogs;
        if (activeTab === 'pending') return pendingLogs;
        return logs;
    };

    const handleApprove = async (log: ModerationLogItem) => {
        try {
            // Restore actual document
            await updateDoc(doc(db, log.collectionName, log.documentId), {
                hidden: false,
                moderationStatus: 'approved-by-admin'
            });

            // Mark log as resolved
            await updateDoc(doc(db, 'community-moderation-log', log.id), {
                resolved: true,
                actionTaken: 'approved-by-admin'
            });

            toast.success("Content approved and restored");
        } catch (e: any) {
            toast.error("Error approving content: " + e.message);
        }
    };

    const handleRemove = async (log: ModerationLogItem) => {
        try {
            // Hard delete actual document
            await deleteDoc(doc(db, log.collectionName, log.documentId));

            // Mark log as resolved
            await updateDoc(doc(db, 'community-moderation-log', log.id), {
                resolved: true,
                actionTaken: 'deleted-by-admin'
            });

            toast.success("Content permanently deleted");
        } catch (e: any) {
            toast.error("Error deleting content: " + e.message);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-red-500 animate-spin rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-red-50 dark:bg-red-900/20 rounded-full -mr-32 -mt-32 transition-transform duration-700"></div>
                <div className="relative z-10 flex gap-4">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center shrink-0 border border-red-200 dark:border-red-800 shadow-sm">
                        <ShieldAlert className="w-8 h-8" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Community Moderation</h1>
                        </div>
                        <p className="text-slate-500 font-medium">Review AI-flagged community posts to ensure a safe environment.</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center"><AlertTriangle className="w-5 h-5"/></div>
                        <h3 className="font-bold text-slate-600 dark:text-slate-300">Action Required</h3>
                    </div>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{flaggedLogs.length}</p>
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-1">High Risk Items</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center"><Activity className="w-5 h-5"/></div>
                        <h3 className="font-bold text-slate-600 dark:text-slate-300">Pending Review</h3>
                    </div>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{pendingLogs.length}</p>
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-1">Medium Risk Items</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center"><CheckCircle className="w-5 h-5"/></div>
                        <h3 className="font-bold text-slate-600 dark:text-slate-300">Total Processed</h3>
                    </div>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{logs.length}</p>
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-1">All time</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                <div className="flex border-b border-slate-200 dark:border-slate-700">
                    <button 
                        onClick={() => setActiveTab('flagged')}
                        className={`px-6 py-4 font-bold text-sm transition-all ${activeTab === 'flagged' ? 'border-b-2 border-red-500 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        AI Flagged ({flaggedLogs.length})
                    </button>
                    <button 
                        onClick={() => setActiveTab('pending')}
                        className={`px-6 py-4 font-bold text-sm transition-all ${activeTab === 'pending' ? 'border-b-2 border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        Pending Review ({pendingLogs.length})
                    </button>
                    <button 
                        onClick={() => setActiveTab('all')}
                        className={`px-6 py-4 font-bold text-sm transition-all ${activeTab === 'all' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/10' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        Moderation Log
                    </button>
                </div>

                <div className="p-6 overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700">
                                <th className="py-3 px-4 text-xs font-black uppercase tracking-widest text-slate-400">Content</th>
                                <th className="py-3 px-4 text-xs font-black uppercase tracking-widest text-slate-400">AI Analysis</th>
                                <th className="py-3 px-4 text-xs font-black uppercase tracking-widest text-slate-400">Status</th>
                                <th className="py-3 px-4 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {getDisplayedLogs().map(log => (
                                <tr key={log.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${log.resolved ? 'opacity-60' : ''}`}>
                                    <td className="py-4 px-4 align-top w-2/5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="font-bold text-slate-900 dark:text-white text-sm">{log.authorName}</span>
                                            <span className="text-xs text-slate-400 font-medium">
                                                {log.timestamp?.toDate ? formatDistanceToNow(log.timestamp.toDate(), {addSuffix: true}) : 'Unknown'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl line-clamp-3">
                                            {log.text}
                                        </p>
                                        {log.mediaUrl && (
                                            <a href={log.mediaUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-500 mt-2 hover:underline">
                                                Attached Media <ArrowUpRight className="w-3 h-3" />
                                            </a>
                                        )}
                                    </td>
                                    <td className="py-4 px-4 align-top w-1/4">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                                                    log.aiRiskLevel === 'high' ? 'bg-red-100 text-red-700 border border-red-200' :
                                                    log.aiRiskLevel === 'medium' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                                                    'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                                }`}>
                                                    {log.aiRiskLevel} Risk
                                                </span>
                                                <span className="text-xs font-bold text-slate-500">{log.category}</span>
                                            </div>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-snug">{log.reason}</p>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 align-top">
                                        {log.resolved ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700">
                                                <CheckCircle className="w-3 h-3" /> Resolved ({log.actionTaken})
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-50 text-amber-600 text-xs font-bold border border-amber-200">
                                                <Activity className="w-3 h-3" /> Pending Admin
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-4 px-4 align-top text-right">
                                        {!log.resolved && (
                                            <div className="flex flex-col gap-2 items-end">
                                                <button 
                                                    onClick={() => handleRemove(log)}
                                                    className="w-full max-w-[120px] bg-red-50 hover:bg-red-100 text-red-600 font-bold px-3 py-1.5 rounded-lg border border-red-200 transition-colors text-xs flex items-center justify-center gap-1"
                                                >
                                                    <Trash2 className="w-3 h-3" /> Remove
                                                </button>
                                                <button 
                                                    onClick={() => handleApprove(log)}
                                                    className="w-full max-w-[120px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors text-xs flex items-center justify-center gap-1"
                                                >
                                                    <CheckCircle className="w-3 h-3" /> Approve
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {getDisplayedLogs().length === 0 && (
                                <tr>
                                    <td colSpan={4} className="py-12 text-center text-slate-500">
                                        No items found in this view.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
