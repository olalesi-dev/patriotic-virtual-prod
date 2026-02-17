"use client";

import React, { useState, useMemo } from 'react';
import {
    Download, Plus, Search, Filter, Calendar, X,
    DollarSign, User, MoreHorizontal, ChevronDown,
    CreditCard, CheckCircle, Clock, AlertCircle, FileText
} from 'lucide-react';

// --- Types ---
interface Invoice {
    id: string;
    issueDate: string;
    client: string;
    billTo: string;
    services: string;
    price: number;
    dueDate: string;
    team: string;
    status: 'Paid' | 'Unpaid' | 'Overdue' | 'Draft';
}

interface Payment {
    id: string;
    date: string;
    client: string;
    amount: number;
    method: 'Credit Card' | 'Bank Transfer' | 'Cash';
    status: 'Completed' | 'Refunded';
}

interface Claim {
    id: string;
    date: string;
    client: string;
    insurance: string;
    amount: number;
    status: 'Submitted' | 'Processing' | 'Paid' | 'Denied';
}

// --- Mock Data ---
const INITIAL_INVOICES: Invoice[] = [
    { id: '000003', issueDate: '2025-12-23', client: 'John Doe', billTo: 'John Doe', services: 'Level 5 new patient office visit', price: 100.00, dueDate: '2025-12-31', team: 'OO', status: 'Unpaid' },
    { id: '000002', issueDate: '2025-12-23', client: 'Sarah Doe', billTo: 'Sarah Doe', services: 'Level 4 new patient office visit', price: 150.00, dueDate: '2025-12-31', team: 'OO', status: 'Overdue' },
    { id: '000001', issueDate: '2025-12-20', client: 'Bobby Doe', billTo: 'Bobby Doe', services: 'Psychiatric service', price: 200.00, dueDate: '2025-12-28', team: 'JD', status: 'Paid' },
    { id: '000004', issueDate: '2025-12-24', client: 'Emily White', billTo: 'Emily White', services: 'Therapy Session', price: 120.00, dueDate: '2026-01-07', team: 'JD', status: 'Draft' },
];

const INITIAL_PAYMENTS: Payment[] = [
    { id: 'PAY-001', date: '2025-12-20', client: 'Bobby Doe', amount: 200.00, method: 'Credit Card', status: 'Completed' },
    { id: 'PAY-002', date: '2025-12-18', client: 'John Smith', amount: 50.00, method: 'Bank Transfer', status: 'Completed' },
];

const INITIAL_CLAIMS: Claim[] = [
    { id: 'CLM-001', date: '2025-12-22', client: 'John Doe', insurance: 'Blue Cross', amount: 100.00, status: 'Submitted' },
    { id: 'CLM-002', date: '2025-12-15', client: 'Sarah Doe', insurance: 'Aetna', amount: 150.00, status: 'Denied' },
];

