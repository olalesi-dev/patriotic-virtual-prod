"use client";

import React, { useState, useEffect } from 'react';
import {
    FileText,
    Scan,
    Eye,
    ChevronRight,
    Calendar,
    User,
    ShieldCheck,
    Download,
    X,
    ExternalLink,
    AlertCircle
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    Timestamp
} from 'firebase/firestore';
import { format } from 'date-fns';

interface ImagingOrder {
    id: string;
    type: string; // e.g. MRI, X-Ray, CT
    bodyPart: string;
    date: Timestamp;
    status: 'Ordered' | 'Completed' | 'Results Available';
    provider: string;
    reportText?: string;
    viewerUrl?: string; // DICOM viewer link
    facility?: string;
}

export default function ImagingPage() {
    const [orders, setOrders] = useState<ImagingOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<ImagingOrder | null>(null);

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged((user: any) => {
            if (user) {
                const imagingRef = collection(db, 'patients', user.uid, 'imaging');
                const q = query(imagingRef, orderBy('date', 'desc'));

                const unsubscribe = onSnapshot(q, (snapshot) => {
                    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ImagingOrder));
                    setOrders(data);
                    setLoading(false);
                });

                return () => unsubscribe();
            }
        });

        return () => unsubscribeAuth();
    }, []);

    if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-4 border-sky-100 border-t-[#0EA5E9] rounded-full animate-spin"></div></div>;

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Imaging Reports</h1>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-1">MRI, X-Ray, and Radiology results</p>
                </div>
                <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4" /> DICOM Secure
                </div>
            </div>

            {/* Orders Feed */}
            <div className="grid grid-cols-1 gap-6">
                {orders.length > 0 ? orders.map((order) => (
                    <div
                        key={order.id}
                        className="bg-white rounded-[40px] border border-slate-50 shadow-sm hover:shadow-xl hover:shadow-sky-900/5 transition-all p-8 md:p-10 flex flex-col md:flex-row gap-8 relative group"
                    >
                        <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-400 group-hover:bg-[#0EA5E9]/10 group-hover:text-[#0EA5E9] transition-all shrink-0">
                            <Scan className="w-10 h-10" />
                        </div>

                        <div className="flex-1 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">{order.type} {order.bodyPart}</h3>
                                <span className={`w-fit px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${order.status === 'Results Available' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                    order.status === 'Completed' ? 'bg-sky-50 text-[#0EA5E9] border-sky-100' :
                                        'bg-amber-50 text-amber-600 border-amber-100'
                                    }`}>
                                    {order.status}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ordered By</p>
                                    <p className="font-bold text-slate-700 text-sm">{order.provider}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Study Date</p>
                                    <p className="font-bold text-slate-700 text-sm">{format(order.date.toDate(), 'PPP')}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Facility</p>
                                    <p className="font-bold text-slate-700 text-sm">{order.facility || 'Patriotic Medical Imaging'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col justify-center gap-3 shrink-0 lg:min-w-[180px]">
                            {order.status === 'Results Available' ? (
                                <>
                                    <button
                                        onClick={() => setSelectedOrder(order)}
                                        className="w-full bg-[#0EA5E9] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-sky-100 hover:bg-sky-600 transition-all flex items-center justify-center gap-2"
                                    >
                                        <FileText className="w-4 h-4" /> View Report
                                    </button>
                                    {order.viewerUrl && (
                                        <a
                                            href={order.viewerUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-800 transition-all flex items-center justify-center gap-2 text-center"
                                        >
                                            <Eye className="w-4 h-4" /> View Images <ExternalLink className="w-3 h-3" />
                                        </a>
                                    )}
                                </>
                            ) : (
                                <div className="p-4 bg-slate-50 rounded-2xl text-center">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Processing</p>
                                    <p className="text-xs font-bold text-slate-500 mt-1 italic">ETA: 24-48 Hours</p>
                                </div>
                            )}
                        </div>
                    </div>
                )) : (
                    <div className="py-20 text-center space-y-4 bg-white rounded-[40px] border border-slate-50">
                        <Scan className="w-16 h-16 text-slate-100 mx-auto" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No imaging studies found in your record</p>
                    </div>
                )}
            </div>

            {/* Report Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-3xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in slide-in-from-bottom-8 duration-500 max-h-[90vh] flex flex-col">
                        <div className="bg-[#0EA5E9] p-10 text-white flex justify-between items-start shrink-0 relative">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                            <div className="relative z-10">
                                <h4 className="text-[10px] font-black text-sky-200 uppercase tracking-[0.2em] mb-2">Radiology Interpretation</h4>
                                <h2 className="text-3xl font-black tracking-tight">{selectedOrder.type} - {selectedOrder.bodyPart}</h2>
                            </div>
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors z-10"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-10 space-y-8 overflow-y-auto flex-1">
                            {/* Study Info */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Study Date</p>
                                    <p className="font-black text-slate-800">{format(selectedOrder.date.toDate(), 'PPP')}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                                    <p className="font-black text-emerald-500 uppercase text-xs">Final Report</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Referrer</p>
                                    <p className="font-black text-slate-800">{selectedOrder.provider}</p>
                                </div>
                            </div>

                            {/* Report Body */}
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Radiologist Findings</h4>
                                <div className="font-sans text-slate-700 leading-relaxed space-y-4">
                                    {selectedOrder.reportText ? (
                                        selectedOrder.reportText.split('\n\n').map((para, i) => (
                                            <p key={i} className="font-medium">{para}</p>
                                        ))
                                    ) : (
                                        <p className="italic text-slate-400">Interpretation results are pending or not available in this view.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-10 pt-4 flex gap-4 shrink-0 border-t border-slate-50">
                            {selectedOrder.viewerUrl && (
                                <a
                                    href={selectedOrder.viewerUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                                >
                                    <Eye className="w-4 h-4" /> Launch External Viewer
                                </a>
                            )}
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="px-10 bg-white text-slate-400 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-50 transition-all border border-slate-100"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
