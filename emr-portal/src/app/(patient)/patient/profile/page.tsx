"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Camera, User, Phone, MapPin, Calendar, Shield, FileText, Activity, Edit3, Save, X, Loader2, CheckCircle2, Heart, Pill, AlertTriangle } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from 'react-hot-toast';

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
    emergencyContact: string;
    emergencyPhone: string;
    bloodType: string;
    allergies: string;
    currentMedications: string;
    chronicConditions: string;
    primaryLanguage: string;
    insuranceProvider: string;
    insuranceMemberId: string;
    height: string;
    weight: string;
    photoURL: string;
}

const EMPTY: ProfileData = {
    firstName: '', lastName: '', dateOfBirth: '', gender: '', phone: '',
    address: '', city: '', state: '', zip: '',
    emergencyContact: '', emergencyPhone: '',
    bloodType: '', allergies: '', currentMedications: '', chronicConditions: '',
    primaryLanguage: 'English', insuranceProvider: '', insuranceMemberId: '',
    height: '', weight: '', photoURL: '',
};

export default function PatientProfilePage() {
    const userProfile = useUserProfile();
    const [data, setData] = useState<ProfileData>(EMPTY);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [activeTab, setActiveTab] = useState<'personal' | 'medical' | 'insurance'>('personal');
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
                        emergencyContact: d.emergencyContact || '',
                        emergencyPhone: d.emergencyPhone || '',
                        bloodType: d.bloodType || '',
                        allergies: d.allergies || '',
                        currentMedications: d.currentMedications || '',
                        chronicConditions: d.chronicConditions || '',
                        primaryLanguage: d.primaryLanguage || 'English',
                        insuranceProvider: d.insuranceProvider || '',
                        insuranceMemberId: d.insuranceMemberId || '',
                        height: d.height || '',
                        weight: d.weight || '',
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
                    // Update Firebase Auth profile
                    await updateProfile(auth.currentUser!, { photoURL: url });
                    // Persist to Firestore
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
            // Sanitize phone for DoseSpot (must be 10 digits)
            const sanitizedPhone = data.phone?.replace(/\D/g, '') || '';

            await setDoc(doc(db, 'users', auth.currentUser.uid), {
                ...data,
                phone: sanitizedPhone, // save the clean version
                displayName: fullName,
                name: fullName,
                email: userProfile.email,
                role: 'patient',
                updatedAt: serverTimestamp(),
            }, { merge: true });
            // Update Firebase Auth display name
            if (fullName) await updateProfile(auth.currentUser, { displayName: fullName });
            setEditing(false);
            toast.success('Profile saved successfully!');
        } catch (e) {
            toast.error('Failed to save profile');
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const field = (label: string, key: keyof ProfileData, type = 'text', options?: string[]) => (
        <div className="space-y-1.5" key={key}>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
            {editing ? (
                options ? (
                    <select
                        value={data[key] as string}
                        onChange={e => setData(p => ({ ...p, [key]: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl p-3 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9] outline-none bg-white"
                    >
                        <option value="">Select...</option>
                        {options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                ) : (
                    <input
                        type={type}
                        value={data[key] as string}
                        onChange={e => setData(p => ({ ...p, [key]: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl p-3 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9] outline-none"
                    />
                )
            ) : (
                <p className={`text-sm font-bold py-2 px-1 ${data[key] ? 'text-slate-800' : 'text-slate-300 italic'}`}>
                    {(data[key] as string) || 'Not provided'}
                </p>
            )}
        </div>
    );

    const completionFields: (keyof ProfileData)[] = ['firstName', 'lastName', 'dateOfBirth', 'phone', 'bloodType', 'emergencyContact', 'insuranceProvider'];
    const completed = completionFields.filter(f => data[f]).length;
    const completionPct = Math.round((completed / completionFields.length) * 100);

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">My Profile</h1>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-1">Manage your health record</p>
                </div>
                {!editing ? (
                    <button
                        onClick={() => setEditing(true)}
                        className="flex items-center gap-2 bg-[#0EA5E9] text-white px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-sky-100 hover:bg-sky-500 transition-all"
                    >
                        <Edit3 className="w-4 h-4" /> Edit Profile
                    </button>
                ) : (
                    <div className="flex gap-2">
                        <button onClick={() => setEditing(false)} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all">
                            <X className="w-4 h-4" /> Cancel
                        </button>
                        <button onClick={handleSave} disabled={saving}
                            className="flex items-center gap-2 bg-[#0EA5E9] text-white px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-sky-100 hover:bg-sky-500 transition-all disabled:opacity-50">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                )}
            </div>

            {/* Profile Hero Card */}
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                {/* Banner */}
                <div className="h-28 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 relative">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDB2LTJoMzZ6bTAtNHYtMkgwdi0yaDB2Mmgzdn0iLz48L2c+PC9nPjwvc3ZnPg==')] opacity-40" />
                </div>

                <div className="px-8 pb-8">
                    <div className="flex items-end gap-6 -mt-14 mb-6">
                        {/* Avatar with upload */}
                        <div className="relative group">
                            <div className="w-28 h-28 rounded-[24px] border-4 border-white shadow-xl overflow-hidden bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center">
                                {data.photoURL ? (
                                    <img src={data.photoURL} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-white font-black text-4xl">
                                        {userProfile.initials || '?'}
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
                            <h2 className="text-2xl font-black text-slate-800">
                                {data.firstName || data.lastName
                                    ? `${data.firstName} ${data.lastName}`.trim()
                                    : userProfile.displayName}
                            </h2>
                            <p className="text-slate-400 font-medium text-sm mt-0.5">{userProfile.email}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Verified Patient
                                </span>
                                {data.bloodType && (
                                    <span className="bg-red-50 text-red-600 border border-red-100 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1">
                                        <Heart className="w-3 h-3" /> {data.bloodType}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Completion meter */}
                        <div className="ml-auto pb-2 text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Profile Completeness</p>
                            <div className="flex items-center gap-2">
                                <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 rounded-full transition-all duration-500"
                                        style={{ width: `${completionPct}%` }}
                                    />
                                </div>
                                <span className="text-sm font-black text-slate-700">{completionPct}%</span>
                            </div>
                            {completionPct < 100 && (
                                <button onClick={() => setEditing(true)} className="text-[10px] text-[#0EA5E9] font-bold mt-1 hover:underline">
                                    Complete profile →
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex gap-1 bg-slate-50 p-1 rounded-2xl mb-6 border border-slate-100">
                        {([
                            { id: 'personal', label: 'Personal Info', icon: User },
                            { id: 'medical', label: 'Medical History', icon: Activity },
                            { id: 'insurance', label: 'Insurance', icon: Shield },
                        ] as const).map(({ id, label, icon: Icon }) => (
                            <button
                                key={id}
                                onClick={() => setActiveTab(id)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === id
                                    ? 'bg-white text-[#0EA5E9] shadow-sm border border-slate-100'
                                    : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                <Icon className="w-3.5 h-3.5" /> {label}
                            </button>
                        ))}
                    </div>

                    {/* ── PERSONAL INFO ── */}
                    {activeTab === 'personal' && (
                        <div className="space-y-6">
                            <section>
                                {(!data.address || !data.city || !data.state || !data.zip || !data.phone || !data.gender || !data.dateOfBirth) && (
                                    <div className="mb-6 p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-3">
                                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                                        <div>
                                            <p className="text-sm font-bold text-amber-800">Action Required for Prescriptions</p>
                                            <p className="text-xs text-amber-700 mt-1">Our e-prescribing system (DoseSpot) requires your full Address, Date of Birth, Phone, and Sex on file before a provider can issue prescriptions.</p>
                                        </div>
                                    </div>
                                )}
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <User className="w-3.5 h-3.5" /> Basic Information
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {field('First Name', 'firstName')}
                                    {field('Last Name', 'lastName')}
                                    {field('Date of Birth', 'dateOfBirth', 'date')}
                                    {field('Gender', 'gender', 'text', ['Male', 'Female', 'Non-binary', 'Prefer not to say'])}
                                    {field('Phone', 'phone', 'tel')}
                                    {field('Primary Language', 'primaryLanguage', 'text', ['English', 'Spanish', 'French', 'Portuguese', 'Other'])}
                                </div>
                            </section>

                            <div className="h-px bg-slate-50" />

                            <section>
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <MapPin className="w-3.5 h-3.5" /> Address
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">{field('Street Address', 'address')}</div>
                                    {field('City', 'city')}
                                    {field('State', 'state')}
                                    {field('ZIP Code', 'zip')}
                                </div>
                            </section>

                            <div className="h-px bg-slate-50" />

                            <section>
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Phone className="w-3.5 h-3.5" /> Emergency Contact
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {field('Contact Name', 'emergencyContact')}
                                    {field('Contact Phone', 'emergencyPhone', 'tel')}
                                </div>
                            </section>
                        </div>
                    )}

                    {/* ── MEDICAL HISTORY ── */}
                    {activeTab === 'medical' && (
                        <div className="space-y-6">
                            <div className="p-4 bg-sky-50 rounded-2xl border border-sky-100 flex items-start gap-3">
                                <Shield className="w-4 h-4 text-sky-500 mt-0.5 shrink-0" />
                                <p className="text-xs text-sky-700 font-medium leading-relaxed">
                                    This information is protected under HIPAA and shared only with your authorized care team.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {field('Blood Type', 'bloodType', 'text', ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'])}
                                {field('Height (e.g. 5\'10")', 'height')}
                                {field('Weight (lbs)', 'weight')}
                            </div>

                            <div key="allergies" className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <AlertTriangle className="w-3 h-3 text-amber-500" /> Allergies
                                </label>
                                {editing ? (
                                    <textarea
                                        value={data.allergies}
                                        onChange={e => setData(p => ({ ...p, allergies: e.target.value }))}
                                        placeholder="e.g. Penicillin, Peanuts, Latex"
                                        className="w-full border border-slate-200 rounded-xl p-3 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9] outline-none min-h-[80px] resize-none"
                                    />
                                ) : (
                                    <p className={`text-sm font-bold py-2 px-1 ${data.allergies ? 'text-slate-800' : 'text-slate-300 italic'}`}>
                                        {data.allergies || 'None reported'}
                                    </p>
                                )}
                            </div>

                            <div key="medications" className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Pill className="w-3 h-3 text-indigo-500" /> Current Medications
                                </label>
                                {editing ? (
                                    <textarea
                                        value={data.currentMedications}
                                        onChange={e => setData(p => ({ ...p, currentMedications: e.target.value }))}
                                        placeholder="List current medications and dosages"
                                        className="w-full border border-slate-200 rounded-xl p-3 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9] outline-none min-h-[80px] resize-none"
                                    />
                                ) : (
                                    <p className={`text-sm font-bold py-2 px-1 ${data.currentMedications ? 'text-slate-800' : 'text-slate-300 italic'}`}>
                                        {data.currentMedications || 'None reported'}
                                    </p>
                                )}
                            </div>

                            <div key="conditions" className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Heart className="w-3 h-3 text-red-400" /> Chronic Conditions
                                </label>
                                {editing ? (
                                    <textarea
                                        value={data.chronicConditions}
                                        onChange={e => setData(p => ({ ...p, chronicConditions: e.target.value }))}
                                        placeholder="e.g. Diabetes Type 2, Hypertension"
                                        className="w-full border border-slate-200 rounded-xl p-3 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9] outline-none min-h-[80px] resize-none"
                                    />
                                ) : (
                                    <p className={`text-sm font-bold py-2 px-1 ${data.chronicConditions ? 'text-slate-800' : 'text-slate-300 italic'}`}>
                                        {data.chronicConditions || 'None reported'}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── INSURANCE ── */}
                    {activeTab === 'insurance' && (
                        <div className="space-y-6">
                            <div className="p-5 bg-gradient-to-br from-indigo-50 to-sky-50 rounded-2xl border border-indigo-100">
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center">
                                        <Shield className="w-4 h-4 text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-indigo-800 uppercase tracking-widest">Insurance Card</p>
                                        <p className="text-sm font-bold text-indigo-900">{data.insuranceProvider || 'No insurance on file'}</p>
                                    </div>
                                </div>
                                {data.insuranceMemberId && (
                                    <p className="text-[11px] text-indigo-400 font-bold uppercase tracking-widest mt-2">
                                        Member ID: {data.insuranceMemberId}
                                    </p>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {field('Insurance Provider', 'insuranceProvider')}
                                {field('Member ID', 'insuranceMemberId')}
                            </div>
                            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
                                <FileText className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-xs font-bold text-amber-800">Need help with insurance?</p>
                                    <p className="text-xs text-amber-600 mt-0.5">Contact our billing team at <strong>billing@patriotictelehealth.com</strong></p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
