"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp, Timestamp, arrayUnion } from 'firebase/firestore';
import { 
    ArrowLeft, Save, User, Briefcase, Users, BarChart, ClipboardList, Database, Loader2, X, Activity, Clock, Shield, Eye, EyeOff, Target, TrendingUp, Key, Calendar, Flag, Trophy, CheckSquare, Square
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const ENTITY_CONFIG = {
    patients: { title: 'Patient', icon: User, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/30' },
    facilities: { title: 'Facility', icon: Briefcase, color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-900/30' },
    vendors: { title: 'Vendor', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
    campaigns: { title: 'Campaign', icon: BarChart, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/30' },
    grants: { title: 'Grant Proposal', icon: ClipboardList, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/30' }
};

const PIPELINE_STAGES: Record<string, string[]> = {
    patients: ['New Lead', 'Contacted', 'Consultation Scheduled', 'Active Patient', 'Churned'],
    facilities: ['Prospecting', 'Demo Scheduled', 'Contract Sent', 'Active Partner', 'Inactive'],
    vendors: ['Active', 'Pending', 'Expiring Soon', 'Inactive'],
    campaigns: ['Draft', 'Active', 'Paused', 'Completed'],
    grants: ['Identifying', 'In Progress', 'Submitted', 'Under Review', 'Awarded', 'Rejected'],
};

interface ActivityLogEntry {
    action: string;
    details: string;
    author: string;
    timestamp: Timestamp;
}

interface CrmEntity {
    id?: string;
    name: string;
    status: string;
    assignedOwner: string;
    tags: string[];
    notes: string;
    lastActivityDate?: Timestamp | Date;
    activityLog?: ActivityLogEntry[];
    // Patient specific
    lastName?: string;
    email?: string;
    phone?: string;
    dob?: string;
    leadSource?: string;
    insuranceInfo?: string;
    // Facility specific
    facilityType?: string;
    primaryContactName?: string;
    primaryContactTitle?: string;
    address?: string;
    stateLicenseNumber?: string;
    npi?: string;
    contractedServices?: string;
    // Vendor specific
    vendorCategory?: string;
    websiteUrl?: string;
    contractStartDate?: string;
    contractEndDate?: string;
    geographicServiceRegion?: string;
    licenseOrApiKey?: string;
    integrationName?: string;
    // Campaign specific
    campaignType?: string;
    targetAudienceSegment?: string;
    startDate?: string;
    endDate?: string;
    budget?: string;
    actualSpend?: string;
    leadsGenerated?: string;
    conversions?: string;
    clickThroughRate?: string;
    // Grant specific
    fundingOrg?: string;
    grantType?: string;
    awardAmount?: string;
    deadline?: string;
    assignedLead?: string;
    supportingMembers?: string;
    funderUrl?: string;
    loiDeadline?: string;
    fullAppDeadline?: string;
    awardNotificationDate?: string;
    checklist?: Record<string, boolean>;
    [key: string]: any;
}

const DEFAULT_RECORD: CrmEntity = {
    name: '',
    status: '',
    assignedOwner: '',
    tags: [],
    notes: ''
};

export default function CrmEntityDetailClient({ entityType, id }: { entityType: string, id: string }) {
    const router = useRouter();
    const isNew = id === 'new';
    
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [originalData, setOriginalData] = useState<CrmEntity | null>(null);
    const [formData, setFormData] = useState<CrmEntity>(DEFAULT_RECORD);
    const [tagInput, setTagInput] = useState('');
    const [noteInput, setNoteInput] = useState('');
    const [showCredentials, setShowCredentials] = useState(false);

    const config = ENTITY_CONFIG[entityType as keyof typeof ENTITY_CONFIG] || ENTITY_CONFIG.patients;
    const Icon = config.icon;
    const stages = PIPELINE_STAGES[entityType] || ['Active', 'Pending', 'Archived'];

    useEffect(() => {
        if (isNew) {
            setFormData(prev => ({ ...prev, status: stages[0] }));
            return;
        }

        async function fetchRecord() {
            try {
                const docRef = doc(db, 'crm', 'data', entityType, id);
                const snapshot = await getDoc(docRef);
                if (snapshot.exists()) {
                    const data = { id: snapshot.id, ...snapshot.data() } as CrmEntity;
                    setFormData(data);
                    setOriginalData(data);
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

    const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement> | React.MouseEvent<HTMLButtonElement>, presetTag?: string) => {
        const tagToAdd = presetTag || tagInput.trim();
        
        if (((e as React.KeyboardEvent).key === 'Enter' || e.type === 'click') && tagToAdd !== '') {
            if ('preventDefault' in e) e.preventDefault();
            
            if (!formData.tags?.includes(tagToAdd)) {
                setFormData(prev => ({ ...prev, tags: [...(prev.tags || []), tagToAdd] }));
            }
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        setFormData(prev => ({ ...prev, tags: (prev.tags || []).filter(t => t !== tagToRemove) }));
    };

    const toggleChecklist = (itemKey: string) => {
        setFormData(prev => ({
            ...prev,
            checklist: {
                ...(prev.checklist || {}),
                [itemKey]: !prev.checklist?.[itemKey]
            }
        }));
    };

    const handleAddNote = async () => {
        if (!noteInput.trim() || isNew) return;
        
        try {
            const docRef = doc(db, 'crm', 'data', entityType, id);
            const currentUser = auth.currentUser;
            const author = currentUser?.displayName || currentUser?.email || 'Unknown User';
            
            const activityEntry = {
                action: 'Note Added',
                details: noteInput.trim(),
                author,
                timestamp: Timestamp.now()
            };

            await setDoc(docRef, {
                activityLog: arrayUnion(activityEntry),
                lastActivityDate: serverTimestamp()
            }, { merge: true });

            setFormData(prev => ({ 
                ...prev, 
                activityLog: [...(prev.activityLog || []), activityEntry] 
            }));
            setNoteInput('');
            toast.success('Note added');
        } catch (error) {
            toast.error('Failed to add note');
        }
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            toast.error(entityType === 'patients' ? 'First Name is required' : 'Name is required');
            return;
        }

        setSaving(true);
        try {
            const collectionRef = collection(db, 'crm', 'data', entityType);
            const currentUser = auth.currentUser;
            const author = currentUser?.displayName || currentUser?.email || 'Unknown User';
            
            const payload: any = {
                ...formData,
                lastActivityDate: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            const changes: string[] = [];
            if (!isNew && originalData) {
                if (originalData.status !== formData.status) changes.push(`Status changed to ${formData.status}`);
                if (originalData.assignedOwner !== formData.assignedOwner) changes.push(`Owner changed to ${formData.assignedOwner || 'Unassigned'}`);
            }

            if (isNew) {
                payload.createdAt = serverTimestamp() as Timestamp;
                payload.activityLog = [{
                    action: 'Record Created',
                    details: 'Initial creation',
                    author,
                    timestamp: Timestamp.now()
                }];
                await addDoc(collectionRef, payload);
                toast.success(`${config.title} created successfully!`);
            } else {
                if (changes.length > 0) {
                    payload.activityLog = arrayUnion({
                        action: 'Record Updated',
                        details: changes.join(', '),
                        author,
                        timestamp: Timestamp.now()
                    });
                }
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
                        className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-900/50 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-100 dark:border-slate-700 shrink-0"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border border-slate-100 dark:border-slate-700 shadow-sm shrink-0 ${config.bg}`}>
                        <Icon className={`w-7 h-7 ${config.color}`} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
                            {isNew ? 'New Record' : `Editing ${config.title}`}
                        </p>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight truncate">
                            {entityType === 'patients' && formData.lastName 
                                ? `${formData.name} ${formData.lastName}` 
                                : (formData.name || `New ${config.title}`)}
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

            {/* Campaign Summary Card */}
            {entityType === 'campaigns' && !isNew && (
                <div className="bg-slate-800 dark:bg-slate-900 p-8 rounded-[32px] text-white shadow-lg overflow-hidden relative">
                    <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl -mr-10 -mt-20"></div>
                    <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
                        <div>
                            <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">Campaign Performance</p>
                            <h3 className="text-2xl font-black tracking-tight">{formData.name}</h3>
                            <div className="flex items-center gap-3 mt-3">
                                <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg ${formData.status === 'Active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-700 text-slate-300'}`}>
                                    {formData.status || 'Draft'}
                                </span>
                                <span className="text-slate-400 text-sm font-semibold">{formData.campaignType || 'Unknown Type'}</span>
                            </div>
                        </div>
                        <div className="flex gap-8">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 flex items-center gap-1.5"><Users className="w-3.5 h-3.5"/> Leads</p>
                                <p className="text-3xl font-black">{formData.leadsGenerated || '0'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 flex items-center gap-1.5"><Target className="w-3.5 h-3.5"/> Conversions</p>
                                <p className="text-3xl font-black text-emerald-400">{formData.conversions || '0'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5"/> CTR</p>
                                <p className="text-3xl font-black text-sky-400">{formData.clickThroughRate || '0'}%</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column: Form Fields */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm p-8 space-y-8">
                        
                        <div className="border-b border-slate-100 dark:border-slate-700/50 pb-4">
                            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                                <Database className="w-5 h-5 text-slate-400" />
                                Core Information
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            
                            {/* Entity Specific Modifiers */}
                            {entityType === 'patients' ? (
                                <>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">First Name <span className="text-rose-500">*</span></label>
                                        <input name="name" value={formData.name} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Last Name</label>
                                        <input name="lastName" value={formData.lastName || ''} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Date of Birth</label>
                                        <input type="date" name="dob" value={formData.dob || ''} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Lead Source</label>
                                        <input name="leadSource" value={formData.leadSource || ''} onChange={handleChange} placeholder="e.g. Google Ads, Referral" className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Email Address</label>
                                        <input type="email" name="email" value={formData.email || ''} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Phone Number</label>
                                        <input type="tel" name="phone" value={formData.phone || ''} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none" />
                                    </div>
                                    <div className="space-y-3 md:col-span-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Insurance Information</label>
                                        <input name="insuranceInfo" value={formData.insuranceInfo || ''} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none" />
                                    </div>
                                </>
                            ) : entityType === 'facilities' ? (
                                <>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Organization Name <span className="text-rose-500">*</span></label>
                                        <input name="name" value={formData.name} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Facility Type</label>
                                        <select name="facilityType" value={formData.facilityType || ''} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none appearance-none cursor-pointer">
                                            <option value="">Select Type...</option>
                                            <option value="Urgent Care">Urgent Care</option>
                                            <option value="Hospital">Hospital</option>
                                            <option value="FQHC">FQHC</option>
                                            <option value="Specialty Clinic">Specialty Clinic</option>
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Primary Contact Name</label>
                                        <input name="primaryContactName" value={formData.primaryContactName || ''} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Primary Contact Title</label>
                                        <input name="primaryContactTitle" value={formData.primaryContactTitle || ''} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Email Address</label>
                                        <input type="email" name="email" value={formData.email || ''} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Phone Number</label>
                                        <input type="tel" name="phone" value={formData.phone || ''} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none" />
                                    </div>
                                    <div className="space-y-3 md:col-span-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Facility Address</label>
                                        <input name="address" value={formData.address || ''} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">State License Number</label>
                                        <input name="stateLicenseNumber" value={formData.stateLicenseNumber || ''} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">NPI Number</label>
                                        <input name="npi" value={formData.npi || ''} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none" />
                                    </div>
                                    <div className="space-y-3 md:col-span-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Contracted Services</label>
                                        <input name="contractedServices" value={formData.contractedServices || ''} onChange={handleChange} placeholder="e.g. Telehealth Coverage, Locum Tenens" className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none" />
                                    </div>
                                </>
                            ) : entityType === 'vendors' ? (
                                <>
                                    <div className="space-y-3 md:col-span-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Vendor Name <span className="text-rose-500">*</span></label>
                                        <input name="name" value={formData.name} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Vendor Category</label>
                                        <select name="vendorCategory" value={formData.vendorCategory || ''} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none appearance-none cursor-pointer">
                                            <option value="">Select Category...</option>
                                            <option value="Pharmacy">Pharmacy</option>
                                            <option value="Merchandise Supplier">Merchandise Supplier</option>
                                            <option value="Technology Partner">Technology Partner</option>
                                            <option value="Integration">Integration</option>
                                            <option value="General Supplier">General Supplier</option>
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Website URL</label>
                                        <input name="websiteUrl" value={formData.websiteUrl || ''} onChange={handleChange} placeholder="https://..." className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Primary Contact Name</label>
                                        <input name="primaryContactName" value={formData.primaryContactName || ''} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Geographic Service Region</label>
                                        <input name="geographicServiceRegion" value={formData.geographicServiceRegion || ''} onChange={handleChange} placeholder="e.g. Nationwide, TX, FL" className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Email Address</label>
                                        <input type="email" name="email" value={formData.email || ''} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Phone Number</label>
                                        <input type="tel" name="phone" value={formData.phone || ''} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Contract Start Date</label>
                                        <input type="date" name="contractStartDate" value={formData.contractStartDate || ''} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Contract End Date</label>
                                        <input type="date" name="contractEndDate" value={formData.contractEndDate || ''} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none" />
                                    </div>
                                </>
                            ) : entityType === 'campaigns' ? (
                                <>
                                    <div className="space-y-3 md:col-span-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Campaign Name <span className="text-rose-500">*</span></label>
                                        <input name="name" value={formData.name} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Campaign Type</label>
                                        <select name="campaignType" value={formData.campaignType || ''} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none appearance-none cursor-pointer">
                                            <option value="">Select Type...</option>
                                            <option value="Email">Email</option>
                                            <option value="SMS">SMS</option>
                                            <option value="Social Media">Social Media</option>
                                            <option value="Paid Ad">Paid Ad</option>
                                            <option value="Event">Event</option>
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Target Audience Segment</label>
                                        <select name="targetAudienceSegment" value={formData.targetAudienceSegment || ''} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none appearance-none cursor-pointer">
                                            <option value="">Select Audience...</option>
                                            <option value="Patient Leads">Patient Leads</option>
                                            <option value="Facility Prospects">Facility Prospects</option>
                                            <option value="General">General</option>
                                            <option value="Current Patients">Current Patients</option>
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Start Date</label>
                                        <input type="date" name="startDate" value={formData.startDate || ''} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">End Date</label>
                                        <input type="date" name="endDate" value={formData.endDate || ''} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Goal Budget ($)</label>
                                        <input type="number" name="budget" value={formData.budget || ''} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Actual Spend ($)</label>
                                        <input type="number" name="actualSpend" value={formData.actualSpend || ''} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Leads Generated</label>
                                        <input type="number" name="leadsGenerated" value={formData.leadsGenerated || ''} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Conversions</label>
                                        <input type="number" name="conversions" value={formData.conversions || ''} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Click-Through Rate (%)</label>
                                        <input type="number" name="clickThroughRate" value={formData.clickThroughRate || ''} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none" />
                                    </div>
                                </>
                            ) : entityType === 'grants' ? (
                                <>
                                    <div className="space-y-3 md:col-span-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Grant Name <span className="text-rose-500">*</span></label>
                                        <input name="name" value={formData.name} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Funding Organization</label>
                                        <input name="fundingOrg" value={formData.fundingOrg || ''} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Grant Type</label>
                                        <select name="grantType" value={formData.grantType || ''} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none appearance-none cursor-pointer">
                                            <option value="">Select Type...</option>
                                            <option value="Federal">Federal</option>
                                            <option value="State">State</option>
                                            <option value="Private Foundation">Private Foundation</option>
                                            <option value="SBIR">SBIR</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Total Award Amount ($)</label>
                                        <input type="number" name="awardAmount" value={formData.awardAmount || ''} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Application Deadline</label>
                                        <input type="date" name="deadline" value={formData.deadline || ''} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Assigned Lead</label>
                                        <input name="assignedLead" value={formData.assignedLead || ''} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Supporting Members</label>
                                        <input name="supportingMembers" value={formData.supportingMembers || ''} onChange={handleChange} placeholder="e.g. John D, Jane S" className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none" />
                                    </div>
                                    <div className="space-y-3 md:col-span-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Funder Website/Portal Link</label>
                                        <input name="funderUrl" value={formData.funderUrl || ''} onChange={handleChange} placeholder="https://..." className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none" />
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-3 md:col-span-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{config.title} Name <span className="text-rose-500">*</span></label>
                                    <input name="name" value={formData.name} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none" placeholder={`Enter name...`} />
                                </div>
                            )}

                            {/* Core Stage, Assignment & Tags */}
                            <div className="col-span-full border-t border-slate-100 dark:border-slate-700/50 pt-8 mt-4 grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Pipeline Stage</label>
                                    <select 
                                        name="status"
                                        value={formData.status}
                                        onChange={handleChange}
                                        className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none appearance-none cursor-pointer"
                                    >
                                        {stages.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Assigned Provider/Owner</label>
                                    <input 
                                        name="assignedOwner"
                                        value={formData.assignedOwner}
                                        onChange={handleChange}
                                        className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none"
                                    />
                                </div>

                                {/* Tags */}
                                <div className="space-y-3 md:col-span-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center justify-between">
                                        <span>Tags (Press Enter to Add)</span>
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
                                            className="flex-1 min-w-[120px] bg-transparent border-none p-0 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-0 focus:outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                            placeholder={(!formData.tags || formData.tags.length === 0) ? "Type a tag..." : ""}
                                        />
                                    </div>
                                    {entityType === 'patients' && (
                                        <div className="flex gap-2 flex-wrap mt-2">
                                            {['GLP-1', 'Testosterone', 'Hair Growth', 'Pediatrics', 'Mental Health'].map(t => (
                                                <button 
                                                    key={t}
                                                    type="button"
                                                    onClick={(e) => handleAddTag(e, t)}
                                                    className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/50 px-2 py-1 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-800/50 transition-colors"
                                                >
                                                    + {t}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Grant Timeline & Checklist Tab */}
                    {entityType === 'grants' && (
                        <div className="bg-white dark:bg-slate-800 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm p-8 space-y-8">
                            <div className="border-b border-slate-100 dark:border-slate-700/50 pb-4">
                                <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                                    <Target className="w-5 h-5 text-rose-500" />
                                    Grant Milestones & Requirements
                                </h3>
                            </div>
                            
                            {/* Horizontal Progress Stepper */}
                            <div className="py-6 overflow-x-auto">
                                <div className="min-w-[500px] flex items-center justify-between relative px-8">
                                    {/* Connecting Line */}
                                    <div className="absolute left-10 right-10 top-5 h-1 bg-slate-100 dark:bg-slate-700 -z-10"></div>
                                    
                                    {[ 
                                        { label: 'LOI Deadline', field: 'loiDeadline', icon: Flag },
                                        { label: 'Full Application', field: 'fullAppDeadline', icon: Calendar },
                                        { label: 'Award Notification', field: 'awardNotificationDate', icon: Trophy }
                                    ].map((step, idx) => {
                                        const dateVal = formData[step.field];
                                        const hasDate = !!dateVal;
                                        const IconComp = step.icon;
                                        
                                        return (
                                            <div key={idx} className="flex flex-col items-center gap-2 bg-white dark:bg-slate-800 px-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-800 ${hasDate ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'}`}>
                                                    <IconComp className="w-4 h-4" />
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{step.label}</p>
                                                    <input 
                                                        type="date" 
                                                        value={dateVal || ''} 
                                                        onChange={(e) => setFormData(prev => ({...prev, [step.field]: e.target.value}))}
                                                        className="text-xs font-bold text-slate-800 dark:text-slate-100 bg-transparent border-none outline-none text-center p-0 mt-1 focus:ring-0" 
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            
                            {/* Document Checklist */}
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Required Documents Checklist</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {['Project Narrative', 'Budget Justification', 'Letter of Support', 'Biosketches', 'Facilities Profile', 'Financial Disclosures'].map(doc => {
                                        const isChecked = formData.checklist?.[doc] || false;
                                        return (
                                            <button 
                                                key={doc}
                                                onClick={() => toggleChecklist(doc)}
                                                className={`flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${isChecked ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-900/20 dark:border-rose-800/50 dark:text-rose-300' : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100 dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800'}`}
                                            >
                                                {isChecked ? <CheckSquare className="w-5 h-5 text-rose-500" /> : <Square className="w-5 h-5 text-slate-400" />}
                                                <span className="text-sm font-bold">{doc}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Vendor Credentials Tab */}
                    {entityType === 'vendors' && (
                        <div className="bg-white dark:bg-slate-800 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm p-8 space-y-8">
                            <div className="border-b border-slate-100 dark:border-slate-700/50 pb-4">
                                <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-emerald-500" />
                                    Vendor Credentials
                                </h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Integration System Name</label>
                                    <select name="integrationName" value={formData.integrationName || ''} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none appearance-none cursor-pointer">
                                        <option value="">None / Custom</option>
                                        <option value="DoseSpot">DoseSpot</option>
                                        <option value="Doxy.me">Doxy.me</option>
                                        <option value="Stripe">Stripe</option>
                                        <option value="SendGrid">SendGrid</option>
                                        <option value="Twilio">Twilio</option>
                                    </select>
                                </div>
                                <div className="space-y-3 md:col-span-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">License or API Key</label>
                                    <div className="relative">
                                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input 
                                            name="licenseOrApiKey" 
                                            type={showCredentials ? "text" : "password"}
                                            value={formData.licenseOrApiKey || ''} 
                                            onChange={handleChange} 
                                            placeholder="Enter secure key..."
                                            className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl py-4 pl-12 pr-12 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:outline-none" 
                                        />
                                        <button 
                                            type="button" 
                                            onClick={() => setShowCredentials(!showCredentials)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                        >
                                            {showCredentials ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1 pl-1">Keys are visually masked by default to prevent shoulder-surfing.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Activity Log */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm p-6 lg:p-8 flex flex-col h-[500px]">
                        
                        <div className="border-b border-slate-100 dark:border-slate-700/50 pb-4 mb-6 shrink-0">
                            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                                <Activity className="w-5 h-5 text-slate-400" />
                                Activity Log
                            </h3>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-6 scrollbar-thin">
                            {(!formData.activityLog || formData.activityLog.length === 0) ? (
                                <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-50">
                                    <Clock className="w-8 h-8 text-slate-400" />
                                    <p className="text-sm font-bold text-slate-500">No activity recorded yet</p>
                                </div>
                            ) : (
                                [...formData.activityLog].reverse().map((log, i) => (
                                    <div key={i} className="relative pl-6 border-l-2 border-slate-100 dark:border-slate-700 pb-2">
                                        <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-sky-500 ring-4 ring-white dark:ring-slate-800"></div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                            {log.timestamp && 'toDate' in log.timestamp 
                                                ? format(log.timestamp.toDate(), 'MMM d, h:mm a') 
                                                : 'Just now'} • {log.author}
                                        </p>
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{log.action}</p>
                                        {log.details && (
                                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                                {log.details}
                                            </p>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {!isNew && (
                            <div className="mt-6 shrink-0 space-y-3 pt-6 border-t border-slate-100 dark:border-slate-700/50">
                                <textarea 
                                    value={noteInput}
                                    onChange={e => setNoteInput(e.target.value)}
                                    placeholder="Add a new note..."
                                    rows={2}
                                    className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-3 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 focus:outline-none"
                                />
                                <button 
                                    onClick={handleAddNote}
                                    disabled={!noteInput.trim()}
                                    className="w-full bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white py-2.5 outline-none rounded-xl font-black uppercase tracking-widest text-[10px] transition-colors"
                                >
                                    Log Note
                                </button>
                            </div>
                        )}
                        {isNew && (
                            <div className="mt-6 shrink-0 pt-6 border-t border-slate-100 dark:border-slate-700/50 text-center">
                                <p className="text-xs font-semibold text-slate-400">Save the record to add notes.</p>
                            </div>
                        )}

                    </div>
                </div>

            </div>
        </div>
    );
}
