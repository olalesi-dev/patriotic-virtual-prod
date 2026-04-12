"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Camera, User, Phone, MapPin, Calendar, Shield, FileText, Activity, Edit3, Save, X, Loader2, CheckCircle2, Award, Building, Stethoscope, ExternalLink, Info, RefreshCw, AlertCircle } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import Link from 'next/link';
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from 'sonner';
import { DoseSpotFrame } from '@/components/telehealth/DoseSpotFrame';
import { AITextarea } from '@/components/ui/AITextarea';
import { syncDoseSpotClinician } from '@/lib/dosespot-clinician-sync';
import {
    DOSESPOT_CLINICIAN_SPECIALTIES,
    DOSESPOT_PDMP_ROLE_TYPES,
    DOSESPOT_PHONE_TYPES,
    buildAdminUserProfileFields,
    formatDoseSpotEnumLabel,
    normalizeDoseSpotPdmpRoleType,
    type AdminUpdateUserInput
} from '@/lib/dosespot-clinician-profile';

interface ProfileData {
    prefix: string;
    firstName: string;
    middleName: string;
    lastName: string;
    suffix: string;
    dateOfBirth: string;
    gender: string;
    phone: string;
    primaryPhoneType: string;
    primaryFax: string;
    address: string;
    address2: string;
    city: string;
    state: string;
    zip: string;
    specialty: string;
    pdmpRoleType: string;
    epcsRequested: boolean;
    active: boolean;
    npi: string;
    deaNumber: string;
    stateLicenseNumber: string;
    stateLicenseState: string;
    clinicName: string;
    clinicPhone: string;
    clinicFax: string;
    medicalSchool: string;
    residency: string;
    doseSpotClinicianId: string;
    photoURL: string;
    aboutMe: string;
    languagesSpoken: string;
    complianceDocs: { id: string; name: string; type: string; url: string; expiryDate: string; }[];
}

const EMPTY: ProfileData = {
    prefix: '', firstName: '', middleName: '', lastName: '', suffix: '',
    dateOfBirth: '', gender: '', phone: '', primaryPhoneType: 'Work', primaryFax: '',
    address: '', address2: '', city: '', state: '', zip: '',
    specialty: '', pdmpRoleType: '', epcsRequested: true, active: true,
    npi: '', deaNumber: '', stateLicenseNumber: '', stateLicenseState: '',
    clinicName: '', clinicPhone: '', clinicFax: '',
    medicalSchool: '', residency: '', doseSpotClinicianId: '', photoURL: '',
    aboutMe: '', languagesSpoken: '', complianceDocs: [],
};