export default function BillingPage() {
    // --- State ---
    const [activeTab, setActiveTab] = useState('Invoices');
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [claims, setClaims] = useState<Claim[]>([]);
    const [loading, setLoading] = useState(true);

    // UI State
    const [searchQuery, setSearchQuery] = useState('');
    const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string[]>([]);

    // --- Effects ---
    React.useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Determine API base URL (in dev, assumption is localhost:8080)
                const API_BASE = 'http://localhost:8080/api/v1/billing';

                // Get Token (Dynamically import to avoid SSR issues if any, though allow auth from lib is fine)
                const { auth } = await import('@/lib/firebase');
                const user = auth.currentUser;

                // If no user immediately available, wait for auth state (simple polling or just skip if demo)
                // For this demo, we'll try to get token if user exists, else fallback to mocks
                if (!user) {
                    console.warn("No user logged in, using mock data.");
                    setInvoices(INITIAL_INVOICES);
                    setPayments(INITIAL_PAYMENTS);
                    setClaims(INITIAL_CLAIMS);
                    setLoading(false);
                    return;
                }

                const token = await user.getIdToken();
                const headers = { 'Authorization': `Bearer ${token}` };

                // Fetch in parallel
                const [invRes, payRes, clmRes] = await Promise.all([
                    fetch(`${API_BASE}/invoices`, { headers }),
                    fetch(`${API_BASE}/payments`, { headers }),
                    fetch(`${API_BASE}/claims`, { headers })
                ]);

                if (invRes.ok) setInvoices(await invRes.json());
                if (payRes.ok) setPayments(await payRes.json());
                if (clmRes.ok) setClaims(await clmRes.json());

            } catch (error) {
                console.error("Failed to fetch billing data, falling back to mocks", error);
                setInvoices(INITIAL_INVOICES);
                setPayments(INITIAL_PAYMENTS);
                setClaims(INITIAL_CLAIMS);
            } finally {
                setLoading(false);
            }
        };

        // Check auth status listener to trigger fetch
        import('@/lib/firebase').then(({ auth }) => {
            const unsubscribe = auth.onAuthStateChanged((user) => {
                if (user) fetchData();
                else {
                    setInvoices(INITIAL_INVOICES); // Fallback for unauth/demo
                    setLoading(false);
                }
            });
            return () => unsubscribe();
        });
    }, []);

    // --- Derived State ---
    const filteredData = useMemo(() => {
        const lowerSearch = searchQuery.toLowerCase();

        if (activeTab === 'Invoices') {
            return invoices.filter(inv =>
                ((inv.client && inv.client.toLowerCase().includes(lowerSearch)) || (inv.id && inv.id.includes(lowerSearch))) &&
                (statusFilter.length === 0 || statusFilter.includes(inv.status))
            );
        } else if (activeTab === 'Payments') {
            return payments.filter(p => p.client && p.client.toLowerCase().includes(lowerSearch));
        } else {
            return claims.filter(c => c.client && c.client.toLowerCase().includes(lowerSearch));
        }
    }, [activeTab, invoices, payments, claims, searchQuery, statusFilter]);

    const stats = useMemo(() => {
        const totalPaid = invoices.filter(i => i.status === 'Paid').reduce((acc, curr) => acc + (curr.price || 0), 0);
        const totalUnpaid = invoices.filter(i => i.status === 'Unpaid').reduce((acc, curr) => acc + (curr.price || 0), 0);
        const totalOverdue = invoices.filter(i => i.status === 'Overdue').reduce((acc, curr) => acc + (curr.price || 0), 0);
        return { totalPaid, totalUnpaid, totalOverdue };
    }, [invoices]);

    // --- Handlers ---
    const handleCreateInvoice = async (data: any) => {
        // Optimistic UI Update
        const tempId = `TEMP-${Date.now()}`;
        const newInvoice: Invoice = {
            id: tempId,
            issueDate: new Date().toISOString().split('T')[0],
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            client: data.client,
            billTo: data.client, // Simplified
            services: data.service,
            price: parseFloat(data.amount),
            team: 'Me',
            status: 'Unpaid'
        };

        const prevInvoices = [...invoices];
        setInvoices([newInvoice, ...invoices]);
        setIsNewInvoiceOpen(false);

        try {
            const { auth } = await import('@/lib/firebase');
            const user = auth.currentUser;
            if (!user) throw new Error("Not logged in");

            const token = await user.getIdToken();
            const res = await fetch('http://localhost:8080/api/v1/billing/invoices', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    client: data.client,
                    amount: data.amount,
                    service: data.service,
                    dueDate: newInvoice.dueDate
                })
            });

            if (!res.ok) throw new Error("Failed to create invoice");

            const savedInvoice = await res.json();
            // Replace temp invoice with real one
            setInvoices(prev => prev.map(inv => inv.id === tempId ? { ...newInvoice, id: savedInvoice.id } : inv));

        } catch (error) {
            console.error("Create invoice failed:", error);
            // Revert on failure (or show error toast)
            setInvoices(prevInvoices);
            alert("Failed to save invoice to backend.");
        }
    };

    const handleExport = () => {
        alert(`Exporting ${activeTab} data to CSV...`);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] font-sans bg-slate-50 relative overflow-hidden">

            {/* HEADER */}
            <div className="bg-white px-8 pt-6 pb-0 border-b border-slate-200">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="bg-slate-100 p-2 rounded-lg text-slate-600">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800">Billing</h1>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleExport} className="bg-white border border-slate-300 text-slate-700 font-bold py-2 px-4 rounded-lg shadow-sm flex items-center gap-2 hover:bg-slate-50 transition-colors">
                            <Download className="w-4 h-4" /> Export
                        </button>
                        <button onClick={() => setIsNewInvoiceOpen(true)} className="bg-brand hover:bg-brand-600 text-white font-bold py-2 px-4 rounded-lg shadow-sm flex items-center gap-2 transition-colors">
                            <Plus className="w-5 h-5" /> New invoice
                        </button>
                    </div>
                </div>

                {/* TABS */}
                <div className="flex gap-8">
                    {['Invoices', 'Claims', 'Payments'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === tab
                                ? 'border-brand text-brand'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* MAIN CONTENT SCROLLABLE */}
            <div className="flex-1 overflow-auto">
                <div className="p-8 space-y-8">

                    {/* FINANCIAL CARDS */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <FinancialCard
                            amount="0.00"
                            label="In Transit"
                            badge="stripe"
                        />
                        <FinancialCard
                            amount={stats.totalPaid.toFixed(2)}
                            label="Total Paid"
                            subLabel="Lifetime"
                            badge="USD"
                            color="text-emerald-600"
                        />
                        <FinancialCard
                            amount={stats.totalUnpaid.toFixed(2)}
                            label="Total Unpaid"
                            subLabel="Outstanding"
                            badge="USD"
                            color="text-slate-900"
                        />
                        <FinancialCard
                            amount={stats.totalOverdue.toFixed(2)}
                            label="Total Overdue"
                            badge="USD"
                            color="text-rose-600"
                        />
                    </div>

                    {/* FILTER BAR */}
                    <div className="flex items-center flex-wrap gap-4">
                        <span className="font-bold text-slate-900 whitespace-nowrap">{filteredData.length} {activeTab}</span>

                        {/* Search */}
                        <div className="relative flex-1 min-w-[200px] max-w-md">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={`Search ${activeTab.toLowerCase()}...`}
                                className="w-full pl-10 pr-4 py-2 bg-white border-0 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand placeholder:text-slate-400"
                            />
                        </div>

                        {/* Filter Chips */}
                        <div className="flex items-center gap-2">
                            {activeTab === 'Invoices' && (
                                <FilterDropdown
                                    label="Status"
                                    icon={MoreHorizontal}
                                    options={['Paid', 'Unpaid', 'Overdue', 'Draft']}
                                    selected={statusFilter}
                                    onChange={(val: string) => {
                                        setStatusFilter(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val])
                                    }}
                                />
                            )}
                        </div>

                        <div className="flex-1"></div>

                        {/* Show Action */}
                        <button className="flex items-center gap-2 text-brand text-sm font-bold hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
                            <Filter className="w-4 h-4" /> Filter
                        </button>
                    </div>

                    {/* TABLE */}
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden relative min-h-[400px]">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-xs font-bold text-slate-500 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">ID</th>
                                    <th className="px-6 py-4">Client</th>
                                    {activeTab === 'Invoices' && <th className="px-6 py-4">Status</th>}
                                    {activeTab === 'Invoices' && <th className="px-6 py-4">Services</th>}
                                    {activeTab !== 'Invoices' && <th className="px-6 py-4">Details</th>}
                                    <th className="px-6 py-4 text-right">Amount</th>
                                    <th className="px-6 py-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredData.map((item: any) => (
                                    <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4 text-slate-700 font-medium whitespace-nowrap">
                                            {item.issueDate || item.date}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-brand hover:underline cursor-pointer">{item.id}</td>
                                        <td className="px-6 py-4 text-slate-700">{item.client}</td>

                                        {activeTab === 'Invoices' && (
                                            <td className="px-6 py-4">
                                                <StatusBadge status={item.status} />
                                            </td>
                                        )}
                                        {activeTab === 'Invoices' && (
                                            <td className="px-6 py-4 text-slate-600 text-sm truncate max-w-xs">{item.services}</td>
                                        )}

                                        {activeTab !== 'Invoices' && (
                                            <td className="px-6 py-4 text-slate-600 text-sm">
                                                {item.method || item.insurance || '-'}
                                            </td>
                                        )}

                                        <td className="px-6 py-4 font-bold text-slate-900 text-right">${item.price?.toFixed(2) || item.amount?.toFixed(2)}</td>

                                        <td className="px-6 py-4">
                                            <button className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100">
                                                <MoreHorizontal className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {filteredData.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                <Search className="w-8 h-8 mb-2 opacity-50" />
                                <p className="text-sm">No items found.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* NEW INVOICE MODAL */}
            {isNewInvoiceOpen && <NewInvoiceModal onClose={() => setIsNewInvoiceOpen(false)} onSave={handleCreateInvoice} />}

            {/* Floating Buttons */}
            <div className="absolute right-8 bottom-8 flex flex-col gap-3 z-10">
                <FloatingButton icon={Plus} onClick={() => setIsNewInvoiceOpen(true)} />
            </div>
        </div>
    );
}

