"use client";

import React from 'react';
import { ShieldCheck, Lock, Eye, Download, Search } from 'lucide-react';

export default function AuditLogPage() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="bg-slate-800 p-2 rounded-lg text-white">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-bold text-slate-800">Audit Log</h1>
                        <span className="text-xs font-bold text-slate-400 flex items-center gap-1"><Lock className="w-3 h-3" /> HIPAA Compliance Tracking</span>
                    </div>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                    <Download className="w-4 h-4" /> Download Report
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <div className="relative w-64">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input type="text" placeholder="Search logs..." className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs" />
                    </div>
                    <div className="flex gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Live monitoring active</span>
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse self-center"></div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                            <tr>
                                <th className="px-6 py-4">Timestamp</th>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Action</th>
                                <th className="px-6 py-4">Record ID</th>
                                <th className="px-6 py-4 text-right">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {[
                                { time: '2026-02-19 05:45:12', user: 'Dayo Olufolaju', action: 'ACCESS_PATIENT_RECORD', record: 'PT-8921', color: 'text-blue-600 bg-blue-50' },
                                { time: '2026-02-19 05:42:05', user: 'Olalesi Osunsade', action: 'VIEW_LAB_RESULTS', record: 'PT-1244', color: 'text-emerald-600 bg-emerald-50' },
                                { time: '2026-02-19 05:38:55', user: 'Dayo Olufolaju', action: 'EXPORT_AUDIT_LOG', record: 'SYSTEM', color: 'text-slate-600 bg-slate-50' },
                            ].map((log, i) => (
                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">{log.time}</td>
                                    <td className="px-6 py-4 font-bold text-slate-800">{log.user}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.color}`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 font-medium">{log.record}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-slate-400 hover:text-brand transition-colors"><Eye className="w-4 h-4 ml-auto" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
