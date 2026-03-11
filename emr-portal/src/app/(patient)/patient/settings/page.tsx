"use client";
import React, { useState, useEffect } from 'react';
import { User, Bell, Lock, Shield, ChevronRight, Save, CheckCircle2 } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

export default function PatientSettingsPage() {
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState({ firstName: '', lastName: '', phone: '', dateOfBirth: '', state: '' });
    const [notifs, setNotifs] = useState({ email: true, sms: false, reminders: true });
    const [saving, setSaving] = useState(false);
    const [activeSection, setActiveSection] = useState<'profile' | 'notifications' | 'security'>('profile');

    useEffect(() => {
        const unsub = auth.onAuthStateChanged(async (u) => {
            if (!u) return;
            setUser(u);
            try {
                const snap = await getDoc(doc(db, 'users', u.uid));
                if (snap.exists()) {
                    const d = snap.data();
                    setProfile({
                        firstName: d.firstName || d.displayName?.split(' ')[0] || '',
                        lastName: d.lastName || d.displayName?.split(' ')[1] || '',
                        phone: d.phone || '',
                        dateOfBirth: d.dateOfBirth || '',
                        state: d.state || '',
                    });
                    if (d.notifications) setNotifs(d.notifications);
                }
            } catch (e) { console.error(e); }
        });
        return () => unsub();
    }, []);

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            await updateDoc(doc(db, 'users', user.uid), {
                ...profile,
                notifications: notifs,
                updatedAt: serverTimestamp()
            });
            toast.success('Settings saved!');
        } catch (e) {
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const sections = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'security', label: 'Security', icon: Lock },
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <div>
                <h1 className="text-3xl font-black text-slate-800 tracking-tight">Settings</h1>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-1">Manage your account preferences</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Sidebar */}
                <div className="md:col-span-1 space-y-1">
                    {sections.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setActiveSection(id as any)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${activeSection === id ? 'bg-[#0EA5E9] text-white shadow-lg shadow-sky-100' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                            <Icon className="w-4 h-4" />
                            {label}
                            {activeSection !== id && <ChevronRight className="w-3 h-3 ml-auto opacity-40" />}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="md:col-span-3 bg-white rounded-[32px] border border-slate-100 shadow-sm p-8">
                    {activeSection === 'profile' && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-black text-slate-800">Profile Information</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    { label: 'First Name', key: 'firstName' },
                                    { label: 'Last Name', key: 'lastName' },
                                    { label: 'Phone', key: 'phone' },
                                    { label: 'Date of Birth', key: 'dateOfBirth' },
                                    { label: 'State', key: 'state' },
                                ].map(({ label, key }) => (
                                    <div key={key} className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</label>
                                        <input
                                            type="text"
                                            value={(profile as any)[key]}
                                            onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))}
                                            className="w-full border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9] outline-none transition-all"
                                        />
                                    </div>
                                ))}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Email</label>
                                    <input type="email" value={user?.email || ''} disabled className="w-full border border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-400 bg-slate-50 cursor-not-allowed" />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'notifications' && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-black text-slate-800">Notification Preferences</h2>
                            {[
                                { key: 'email', label: 'Email Notifications', desc: 'Receive appointment confirmations and updates via email' },
                                { key: 'sms', label: 'SMS Notifications', desc: 'Get text message reminders for upcoming appointments' },
                                { key: 'reminders', label: 'Appointment Reminders', desc: 'Receive reminders 24 hours before your appointment' },
                            ].map(({ key, label, desc }) => (
                                <div key={key} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm">{label}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                                    </div>
                                    <button
                                        onClick={() => setNotifs(n => ({ ...n, [key]: !(n as any)[key] }))}
                                        className={`w-12 h-6 rounded-full transition-all relative ${(notifs as any)[key] ? 'bg-[#0EA5E9]' : 'bg-slate-200'}`}
                                    >
                                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${(notifs as any)[key] ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeSection === 'security' && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-black text-slate-800">Security</h2>
                            <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
                                <Shield className="w-5 h-5 text-emerald-600" />
                                <div>
                                    <p className="font-bold text-emerald-800 text-sm">HIPAA Compliant Account</p>
                                    <p className="text-xs text-emerald-600">Your data is encrypted and secure</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Account</p>
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <p className="text-xs font-bold text-slate-500 mb-1">Email Address</p>
                                    <p className="text-sm font-bold text-slate-800">{user?.email}</p>
                                </div>
                                <p className="text-xs text-slate-400 italic">To change your password, use the "Forgot Password" link on the login page.</p>
                            </div>
                        </div>
                    )}

                    <div className="mt-8 flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-[#0EA5E9] text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-sky-100 hover:bg-sky-500 transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