export default function ProviderProfilePage() {
    const userProfile = useUserProfile();
    const [data, setData] = useState<ProfileData>(EMPTY);
    const [doseSpotStatus, setDoseSpotStatus] = useState({
        synced: false,
        registrationStatus: null as string | null,
        lastSyncError: null as string | null
    });
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [syncingDoseSpot, setSyncingDoseSpot] = useState(false);
    const [activeTab, setActiveTab] = useState<'personal' | 'professional' | 'practice' | 'compliance' | 'erx'>('personal');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!userProfile.uid) return;
        const loadProfile = async () => {
            try {
                const snap = await getDoc(doc(db, 'users', userProfile.uid));
                if (snap.exists()) {
                    const d = snap.data();
                    setData({
                        prefix: d.prefix || '',
                        firstName: d.firstName || userProfile.displayName.split(' ')[0] || '',
                        middleName: d.middleName || '',
                        lastName: d.lastName || userProfile.displayName.split(' ')[1] || '',
                        suffix: d.suffix || '',
                        dateOfBirth: d.dateOfBirth || '',
                        gender: d.gender || '',
                        phone: d.phone || '',
                        primaryPhoneType: d.primaryPhoneType || 'Work',
                        primaryFax: d.primaryFax || d.clinicFax || '',
                        address: d.address1 || d.address || '',
                        address2: d.address2 || '',
                        city: d.city || '',
                        state: d.state || '',
                        zip: d.zipCode || d.zip || '',
                        specialty: d.clinicianSpecialtyType || d.specialty || '',
                        pdmpRoleType: normalizeDoseSpotPdmpRoleType(typeof d.pdmpRoleType === 'string' ? d.pdmpRoleType : ''),
                        epcsRequested: d.epcsRequested !== false,
                        active: d.active !== false && d.status !== 'disabled',
                        npi: d.npiNumber || d.npi || '',
                        deaNumber: d.deaNumber || '',
                        stateLicenseNumber: d.stateLicenseNumber || '',
                        stateLicenseState: d.stateLicenseState || '',
                        clinicName: d.clinicName || '',
                        clinicPhone: d.clinicPhone || '',
                        clinicFax: d.clinicFax || '',
                        medicalSchool: d.medicalSchool || '',
                        residency: d.residency || '',
                        doseSpotClinicianId: d.doseSpotClinicianId?.toString() || '',
                        photoURL: d.photoURL || userProfile.photoURL || '',
                        aboutMe: d.aboutMe || '',
                        languagesSpoken: d.languagesSpoken || '',
                        complianceDocs: d.complianceDocs || [],
                    });
                    setDoseSpotStatus({
                        synced: d.doseSpot?.synced === true,
                        registrationStatus: typeof d.doseSpot?.registrationStatus === 'string' ? d.doseSpot.registrationStatus : null,
                        lastSyncError: typeof d.doseSpot?.lastSyncError === 'string' ? d.doseSpot.lastSyncError : null
                    });
                } else {
                    setData(prev => ({
                        ...prev,
                        firstName: userProfile.displayName.split(' ')[0] || '',
                        lastName: userProfile.displayName.split(' ')[1] || '',
                        photoURL: userProfile.photoURL || '',
                    }));
                }
            } catch (e) { console.error(e); }
        };
        loadProfile();
    }, [userProfile.uid]);

    const handlePhotoUpload = async (file: File) => {
        if (!auth.currentUser) return;
        setUploading(true);
        setUploadProgress(0);
        try {
            const storage = getStorage();
            const fileRef = storageRef(storage, `profile-photos/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
            const task = uploadBytesResumable(fileRef, file);
            task.on('state_changed',
                (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
                (err) => { toast.error('Upload failed'); setUploading(false); },
                async () => {
                    const url = await getDownloadURL(task.snapshot.ref);
                    setData(prev => ({ ...prev, photoURL: url }));
                    await updateProfile(auth.currentUser!, { photoURL: url });
                    await updateDoc(doc(db, 'users', auth.currentUser!.uid), { photoURL: url, updatedAt: serverTimestamp() });
                    setUploading(false);
                    toast.success('Profile photo updated!');
                }
            );
        } catch (e) {
            toast.error('Upload failed');
            setUploading(false);
        }
    };

    const handleSave = async () => {
        if (!auth.currentUser) return;
        setSaving(true);
        try {
            const fullName = `${data.firstName} ${data.lastName}`.trim();
            const sanitizePhone = (value: string) => value.replace(/\D/g, '');
            const adminShape: AdminUpdateUserInput = {
                firstName: data.firstName,
                lastName: data.lastName,
                email: userProfile.email,
                phone: sanitizePhone(data.phone),
                dob: data.dateOfBirth,
                sex: data.gender as AdminUpdateUserInput['sex'],
                role: 'provider',
                prefix: data.prefix,
                middleName: data.middleName,
                suffix: data.suffix,
                address1: data.address,
                address2: data.address2,
                city: data.city,
                state: data.state,
                zipCode: data.zip,
                primaryPhoneType: (DOSESPOT_PHONE_TYPES as readonly string[]).includes(data.primaryPhoneType)
                    ? data.primaryPhoneType as AdminUpdateUserInput['primaryPhoneType']
                    : 'Work',
                primaryFax: sanitizePhone(data.primaryFax),
                npiNumber: data.npi,
                deaNumber: data.deaNumber,
                stateLicenseNumber: data.stateLicenseNumber,
                stateLicenseState: data.stateLicenseState,
                clinicianSpecialtyType: (DOSESPOT_CLINICIAN_SPECIALTIES as readonly string[]).includes(data.specialty)
                    ? data.specialty as AdminUpdateUserInput['clinicianSpecialtyType']
                    : '',
                pdmpRoleType: (DOSESPOT_PDMP_ROLE_TYPES as readonly string[]).includes(normalizeDoseSpotPdmpRoleType(data.pdmpRoleType))
                    ? normalizeDoseSpotPdmpRoleType(data.pdmpRoleType) as AdminUpdateUserInput['pdmpRoleType']
                    : '',
                epcsRequested: data.epcsRequested,
                active: data.active
            };
            const providerProfile = buildAdminUserProfileFields(adminShape, {
                uid: auth.currentUser.uid,
                existingDoseSpot: doseSpotStatus
            });
            const clinicianId = data.doseSpotClinicianId.trim();
            const normalizedClinicianId = clinicianId.length > 0 && /^\d+$/.test(clinicianId)
                ? Number(clinicianId)
                : clinicianId || null;
            const profilePayload = {
                ...providerProfile,
                dateOfBirth: data.dateOfBirth,
                gender: data.gender,
                aboutMe: data.aboutMe,
                languagesSpoken: data.languagesSpoken,
                clinicName: data.clinicName,
                clinicPhone: sanitizePhone(data.clinicPhone),
                clinicFax: sanitizePhone(data.clinicFax),
                medicalSchool: data.medicalSchool,
                residency: data.residency,
                complianceDocs: data.complianceDocs,
                photoURL: data.photoURL,
                doseSpotClinicianId: normalizedClinicianId,
                updatedAt: serverTimestamp(),
            };

            await Promise.all([
                setDoc(doc(db, 'users', auth.currentUser.uid), profilePayload, { merge: true }),
                setDoc(doc(db, 'patients', auth.currentUser.uid), profilePayload, { merge: true })
            ]);

            if (fullName) await updateProfile(auth.currentUser, { displayName: fullName });
            setEditing(false);
            toast.success('Provider profile saved!');
        } catch (e) {
            toast.error('Failed to save profile');
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const handleDoseSpotSync = async () => {
        if (!auth.currentUser) {
            toast.error('Please sign in again before syncing DoseSpot.');
            return;
        }

        setSyncingDoseSpot(true);
        try {
            const result = await syncDoseSpotClinician(auth.currentUser);
            const syncErrorMessage = result.synced
                ? null
                : (result.missingFields.length > 0
                    ? `Missing DoseSpot fields: ${result.missingFields.join(', ')}`
                    : result.message);
            setData((prev) => ({
                ...prev,
                doseSpotClinicianId: result.clinicianId ? String(result.clinicianId) : prev.doseSpotClinicianId
            }));
            setDoseSpotStatus({
                synced: result.synced,
                registrationStatus: result.registrationStatus,
                lastSyncError: syncErrorMessage
            });

            if (result.synced) {
                toast.success(result.message);
            } else {
                toast.error(syncErrorMessage ?? result.message);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'DoseSpot sync failed.';
            setDoseSpotStatus((prev) => ({ ...prev, lastSyncError: message }));
            toast.error(message);
        } finally {
            setSyncingDoseSpot(false);
        }
    };

    const handleDocUpload = async (file: File) => {
        if (!auth.currentUser) return;
        setUploading(true);
        try {
            const storage = getStorage();
            const fileRef = storageRef(storage, `compliance/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
            const task = uploadBytesResumable(fileRef, file);
            task.on('state_changed', null, 
                (err) => { toast.error('Upload failed'); setUploading(false); },
                async () => {
                    const url = await getDownloadURL(task.snapshot.ref);
                    const newDoc = {
                        id: Date.now().toString(),
                        name: file.name,
                        type: 'Certificate/License',
                        url,
                        expiryDate: ''
                    };
                    const newDocs = [...data.complianceDocs, newDoc];
                    setData(p => ({ ...p, complianceDocs: newDocs }));
                    await updateDoc(doc(db, 'users', auth.currentUser!.uid), { complianceDocs: newDocs, updatedAt: serverTimestamp() });
                    setUploading(false);
                    toast.success('Document uploaded!');
                }
            );
        } catch (e) {
            toast.error('Upload failed');
            setUploading(false);
        }
    };

    const handleRemoveDoc = async (docId: string) => {
        if (!auth.currentUser) return;
        try {
            const newDocs = data.complianceDocs.filter(d => d.id !== docId);
            setData(p => ({ ...p, complianceDocs: newDocs }));
            await updateDoc(doc(db, 'users', auth.currentUser.uid), { complianceDocs: newDocs, updatedAt: serverTimestamp() });
            toast.success('Document removed');
        } catch (e) {
            toast.error('Failed to remove document');
        }
    };

    const handleUpdateDocExpiry = async (docId: string, expiryDate: string, docName: string) => {
        const newDocs = data.complianceDocs.map(d => d.id === docId ? { ...d, expiryDate, name: docName } : d);
        setData(p => ({ ...p, complianceDocs: newDocs }));
        // Only save to DB if not currently in global 'editing' mode, to allow batch saving, 
        // but wait, we want instant save for docs or part of form? Let's just update local state, 
        // user has to click "Save Changes" to commit if we don't auto-save.
        // Actually, let's auto-save doc metadata.
        if (!editing) {
             await updateDoc(doc(db, 'users', auth.currentUser!.uid), { complianceDocs: newDocs, updatedAt: serverTimestamp() });
             toast.success('Document details updated');
        }
    };

    const field = (label: string, key: keyof ProfileData, type = 'text', options?: string[]) => (
        <div className="space-y-1.5" key={key}>
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</label>
            {editing ? (
                options ? (
                    <select
                        value={data[key] as string}
                        onChange={e => setData(p => ({ ...p, [key]: e.target.value }))}
                        className="w-full border border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded-xl p-3 text-sm font-semibold text-slate-800 dark:text-slate-100 dark:text-slate-100 focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9] outline-none bg-white dark:bg-slate-800 dark:bg-slate-800"
                    >
                        <option value="">Select...</option>
                        {options.map(o => <option key={o} value={o}>{formatDoseSpotEnumLabel(o)}</option>)}
                    </select>
                ) : (
                    <input
                        type={type}
                        value={data[key] as string}
                        onChange={e => setData(p => ({ ...p, [key]: e.target.value }))}
                        className="w-full border border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded-xl p-3 text-sm font-semibold text-slate-800 dark:text-slate-100 dark:text-slate-100 focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9] outline-none bg-white dark:bg-slate-800 dark:bg-slate-800"
                    />
                )
            ) : (
                <p className={`text-sm font-bold py-2 px-1 ${data[key] ? 'text-slate-800 dark:text-slate-100' : 'text-slate-300 dark:text-slate-600 italic'}`}>
                    {((options && typeof data[key] === 'string' && data[key])
                        ? formatDoseSpotEnumLabel(data[key] as string)
                        : data[key] as string) || 'Not provided'}
                </p>
            )}
        </div>
    );

    const toggleField = (label: string, key: keyof Pick<ProfileData, 'epcsRequested' | 'active'>, helpText?: string) => (
        <div className="space-y-2" key={key}>
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</label>
            {editing ? (
                <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                    <span>{helpText ?? label}</span>
                    <input
                        type="checkbox"
                        checked={data[key]}
                        onChange={(event) => setData((prev) => ({ ...prev, [key]: event.target.checked }))}
                        className="h-4 w-4 rounded border-slate-300 text-[#0EA5E9] focus:ring-[#0EA5E9]"
                    />
                </label>
            ) : (
                <p className="text-sm font-bold py-2 px-1 text-slate-800 dark:text-slate-100">
                    {data[key] ? 'Enabled' : 'Disabled'}
                </p>
            )}
        </div>
    );

    const textareaField = (label: string, key: keyof ProfileData) => (
        <div className="space-y-1.5 md:col-span-2" key={key}>
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</label>
            {editing ? (
                <AITextarea
                    rows={4}
                    value={data[key] as string}
                    onValueChange={(val) => setData(p => ({ ...p, [key]: val }))}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9] outline-none bg-white dark:bg-slate-800 resize-y"
                    placeholder="Enter details here..."
                />
            ) : (
                <p className={`text-sm font-bold py-2 px-1 whitespace-pre-wrap ${data[key] ? 'text-slate-800 dark:text-slate-100' : 'text-slate-300 dark:text-slate-600 italic'}`}>
                    {(data[key] as string) || 'Not provided'}
                </p>
            )}
        </div>
    );

    const completionFields: (keyof ProfileData)[] = ['firstName', 'lastName', 'dateOfBirth', 'phone', 'address', 'city', 'state', 'zip', 'primaryFax', 'npi'];
    const completed = completionFields.filter(f => data[f]).length;
    const completionPct = Math.round((completed / completionFields.length) * 100);

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 dark:text-slate-100 tracking-tight italic uppercase">Provider Profile</h1>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-1">Manage your clinical credentials</p>
                </div>
                {!editing ? (
                    <button
                        onClick={() => setEditing(true)}
                        className="flex items-center gap-2 bg-[#0EA5E9] text-white px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-sky-100 dark:shadow-none hover:bg-sky-500 transition-all"
                    >
                        <Edit3 className="w-4 h-4" /> Edit Profile
                    </button>
                ) : (
                    <div className="flex gap-2">
                        <button onClick={() => setEditing(false)} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                            <X className="w-4 h-4" /> Cancel
                        </button>
                        <button onClick={handleSave} disabled={saving}
                            className="flex items-center gap-2 bg-[#0EA5E9] text-white px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-sky-100 dark:shadow-none hover:bg-sky-500 transition-all disabled:opacity-50">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                )}
            </div>

            {/* Profile Hero Card */}
            <div className="bg-white dark:bg-slate-800 dark:bg-slate-800 rounded-[32px] border border-slate-100 dark:border-slate-700 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="h-28 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 relative">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDB2LTJoMzZ6bTAtNHYtMkgwdi0yaDB2Mmgzdn0iLz48L2c+PC9nPjwvc3ZnPg==')] opacity-40" />
                </div>

                <div className="px-8 pb-8">
                    <div className="flex items-end gap-6 -mt-14 mb-6">
                        <div className="relative group">
                            <div className="w-28 h-28 rounded-[24px] border-4 border-white dark:border-slate-800 shadow-xl overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                {data.photoURL ? (
                                    <img src={data.photoURL} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-white font-black text-4xl">
                                        {userProfile.initials || 'P'}
                                    </span>
                                )}
                                {uploading && (
                                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                                        <span className="text-white text-xs font-bold mt-1">{uploadProgress}%</span>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute -bottom-2 -right-2 w-9 h-9 bg-[#0EA5E9] rounded-xl flex items-center justify-center shadow-lg hover:bg-sky-500 transition-all group-hover:scale-110"
                                title="Upload photo"
                            >
                                <Camera className="w-4 h-4 text-white" />
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={e => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])}
                            />
                        </div>

                        <div className="pb-2">
                            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 dark:text-slate-100 uppercase italic">
                                {data.firstName || data.lastName
                                    ? `Dr. ${data.firstName} ${data.lastName}`.trim()
                                    : `Dr. ${userProfile.displayName}`}
                            </h2>
                            <p className="text-slate-400 font-medium text-sm mt-0.5">{userProfile.email}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1">
                                    <Award className="w-3 h-3" /> Licensed Provider
                                </span>
                                {data.specialty && (
                                    <span className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1">
                                        <Stethoscope className="w-3 h-3" /> {data.specialty}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="ml-auto pb-2 text-right">
                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Credential Readiness</p>
                            <div className="flex items-center gap-2">
                                <div className="w-32 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full transition-all duration-500"
                                        style={{ width: `${completionPct}%` }}
                                    />
                                </div>
                                <span className="text-sm font-black text-slate-700 dark:text-slate-200 dark:text-slate-200">{completionPct}%</span>
                            </div>
                        </div>
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex gap-1 bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-900/50 p-1 rounded-2xl mb-6 border border-slate-100 dark:border-slate-700 dark:border-slate-700">
                        {([
                            { id: 'personal', label: 'Personal', icon: User },
                            { id: 'professional', label: 'Credentials', icon: Award },
                            { id: 'practice', label: 'Practice', icon: Building },
                            { id: 'compliance', label: 'Compliance & Docs', icon: FileText },
                            { id: 'erx', label: 'eRx (DoseSpot)', icon: ExternalLink },
                        ] as const).map(({ id, label, icon: Icon }) => (
                            <button
                                key={id}
                                onClick={() => setActiveTab(id)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === id
                                    ? 'bg-white dark:bg-slate-800 text-[#0EA5E9] shadow-sm border border-slate-100 dark:border-slate-700'
                                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400'
                                    }`}
                            >
                                <Icon className="w-3.5 h-3.5" /> {label}
                            </button>
                        ))}
                    </div>

                    {/* ── PERSONAL INFO ── */}
                    {activeTab === 'personal' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <section>
                                <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <User className="w-3.5 h-3.5" /> Basic Information
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {field('Prefix', 'prefix')}
                                    {field('First Name', 'firstName')}
                                    {field('Middle Name', 'middleName')}
                                    {field('Last Name', 'lastName')}
                                    {field('Suffix', 'suffix')}
                                    {field('Date of Birth', 'dateOfBirth', 'date')}
                                    {field('Gender', 'gender', 'text', ['Male', 'Female', 'Non-binary', 'Prefer not to say'])}
                                    {field('Personal Phone', 'phone', 'tel')}
                                    {field('Primary Phone Type', 'primaryPhoneType', 'text', [...DOSESPOT_PHONE_TYPES])}
                                    {field('Primary Fax', 'primaryFax', 'tel')}
                                    {field('Primary Address', 'address')}
                                    {field('Address Line 2', 'address2')}
                                    {field('City', 'city')}
                                    {field('State', 'state')}
                                    {field('ZIP Code', 'zip')}
                                    {field('Languages Spoken', 'languagesSpoken', 'text')}
                                    {textareaField('About Me / Bio', 'aboutMe')}
                                </div>
                            </section>
                        </div>
                    )}

                    {/* ── COMPLIANCE & DOCS ── */}
                    {activeTab === 'compliance' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <section>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        <FileText className="w-3.5 h-3.5" /> Licenses & Certificates
                                    </h3>
                                    <input type="file" ref={docInputRef} className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={e => e.target.files?.[0] && handleDocUpload(e.target.files[0])} />
                                    <button onClick={() => docInputRef.current?.click()} disabled={uploading} className="bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors disabled:opacity-50 flex items-center gap-1.5">
                                        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                                        Upload Document
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {data.complianceDocs.length === 0 ? (
                                        <div className="p-8 text-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 dark:border-slate-800 text-sm font-medium">
                                            No compliance documents uploaded yet.
                                        </div>
                                    ) : (
                                        data.complianceDocs.map(docItem => (
                                            <div key={docItem.id} className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between p-4 bg-white dark:bg-slate-800 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 shadow-sm">
                                                <div className="flex items-center gap-3 w-full md:w-auto">
                                                    <div className="min-w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                                                        <FileText className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        {editing ? (
                                                            <input type="text" value={docItem.name} onChange={e => handleUpdateDocExpiry(docItem.id, docItem.expiryDate, e.target.value)} className="w-full text-sm font-bold text-slate-800 dark:text-slate-100 dark:text-slate-100 bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-900 p-1 rounded" />
                                                        ) : (
                                                            <a href={docItem.url} target="_blank" rel="noreferrer" className="text-sm font-bold text-slate-800 dark:text-slate-100 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 truncate block">
                                                                {docItem.name}
                                                            </a>
                                                        )}
                                                        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-0.5 block">{docItem.type}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 w-full md:w-auto mt-2 md:mt-0 pt-2 border-t border-slate-100 dark:border-slate-700 dark:border-slate-700 md:pt-0 md:border-none">
                                                    <div className="flex items-center gap-2 flex-1 md:flex-none">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Expires:</span>
                                                        {editing ? (
                                                            <input type="date" value={docItem.expiryDate} onChange={e => handleUpdateDocExpiry(docItem.id, e.target.value, docItem.name)} className="text-xs font-bold text-slate-700 dark:text-slate-200 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-900 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 dark:border-slate-700 outline-none focus:ring-1 focus:ring-indigo-500" />
                                                        ) : (
                                                            <span className={`text-xs font-bold px-2 py-1 rounded-lg ${docItem.expiryDate ? (new Date(docItem.expiryDate) < new Date() ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300') : 'text-slate-400'}`}>
                                                                {docItem.expiryDate || 'N/A'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {editing && (
                                                        <button onClick={() => handleRemoveDoc(docItem.id)} className="p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </section>
                        </div>
                    )}

                    {/* ── PROFESSIONAL INFO ── */}
                    {activeTab === 'professional' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div className="p-4 bg-sky-50 dark:bg-sky-900/20 rounded-2xl border border-sky-100 dark:border-sky-800 flex items-start gap-3">
                                <Shield className="w-4 h-4 text-sky-500 mt-0.5 shrink-0" />
                                <p className="text-xs text-sky-700 dark:text-sky-300 font-medium leading-relaxed">
                                    Accurate NPI and DEA details are required for DoseSpot e-prescribing integration.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {field('Clinician Specialty Type', 'specialty', 'text', [...DOSESPOT_CLINICIAN_SPECIALTIES])}
                                {field('NPI Number', 'npi')}
                                {field('DEA Number', 'deaNumber')}
                                {field('DoseSpot ID (Read Only)', 'doseSpotClinicianId')}
                                {field('State License #', 'stateLicenseNumber')}
                                {field('License State', 'stateLicenseState')}
                                {field('PDMP Role Type', 'pdmpRoleType', 'text', [...DOSESPOT_PDMP_ROLE_TYPES])}
                                {toggleField('EPCS Requested', 'epcsRequested', 'Request EPCS registration for this clinician')}
                                {toggleField('Active', 'active', 'Mark this clinician as active for DoseSpot')}
                                {field('Medical School', 'medicalSchool')}
                                {field('Residency', 'residency')}
                            </div>
                        </div>
                    )}

                    {/* ── PRACTICE INFO ── */}
                    {activeTab === 'practice' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <section>
                                <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Building className="w-3.5 h-3.5" /> Clinical Location
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">{field('Clinic/Hospital Name', 'clinicName')}</div>
                                    {field('Clinic Phone', 'clinicPhone', 'tel')}
                                    {field('Clinic Fax', 'clinicFax', 'tel')}
                                    {field('City', 'city')}
                                    {field('State', 'state')}
                                    {field('ZIP Code', 'zip')}
                                </div>
                            </section>
                        </div>
                    )}

                    {/* ── ERX / DOSESPOT ── */}
                    {activeTab === 'erx' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <section>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        <ExternalLink className="w-3.5 h-3.5" /> e-Prescribing Portal
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {doseSpotStatus.registrationStatus && (
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                                Registration: {doseSpotStatus.registrationStatus}
                                            </span>
                                        )}
                                        {data.doseSpotClinicianId && (
                                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1.5">
                                                <CheckCircle2 className="w-3.5 h-3.5" /> ID Linked: {data.doseSpotClinicianId}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {!data.doseSpotClinicianId ? (
                                    <div className="p-12 text-center bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-900/50 rounded-[32px] border border-dashed border-slate-200 dark:border-slate-700 dark:border-slate-700">
                                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                            <Shield className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                                        </div>
                                        <h4 className="text-lg font-black text-slate-700 dark:text-slate-200 dark:text-slate-300 uppercase italic">eRx Not Configured</h4>
                                        <p className="text-sm text-slate-400 font-medium max-w-xs mx-auto mt-2">
                                            Complete your provider credentials, then sync this profile to DoseSpot to enable e-prescribing.
                                        </p>
                                        <div className="mt-6 flex flex-col items-center gap-3">
                                            <button
                                                onClick={handleDoseSpotSync}
                                                disabled={syncingDoseSpot || doseSpotStatus.synced}
                                                title={doseSpotStatus.synced ? 'Provider already synced to DoseSpot' : 'Sync to DoseSpot'}
                                                className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-5 py-3 text-xs font-black uppercase tracking-widest text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {syncingDoseSpot ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                                                Sync to DoseSpot
                                            </button>
                                            <button
                                                onClick={() => setActiveTab('professional')}
                                                className="text-xs font-black uppercase tracking-widest text-indigo-500 hover:underline"
                                            >
                                                Go to Credentials
                                            </button>
                                        </div>
                                        {doseSpotStatus.lastSyncError && (
                                            <div className="mx-auto mt-4 flex max-w-md items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-left text-xs text-amber-700">
                                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                                <span>{doseSpotStatus.lastSyncError}</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex flex-wrap gap-3">
                                            <button
                                                onClick={handleDoseSpotSync}
                                                disabled={syncingDoseSpot || doseSpotStatus.synced}
                                                title={doseSpotStatus.synced ? 'Provider already synced to DoseSpot' : 'Sync to DoseSpot'}
                                                className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-3 text-xs font-black uppercase tracking-widest text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {syncingDoseSpot ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                                                Sync to DoseSpot
                                            </button>
                                            {doseSpotStatus.synced && (
                                                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-black uppercase tracking-widest text-emerald-700">
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                    Synced
                                                </span>
                                            )}
                                        </div>

                                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800 flex items-start gap-3">
                                            <Info className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                                            <div className="space-y-1">
                                                <p className="text-xs text-emerald-800 dark:text-emerald-300 font-bold leading-relaxed">
                                                    SSO Integration Active (Staging)
                                                </p>
                                                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium leading-relaxed">
                                                    You are currently signed in as Clinician #{data.doseSpotClinicianId}. Any prescriptions written here will be linked to your professional record.
                                                </p>
                                                {doseSpotStatus.registrationStatus && (
                                                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium leading-relaxed">
                                                        Registration Status: {doseSpotStatus.registrationStatus}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-3">
                                            <Link
                                                href="/orders/erx/readiness"
                                                className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs font-black uppercase tracking-widest text-sky-700 transition hover:bg-sky-100"
                                            >
                                                DoseSpot Readiness
                                                <ExternalLink className="h-3.5 w-3.5" />
                                            </Link>
                                            <Link
                                                href="/orders/erx?refillsErrors=true"
                                                className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-black uppercase tracking-widest text-amber-700 transition hover:bg-amber-100"
                                            >
                                                Refills & Errors
                                                <ExternalLink className="h-3.5 w-3.5" />
                                            </Link>
                                        </div>
                                        
                                        <div className="rounded-[24px] overflow-hidden border border-slate-200 dark:border-slate-700 dark:border-slate-700 shadow-inner">
                                            <DoseSpotFrame height="920px" />
                                        </div>
                                    </div>
                                )}
                            </section>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
