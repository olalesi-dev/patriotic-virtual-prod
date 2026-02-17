"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import {
    User, Globe, Palette, Lock, ChevronRight, Edit2, Info, Monitor, Moon, Sun, Shield
} from 'lucide-react';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('Details');

    return (
        <div className="font-sans text-slate-900 max-w-6xl mx-auto">

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-4 font-medium">
                <Link href="/settings" className="hover:text-brand">Settings</Link>
                <ChevronRight className="w-4 h-4" />
                <span className="text-slate-900">My Profile</span>
            </div>

            {/* Page Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                    <User className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 mb-8">
                <div className="flex gap-8">
                    {['Details', 'Services and availability', 'Connected apps', 'Notifications'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-3 text-sm font-bold border-b-2 transition-colors px-1 ${activeTab === tab
                                    ? 'border-brand text-brand'
                                        .replace('brand', 'indigo-600') // Ensuring brand color match
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* MAIN CONTENT GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* LEFT COLUMN: Personal Details */}
                <div className="lg:col-span-2 space-y-6">
                    <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 relative">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-2">
                                <User className="w-5 h-5 text-slate-400" />
                                <h2 className="text-lg font-bold text-slate-800">Personal details</h2>
                            </div>
                            <button className="text-sm font-bold text-brand hover:text-indigo-700 transition-colors">Edit</button>
                        </div>

                        {/* Avatar */}
                        <div className="flex justify-center mb-8">
                            <div className="w-32 h-32 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-4xl font-bold shadow-inner">
                                DO
                            </div>
                        </div>

                        {/* Fields Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 font-medium">First name</label>
                                <div className="text-sm font-bold text-slate-900">Dayo</div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 font-medium">Last name</label>
                                <div className="text-sm font-bold text-slate-900">Olufolaju</div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 font-medium">Email</label>
                                <div className="text-sm font-medium text-slate-900">dayoolufolaju@gmail.com</div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 font-medium">Phone number</label>
                                <div className="text-sm font-medium text-slate-900">+1 (202) 215-0636</div>
                            </div>
                            <div className="space-y-1 md:col-span-2">
                                <label className="text-xs text-slate-400 font-medium">Password</label>
                                <div className="text-sm font-black text-slate-900 tracking-widest">••••••••</div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* RIGHT COLUMN: Settings */}
                <div className="space-y-6">

                    {/* Language & Timezone */}
                    <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2">
                                <Globe className="w-5 h-5 text-slate-400" />
                                <h2 className="text-lg font-bold text-slate-800">Language and timezone</h2>
                            </div>
                            <button className="text-sm font-bold text-brand hover:text-indigo-700 transition-colors">Edit</button>
                        </div>
                        <p className="text-xs text-slate-400 mb-6">Manage settings for your language and timezone</p>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 font-medium">Language</label>
                                <div className="text-sm font-medium text-slate-900">English (US)</div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 font-medium">Timezone</label>
                                <div className="text-sm font-medium text-slate-900">America/New_York</div>
                            </div>
                        </div>
                    </section>

                    {/* Theme */}
                    <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2">
                                <Palette className="w-5 h-5 text-slate-400" />
                                <h2 className="text-lg font-bold text-slate-800">Theme</h2>
                            </div>
                            <button className="text-sm font-bold text-brand hover:text-indigo-700 transition-colors">Edit</button>
                        </div>
                        <p className="text-xs text-slate-400 mb-6">Choose between light and dark mode, and customize preferences</p>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 font-medium">Color mode</label>
                                <div className="text-sm font-bold text-slate-900">Light</div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 font-medium">Theme</label>
                                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                                    <div className="w-4 h-4 rounded-full bg-[#7242EE]"></div>
                                    <span>Carepatron #7242EE</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* MFA */}
                    <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Lock className="w-5 h-5 text-slate-400" />
                            <h2 className="text-lg font-bold text-slate-800">Multi-Factor Authentication (MFA)</h2>
                        </div>

                        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                            Secure your account by enabling Multi-Factor Authentication (MFA) for an extra layer of protection. Verify your identity through a secondary method to prevent unauthorized access.
                        </p>

                        <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-4 flex gap-3">
                            <Info className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                            <div className="text-xs text-indigo-900 leading-relaxed">
                                MFA is only available for email and password logins. To make changes to your MFA settings,
                                <span className="font-bold underline cursor-pointer ml-1">log in using your email and password.</span>
                                <span className="underline ml-1 cursor-pointer text-indigo-700">Learn more</span>
                            </div>
                        </div>
                    </section>

                </div>
            </div>

            {/* FLOATING ACTION BUTTONS (Mock) */}
            <div className="fixed right-6 bottom-1/2 translate-y-1/2 flex flex-col gap-3">
                {/* These would be part of a global layout ideally */}
                {/* Just rendering placeholders for completeness with screenshot concept */}
            </div>

        </div>
    );
}
