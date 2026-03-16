"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { db, storage } from '@/lib/firebase';
import { collection, query, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, getDocs } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import {
    ShieldCheck, Calendar, Filter, Plus, Search, Upload, AlertCircle, CheckCircle2,
    XCircle, Clock, FileText, Download, MoreVertical, Eye, Edit2, ShieldAlert, Sparkles
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useAuthUser } from '@/hooks/useAuthUser';

export const COMPLIANCE_CATEGORIES = [
    "Business Associate Agreements",
    "HIPAA Privacy Policy",
    "HIPAA Security Policy",
    "Patient Consent Forms",
    "Informed Consent for Treatment",
    "State-Specific Telehealth Compliance Documents",
    "Notice of Privacy Practices",
    "Data Breach Notification Policy",
    "Record Retention Policy",
    "Accessibility and Nondiscrimination Policy",
    "Telehealth Provider Licensure Documentation",
    "ONC Certification",
    "E-Prescribing Compliance",
    "Telehealth Platform Terms of Service",
    "Emergency Protocol Documentation"
];

export default function ComplianceClient() {
    const router = useRouter();
    const { user } = useAuthUser();
    const [documents, setDocuments] = useState<any[]>([]);
    const [staffList, setStaffList] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [ownerFilter, setOwnerFilter] = useState('All');
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    
    // Upload State
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [newDocForm, setNewDocForm] = useState({
        title: '',
        category: COMPLIANCE_CATEGORIES[0],
        effectiveDate: '',
        expirationDate: '',
        noExpiration: false,
        version: '1.0',
        assignedOwner: '',
        providerName: '',
        state: '',
        notes: ''
    });

    useEffect(() => {
        // Fetch Admin / Staff for owners
        const fetchStaff = async () => {
            const snap = await getDocs(query(collection(db, 'patients')));
            const staff = snap.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter((u: any) => u.role === 'admin' || u.role === 'staff' || u.role === 'provider');
            setStaffList(staff);
        };
        fetchStaff();

        const q = query(collection(db, 'crm-compliance', 'data', 'document-records'));
        const unsub = onSnapshot(q, (snapshot) => {
            const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setDocuments(docs);
        });

        return () => unsub();
    }, []);

    const filteredDocuments = useMemo(() => {
        let result = documents;

        if (search) {
            const term = search.toLowerCase();
            result = result.filter(d => 
                d.title?.toLowerCase().includes(term) ||
                d.category?.toLowerCase().includes(term) ||
                d.notes?.toLowerCase().includes(term)
            );
        }

        if (categoryFilter !== 'All') {
            result = result.filter(d => d.category === categoryFilter);
        }

        if (statusFilter !== 'All') {
            result = result.filter(d => d.status === statusFilter);
        }

        if (ownerFilter !== 'All') {
            result = result.filter(d => d.assignedOwner === ownerFilter);
        }

        // Sort by expiration date ascending (nulls last)
        result.sort((a, b) => {
            if (!a.expirationDate && !b.expirationDate) return 0;
            if (!a.expirationDate) return 1;
            if (!b.expirationDate) return -1;
            return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
        });

        return result;
    }, [documents, search, categoryFilter, statusFilter, ownerFilter]);

    const metrics = useMemo(() => {
        const total = documents.length;
        const active = documents.filter(d => d.status === 'Active').length;
        const expiringSoon = documents.filter(d => d.status === 'Expiring Soon' || d.status === 'Expiring Critical').length;
        const expired = documents.filter(d => d.status === 'Expired').length;
        return { total, active, expiringSoon, expired };
    }, [documents]);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uploadFile) return alert('Please select a file');

        setUploading(true);
        try {
            const docRef = await addDoc(collection(db, 'crm-compliance', 'data', 'document-records'), {
                ...newDocForm,
                expirationDate: newDocForm.noExpiration ? null : newDocForm.expirationDate,
                uploaderId: user?.uid,
                status: newDocForm.noExpiration ? 'Active' : 'Pending Calculation',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                versionHistory: [] // will append below
            });

            // Upload File
            const categorySlug = newDocForm.category.replace(/[^a-z0-9]/gi, '-').toLowerCase();
            const filePath = `compliance-documents/${categorySlug}/${docRef.id}/${uploadFile.name}`;
            const storageRef = ref(storage, filePath);
            
            const metadata = {
                customMetadata: {
                    docId: docRef.id
                }
            };

            const uploadTask = uploadBytesResumable(storageRef, uploadFile, metadata);

            uploadTask.on('state_changed', 
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(progress);
                },
                (error) => {
                    console.error('Upload failed:', error);
                    setUploading(false);
                },
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    
                    const newVersion = {
                        version: newDocForm.version,
                        uploadDate: new Date().toISOString(),
                        uploaderName: user?.displayName || user?.email || 'Staff',
                        url: downloadURL,
                        filename: uploadFile.name
                    };

                    await updateDoc(docRef, {
                        fileUrl: downloadURL,
                        filename: uploadFile.name,
                        versionHistory: [newVersion]
                    });

                    // Log initial activity
                    await addDoc(collection(db, 'crm-compliance', 'data', 'document-records', docRef.id, 'activity-log'), {
                        action: 'Document Created & Uploaded',
                        actor: user?.displayName || user?.email || 'Staff',
                        timestamp: serverTimestamp(),
                        note: `Initial version ${newDocForm.version} uploaded.`
                    });

                    setUploading(false);
                    setIsUploadModalOpen(false);
                    setUploadFile(null);
                    setNewDocForm({
                        title: '', category: COMPLIANCE_CATEGORIES[0], effectiveDate: '', expirationDate: '',
                        noExpiration: false, version: '1.0', assignedOwner: '', providerName: '', state: '', notes: ''
                    });
                }
            );
        } catch (error) {
            console.error(error);
            setUploading(false);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Active': return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800/50';
            case 'Expiring Soon': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50';
            case 'Expiring Critical': return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800/50';
            case 'Expired': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50';
            default: return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Active': return <CheckCircle2 className="w-4 h-4" />;
            case 'Expiring Soon': return <Clock className="w-4 h-4" />;
            case 'Expiring Critical': return <AlertCircle className="w-4 h-4" />;
            case 'Expired': return <XCircle className="w-4 h-4" />;
            default: return <ShieldAlert className="w-4 h-4" />;
        }
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-800 p-8 rounded-[36px] shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-teal-50 dark:bg-teal-900/30 rounded-2xl flex items-center justify-center border border-teal-100 dark:border-teal-800/50">
                            <ShieldCheck className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                        </div>
                        <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Compliance</h1>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xl leading-relaxed mt-2 pl-15">
                        Manage all compliance-related documents required for Patriotic Telehealth's HIPAA-compliant operations.
                    </p>
                </div>

                <div className="flex items-center gap-3 relative z-10">
                    <button 
                        onClick={() => setIsUploadModalOpen(true)}
                        className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white px-6 py-3.5 rounded-2xl font-bold shadow-lg shadow-teal-900/20 transition-all hover:-translate-y-0.5"
                    >
                        <Plus className="w-5 h-5" /> Upload Document
                    </button>
                    <Link href="/crm/compliance/calendar" className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-6 py-3.5 rounded-2xl font-bold transition-all shadow-sm">
                        <Calendar className="w-5 h-5" /> Calendar View
                    </Link>
                </div>
            </div>

            {/* Metrics Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-center relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-slate-50 dark:bg-slate-700/50 rounded-full blur-xl group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20 transition-colors"></div>
                    <div className="text-3xl font-black text-slate-800 dark:text-slate-100 relative z-10">{metrics.total}</div>
                    <div className="text-xs uppercase font-black tracking-widest text-slate-400 mt-1 relative z-10 text-indigo-600 dark:text-indigo-400">Total Documents</div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-teal-100 dark:border-teal-900/30 shadow-sm flex flex-col justify-center relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-teal-50 dark:bg-teal-900/20 rounded-full blur-xl group-hover:bg-teal-100 dark:group-hover:bg-teal-800/30 transition-colors"></div>
                    <div className="text-3xl font-black text-teal-600 dark:text-teal-400 relative z-10">{metrics.active}</div>
                    <div className="text-xs uppercase font-black tracking-widest text-teal-500 mt-1 relative z-10">Active & Current</div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-amber-100 dark:border-amber-900/30 shadow-sm flex flex-col justify-center relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-50 dark:bg-amber-900/20 rounded-full blur-xl group-hover:bg-amber-100 dark:group-hover:bg-amber-800/30 transition-colors"></div>
                    <div className="text-3xl font-black text-amber-600 dark:text-amber-500 relative z-10">{metrics.expiringSoon}</div>
                    <div className="text-xs uppercase font-black tracking-widest text-amber-500 mt-1 relative z-10">Expiring Soon</div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-rose-100 dark:border-rose-900/30 shadow-sm flex flex-col justify-center relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-rose-50 dark:bg-rose-900/20 rounded-full blur-xl group-hover:bg-rose-100 dark:group-hover:bg-rose-800/30 transition-colors"></div>
                    <div className="text-3xl font-black text-rose-600 dark:text-rose-500 relative z-10">{metrics.expired}</div>
                    <div className="text-xs uppercase font-black tracking-widest text-rose-500 mt-1 relative z-10">Expired</div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-1 w-full relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search documents by title or keyword..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl py-3 pl-12 pr-4 text-sm font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500/50 outline-none placeholder:text-slate-400 transition-all"
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
                    <div className="flex items-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl px-3 py-1">
                        <Filter className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                        <select 
                            value={categoryFilter} 
                            onChange={e => setCategoryFilter(e.target.value)}
                            className="bg-transparent border-none text-sm font-semibold text-slate-700 dark:text-slate-300 focus:ring-0 outline-none w-32 md:w-auto"
                        >
                            <option value="All">All Categories</option>
                            {COMPLIANCE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl px-3 py-1">
                        <select 
                            value={statusFilter} 
                            onChange={e => setStatusFilter(e.target.value)}
                            className="bg-transparent border-none text-sm font-semibold text-slate-700 dark:text-slate-300 focus:ring-0 outline-none"
                        >
                            <option value="All">All Statuses</option>
                            <option value="Active">Active</option>
                            <option value="Expiring Soon">Expiring Soon</option>
                            <option value="Expiring Critical">Expiring Critical</option>
                            <option value="Expired">Expired</option>
                        </select>
                    </div>
                    <div className="flex items-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl px-3 py-1">
                        <select 
                            value={ownerFilter} 
                            onChange={e => setOwnerFilter(e.target.value)}
                            className="bg-transparent border-none text-sm font-semibold text-slate-700 dark:text-slate-300 focus:ring-0 outline-none"
                        >
                            <option value="All">All Owners</option>
                            {staffList.map(s => <option key={s.id} value={s.id}>{s.name || s.email}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Document Table */}
            <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[32px] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-900/20 border-b border-slate-100 dark:border-slate-700/50">
                                <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-400">Document Name</th>
                                <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-400">Category</th>
                                <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-400">Owner</th>
                                <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-400">Effective Date</th>
                                <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-400">Expiration Date</th>
                                <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-400 text-center">Status</th>
                                <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                            {filteredDocuments.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-slate-500 font-bold">
                                        No documents found.
                                    </td>
                                </tr>
                            ) : filteredDocuments.map(doc => (
                                <tr key={doc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors group">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                                                <FileText className="w-5 h-5 text-slate-500" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800 dark:text-slate-200">{doc.title || 'Untitled Document'}</div>
                                                <div className="text-xs font-semibold text-slate-400 flex items-center gap-2 mt-0.5">
                                                    <span>v{doc.version || '1.0'}</span>
                                                    {doc.aiExtractionStatus === 'success' && (
                                                        <span className="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 px-1.5 py-0.5 rounded text-[10px] uppercase font-black tracking-wider flex items-center gap-1">
                                                            <Sparkles className="w-3 h-3" /> AI Extracted
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-sm font-bold text-slate-600 dark:text-slate-300">{doc.category}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                                            {staffList.find(s => s.id === doc.assignedOwner)?.name || 'Unassigned'}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                                            {doc.effectiveDate ? format(new Date(doc.effectiveDate), 'MMM d, yyyy') : '--'}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                            {doc.expirationDate ? format(new Date(doc.expirationDate), 'MMM d, yyyy') : <span className="text-slate-400 font-semibold italic">No Expiration</span>}
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getStatusStyle(doc.status)}`}>
                                            {getStatusIcon(doc.status)} {doc.status || 'Unknown'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Link href={`/crm/compliance/${doc.id}`} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 p-2 rounded-xl text-slate-600 dark:text-slate-300 transition-colors" title="View Detail">
                                                <Eye className="w-4 h-4" />
                                            </Link>
                                            {doc.fileUrl && (
                                                <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 p-2 rounded-xl text-slate-600 dark:text-slate-300 transition-colors" title="Download Current">
                                                    <Download className="w-4 h-4" />
                                                </a>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Upload Modal */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !uploading && setIsUploadModalOpen(false)}></div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] shadow-2xl p-8 max-w-2xl w-full relative z-10 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2"><Upload className="w-6 h-6 text-teal-500" /> Upload Compliance Document</h2>
                            <button onClick={() => !uploading && setIsUploadModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><XCircle className="w-6 h-6" /></button>
                        </div>

                        <form onSubmit={handleUpload} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Document Title</label>
                                    <input 
                                        type="text" 
                                        value={newDocForm.title} onChange={e => setNewDocForm({...newDocForm, title: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-teal-500"
                                        placeholder="Leave blank for AI to extract"
                                    />
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Category *</label>
                                    <select 
                                        required
                                        value={newDocForm.category} onChange={e => setNewDocForm({...newDocForm, category: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-teal-500"
                                    >
                                        {COMPLIANCE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Effective Date</label>
                                    <input 
                                        type="date" 
                                        value={newDocForm.effectiveDate} onChange={e => setNewDocForm({...newDocForm, effectiveDate: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-teal-500"
                                    />
                                </div>
                                <div className="space-y-1.5 relative">
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                                        <span>Expiration Date</span>
                                        <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                                            <input type="checkbox" checked={newDocForm.noExpiration} onChange={e => setNewDocForm({...newDocForm, noExpiration: e.target.checked})} className="rounded text-teal-600 focus:ring-teal-500 w-3 h-3 pointer-events-auto" />
                                            Does not expire
                                        </label>
                                    </label>
                                    <input 
                                        type="date" 
                                        disabled={newDocForm.noExpiration}
                                        value={newDocForm.expirationDate} onChange={e => setNewDocForm({...newDocForm, expirationDate: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Version</label>
                                    <input 
                                        type="text" 
                                        value={newDocForm.version} onChange={e => setNewDocForm({...newDocForm, version: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-teal-500"
                                        placeholder="1.0"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Assigned Owner</label>
                                    <select 
                                        value={newDocForm.assignedOwner} onChange={e => setNewDocForm({...newDocForm, assignedOwner: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-teal-500"
                                    >
                                        <option value="">Unassigned</option>
                                        {staffList.map(s => <option key={s.id} value={s.id}>{s.name || s.email}</option>)}
                                    </select>
                                </div>

                                {newDocForm.category === "Telehealth Provider Licensure Documentation" && (
                                    <>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Provider Name</label>
                                            <input 
                                                type="text" 
                                                value={newDocForm.providerName} onChange={e => setNewDocForm({...newDocForm, providerName: e.target.value})}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-teal-500"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">State</label>
                                            <input 
                                                type="text" 
                                                value={newDocForm.state} onChange={e => setNewDocForm({...newDocForm, state: e.target.value})}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-teal-500"
                                                maxLength={2} placeholder="e.g. FL"
                                            />
                                        </div>
                                    </>
                                )}
                                {newDocForm.category === "State-Specific Telehealth Compliance Documents" && (
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">State</label>
                                        <input 
                                            type="text" 
                                            value={newDocForm.state} onChange={e => setNewDocForm({...newDocForm, state: e.target.value})}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-teal-500"
                                            maxLength={2} placeholder="e.g. FL"
                                        />
                                    </div>
                                )}

                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Notes (Optional)</label>
                                    <textarea 
                                        rows={2}
                                        value={newDocForm.notes} onChange={e => setNewDocForm({...newDocForm, notes: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                                        placeholder="Add any internal notes..."
                                    />
                                </div>
                            </div>
                            
                            <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">Upload File (PDF, DOCX, Image) *</label>
                                <input 
                                    type="file" 
                                    required
                                    accept=".pdf,.docx,image/*"
                                    onChange={e => setUploadFile(e.target.files?.[0] || null)}
                                    className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 dark:file:bg-slate-800 dark:file:text-slate-200 outline-none"
                                />
                                <p className="text-xs text-slate-400 mt-2 font-semibold">After upload, our AI agent will automatically securely extract any missing metadata from the document.</p>
                            </div>

                            {uploading && (
                                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 mt-4 overflow-hidden">
                                    <div className="bg-gradient-to-r from-teal-500 to-emerald-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => !uploading && setIsUploadModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                                <button type="submit" disabled={uploading} className="px-5 py-2.5 rounded-xl font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-teal-900/20">
                                    {uploading ? (
                                        <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></span> Uploading...</>
                                    ) : (
                                        <><Upload className="w-4 h-4" /> Save & Upload</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
