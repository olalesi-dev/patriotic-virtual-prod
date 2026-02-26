"use client";

import React, { useState, useEffect } from 'react';
import {
    CreditCard,
    Plus,
    FileText,
    ArrowUpRight,
    Download,
    CheckCircle2,
    AlertCircle,
    ChevronRight,
    ShieldCheck,
    Building2,
    Calendar,
    Receipt,
    ExternalLink,
    X,
    Info,
    Smartphone
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    doc,
    getDoc,
    addDoc,
    serverTimestamp
} from 'firebase/firestore';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface BillingSummary {
    balance: number;
    status: 'current' | 'overdue';
    nextBillingDate: any;
    membershipPlan: string;
    stripePortalUrl?: string;
}

interface Statement {
    id: string;
    date: any;
    amount: number;
    status: 'paid' | 'unpaid';
    items: { description: string; amount: number }[];
}

interface Insurance {
    carrier: string;
    memberId: string;
    groupNumber: string;
    status: string;
    lastVerified: any;
}

export default function BillingPage() {
    const [summary, setSummary] = useState<BillingSummary | null>(null);
    const [statements, setStatements] = useState<Statement[]>([]);
    const [insurance, setInsurance] = useState<Insurance | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedStatement, setSelectedStatement] = useState<Statement | null>(null);
    const [isUpdatingInsurance, setIsUpdatingInsurance] = useState(false);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
            if (user) {
                // Summary
                const summaryRef = doc(db, 'patients', user.uid, 'billing', 'summary');
                const unsubSummary = onSnapshot(summaryRef, (doc) => {
                    if (doc.exists()) setSummary(doc.data() as BillingSummary);
                });

                // Statements
                const statementsRef = collection(db, 'patients', user.uid, 'billing', 'summary', 'statements');
                const q = query(statementsRef, orderBy('date', 'desc'));
                const unsubStatements = onSnapshot(q, (snaps) => {
                    setStatements(snaps.docs.map(d => ({ id: d.id, ...d.data() } as Statement)));
                });

                // Insurance
                const insuranceRef = doc(db, 'patients', user.uid, 'insurance', 'current');
                const unsubInsurance = onSnapshot(insuranceRef, (doc) => {
                    if (doc.exists()) setInsurance(doc.data() as Insurance);
                });

                setLoading(false);
                return () => {
                    unsubSummary();
                    unsubStatements();
                    unsubInsurance();
                };
            }
        });

        return () => unsubscribeAuth();
    }, []);

    const handlePayNow = async () => {
        if (!summary || summary.balance <= 0) return;

        setIsProcessingPayment(true);
        try {
            const token = await auth.currentUser?.getIdToken();
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/v1/billing/create-balance-checkout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error("Missing checkout URL");
            }
        } catch (error) {
            console.error("Payment error:", error);
            toast.error("Payment failed to initialize");
        } finally {
            setIsProcessingPayment(false);
        }
    };

    const handleUpdateInsurance = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const insuranceData = {
            carrier: formData.get('carrier'),
            memberId: formData.get('memberId'),
            groupNumber: formData.get('groupNumber')
        };

        try {
            const token = await auth.currentUser?.getIdToken();
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/v1/insurance/update`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(insuranceData)
            });

            if (response.ok) {
                toast.success("Insurance update submitted for review", { icon: '📄' });
                setIsUpdatingInsurance(false);
            } else {
                throw new Error("Update failed");
            }
        } catch (error) {
            toast.error("Failed to submit insurance update");
        }
    };

    if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-4 border-sky-100 border-t-[#0EA5E9] rounded-full animate-spin"></div></div>;

    return (
        <div className="space-y-10 pb-20 max-w-6xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-slate-800 tracking-tight">Billing & Insurance</h1>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-1">Manage your payments, statements, and coverage</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Column */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Balance Card */}
                    <div className="bg-white rounded-[40px] border border-slate-50 shadow-sm overflow-hidden relative group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-50 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-sky-100/50 transition-colors"></div>
                        <div className="p-10 relative">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Outstanding Balance</p>
                                    <h2 className={`text-5xl font-black tracking-tighter ${summary?.status === 'overdue' ? 'text-rose-500' : 'text-slate-800'}`}>
                                        ${summary?.balance.toFixed(2) || '0.00'}
                                    </h2>
                                </div>
                                {summary?.status === 'overdue' && (
                                    <div className="bg-rose-50 text-rose-500 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-rose-100 flex items-center gap-2">
                                        <AlertCircle className="w-3 h-3" /> Overdue
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
                                        <Calendar className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Next Billing Date</p>
                                        <p className="font-black text-slate-800 text-sm">
                                            {summary?.nextBillingDate ? format(summary.nextBillingDate.toDate(), 'MMMM d, yyyy') : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handlePayNow}
                                    disabled={isProcessingPayment || !summary?.balance}
                                    className="h-14 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-200 hover:bg-[#0EA5E9] hover:shadow-sky-100 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {isProcessingPayment ? 'Processing...' : 'Pay Balance Now'}
                                    <ArrowUpRight className="w-4 h-4" />
                                </button>
                            </div>

                            <p className="mt-8 text-[10px] text-slate-400 font-bold flex items-center gap-2">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                                Secure encrypted payments via Stripe. HSA/FSA cards accepted.
                            </p>
                        </div>
                    </div>

                    {/* Statement History */}
                    <div className="bg-white rounded-[40px] border border-slate-50 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                            <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs flex items-center gap-2">
                                <Receipt className="w-4 h-4 text-slate-300" /> Statement History
                            </h3>
                            <button className="text-[10px] font-black text-[#0EA5E9] uppercase tracking-widest hover:underline">Download All (PDF)</button>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {statements.length > 0 ? statements.map((st) => (
                                <div
                                    key={st.id}
                                    className="p-8 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer group"
                                    onClick={() => setSelectedStatement(st)}
                                >
                                    <div className="flex items-center gap-6">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${st.status === 'paid' ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'}`}>
                                            <FileText className="w-7 h-7" />
                                        </div>
                                        <div>
                                            <p className="text-lg font-black text-slate-800 tracking-tight">Statement for {format(st.date.toDate(), 'MMMM yyyy')}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{format(st.date.toDate(), 'MMM d, yyyy')}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8">
                                        <div className="text-right">
                                            <p className="text-xl font-black text-slate-800 tracking-tighter">${st.amount.toFixed(2)}</p>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${st.status === 'paid' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                {st.status}
                                            </span>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-slate-200 group-hover:text-[#0EA5E9] transition-colors" />
                                    </div>
                                </div>
                            )) : (
                                <div className="p-20 text-center">
                                    <FileText className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No statements found</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Column */}
                <div className="space-y-8">
                    {/* Membership Section */}
                    <div className="bg-slate-900 rounded-[40px] p-8 text-white relative overflow-hidden shadow-2xl shadow-slate-200">
                        <div className="absolute bottom-0 right-0 w-32 h-32 bg-[#0EA5E9] rounded-full -mb-16 -mr-16 blur-3xl opacity-50"></div>
                        <div className="relative">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 mb-6">Current Plan</h3>
                            <div className="mb-8">
                                <h4 className="text-2xl font-black tracking-tight mb-2 underline decoration-[#0EA5E9] decoration-4 underline-offset-4">
                                    {summary?.membershipPlan || 'Free Plan'}
                                </h4>
                                <p className="text-xs font-bold text-slate-400 italic">Member since Feb 2024</p>
                            </div>
                            <button
                                onClick={() => window.open(summary?.stripePortalUrl || '#', '_blank')}
                                className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 backdrop-blur-md"
                            >
                                Manage Subscription <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Insurance Card */}
                    <div className="bg-white rounded-[40px] border border-slate-50 shadow-sm overflow-hidden p-8">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-[#0EA5E9]">
                                <Building2 className="w-5 h-5" />
                            </div>
                            <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Insurance Coverage</h3>
                        </div>

                        {insurance ? (
                            <div className="space-y-6">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Carrier</p>
                                    <p className="font-black text-slate-800">{insurance.carrier}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Member ID</p>
                                        <p className="font-black text-slate-800 text-xs">{insurance.memberId}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Group ID</p>
                                        <p className="font-black text-slate-800 text-xs">{insurance.groupNumber}</p>
                                    </div>
                                </div>
                                <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-emerald-500 font-black text-[10px] uppercase">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Active Coverage
                                    </div>
                                    <button
                                        onClick={() => setIsUpdatingInsurance(true)}
                                        className="text-[10px] font-black text-[#0EA5E9] hover:underline"
                                    >
                                        Update Details
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-6">
                                <p className="text-slate-400 text-xs font-bold mb-4 italic">No insurance on file</p>
                                <button className="text-xs font-black text-[#0EA5E9] uppercase tracking-widest bg-sky-50 px-6 py-3 rounded-xl hover:bg-sky-100 transition-all">Add Insurance</button>
                            </div>
                        )}
                    </div>

                    {/* Payment Support Info */}
                    <div className="bg-[#F0F9FF] rounded-[32px] p-6 border border-sky-100">
                        <div className="flex gap-4 items-start">
                            <Info className="w-5 h-5 text-[#0EA5E9] shrink-0" />
                            <div>
                                <h4 className="font-black text-slate-800 text-xs uppercase tracking-widest mb-2">Billing Support</h4>
                                <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                                    Need help with a statement? Schedule a quick call with our billing office or send a secure message.
                                </p>
                                <button className="mt-4 text-[10px] font-black text-[#0EA5E9] uppercase hover:underline">Contact Office</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Statement Detail Modal */}
            {selectedStatement && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in slide-in-from-bottom-8 duration-500">
                        <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Statement Details</h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{format(selectedStatement.date.toDate(), 'MMMM d, yyyy')}</p>
                            </div>
                            <button onClick={() => setSelectedStatement(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-10 space-y-8">
                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Itemized Charges</p>
                                {selectedStatement.items.map((item, i) => (
                                    <div key={i} className="flex justify-between items-center py-4 border-b border-slate-50 last:border-none">
                                        <p className="font-bold text-slate-700">{item.description}</p>
                                        <p className="font-black text-slate-800">${item.amount.toFixed(2)}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-slate-900 rounded-3xl p-6 text-white flex justify-between items-center">
                                <p className="text-xs font-black uppercase tracking-widest opacity-50">Total Amount</p>
                                <p className="text-2xl font-black">${selectedStatement.amount.toFixed(2)}</p>
                            </div>
                            <div className="flex gap-3">
                                <button className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all flex items-center justify-center gap-2">
                                    <Download className="w-3.5 h-3.5" /> Download PDF
                                </button>
                                {selectedStatement.status === 'unpaid' && (
                                    <button
                                        className="flex-1 bg-[#0EA5E9] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-sky-600 transition-all shadow-lg shadow-sky-100"
                                        onClick={handlePayNow}
                                    >
                                        Pay This Statement
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Insurance Update Modal */}
            {isUpdatingInsurance && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in duration-500">
                        <div className="p-10 bg-[#0EA5E9] text-white relative">
                            <h2 className="text-2xl font-black tracking-tight mb-2">Update Coverage</h2>
                            <p className="text-xs font-bold opacity-80 uppercase tracking-widest">Submit insurance changes for verification</p>
                            <button onClick={() => setIsUpdatingInsurance(false)} className="absolute top-10 right-10 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateInsurance} className="p-10 space-y-6">
                            <div className="grid grid-cols-1 gap-6">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Insurance Carrier</label>
                                    <input name="carrier" required type="text" className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-sky-100" placeholder="e.g. Aetna" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Member ID</label>
                                        <input name="memberId" required type="text" className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-sky-100" placeholder="ID Number" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Group Number</label>
                                        <input name="groupNumber" required type="text" className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-sky-100" placeholder="Group #" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Front of Card (Photo)</label>
                                    <button type="button" className="w-full h-32 border-2 border-dashed border-slate-100 rounded-[32px] flex flex-col items-center justify-center gap-3 text-slate-300 hover:border-[#0EA5E9] hover:text-[#0EA5E9] transition-all group bg-slate-50/30">
                                        <Smartphone className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Upload or Take Photo</span>
                                    </button>
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                            >
                                Submit for Verification
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
