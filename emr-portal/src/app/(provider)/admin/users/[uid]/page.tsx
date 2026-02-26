"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ChevronLeft, User, Mail, Shield, Save,
    AlertCircle, CheckCircle2, ShieldAlert, Key, Trash2
} from 'lucide-react';

export default function UserProfilePage({ params }: { params: { uid: string } }) {
    const router = useRouter();
    const { uid } = params;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [userData, setUserData] = useState({
        displayName: '',
        email: '',
        role: 'patient',
        disabled: false,
        creationTime: '',
        lastSignInTime: ''
    });

    useEffect(() => {
        fetchUser();
    }, [uid]);

    const fetchUser = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/users');
            const data = await res.json();
            if (data.success) {
                const user = data.users.find((u: any) => u.uid === uid);
                if (user) {
                    setUserData({
                        displayName: user.displayName || '',
                        email: user.email || '',
                        role: user.role || 'patient',
                        disabled: user.disabled || false,
                        creationTime: user.creationTime || '',
                        lastSignInTime: user.lastSignInTime || ''
                    });
                } else {
                    setError('User not found');
                }
            } else {
                throw new Error(data.error);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            setError(null);
            setSuccess(null);

            const res = await fetch(`/api/admin/users/${uid}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    displayName: userData.displayName,
                    role: userData.role,
                    disabled: userData.disabled
                })
            });

            const data = await res.json();
            if (data.success) {
                setSuccess('User profile updated successfully');
                setTimeout(() => setSuccess(null), 3000);
            } else {
                throw new Error(data.error);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleResetPassword = async () => {
        if (!confirm('Generate a password reset link for this user?')) return;
        try {
            const res = await fetch(`/api/admin/users/${uid}/reset`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                alert(`Reset link generated: ${data.link}`);
            } else {
                alert('Error: ' + data.error);
            }
        } catch (err: any) {
            alert('Failed to generate reset link');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <Link
                href="/admin/users"
                className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-brand transition-colors mb-2"
            >
                <ChevronLeft className="w-4 h-4" />
                Back to User Management
            </Link>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center text-brand text-2xl font-black">
                        {userData.displayName?.charAt(0) || userData.email?.charAt(0)}
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {userData.displayName || 'User Profile'}
                        </h1>
                        <p className="text-slate-500 flex items-center gap-2 mt-1">
                            <Mail className="w-4 h-4" /> {userData.email}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleResetPassword}
                        className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-blue-500 hover:bg-blue-50 transition-all shadow-sm"
                        title="Reset Password"
                    >
                        <Key className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => {
                            if (confirm('Are you sure you want to delete this user?')) {
                                fetch(`/api/admin/users/${uid}`, { method: 'DELETE' })
                                    .then(() => router.push('/admin/users'));
                            }
                        }}
                        className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-red-500 hover:bg-red-50 transition-all shadow-sm"
                        title="Delete User"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <form onSubmit={handleSave} className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                            <h3 className="text-lg font-bold">General Information</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            {error && (
                                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm">
                                    <AlertCircle className="w-5 h-5" />
                                    {error}
                                </div>
                            )}
                            {success && (
                                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-3 text-emerald-600 dark:text-emerald-400 text-sm animate-in fade-in slide-in-from-top-2">
                                    <CheckCircle2 className="w-5 h-5" />
                                    {success}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                                        value={userData.displayName}
                                        onChange={e => setUserData({ ...userData, displayName: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Email (Read Only)</label>
                                    <input
                                        disabled
                                        type="text"
                                        className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-500 cursor-not-allowed"
                                        value={userData.email}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Access Role</label>
                                    <select
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                                        value={userData.role}
                                        onChange={e => setUserData({ ...userData, role: e.target.value })}
                                    >
                                        <option value="patient">Patient</option>
                                        <option value="provider">Provider (Doctor)</option>
                                        <option value="admin">Systems Administrator</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Account Status</label>
                                    <div className="flex items-center gap-3 h-[42px] px-1">
                                        <button
                                            type="button"
                                            onClick={() => setUserData({ ...userData, disabled: !userData.disabled })}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ring-2 ring-transparent ring-offset-2 ${userData.disabled ? 'bg-red-500' : 'bg-emerald-500'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${userData.disabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                        <span className={`text-sm font-bold ${userData.disabled ? 'text-red-500' : 'text-emerald-500'}`}>
                                            {userData.disabled ? 'Disabled' : 'Active'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 mt-6 border-t border-slate-50 dark:border-slate-700 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="bg-brand hover:bg-brand-600 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-xl shadow-brand/20 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {saving ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    ) : (
                                        <Save className="w-4 h-4" />
                                    )}
                                    Update Profile
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-4">Meta Information</h3>
                        <div className="space-y-4">
                            <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Account Created</div>
                                <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    {userData.creationTime ? new Date(userData.creationTime).toLocaleString() : 'N/A'}
                                </div>
                            </div>
                            <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Last Login Session</div>
                                <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    {userData.lastSignInTime ? new Date(userData.lastSignInTime).toLocaleString() : 'Never'}
                                </div>
                            </div>
                            <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Security Context</div>
                                <div className="flex items-center gap-2 mt-1">
                                    <Shield className="w-4 h-4 text-brand" />
                                    <span className="text-xs font-black uppercase text-brand tracking-wider bg-brand/5 px-2 py-1 rounded-md">
                                        RBAC Verified
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-3xl border border-amber-100 dark:border-amber-900/30">
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 mb-2">
                            <ShieldAlert className="w-5 h-5" />
                            <h4 className="text-sm font-black uppercase tracking-widest">Admin Notice</h4>
                        </div>
                        <p className="text-xs text-amber-700 dark:text-amber-500/80 leading-relaxed font-bold uppercase">
                            Changes to user roles affect custom security claims. The user may need to re-login to see all permission changes.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
