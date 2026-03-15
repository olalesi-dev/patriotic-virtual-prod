"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { 
    ArrowLeft, Save, User, Briefcase, Users, BarChart, ClipboardList, Database, Loader2, X 
} from 'lucide-react';
import { toast } from 'sonner';

const ENTITY_CONFIG = {
    patients: { title: 'Patient', icon: User, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/30' },
    facilities: { title: 'Facility', icon: Briefcase, color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-900/30' },
    vendors: { title: 'Vendor', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
    campaigns: { title: 'Campaign', icon: BarChart, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/30' },
    grants: { title: 'Grant Proposal', icon: ClipboardList, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/30' }
};

interface CrmEntity {
    id?: string;
    name: string;
    status: string;
    assignedOwner: string;
    tags: string[];
    notes: string;
    lastActivityDate?: Timestamp | Date;
    [key: string]: any;
}

const DEFAULT_RECORD: CrmEntity = {
    name: '',
    status: 'Active',
    assignedOwner: '',
    tags: [],
    notes: ''
};

export default function CrmEntityDetailClient({ entityType, id }: { entityType: string, id: string }) {
    const router = useRouter();
    const isNew = id === 'new';
    
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<CrmEntity>(DEFAULT_RECORD);
    const [tagInput, setTagInput] = useState('');

    const config = ENTITY_CONFIG[entityType as keyof typeof ENTITY_CONFIG] || ENTITY_CONFIG.patients;
    const Icon = config.icon;

    useEffect(() => {
        if (isNew) return;

        async function fetchRecord() {
            try {
                const docRef = doc(db, 'crm', 'data', entityType, id);
                const snapshot = await getDoc(docRef);
                if (snapshot.exists()) {
                    setFormData({ id: snapshot.id, ...snapshot.data() } as CrmEntity);
                } else {
                    toast.error('Record not found.');
                    router.push(`/crm/${entityType}`);
                }
            } catch (error) {
                console.error('Error fetching CRM record:', error);
                toast.error('Failed to load record.');
            } finally {
                setLoading(false);
            }
        }
        fetchRecord();
    }, [id, entityType, isNew, router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && tagInput.trim() !== '') {
            e.preventDefault();
            if (!formData.tags?.includes(tagInput.trim())) {
                setFormData(prev => ({ ...prev, tags: [...(prev.tags || []), tagInput.trim()] }));
            }
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        setFormData(prev => ({ ...prev, tags: (prev.tags || []).filter(t => t !== tagToRemove) }));
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            toast.error('Name is required');
            return;
        }

        setSaving(true);
        try {
            const collectionRef = collection(db, 'crm', 'data', entityType);
            const payload: any = {
                ...formData,
                lastActivityDate: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            if (isNew) {
                payload.createdAt = serverTimestamp() as Timestamp;
                await addDoc(collectionRef, payload);
                toast.success(`${config.title} created successfully!`);
            } else {
                const docRef = doc(db, 'crm', 'data', entityType, id);
                await setDoc(docRef, payload, { merge: true });
                toast.success(`${config.title} updated successfully!`);
            }

            router.push(`/crm/${entityType}`);
        } catch (error) {
            console.error('Save CRM error:', error);
            toast.error(`Failed to save ${config.title.toLowerCase()} record.`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-sky-500 rounded-full animate-spin"></div>
                <p className="mt-4 text-slate-500 font-bold uppercase tracking-widest text-xs">Loading record...</p>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500 pb-32">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-800 p-8 rounded-[36px] shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => router.push(`/crm/${entityType}`)}
                        className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-900/50 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-100 dark:border-slate-700"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border border-slate-100 dark:border-slate-700 shadow-sm ${config.bg}`}>
                        <Icon className={`w-7 h-7 ${config.color}`} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
                            {isNew ? 'New Record' : `Editing ${config.title}`}
                        </p>
                        <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                            {formData.name || `New ${config.title}`}
                        </h1>
                    </div>
                </div>
                
                <div className="shrink-0 flex gap-3 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t border-slate-100 dark:border-slate-700 md:border-none">
                    <button 
                        onClick={() => router.push(`/crm/${entityType}`)}
                        className="flex-1 md:flex-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#0EA5E9] hover:bg-sky-600 disabled:bg-sky-400 text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-sky-100 dark:shadow-sky-900/20 active:scale-95 transition-all"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? 'Saving...' : 'Save Record'}
                    </button>
                </div>
            </div>

            {/* Main Form Fields */}
            <div className="bg-white dark:bg-slate-800 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm p-8 space-y-8">
                
                <div className="border-b border-slate-100 dark:border-slate-700/50 pb-4">
                    <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                        <Database className="w-5 h-5 text-slate-400" />
                        Core Information
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Name */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                            {config.title} Name <span className="text-rose-500">*</span>
                        </label>
                        <input 
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                            placeholder={`Enter ${config.title.toLowerCase()} name...`}
                        />
                    </div>

                    {/* Status */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                            Current Status
                        </label>
                        <select 
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 transition-all appearance-none cursor-pointer"
                        >
                            <option value="Lead">Lead / Prospect</option>
                            <option value="Active">Active</option>
                            <option value="Pending">Pending / In Progress</option>
                            <option value="Won">Closed / Won / Approved</option>
                            <option value="Lost">Closed / Lost / Rejected</option>
                            <option value="Archived">Archived</option>
                        </select>
                    </div>

                    {/* Owner */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                            Assigned Owner
                        </label>
                        <input 
                            name="assignedOwner"
                            value={formData.assignedOwner}
                            onChange={handleChange}
                            className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                            placeholder="e.g. Dr. Smith"
                        />
                    </div>

                    {/* Tags */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                            Tags (Press Enter to Add)
                        </label>
                        <div className="w-full bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-3 focus-within:ring-2 focus-within:ring-sky-500/50 transition-all min-h-[56px] flex flex-wrap gap-2 items-center">
                            {(formData.tags || []).map(tag => (
                                <span key={tag} className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-xl text-xs font-bold">
                                    {tag}
                                    <button 
                                        type="button"
                                        onClick={() => removeTag(tag)}
                                        className="text-slate-400 hover:text-rose-500 transition-colors ml-1"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                            <input 
                                value={tagInput}
                                onChange={e => setTagInput(e.target.value)}
                                onKeyDown={handleAddTag}
                                className="flex-1 min-w-[120px] bg-transparent border-none p-0 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-0 placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                placeholder={(!formData.tags || formData.tags.length === 0) ? "Type a tag..." : ""}
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-3 md:col-span-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                            General Notes
                        </label>
                        <textarea 
                            name="notes"
                            value={formData.notes || ''}
                            onChange={handleChange}
                            rows={4}
                            className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-5 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                            placeholder="Record key details, background information, or status updates here..."
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
