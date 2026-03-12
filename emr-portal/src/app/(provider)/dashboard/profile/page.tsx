"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Camera, User, Phone, MapPin, Calendar, Shield, FileText, Activity, Edit3, Save, X, Loader2, CheckCircle2, Award, Building, Stethoscope, ExternalLink, Info } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from 'react-hot-toast';
import { DoseSpotFrame } from '@/components/telehealth/DoseSpotFrame';

interface ProfileData {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    specialty: string;
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
}

const EMPTY: ProfileData = {
    firstName: '', lastName: '', dateOfBirth: '', gender: '', phone: '',
    address: '', city: '', state: '', zip: '',
    specialty: '', npi: '', deaNumber: '', stateLicenseNumber: '', stateLicenseState: '',
    clinicName: '', clinicPhone: '', clinicFax: '',
    medicalSchool: '', residency: '', doseSpotClinicianId: '', photoURL: '',
};

export default function ProviderProfilePage() {
    const userProfile = useUserProfile();
    const [data, setData] = useState<ProfileData>(EMPTY);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [activeTab, setActiveTab] = useState<'personal' | 'professional' | 'practice' | 'erx'>('personal');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!userProfile.uid) return;
        const loadProfile = async () => {
            try {
                const snap = await getDoc(doc(db, 'users', userProfile.uid));
                if (snap.exists()) {
                    const d = snap.data();
                    setData({
                        firstName: d.firstName || userProfile.displayName.split(' ')[0] || '',
                        lastName: d.lastName || userProfile.displayName.split(' ')[1] || '',
                        dateOfBirth: d.dateOfBirth || '',
                        gender: d.gender || '',
                        phone: d.phone || '',
                        address: d.address || '',
                        city: d.city || '',
                        state: d.state || '',
                        zip: d.zip || '',
                        specialty: d.specialty || '',
                        npi: d.npi || '',
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
            const sanitizedPhone = data.phone?.replace(/\D/g, '') || '';

            await setDoc(doc(db, 'users', auth.currentUser.uid), {
                ...data,
                phone: sanitizedPhone,
                displayName: fullName,
                name: fullName,
                email: userProfile.email,
                role: 'provider', // Explicitly ensure role is provider
                updatedAt: serverTimestamp(),
            }, { merge: true });

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

    const field = (label: string, key: keyof ProfileData, type = 'text', options?: string[]) => (
        <div className="space-y-1.5" key={key}>
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</label>
            {editing ? (
                options ? (
                    <select
                        value={data[key] as string}
                        onChange={e => setData(p => ({ ...p, [key]: e.target.value }))}
                        className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9] outline-none bg-white dark:bg-slate-800"
                    >
                        <option value="">Select...</option>
                        {options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                ) : (
                    <input
                        type={type}
                        value={data[key] as string}
                        onChange={e => setData(p => ({ ...p, [key]: e.target.value }))}
                        className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9] outline-none bg-white dark:bg-slate-800"
                    />
                )
            ) : (
                <p className={`text-sm font-bold py-2 px-1 ${data[key] ? 'text-slate-800 dark:text-slate-100' : 'text-slate-300 dark:text-slate-600 italic'}`}>
                    {(data[key] as string) || 'Not provided'}
                </p>
            )}
        </div>
    );

    const completionFields: (keyof ProfileData)[] = ['firstName', 'lastName', 'specialty', 'npi', 'phone', 'clinicName', 'stateLicenseNumber'];
    const completed = completionFields.filter(f => data[f]).length;
    const completionPct = Math.round((completed / completionFields.length) * 100);

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight italic uppercase">Provider Profile</h1>
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
            <div className="bg-white dark:bg-slate-800 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
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
                            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase italic">
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
                                <span className="text-sm font-black text-slate-700 dark:text-slate-200">{completionPct}%</span>
                            </div>
                        </div>
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex gap-1 bg-slate-50 dark:bg-slate-900/50 p-1 rounded-2xl mb-6 border border-slate-100 dark:border-slate-700">
                        {([
                            { id: 'personal', label: 'Personal', icon: User },
                            { id: 'professional', label: 'Credentials', icon: Award },
                            { id: 'practice', label: 'Practice', icon: Building },
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
                                    {field('First Name', 'firstName')}
                                    {field('Last Name', 'lastName')}
                                    {field('Date of Birth', 'dateOfBirth', 'date')}
                                    {field('Gender', 'gender', 'text', ['Male', 'Female', 'Non-binary', 'Prefer not to say'])}
                                    {field('Personal Phone', 'phone', 'tel')}
                                    {field('Primary Address', 'address')}
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
                                {field('Specialty', 'specialty')}
                                {field('NPI Number', 'npi')}
                                {field('DEA Number', 'deaNumber')}
                                {field('DoseSpot ID (Read Only)', 'doseSpotClinicianId')}
                                {field('State License #', 'stateLicenseNumber')}
                                {field('License State', 'stateLicenseState', 'text', ['Florida', 'New York', 'California', 'Texas'])}
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
                                    {data.doseSpotClinicianId && (
                                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1.5">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> ID Linked: {data.doseSpotClinicianId}
                                        </span>
                                    )}
                                </div>

                                {!data.doseSpotClinicianId ? (
                                    <div className="p-12 text-center bg-slate-50 dark:bg-slate-900/50 rounded-[32px] border border-dashed border-slate-200 dark:border-slate-700">
                                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                            <Shield className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                                        </div>
                                        <h4 className="text-lg font-black text-slate-700 dark:text-slate-300 uppercase italic">eRx Not Configured</h4>
                                        <p className="text-sm text-slate-400 font-medium max-w-xs mx-auto mt-2">
                                            Please enter your DoseSpot Clinician ID in the <span className="text-indigo-500 font-bold">Credentials</span> tab to enable e-prescribing.
                                        </p>
                                        <button 
                                            onClick={() => setActiveTab('professional')}
                                            className="mt-6 text-xs font-black text-indigo-500 uppercase tracking-widest hover:underline"
                                        >
                                            Go to Credentials
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800 flex items-start gap-3">
                                            <Info className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                                            <div className="space-y-1">
                                                <p className="text-xs text-emerald-800 dark:text-emerald-300 font-bold leading-relaxed">
                                                    SSO Integration Active (Staging)
                                                </p>
                                                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium leading-relaxed">
                                                    You are currently signed in as Clinician #{data.doseSpotClinicianId}. Any prescriptions written here will be linked to your professional record.
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="rounded-[24px] overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner">
                                            <DoseSpotFrame height="800px" />
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
