"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Mail, Plus, Trash2, CheckCircle2, ShieldAlert, AlertCircle, Smartphone } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';

export function PageClient() {
    const profile = useUserProfile();
    const [emails, setEmails] = useState<string[]>([]);
    const [newEmail, setNewEmail] = useState('');
    const [smsEnabled, setSmsEnabled] = useState<boolean>(true);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const loadSettings = async () => {
        try {
            setLoading(true);
            const docRef = doc(db, 'global_settings', 'notifications');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.adminEmails && Array.isArray(data.adminEmails)) {
                    setEmails(data.adminEmails);
                } else {
                    setEmails(['dayo@patriotictelehealth.com']); // Default fallback
                }
                if (typeof data.smsEnabled === 'boolean') {
                    setSmsEnabled(data.smsEnabled);
                }
            } else {
                setEmails(['dayo@patriotictelehealth.com']);
            }
        } catch (err: any) {
            console.error("Error loading global settings:", err);
            setError("Failed to load settings. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!profile.loading && profile.authenticated) {
            loadSettings();
        }
    }, [profile]);

    const handleSave = async (updatedEmails: string[], updatedSmsEnabled: boolean) => {
        try {
            setSaving(true);
            setError('');
            setSuccess('');
            const docRef = doc(db, 'global_settings', 'notifications');
            await setDoc(docRef, { adminEmails: updatedEmails, smsEnabled: updatedSmsEnabled }, { merge: true });
            setEmails(updatedEmails);
            setSmsEnabled(updatedSmsEnabled);
            setSuccess('Settings saved successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            console.error("Error saving global settings:", err);
            setError("Failed to save settings. Make sure you have admin permissions.");
        } finally {
            setSaving(false);
        }
    };

    const handleAddEmail = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newEmail.trim().toLowerCase();
        if (!trimmed) return;
        
        // Basic email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
            setError("Please enter a valid email address.");
            return;
        }

        if (emails.includes(trimmed)) {
            setError("This email is already in the list.");
            return;
        }

        const updated = [...emails, trimmed];
        setNewEmail('');
        handleSave(updated, smsEnabled);
    };

    const handleRemoveEmail = (emailToRemove: string) => {
        if (emails.length <= 1) {
            setError("You cannot remove the last admin email.");
            return;
        }
        const updated = emails.filter(e => e !== emailToRemove);
        handleSave(updated, smsEnabled);
    };

    const handleToggleSms = () => {
        handleSave(emails, !smsEnabled);
    };

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                    <ShieldAlert className="w-7 h-7 text-indigo-500" />
                    Global Systems Settings
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2">
                    Manage system-wide configurations, administrator notifications, and environment variables.
                </p>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-4 rounded-xl flex items-start gap-3 border border-red-200 dark:border-red-500/20">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p>{error}</p>
                </div>
            )}

            {success && (
                <div className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl flex items-start gap-3 border border-emerald-200 dark:border-emerald-500/20 animate-fade-in">
                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                    <p>{success}</p>
                </div>
            )}

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl">
                            <Mail className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Admin Notification Emails</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                                Users in this list will receive all critical system alerts, new appointment waitlist notifications, scheduling updates, and other global communications.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-slate-50/50 dark:bg-slate-800/50">
                    <form onSubmit={handleAddEmail} className="flex gap-3 mb-6">
                        <input
                            type="email"
                            placeholder="Enter admin email address..."
                            value={newEmail}
                            onChange={(e) => {
                                setNewEmail(e.target.value);
                                setError('');
                            }}
                            className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                        />
                        <button
                            type="submit"
                            disabled={saving || !newEmail.trim()}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">Add Email</span>
                        </button>
                    </form>

                    <div className="space-y-3">
                        {emails.map((email, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm group transition-all hover:border-slate-300 dark:hover:border-slate-600">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold uppercase text-xs shrink-0">
                                        {email.charAt(0)}
                                    </div>
                                    <span className="font-medium text-slate-700 dark:text-slate-200 truncate">{email}</span>
                                </div>
                                <button
                                    onClick={() => handleRemoveEmail(email)}
                                    disabled={saving}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-50 cursor-pointer"
                                    title="Remove email"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}

                        {emails.length === 0 && (
                            <div className="text-center py-6 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 border-dashed rounded-xl">
                                No admin emails configured.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mt-6">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl">
                            <Smartphone className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Global SMS Alerts (Twilio)</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                                Enable or disable all outbound SMS messages (patient & provider).
                            </p>
                        </div>
                    </div>
                    <div>
                        <button
                            onClick={handleToggleSms}
                            disabled={saving}
                            className={`relative inline-flex h-7 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${smsEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'} disabled:opacity-50`}
                        >
                            <span 
                                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${smsEnabled ? 'translate-x-7' : 'translate-x-0'}`} 
                            />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
