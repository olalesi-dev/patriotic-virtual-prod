"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Key, Copy, EyeOff, Eye, Plus, Sparkles, ShieldCheck, ArrowLeft, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function APIKeysClient() {
    const [keys, setKeys] = useState([
        { id: '1', name: 'Production Backend Services', prefix: 'pk_live_8fe9...', lastUsed: '5 mins ago', created: 'Oct 12, 2025' },
        { id: '2', name: 'Analytics Webhook Data', prefix: 'pk_live_2a4b...', lastUsed: '1 hour ago', created: 'Nov 01, 2025' },
        { id: '3', name: 'Staging Environment Test', prefix: 'pk_test_9c1d...', lastUsed: 'Yesterday', created: 'Nov 15, 2025' },
    ]);
    const [showKeyModal, setShowKeyModal] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [generatedKey, setGeneratedKey] = useState<string | null>(null);

    const generateKey = () => {
        if (!newKeyName.trim()) {
            toast.error('Please enter a name for the API key');
            return;
        }
        
        // Simulating key generation
        const newKeyVal = `pk_live_${Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)}`;
        setGeneratedKey(newKeyVal);
        
        setKeys([{
            id: Date.now().toString(),
            name: newKeyName,
            prefix: newKeyVal.substring(0, 12) + '...',
            lastUsed: 'Never',
            created: 'Just now'
        }, ...keys]);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('API Key copied to clipboard');
    };

    const revokeKey = (id: string, name: string) => {
        if (window.confirm(`Are you sure you want to revoke the key "${name}"? This action cannot be undone.`)) {
            setKeys(keys.filter(k => k.id !== id));
            toast.success('API Key revoked');
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <Link href="/admin/integrations" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-teal-600 transition-colors mb-4">
                        <ArrowLeft className="w-4 h-4" /> Back to Integrations Hub
                    </Link>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
                        <Key className="w-8 h-8 text-teal-600" /> API Keys & Webhooks
                    </h1>
                    <p className="text-slate-500 font-medium mt-2">Manage secure credentials for backend systems and external integrations.</p>
                </div>
                <button 
                    onClick={() => {
                        setNewKeyName('');
                        setGeneratedKey(null);
                        setShowKeyModal(true);
                    }}
                    className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 px-6 py-2.5 rounded-xl font-bold transition-transform active:scale-95"
                >
                    <Plus className="w-5 h-5" /> Generate New Key
                </button>
            </header>

            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Active Secret Keys</h2>
                    <span className="text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> High Security Area
                    </span>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50">
                            <tr>
                                <th className="px-8 py-4 font-bold border-b dark:border-slate-700">Name / Description</th>
                                <th className="px-8 py-4 font-bold border-b dark:border-slate-700">Token Prefix</th>
                                <th className="px-8 py-4 font-bold border-b dark:border-slate-700">Last Used</th>
                                <th className="px-8 py-4 font-bold border-b dark:border-slate-700">Created</th>
                                <th className="px-8 py-4 font-bold border-b dark:border-slate-700 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-slate-700 dark:text-slate-300 font-medium">
                            {keys.map(key => (
                                <tr key={key.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-8 py-4 whitespace-nowrap font-bold text-slate-900 dark:text-white">
                                        {key.name}
                                    </td>
                                    <td className="px-8 py-4 font-mono text-slate-500">
                                        <div className="flex items-center gap-2">
                                            <Key className="w-3.5 h-3.5 text-slate-400" />
                                            {key.prefix}
                                        </div>
                                    </td>
                                    <td className="px-8 py-4 text-slate-500">{key.lastUsed}</td>
                                    <td className="px-8 py-4 text-slate-500">{key.created}</td>
                                    <td className="px-8 py-4 text-right">
                                        <button 
                                            onClick={() => revokeKey(key.id, key.name)}
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ml-auto"
                                            title="Revoke Key"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL */}
            {showKeyModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden relative">
                        {/* Header */}
                        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <Key className="w-6 h-6 text-teal-600" /> 
                                {generatedKey ? "Save Your Secret Key" : "Generate API Key"}
                            </h3>
                            <p className="text-slate-500 font-medium text-sm mt-1">
                                {generatedKey 
                                    ? "Please copy this key now. You will not be able to see it again." 
                                    : "Create a new secret key for authenticating API requests."}
                            </p>
                        </div>

                        {/* Body */}
                        <div className="p-8">
                            {!generatedKey ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Key Name</label>
                                        <input 
                                            type="text" 
                                            value={newKeyName}
                                            onChange={(e) => setNewKeyName(e.target.value)}
                                            placeholder="e.g. Production Data Sync"
                                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 transition-shadow outline-none dark:text-white"
                                            autoFocus
                                        />
                                    </div>
                                    <button 
                                        onClick={generateKey}
                                        className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-teal-500/30 mt-6 transition-transform active:scale-95"
                                    >
                                        <Sparkles className="w-5 h-5" /> Generate Secret Key
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800/50">
                                        <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
                                            Make sure to copy your new secret key now. You won't be able to see it again!
                                        </p>
                                    </div>
                                    <div className="relative group">
                                        <input 
                                            type="text" 
                                            readOnly 
                                            value={generatedKey}
                                            className="w-full pl-4 pr-16 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm text-slate-900 dark:text-white outline-none selection:bg-teal-200 dark:selection:bg-teal-900"
                                        />
                                        <button 
                                            onClick={() => copyToClipboard(generatedKey)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-teal-600 hover:border-teal-500 p-2 rounded-lg transition-colors shadow-sm"
                                            title="Copy to clipboard"
                                        >
                                            <Copy className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <button 
                                        onClick={() => setShowKeyModal(false)}
                                        className="w-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-3 rounded-xl font-bold mt-2 transition-colors"
                                    >
                                        I've saved it securely
                                    </button>
                                </div>
                            )}
                        </div>
                        
                        {!generatedKey && (
                            <button 
                                onClick={() => setShowKeyModal(false)}
                                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
