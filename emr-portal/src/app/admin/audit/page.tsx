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

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="bg-slate-900 p-2 rounded-xl text-white shadow-lg shadow-slate-200">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none uppercase">HIPAA Audit Trail</h1>
                    </div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Lock className="w-4 h-4 text-emerald-500" /> Tamper-proof compliance logs
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                        <button
                            onClick={() => setIsLive(true)}
                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${isLive ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'text-slate-400'}`}
                        >
                            Live Feed
                        </button>
                        <button
                            onClick={() => setIsLive(false)}
                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${!isLive ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'text-slate-400'}`}
                        >
                            Archived
                        </button>
                    </div>
                    <button className="flex items-center gap-2 bg-white border border-slate-200 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                        <Download className="w-4 h-4" /> Export BAA Log
                    </button>
                    <button className="flex items-center gap-2 bg-brand text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-brand/20 hover:bg-brand-600 transition-all active:scale-95">
                        <Terminal className="w-4 h-4" /> Advanced Filter
                    </button>
                </div>
            </div>

            {/* Security Alerts Banner */}
            <div className="bg-amber-50 border border-amber-200 p-6 rounded-[2rem] flex items-center gap-6">
                <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 shadow-sm">
                    <AlertTriangle className="w-8 h-8" />
                </div>
                <div>
                    <h3 className="text-lg font-black text-amber-900 leading-tight uppercase tracking-tight">Anomalous Activity Detected</h3>
                    <p className="text-xs font-bold text-amber-700/80 mt-1 uppercase tracking-widest">3 Failed login attempts from IP 192.168.1.45 (San Francisco, CA)</p>
                </div>
                <button className="ml-auto px-6 py-3 bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-amber-200 hover:bg-amber-700 transition-all">Review Security Instance</button>
            </div>

            {/* Audit Log Table */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="w-5 h-5 text-slate-300 absolute left-4 top-3.5" />
                        <input
                            type="text"
                            placeholder="Search by user, action, or resource..."
                            className="w-full pl-12 pr-6 py-3.5 bg-white border border-slate-200 rounded-[1.25rem] text-sm font-medium focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-4">
                        <select className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 outline-none cursor-pointer hover:border-slate-300">
                            <option>All Actions</option>
                            <option>PHI VIEW</option>
                            <option>SIGN NOTE</option>
                            <option>AUTH</option>
                        </select>
                        <select className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 outline-none cursor-pointer hover:border-slate-300">
                            <option>Last 24 Hours</option>
                            <option>Last 7 Days</option>
                            <option>Custom Range</option>
                        </select>
                    </div>
                </div>

                <div className="flex-1 overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/30">
                            <tr>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Timestamp (UTC)</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Authorized User</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">HIPAA Action</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Resource ID</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Access IP</th>
                                <th className="px-8 py-5"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {MOCK_LOGS.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50/50 transition-all group">
                                    <td className="px-8 py-5 text-sm font-mono text-slate-400">{log.timestamp}</td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                                                <User className="w-4 h-4" />
                                            </div>
                                            <span className="text-sm font-black text-slate-900 tracking-tight">{log.user}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${log.status === 'Success' ? 'bg-emerald-50 text-emerald-600' :
                                                log.status === 'Warning' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                                            }`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{log.resource}</span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                            <Globe className="w-3 h-3" /> {log.ip}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <button className="p-2.5 text-slate-300 hover:text-brand hover:bg-brand/5 rounded-xl transition-all">
                                            <Eye className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="p-6 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Showing 5 of 1,240 events</p>
                    <div className="flex gap-2">
                        <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-black uppercase tracking-widest text-slate-600 shadow-sm">Previous</button>
                        <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-black uppercase tracking-widest text-slate-600 shadow-sm">Next</button>
                    </div>
                </div>
            </div>

            {/* Compliance Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                    { label: 'Data Backups', status: 'Healthy', details: 'Daily snapshot completed 4h ago', icon: Activity, color: 'emerald' },
                    { label: 'Session Security', status: 'Enforced', details: '15-min auto-logout active', icon: Lock, color: 'indigo' },
                    { label: 'Cloud SQL Encryption', status: 'Active', details: 'AES-256 at-rest encryption verified', icon: ShieldCheck, color: 'emerald' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-6">
                        <div className={`w-14 h-14 bg-${stat.color}-50 rounded-2xl flex items-center justify-center text-${stat.color}-500 shadow-sm`}>
                            <stat.icon className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</div>
                            <div className={`text-lg font-black text-${stat.color}-600 leading-tight`}>{stat.status}</div>
                            <p className="text-[10px] font-bold text-slate-400 mt-0.5">{stat.details}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