// --- Components ---

function StatusBadge({ status }: { status: string }) {
    let color = 'bg-slate-100 text-slate-600';
    if (status === 'Paid' || status === 'Completed') color = 'bg-emerald-100 text-emerald-700';
    if (status === 'Overdue' || status === 'Denied') color = 'bg-rose-100 text-rose-700';
    if (status === 'Unpaid' || status === 'Submitted') color = 'bg-orange-100 text-orange-700';
    if (status === 'Processing') color = 'bg-blue-100 text-blue-700';

    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${color}`}>
            {status}
        </span>
    );
}

function FinancialCard({ amount, label, subLabel, badge, color = "text-slate-900" }: any) {
    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center relative h-32">
            {badge === 'stripe' && (
                <span className="absolute top-3 right-3 bg-indigo-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">stripe</span>
            )}
            {badge === 'USD' && (
                <span className="absolute top-3 right-3 bg-slate-100 text-slate-500 text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-200">USD</span>
            )}

            <div className={`text-3xl font-bold mb-1 ${color}`}>${amount}</div>
            <div className="text-sm font-bold text-slate-600">
                {label} <span className="text-slate-400 font-normal">{subLabel}</span>
            </div>
        </div>
    )
}

function FilterDropdown({ label, icon: Icon, options, selected, onChange }: any) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 border border-dashed rounded-full text-xs font-bold transition-all shadow-sm ${selected.length > 0 ? 'bg-brand-50 border-brand text-brand' : 'bg-white border-slate-200 text-slate-500 hover:border-brand hover:text-brand'
                    }`}
            >
                <Plus className={`w-3 h-3 rounded-full p-0.5 ${selected.length > 0 ? 'bg-brand text-white' : 'bg-slate-400 text-white'}`} />
                <span>{label}</span>
                {selected.length > 0 && <span className="bg-brand text-white text-[9px] px-1 rounded-full">{selected.length}</span>}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                        <div className="p-2 space-y-1">
                            {options.map((option: string) => (
                                <label key={option} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selected.includes(option)}
                                        onChange={() => onChange(option)}
                                        className="w-4 h-4 rounded border-slate-300 text-brand focus:ring-brand"
                                    />
                                    <span className="text-sm text-slate-700 font-medium">{option}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

function FloatingButton({ icon: Icon, onClick }: any) {
    return (
        <button onClick={onClick} className="w-12 h-12 bg-white rounded-full shadow-lg border border-slate-100 flex items-center justify-center hover:bg-slate-50 transition-colors group relative">
            <Icon className="w-5 h-5 text-slate-500 group-hover:text-slate-700" />
        </button>
    )
}

function NewInvoiceModal({ onClose, onSave }: any) {
    const [client, setClient] = useState('');
    const [amount, setAmount] = useState('');
    const [service, setService] = useState('');

    const handleSubmit = () => {
        if (!client || !amount) return;
        onSave({ client, amount, service });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h3 className="font-bold text-lg text-slate-800">New Invoice</h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-500">Client</label>
                        <input type="text" value={client} onChange={e => setClient(e.target.value)} placeholder="Client Name" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-500">Amount ($)</label>
                        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-500">Service Description</label>
                        <input type="text" value={service} onChange={e => setService(e.target.value)} placeholder="e.g. Therapy Session" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand" />
                    </div>
                </div>
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-bold text-sm bg-white hover:bg-slate-50">Cancel</button>
                    <button onClick={handleSubmit} className="px-6 py-2 bg-brand hover:bg-brand-600 text-white font-bold rounded-lg text-sm shadow-sm">Create Invoice</button>
                </div>
            </div>
        </div>
    )
}
