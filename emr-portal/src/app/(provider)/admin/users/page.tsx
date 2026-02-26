"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Users, Plus, Search, MoreVertical, Shield, User,
    UserPlus, Mail, Key, Trash2, Edit2, ShieldAlert,
    CheckCircle2, XCircle, AlertCircle
} from 'lucide-react';

interface UserData {
    uid: string;
    email: string;
    displayName: string;
    role: string;
    disabled: boolean;
    creationTime: string;
    lastSignInTime: string;
}

export default function UserManagementPage() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        displayName: '',
        email: '',
        password: '',
        role: 'patient'
    });

    const [filterRole, setFilterRole] = useState<string | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/users');
            const data = await res.json();
            if (data.success) {
                setUsers(data.users);
            } else {
                throw new Error(data.error);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            setError(null);
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (data.success) {
                setIsCreateModalOpen(false);
                setFormData({ displayName: '', email: '', password: '', role: 'patient' });
                fetchUsers();
            } else {
                throw new Error(data.error);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleStatus = async (user: UserData) => {
        try {
            const res = await fetch(`/api/admin/users/${user.uid}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ disabled: !user.disabled })
            });
            const data = await res.json();
            if (data.success) {
                fetchUsers();
            }
        } catch (err: any) {
            alert('Failed to update user status');
        }
    };

    const handleDeleteUser = async (uid: string) => {
        if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return;
        try {
            const res = await fetch(`/api/admin/users/${uid}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                fetchUsers();
            }
        } catch (err: any) {
            alert('Failed to delete user');
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.displayName?.toLowerCase().includes(searchTerm.toLowerCase());

        const role = user.role?.toLowerCase() || '';
        const matchesRole = !filterRole ||
            (filterRole === 'disabled' ? user.disabled :
                filterRole === 'admin' ? ['admin', 'systems admin'].includes(role) :
                    filterRole === 'provider' ? ['doctor', 'provider'].includes(role) :
                        role === filterRole);

        return matchesSearch && matchesRole;
    });

    const getRoleBadge = (role: string) => {
        switch (role.toLowerCase()) {
            case 'admin':
            case 'systems admin':
                return <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">Admin</span>;
            case 'doctor':
            case 'provider':
                return <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">Provider</span>;
            default:
                return <span className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">Patient</span>;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Users className="w-6 h-6 text-brand" />
                        User Management
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage system access, roles, and security for all users.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-brand hover:bg-brand-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-brand/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    <UserPlus className="w-4 h-4" />
                    Add New User
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    label="Total Users"
                    value={users.length}
                    icon={Users}
                    color="text-brand"
                    bg="bg-brand/10"
                    active={filterRole === null}
                    onClick={() => setFilterRole(null)}
                />
                <StatCard
                    label="Admins"
                    value={users.filter(u => ['admin', 'systems admin'].includes(u.role?.toLowerCase())).length}
                    icon={Shield}
                    color="text-purple-500"
                    bg="bg-purple-500/10"
                    active={filterRole === 'admin'}
                    onClick={() => setFilterRole('admin')}
                />
                <StatCard
                    label="Providers"
                    value={users.filter(u => ['doctor', 'provider'].includes(u.role?.toLowerCase())).length}
                    icon={User}
                    color="text-blue-500"
                    bg="bg-blue-500/10"
                    active={filterRole === 'provider'}
                    onClick={() => setFilterRole('provider')}
                />
                <StatCard
                    label="Disabled"
                    value={users.filter(u => u.disabled).length}
                    icon={AlertCircle}
                    color="text-red-500"
                    bg="bg-red-500/10"
                    active={filterRole === 'disabled'}
                    onClick={() => setFilterRole('disabled')}
                />
            </div>

            {/* Main Table Container */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-4 bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Filter by name or email..."
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {filterRole && (
                        <button
                            onClick={() => setFilterRole(null)}
                            className="text-xs font-bold text-slate-400 hover:text-brand flex items-center gap-1 transition-colors"
                        >
                            <XCircle className="w-3 h-3" />
                            Clear filter: {filterRole}
                        </button>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-900/50 text-[11px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Created</th>
                                <th className="px-6 py-4">Last Login</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-6 py-4 h-16 bg-slate-100/10"></td>
                                    </tr>
                                ))
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <Users className="w-8 h-8 opacity-20" />
                                            <span>No users found</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.uid} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ring-2 ring-offset-2 ring-transparent group-hover:ring-brand/30 transition-all ${user.disabled ? 'bg-slate-100 text-slate-400' : 'bg-brand/10 text-brand dark:bg-brand/20'
                                                    }`}>
                                                    {user.displayName?.charAt(0) || user.email?.charAt(0)}
                                                </div>
                                                <div>
                                                    <Link
                                                        href={`/admin/users/${user.uid}`}
                                                        className={`font-bold text-sm hover:text-brand transition-colors ${user.disabled ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}
                                                    >
                                                        {user.displayName}
                                                    </Link>
                                                    <div className="text-xs text-slate-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                                        <td className="px-6 py-4">
                                            {user.disabled ? (
                                                <span className="flex items-center gap-1.5 text-[10px] font-black text-red-500 uppercase tracking-tight">
                                                    <XCircle className="w-3.5 h-3.5" /> Disabled
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-500 uppercase tracking-tight">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Active
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-slate-500">
                                            {user.creationTime ? new Date(user.creationTime).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-slate-500">
                                            {user.lastSignInTime ? new Date(user.lastSignInTime).toLocaleDateString() : 'Never'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => {
                                                        const confirmReset = confirm("Generate a password reset link for this user?");
                                                        if (!confirmReset) return;
                                                        fetch(`/api/admin/users/${user.uid}/reset`, { method: 'POST' })
                                                            .then(res => res.json())
                                                            .then(data => {
                                                                if (data.success) {
                                                                    alert(`Reset link generated: ${data.link}`);
                                                                } else {
                                                                    alert('Error: ' + data.error);
                                                                }
                                                            });
                                                    }}
                                                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Generate Reset Link"
                                                >
                                                    <Key className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleToggleStatus(user)}
                                                    className={`p-2 rounded-lg transition-colors ${user.disabled ? 'text-emerald-500 hover:bg-emerald-50' : 'text-orange-500 hover:bg-orange-50'}`}
                                                    title={user.disabled ? "Enable account" : "Disable account"}
                                                >
                                                    {user.disabled ? <CheckCircle2 className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(user.uid)}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete history"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create User Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-scale-up">
                        <div className="bg-brand p-6 text-white relative">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <UserPlus className="w-6 h-6" />
                                Create New Account
                            </h3>
                            <p className="text-brand-100 text-sm mt-1">Register a new user and assign their access hierarchy.</p>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                            {error && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm">
                                    <AlertCircle className="w-5 h-5 shrink-0" />
                                    {error}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            required
                                            type="text"
                                            placeholder="e.g. Dr. John Watson"
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                                            value={formData.displayName}
                                            onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            required
                                            type="email"
                                            placeholder="john@example.com"
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Initial Password</label>
                                    <div className="relative">
                                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            required
                                            type="password"
                                            placeholder="••••••••"
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                                            value={formData.password}
                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Access Role</label>
                                    <select
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                                        value={formData.role}
                                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        <option value="patient">Patient</option>
                                        <option value="provider">Provider (Doctor)</option>
                                        <option value="admin">Systems Administrator</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="flex-1 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 py-2.5 bg-brand hover:bg-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand/20 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Creating...' : 'Finalize Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ label, value, icon: Icon, color, bg, active, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className={`bg-white dark:bg-slate-800 p-5 rounded-2xl border transition-all text-left flex items-center gap-4 ${active
                ? 'border-brand ring-4 ring-brand/5 shadow-md shadow-brand/5'
                : 'border-slate-200 dark:border-slate-700 shadow-sm hover:border-slate-300 dark:hover:border-slate-600'
                }`}
        >
            <div className={`p-3 rounded-xl ${bg} ${color}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">{value}</div>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</div>
            </div>
        </button>
    );
}
