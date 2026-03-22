"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { db, storage } from '@/lib/firebase';
import { doc, onSnapshot, collection, query, orderBy, getDocs, updateDoc, serverTimestamp, setDoc, addDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import {
    ArrowLeft, ShieldCheck, FileText, Clock, AlertCircle, Sparkles, AlertTriangle, Save, 
    UploadCloud, Download, History, Eye, CheckCircle2, XCircle, Trash2, Calendar, User, Tag,
    Edit2, Plus, Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { COMPLIANCE_CATEGORIES } from '../ComplianceClient';
import { useAuthUser } from '@/hooks/useAuthUser';

export default function DocumentDetailClient({ documentId }: { documentId: string }) {
    const { user } = useAuthUser();
    const [documentData, setDocumentData] = useState<any>(null);
    const [activityLog, setActivityLog] = useState<any[]>([]);
    const [staffList, setStaffList] = useState<any[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<any>({});
    
    // Acknowledgments
    const [acknowledgments, setAcknowledgments] = useState<any[]>([]);
    const [showAckModal, setShowAckModal] = useState(false);
    const [selectedStaffForAck, setSelectedStaffForAck] = useState('');

    // New Version Upload
    const [newVersionFile, setNewVersionFile] = useState<File | null>(null);
    const [newVersionNotes, setNewVersionNotes] = useState('');
    const [newVersionStr, setNewVersionStr] = useState('');
    const [uploadingVersion, setUploadingVersion] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);

    useEffect(() => {
        // Fetch Admin / Staff for owners
        const fetchStaff = async () => {
            const snap = await getDocs(query(collection(db, 'patients')));
            const staff = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter((u: any) => u.role === 'admin' || u.role === 'staff' || u.role === 'provider');
            setStaffList(staff);
        };
        fetchStaff();

        const docRef = doc(db, 'crm-compliance', 'data', 'document-records', documentId);
        const unsubDoc = onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
                const data = { id: snap.id, ...snap.data() };
                setDocumentData(data);
                console.log(data);
                if (!isEditing) setEditForm(data);
            }
        });

        const actQ = query(collection(db, 'crm-compliance', 'data', 'document-records', documentId, 'activity-log'), orderBy('timestamp', 'desc'));
        const unsubAct = onSnapshot(actQ, (snap) => {
            setActivityLog(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const ackQ = query(collection(db, 'crm-compliance', 'data', 'document-records', documentId, 'acknowledgments'));
        const unsubAck = onSnapshot(ackQ, (snap) => {
            setAcknowledgments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => { unsubDoc(); unsubAct(); unsubAck(); };
    }, [documentId, isEditing]);

    const handleSave = async () => {
        try {
            const ref = doc(db, 'crm-compliance', 'data', 'document-records', documentId);
            const updates = { ...editForm, updatedAt: serverTimestamp() };
            
            // Re-eval expiration based on local form if not "no expiration"
            if (!updates.noExpiration && updates.expirationDate) {
                const diffDays = Math.ceil((new Date(updates.expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                if (diffDays > 90) updates.status = 'Active';
                else if (diffDays > 60) updates.status = 'Expiring Soon';
                else if (diffDays >= 0) updates.status = 'Expiring Critical';
                else updates.status = 'Expired';
            } else if (updates.noExpiration) {
                updates.expirationDate = null;
                updates.status = 'Active';
            }

            await updateDoc(ref, updates);
            
            await addDoc(collection(db, 'crm-compliance', 'data', 'document-records', documentId, 'activity-log'), {
                action: 'Document Edited manually',
                actor: user?.displayName || user?.email || 'Staff',
                timestamp: serverTimestamp(),
                note: 'Staff updated document metadata fields manually.'
            });

            setIsEditing(false);
        } catch (e) {
            console.error('Error saving', e);
        }
    };

    const requestAcknowledgment = async () => {
        if (!selectedStaffForAck) return;
        try {
            // Check if already requested
            if (acknowledgments.find(a => a.userId === selectedStaffForAck)) {
                alert('Already requested for this user.');
                return;
            }

            const staffM = staffList.find(s => s.id === selectedStaffForAck);

            const ackRef = doc(collection(db, 'crm-compliance', 'data', 'document-records', documentId, 'acknowledgments'));
            await setDoc(ackRef, {
                userId: selectedStaffForAck,
                userName: staffM?.name || staffM?.email || 'Unknown',
                requestedAt: serverTimestamp(),
                requestedBy: user?.displayName || 'Admin',
                status: 'pending' // 'acknowledged' when done
            });

            // Trigger Inbox Notification to assigned user
            await addDoc(collection(db, 'notifications'), {
                userId: selectedStaffForAck,
                title: 'Compliance Document Acknowledgment Required',
                message: `Please review and acknowledge the updated compliance document: ${documentData?.title}`,
                type: 'compliance_ack',
                status: 'unread',
                priority: 'high',
                createdAt: serverTimestamp(),
                link: `/admin/crm/compliance/${documentId}`
            });

            await addDoc(collection(db, 'crm-compliance', 'data', 'document-records', documentId, 'activity-log'), {
                action: 'Acknowledgment Requested',
                actor: user?.displayName || 'Admin',
                timestamp: serverTimestamp(),
                note: `Requested review from ${staffM?.name || staffM?.email}`
            });

            setShowAckModal(false);
            setSelectedStaffForAck('');
        } catch (e) {
            console.error('Request Err', e);
        }
    };

    const handleUploadNewVersion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newVersionFile) return alert('Select a file.');
        setUploadingVersion(true);

        try {
            // Reset AI Status on document main record
            const refDoc = doc(db, 'crm-compliance', 'data', 'document-records', documentId);
            
            const categorySlug = documentData.category?.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'general';
            const filePath = `compliance-documents/${categorySlug}/${documentId}/${newVersionFile.name}`;
            const fileRef = ref(storage, filePath);
            
            const metadata = { customMetadata: { docId: documentId } };
            const uploadTask = uploadBytesResumable(fileRef, newVersionFile, metadata);

            uploadTask.on('state_changed', null, (err) => {
                console.error(err); setUploadingVersion(false);
            }, async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                
                const newVersionLog = {
                    version: newVersionStr || `v${(documentData.versionHistory?.length || 0) + 1}.0`,
                    uploadDate: new Date().toISOString(),
                    uploaderName: user?.displayName || user?.email || 'Staff',
                    url: downloadURL,
                    filename: newVersionFile.name,
                    notes: newVersionNotes
                };

                const history = documentData.versionHistory || [];
                history.push(newVersionLog);

                await updateDoc(refDoc, {
                    fileUrl: downloadURL,
                    filename: newVersionFile.name,
                    version: newVersionLog.version,
                    versionHistory: history,
                    aiExtractionStatus: 'pending', // Triggers AI func on Cloud again implicitly. But we actually just overwrite the file and the CF will see it
                    updatedAt: serverTimestamp()
                });

                await addDoc(collection(db, 'crm-compliance', 'data', 'document-records', documentId, 'activity-log'), {
                    action: 'New Version Uploaded',
                    actor: user?.displayName || user?.email || 'Staff',
                    timestamp: serverTimestamp(),
                    note: `Version ${newVersionLog.version} uploaded.`
                });

                setUploadingVersion(false);
                setShowUploadModal(false);
                setNewVersionFile(null);
                setNewVersionNotes('');
                setNewVersionStr('');
            });
        } catch (err) {
            console.error('Upload Error', err);
            setUploadingVersion(false);
        }
    };

    const isAiExtracted = (field: string) => {
        if (!documentData?.aiExtractedFields) return false;
        return documentData.aiExtractedFields.includes(field);
    };

    if (!documentData) return (
        <div className="flex justify-center items-center h-[50vh]">
            <div className="w-8 h-8 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
        </div>
    );

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                <div>
                    <Link href="/crm/compliance" className="text-teal-600 hover:text-teal-700 font-bold text-sm flex items-center gap-1 mb-2">
                        <ArrowLeft className="w-4 h-4" /> Back to Compliance
                    </Link>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
                        {documentData.title || 'Untitled Document'}
                        <span className={`text-sm px-3 py-1 rounded-full font-bold uppercase tracking-widest ${
                            documentData.status === 'Active' ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' :
                            documentData.status === 'Expiring Soon' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            documentData.status === 'Expiring Critical' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                            {documentData.status}
                        </span>
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setShowUploadModal(true)}
                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300 transition-colors shadow-sm"
                    >
                        <UploadCloud className="w-4 h-4 text-teal-500" /> New Version
                    </button>
                    {!isEditing ? (
                        <button 
                            onClick={() => setIsEditing(true)}
                            className="bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm"
                        >
                            <Edit2 className="w-4 h-4" /> Edit Record
                        </button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => { setIsEditing(false); setEditForm(documentData); }}
                                className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSave}
                                className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-teal-900/20"
                            >
                                <Save className="w-4 h-4" /> Save Record
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {documentData.aiExtractionStatus === 'failed' && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-amber-800 dark:text-amber-400">AI Extraction Incomplete</h4>
                        <p className="text-sm font-semibold text-amber-700 dark:text-amber-500 mt-1">
                            The automated extraction process could not confidently parse this document. Please review and fill in the fields manually.
                            {documentData.aiExtractionError && <span className="block mt-1 text-xs">{documentData.aiExtractionError}</span>}
                        </p>
                    </div>
                </div>
            )}

            {documentData.aiExtractionStatus === 'success' && documentData.summary && (
                <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/10 dark:to-slate-800 border border-indigo-100 dark:border-indigo-800/50 p-6 rounded-3xl shadow-sm relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-100 dark:bg-indigo-900/20 rounded-full blur-[80px] -z-10 group-hover:bg-indigo-200 dark:group-hover:bg-indigo-900/40 transition-colors"></div>
                    <div className="flex items-start gap-4 z-10">
                        <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-sm border border-indigo-50 dark:border-indigo-800 flex-shrink-0">
                            <Sparkles className="w-6 h-6 text-indigo-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-800 dark:text-indigo-100 tracking-tight flex items-center gap-2">
                                AI Document Summary
                            </h2>
                            <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed mt-2 text-sm">{documentData.summary}</p>
                            
                            {documentData.criticalDates && (
                                <div className="mt-4 pt-4 border-t border-indigo-100 dark:border-indigo-800/50">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-2 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> Key Dates Addressed</h4>
                                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">{documentData.criticalDates}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Meta Data */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl p-6 shadow-sm">
                        <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-teal-500" /> Record Metadata
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                    Document Title 
                                    {isAiExtracted('title') && <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded text-[9px]"><Sparkles className="w-2.5 h-2.5 inline mr-1"/>AI</span>}
                                </label>
                                {isEditing ? (
                                    <input 
                                        type="text" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2 text-sm font-bold text-slate-800 dark:text-slate-200"
                                    />
                                ) : (
                                    <div className="font-bold text-lg text-slate-800 dark:text-white">{documentData.title || '--'}</div>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                    Category 
                                    {isAiExtracted('category') && <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded text-[9px]"><Sparkles className="w-2.5 h-2.5 inline mr-1"/>AI</span>}
                                </label>
                                {isEditing ? (
                                    <select 
                                        value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2 text-sm font-bold text-slate-800 dark:text-slate-200"
                                    >
                                        {COMPLIANCE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                ) : (
                                    <div className="font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 w-fit px-3 py-1 rounded-lg text-sm">{documentData.category || '--'}</div>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                    Record Owner 
                                    {isAiExtracted('assignedOwner') && <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded text-[9px]"><Sparkles className="w-2.5 h-2.5 inline mr-1"/>AI</span>}
                                </label>
                                {isEditing ? (
                                    <select 
                                        value={editForm.assignedOwner} onChange={e => setEditForm({...editForm, assignedOwner: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2 text-sm font-bold text-slate-800 dark:text-slate-200"
                                    >
                                        <option value="">Unassigned</option>
                                        {staffList.map(s => <option key={s.id} value={s.id}>{s.name || s.email}</option>)}
                                    </select>
                                ) : (
                                    <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 text-sm">
                                        <User className="w-4 h-4 text-slate-400" />
                                        {staffList.find(s => s.id === documentData.assignedOwner)?.name || 'Unassigned'}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                    Effective Date 
                                    {isAiExtracted('effectiveDate') && <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded text-[9px]"><Sparkles className="w-2.5 h-2.5 inline mr-1"/>AI</span>}
                                </label>
                                {isEditing ? (
                                    <input 
                                        type="date" value={editForm.effectiveDate || ''} onChange={e => setEditForm({...editForm, effectiveDate: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2 text-sm font-bold text-slate-800 dark:text-slate-200"
                                    />
                                ) : (
                                    <div className="font-bold text-slate-800 dark:text-slate-200">{documentData.effectiveDate ? format(new Date(documentData.effectiveDate), 'MMMM d, yyyy') : '--'}</div>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        Expiration Date
                                        {isAiExtracted('expirationDate') && <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded text-[9px]"><Sparkles className="w-2.5 h-2.5 inline mr-1"/>AI</span>}
                                    </span>
                                </label>
                                {isEditing ? (
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-xs text-slate-500">
                                            <input type="checkbox" checked={editForm.noExpiration || false} onChange={e => setEditForm({...editForm, noExpiration: e.target.checked})} className="rounded text-teal-600" />
                                            Does not expire
                                        </label>
                                        <input 
                                            type="date" 
                                            disabled={editForm.noExpiration}
                                            value={editForm.expirationDate || ''} onChange={e => setEditForm({...editForm, expirationDate: e.target.value})}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2 text-sm font-bold text-slate-800 dark:text-slate-200 disabled:opacity-50"
                                        />
                                    </div>
                                ) : (
                                    <div className="font-bold text-slate-800 dark:text-slate-200">
                                        {documentData.noExpiration || !documentData.expirationDate ? 
                                            <span className="text-slate-500 italic">No Expiration Date</span> : 
                                            format(new Date(documentData.expirationDate), 'MMMM d, yyyy')}
                                    </div>
                                )}
                            </div>

                            {(documentData.category === "Telehealth Provider Licensure Documentation" || documentData.providerName) && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                        Provider Name
                                        {isAiExtracted('parties') && <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded text-[9px]"><Sparkles className="w-2.5 h-2.5 inline mr-1"/>AI</span>}
                                    </label>
                                    {isEditing ? (
                                        <input 
                                            type="text" value={editForm.providerName || ''} onChange={e => setEditForm({...editForm, providerName: e.target.value})}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2 text-sm font-bold text-slate-800 dark:text-slate-200"
                                        />
                                    ) : (
                                        <div className="font-bold text-slate-800 dark:text-slate-200">{documentData.providerName || (documentData.parties?.join(', ')) || '--'}</div>
                                    )}
                                </div>
                            )}

                            {(documentData.category === "Telehealth Provider Licensure Documentation" || documentData.category === "State-Specific Telehealth Compliance Documents" || documentData.state) && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 shrink-0">State</label>
                                    {isEditing ? (
                                        <input 
                                            type="text" value={editForm.state || ''} onChange={e => setEditForm({...editForm, state: e.target.value})} maxLength={2}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2 text-sm font-bold text-slate-800 dark:text-slate-200"
                                        />
                                    ) : (
                                        <div className="font-bold text-slate-800 dark:text-slate-200">{documentData.state || '--'}</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Version History */}
                    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl p-6 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                                <History className="w-5 h-5 text-slate-400" /> Version History
                            </h3>
                            <div className="text-sm font-bold text-slate-500">Current: v{documentData.version || '1.0'}</div>
                        </div>

                        <div className="relative pl-6 space-y-6 before:absolute before:inset-y-0 before:left-[11px] before:w-[2px] before:bg-slate-100 dark:before:bg-slate-700">
                            {(documentData.versionHistory || []).slice().reverse().map((vh: any, i: number) => (
                                <div key={i} className="relative bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 group">
                                    <div className={`absolute -left-[30px] top-4 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 shadow-sm ${i === 0 ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                                Version {vh.version} 
                                                {i === 0 && <span className="bg-teal-100 text-teal-700 text-[10px] uppercase font-black px-2 py-0.5 rounded tracking-widest">Current</span>}
                                            </div>
                                            <div className="text-xs font-semibold text-slate-500 mt-1">Uploaded by {vh.uploaderName} on {format(new Date(vh.uploadDate), 'MMM d, yyyy h:mm a')}</div>
                                        </div>
                                        <a href={vh.url} target="_blank" rel="noreferrer" className="shrink-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 p-2 rounded-xl text-indigo-600 hover:text-indigo-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition" title="Download">
                                            <Download className="w-4 h-4" />
                                        </a>
                                    </div>
                                    {vh.notes && <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 font-medium bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">{vh.notes}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-1 space-y-6">
                    {/* Acknowledgment Card */}
                    <div className="bg-gradient-to-br from-indigo-600 to-sky-600 p-6 rounded-3xl text-white shadow-lg shadow-indigo-900/20">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                                Acknowledgment
                            </h3>
                            <button 
                                onClick={() => setShowAckModal(true)}
                                className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-colors text-sm backdrop-blur-sm"
                            >
                                <Plus className="w-4 h-4" /> Assign
                            </button>
                        </div>

                        {acknowledgments.length === 0 ? (
                            <div className="bg-indigo-900/20 border border-indigo-400/30 rounded-2xl p-4 text-center text-sm font-semibold text-indigo-100">
                                No staff requested to acknowledge this document.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {acknowledgments.map(a => (
                                    <div key={a.id} className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-indigo-400/30 flex justify-between items-center">
                                        <div>
                                            <div className="font-bold text-sm text-white">{a.userName}</div>
                                            <div className="text-xs text-indigo-200 font-medium">Requested: {a.requestedAt ? format(a.requestedAt.toDate(), 'MMM d') : '--'}</div>
                                        </div>
                                        {a.status === 'acknowledged' ? (
                                            <span className="flex items-center gap-1 text-xs font-black uppercase tracking-widest text-[#a8e6cf] bg-white/10 px-2 py-1 rounded" title={a.acknowledgedAt ? format(a.acknowledgedAt.toDate(), 'MMM d, h:mm a') : ''}>
                                                <CheckCircle2 className="w-3 h-3" /> Signed
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-xs font-black uppercase tracking-widest text-amber-300 bg-white/10 px-2 py-1 rounded">
                                                <Clock className="w-3 h-3" /> Pending
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Activity Log */}
                    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl p-6 shadow-sm overflow-hidden flex flex-col h-[500px]">
                        <h3 className="text-lg font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-slate-400" /> Event Log
                        </h3>
                        <div className="flex-1 overflow-y-auto no-scrollbar relative pl-5 space-y-6 before:absolute before:inset-y-0 before:left-[9px] before:w-[2px] before:bg-slate-100 dark:before:bg-slate-700">
                            {activityLog.length === 0 ? <p className="text-slate-500 font-semibold text-sm">No activity recorded.</p> : activityLog.map((act) => (
                                <div key={act.id} className="relative flex flex-col gap-1 tracking-tight group">
                                    <div className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-800 bg-slate-400 shadow-sm transition-transform group-hover:scale-125"></div>
                                    <div className="flex items-center justify-between mb-0.5">
                                        <div className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                            {act.actor}
                                            {act.action.includes('AI') && <Sparkles className="w-3 h-3 text-indigo-500" />}
                                        </div>
                                        <span className="text-xs font-bold text-slate-400">{act.timestamp ? format(act.timestamp.toDate(), 'MMM d, h:mm a') : '--'}</span>
                                    </div>
                                    <div className="text-xs uppercase font-black px-0 text-slate-500 dark:text-slate-400 tracking-widest leading-none mb-1">
                                        {act.action}
                                    </div>
                                    <div className="text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                                        {act.note}
                                        {act.fieldsUpdated && act.fieldsUpdated.length > 0 && (
                                            <div className="mt-2 text-[10px] text-indigo-500 font-bold tracking-wider uppercase">
                                                Fields: {act.fieldsUpdated.join(', ')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Ack Modal */}
            {showAckModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAckModal(false)}></div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] shadow-2xl p-8 max-w-sm w-full relative z-10">
                        <h2 className="text-xl font-black text-slate-800 dark:text-white mb-4">Request Acknowledgment</h2>
                        <div className="space-y-4">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block">Select Staff Member</label>
                            <select 
                                value={selectedStaffForAck} onChange={e => setSelectedStaffForAck(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Select someone...</option>
                                {staffList.map(s => <option key={s.id} value={s.id}>{s.name || s.email}</option>)}
                            </select>
                            
                            <div className="flex gap-3 justify-end mt-4">
                                <button onClick={() => setShowAckModal(false)} className="px-4 py-2 rounded-xl text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
                                <button onClick={requestAcknowledgment} disabled={!selectedStaffForAck} className="px-5 py-2 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors">Assign</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Upload New Version Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !uploadingVersion && setShowUploadModal(false)}></div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] shadow-2xl p-8 max-w-md w-full relative z-10">
                        <h2 className="text-xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-2"><UploadCloud className="w-5 h-5 text-teal-500" /> Upload New Version</h2>
                        <form onSubmit={handleUploadNewVersion} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">New Version Number</label>
                                <input 
                                    type="text" required
                                    value={newVersionStr} onChange={e => setNewVersionStr(e.target.value)}
                                    placeholder={`e.g. ${(parseFloat(documentData.version) + 0.1).toFixed(1)}`}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-teal-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block">File</label>
                                <input 
                                    type="file" required accept=".pdf,.docx,image/*"
                                    onChange={e => setNewVersionFile(e.target.files?.[0] || null)}
                                    className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Version Notes (Optional)</label>
                                <textarea 
                                    rows={2}
                                    value={newVersionNotes} onChange={e => setNewVersionNotes(e.target.value)}
                                    placeholder="What changed?"
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                                />
                            </div>

                            <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <button type="button" onClick={() => !uploadingVersion && setShowUploadModal(false)} className="px-4 py-2 rounded-xl text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
                                <button type="submit" disabled={uploadingVersion} className="px-5 py-2 rounded-xl font-bold bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center gap-2">
                                    {uploadingVersion ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></span> : <UploadCloud className="w-4 h-4" />} Upload
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
