"use client";

import React, { useState, useEffect } from 'react';
import { ShieldCheck, ArrowLeft, Users, Plus, Edit2, Trash2, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useModuleAccessStore } from '@/hooks/useModuleAccess';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';

const PLATFORM_MODULES = [
    'Favorites',
    'Clinical',
    'CRM',
    'Social',
    'Orders & Rx',
    'Services',
    'Specialty Modules',
    'AI Tools',
    'Analytics',
    'Admin',
    'Integrations'
];

const DEFAULT_ROLES = ['Admin', 'Provider', 'Staff', 'Radiologist', 'Patient'];

export default function ModuleManagementClient() {
    const router = useRouter();
    const { matrix, toggleAccess } = useModuleAccessStore();
    const [personaGroups, setPersonaGroups] = useState<any[]>([]);
    const [isEditingGroup, setIsEditingGroup] = useState<any>(null);
    const [systemRoles, setSystemRoles] = useState<string[]>(DEFAULT_ROLES);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'personaGroups'), (snap) => {
            const groups = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setPersonaGroups(groups);

            // Compute unique roles across matrix and persona groups to display columns
            const rolesSet = new Set(DEFAULT_ROLES);
            groups.forEach((g: any) => g.roles?.forEach((r: string) => rolesSet.add(r)));
            Object.values(matrix).forEach(moduleRoles => {
                Object.keys(moduleRoles).forEach(r => rolesSet.add(r));
            });
            setSystemRoles(Array.from(rolesSet));
        });
        return () => unsub();
    }, [matrix]);

    const handleSaveGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const name = formData.get('name') as string;
        const description = formData.get('description') as string;
        const rolesInput = formData.get('roles') as string;
        
        const roles = rolesInput.split(',').map(r => r.trim()).filter(Boolean);

        if (!name || roles.length === 0) {
            toast.error('Name and at least one role are required');
            return;
        }

        const id = isEditingGroup?.id || `pg_${Date.now()}`;
        
        try {
            await setDoc(doc(db, 'personaGroups', id), {
                name,
                description,
                roles,
                updatedAt: new Date().toISOString()
            }, { merge: true });
            toast.success('Persona Group saved');
            setIsEditingGroup(null);
        } catch (e) {
            toast.error('Failed to save group');
        }
    };

    const handleDeleteGroup = async (id: string) => {
        if (!confirm('Are you sure you want to delete this Persona Group? Users assigned to it will lose these inherited roles.')) return;
        try {
            await deleteDoc(doc(db, 'personaGroups', id));
            toast.success('Persona Group deleted');
        } catch (e) {
            toast.error('Failed to delete group');
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8 max-w-7xl mx-auto">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                <div className="relative z-10 flex gap-4">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-2xl flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <ShieldCheck className="w-8 h-8 text-slate-500" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Module Management</h1>
                        </div>
                        <p className="text-slate-500 font-medium">Configure advanced Role-Based Access Control (RBAC) and Persona Groups.</p>
                    </div>
                </div>
                <div className="relative z-10">
                    <button
                        onClick={() => router.back()}
                        className="px-6 py-2.5 bg-slate-100 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-200 transition-all flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" /> Go Back
                    </button>
                </div>
            </header>

            {/* Matrix Section */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Module Access Matrix</h2>
                    <p className="text-sm text-slate-500">Toggle which roles have access to each platform module. If a module has NO roles checked, it is accessible to everyone (fail open) for backwards compatibility. If at least one role is checked, only those roles can access it.</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400">
                            <tr>
                                <th className="p-4 font-bold border-b dark:border-slate-700 min-w-[200px]">Module / Section</th>
                                {systemRoles.map(role => (
                                    <th key={role} className="p-4 font-bold border-b dark:border-slate-700 text-center">{role}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {PLATFORM_MODULES.map(moduleName => (
                                <tr key={moduleName} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="p-4 font-bold text-slate-900 dark:text-slate-200">{moduleName}</td>
                                    {systemRoles.map(role => {
                                        const isEnabled = matrix[moduleName]?.[role] || false;
                                        return (
                                            <td key={`${moduleName}-${role}`} className="p-4 text-center">
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={isEnabled}
                                                        onChange={() => toggleAccess(moduleName, role, !isEnabled)}
                                                    />
                                                    <div className={`w-9 h-5 rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-300 transition-colors ${isEnabled ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'} after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all ${isEnabled ? 'after:translate-x-full after:border-white' : 'after:border-gray-300'}`}></div>
                                                </label>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Persona Groups Section */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-indigo-500" />
                            Persona Groups
                        </h2>
                        <p className="text-sm text-slate-500">Group multiple roles together to assign to users quickly.</p>
                    </div>
                    <button 
                        onClick={() => setIsEditingGroup({})}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-2 transition-all shadow-md"
                    >
                        <Plus className="w-4 h-4" /> Create Group
                    </button>
                </div>
                
                {isEditingGroup && (
                    <div className="p-6 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                        <form onSubmit={handleSaveGroup} className="space-y-4 max-w-2xl">
                            <h3 className="font-bold text-lg">{isEditingGroup.id ? 'Edit Persona Group' : 'New Persona Group'}</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Group Name</label>
                                    <input name="name" defaultValue={isEditingGroup.name} required className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" placeholder="e.g. Super Admin" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Description</label>
                                    <input name="description" defaultValue={isEditingGroup.description} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" placeholder="What does this group do?" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Roles (comma separated)</label>
                                    <input name="roles" defaultValue={(isEditingGroup.roles || []).join(', ')} required className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" placeholder="Admin, Provider, CustomRole" />
                                    <p className="text-xs text-slate-500 mt-1">These roles will be dynamically granted to any user in this group.</p>
                                </div>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button type="submit" className="px-6 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-xl">Save Group</button>
                                <button type="button" onClick={() => setIsEditingGroup(null)} className="px-6 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl">Cancel</button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {personaGroups.map(group => (
                        <div key={group.id} className="border border-slate-200 dark:border-slate-700 rounded-2xl p-5 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow relative group">
                            <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setIsEditingGroup(group)} className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded-md hover:bg-indigo-100 text-slate-500 hover:text-indigo-600 transition-colors">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDeleteGroup(group.id)} className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded-md hover:bg-red-100 text-slate-500 hover:text-red-600 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-4">
                                <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">{group.name}</h3>
                            <p className="text-sm text-slate-500 mt-1 mb-4 h-10 overflow-hidden line-clamp-2">{group.description}</p>
                            
                            <div className="flex flex-wrap gap-1.5">
                                {group.roles?.map((role: string) => (
                                    <span key={role} className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                                        {role}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                    {personaGroups.length === 0 && !isEditingGroup && (
                        <div className="col-span-full py-12 text-center text-slate-500">
                            <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p className="font-bold">No Persona Groups configured.</p>
                            <p className="text-sm">Create a group to easily assign multiple roles to users.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
