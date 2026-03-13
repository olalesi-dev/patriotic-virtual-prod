"use client";

import React, { useState, useEffect } from 'react';
import {
    ShieldCheck, Lock, Eye, Download, Search, Filter,
    Calendar, User, Globe, Activity, Terminal, AlertTriangle
} from 'lucide-react';

const MOCK_LOGS = [
    { id: 1, timestamp: '2026-02-19 17:45:12', user: 'Dr. Olufolaju', action: 'VIEW_PATIENT_PHI', resource: 'PT-8921', ip: '192.168.1.45', status: 'Success' },
    { id: 2, timestamp: '2026-02-19 17:42:05', user: 'Alalesi O.', action: 'SIGN_ENCOUNTER', resource: 'ENC-4421', ip: '72.14.25.112', status: 'Success' },
    { id: 3, timestamp: '2026-02-19 17:38:55', user: 'Dr. Olufolaju', action: 'LOGIN_FAILURE', resource: 'N/A', ip: '192.168.1.45', status: 'Warning' },
    { id: 4, timestamp: '2026-02-19 17:30:10', user: 'System', action: 'BACKUP_COMPLETED', resource: 'STORAGE-01', ip: 'Internal', status: 'Info' },
    { id: 5, timestamp: '2026-02-19 17:15:22', user: 'Nurse Sarah', action: 'EDIT_PATIENT_PHI', resource: 'PT-1244', ip: '192.168.1.12', status: 'Success' },
];

export default function AuditLogPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [isLive, setIsLive] = useState(true);

    const filteredLogs = MOCK_LOGS.filter(log =>
        log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.resource.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500 text-slate-900 dark:text-white dark:text-slate-100">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="bg-slate-900 dark:bg-slate-800 p-2 rounded-xl text-white shadow-lg shadow-slate-200 dark:shadow-none border dark:border-slate-700">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white dark:text-slate-100 tracking-tight leading-none uppercase">HIPAA Audit Trail</h1>
                    </div>
                    <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Lock className="w-4 h-4 text-emerald-500" /> Tamper-proof compliance logs
                    </p>
                </div>

                <div className="flex items-center gap-4 bg-white dark:bg-slate-800 dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 shadow-sm">
                    <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-1">
                        <button
                            onClick={() => setIsLive(true)}
                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${isLive ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100 dark:shadow-none' : 'text-slate-400 dark:text-slate-500'}`}
                        >
                            Live Feed
                        </button>
                        <button
                            onClick={() => setIsLive(false)}
                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${!isLive ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-lg shadow-slate-200 dark:shadow-none' : 'text-slate-400 dark:text-slate-500'}`}
                        >
                            Archived
                        </button>
                    </div>
                </div>
            </div>

            {/* Compliance Banner */}
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-6 rounded-[2rem] flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-500 mt-1 flex-shrink-0" />
                <div>
                    <h3 className="text-sm font-black text-amber-900 dark:text-amber-400 uppercase tracking-tight">HIPAA COMPLIANCE NOTICE</h3>
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-500/80 mt-1 leading-relaxed">
                        This audit log tracks all PHI access and modification. Records are immutable and retained for 7 years per federal regulations.
                        Exporting these logs is restricted to authorized administrative personnel only.
                    </p>
                </div>
            </div>

            {/* Audit Table Card */}
            <div className="bg-white dark:bg-slate-800 dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
                {/* Table Actions */}
                <div className="px-8 py-6 border-b border-slate-50 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-4 top-3.5" />
                        <input
                            type="text"
                            placeholder="Search logs..."
                            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand transition-all dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 bg-white dark:bg-slate-800 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:border-slate-700 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
                            <Filter className="w-3.5 h-3.5" /> Filter
                        </button>
                        <button className="flex items-center gap-2 bg-slate-900 dark:bg-slate-700 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-slate-600 transition-all">
                            <Download className="w-3.5 h-3.5" /> Export
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/30 dark:bg-slate-900/30">
                            <tr>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Timestamp</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">User</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Action</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Resource</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">IP Address</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                            {filteredLogs.map((log, i) => (
                                <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-all group cursor-pointer">
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-slate-900 dark:text-white dark:text-slate-100 leading-none">{log.timestamp.split(' ')[0]}</span>
                                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase">{log.timestamp.split(' ').slice(1).join(' ')}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center text-[10px] font-black text-indigo-600 dark:text-indigo-400">
                                                {log.user.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-slate-900 dark:text-white dark:text-slate-100 leading-none">{log.user}</span>
                                                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase">PROVIDER</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${log.action.includes('LOGIN') ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600' :
                                            log.action.includes('DELETE') ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600' :
                                                'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600'
                                            }`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 dark:text-slate-400">{log.resource}</span>
                                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">RESOURCE_ID</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right font-mono text-[10px] text-slate-400 dark:text-slate-500">
                                        {log.ip}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="p-6 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 dark:border-slate-700 flex items-center justify-between">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Showing {filteredLogs.length} events</p>
                    <div className="flex gap-2">
                        <button className="px-4 py-2 bg-white dark:bg-slate-800 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded-lg text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 dark:text-slate-400 shadow-sm">Previous</button>
                        <button className="px-4 py-2 bg-white dark:bg-slate-800 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded-lg text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 dark:text-slate-400 shadow-sm">Next</button>
                    </div>
                </div>
            </div>

            {/* Compliance Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                    { label: 'Data Backups', status: 'Healthy', details: 'Daily snapshot completed 4h ago', icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/20' },
                    { label: 'Session Security', status: 'Enforced', details: '15-min auto-logout active', icon: Lock, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-950/20' },
                    { label: 'Encryption', status: 'AES-256', details: 'At-rest encryption verified', icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/20' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 dark:border-slate-700 shadow-sm flex items-center gap-6">
                        <div className={`w-14 h-14 ${stat.bg} rounded-2xl flex items-center justify-center ${stat.color} shadow-sm`}>
                            <stat.icon className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{stat.label}</div>
                            <div className={`text-lg font-black ${stat.color} leading-tight`}>{stat.status}</div>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">{stat.details}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
