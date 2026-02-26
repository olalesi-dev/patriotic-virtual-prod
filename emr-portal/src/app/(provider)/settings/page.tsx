"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import {
    User, Globe, Palette, Lock, ChevronRight, Edit2, Info, Monitor, Moon, Sun, Shield,
    Calendar, Mail, Video, Layout, MessageSquare, CheckSquare, CreditCard, Bell,
    Trash2, Copy, Plus, MoreVertical, X, Check, ExternalLink
} from 'lucide-react';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('Details');

    const renderDetails = () => (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
            {/* LEFT COLUMN: Personal Details */}
            <div className="lg:col-span-2 space-y-6">
                <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 relative">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-2">
                            <User className="w-5 h-5 text-slate-400" />
                            <h2 className="text-lg font-bold text-slate-800">Personal details</h2>
                        </div>
                        <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors">Edit</button>
                    </div>

                    {/* Avatar */}
                    <div className="flex justify-center mb-8">
                        <div className="w-32 h-32 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-4xl font-bold shadow-inner border-4 border-white">
                            DO
                        </div>
                    </div>

                    {/* Fields Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">First name</label>
                            <div className="text-sm font-bold text-slate-900">Dayo</div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">Last name</label>
                            <div className="text-sm font-bold text-slate-900">Olufolaju</div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">Email</label>
                            <div className="text-sm font-medium text-slate-900">dayoolufolaju@gmail.com</div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">Phone number</label>
                            <div className="text-sm font-medium text-slate-900">+1 (202) 215-0636</div>
                        </div>
                        <div className="space-y-1 md:col-span-2">
                            <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">Password</label>
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
                        <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors">Edit</button>
                    </div>
                    <p className="text-xs text-slate-400 mb-6 font-medium">Manage settings for your language and timezone</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-medium tracking-wider">Language</label>
                            <div className="text-sm font-medium text-slate-900">English (US)</div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-medium tracking-wider">Timezone</label>
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
                        <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors">Edit</button>
                    </div>
                    <p className="text-xs text-slate-400 mb-6 font-medium">Choose between light and dark mode, and customize preferences</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-medium tracking-wider">Color mode</label>
                            <div className="text-sm font-bold text-slate-900">Light</div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-medium tracking-wider">Theme</label>
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
                    <p className="text-xs text-slate-500 mb-6 leading-relaxed font-medium">
                        Secure your account by enabling Multi-Factor Authentication (MFA) for an extra layer of protection. Verify your identity through a secondary method to prevent unauthorized access.
                    </p>
                    <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex gap-3">
                        <Info className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-indigo-900 leading-relaxed font-medium">
                            MFA is only available for email and password logins. To make changes to your MFA settings,
                            <span className="font-bold underline cursor-pointer ml-1">log in using your email and password.</span>
                            <span className="underline ml-1 cursor-pointer text-indigo-700">Learn more</span>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );

    const renderServicesAvailability = () => (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-500">
            {/* LEFT: Assigned Services (Span 5) */}
            <div className="lg:col-span-5 space-y-6">
                <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                            <Layout className="w-5 h-5 text-slate-400" />
                            <h2 className="text-lg font-bold text-slate-800">Assigned services</h2>
                        </div>
                        <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700">Edit</button>
                    </div>
                    <p className="text-xs text-slate-400 mb-6 font-medium">
                        View and manage your assigned services, adjusting the prices to reflect your custom rates.
                    </p>
                    <div className="py-12 flex flex-col items-center justify-center text-center opacity-40">
                        <CheckSquare className="w-12 h-12 text-slate-300 mb-3" />
                        <p className="text-sm text-slate-400 font-medium">Individualized services will appear here</p>
                    </div>
                </section>
            </div>

            {/* RIGHT: Overrides & Availability (Span 7) */}
            <div className="lg:col-span-7 space-y-6">
                {/* Date specific hours */}
                <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 font-sans">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-slate-400" />
                            <h2 className="text-lg font-bold text-slate-800">Date specific hours</h2>
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 mb-6 font-medium">
                        Add dates when your availability changes from your scheduled hours or to offer a service on a specific date.
                    </p>
                    <div className="flex gap-4 border-b border-slate-100 mb-6">
                        <button className="pb-3 text-sm font-bold text-indigo-600 border-b-2 border-indigo-600 px-1">Upcoming</button>
                        <button className="pb-3 text-sm font-bold text-slate-400 px-1">Past</button>
                    </div>
                    <div className="py-2 text-sm text-slate-500 font-medium italic mb-6">
                        No date overrides have been found.
                    </div>
                    <button className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:underline">
                        <Plus className="w-4 h-4" /> New date override
                    </button>
                </section>

                {/* Availability */}
                <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 overflow-hidden">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                            <Monitor className="w-5 h-5 text-slate-400" />
                            <h2 className="text-lg font-bold text-slate-800">Availability</h2>
                        </div>
                        <div className="flex items-center gap-3">
                            <button className="p-1 hover:bg-slate-50 rounded text-slate-400 transition-colors"><Edit2 className="w-4 h-4" /></button>
                            <button className="p-1 hover:bg-slate-50 rounded text-slate-400 transition-colors"><Copy className="w-4 h-4" /></button>
                            <button className="p-1 hover:bg-slate-50 rounded text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 mb-6 font-medium">
                        Create schedules based on your availability and desired service offerings at specific times to determine your online booking availability.
                    </p>

                    <div className="bg-indigo-50/70 border border-indigo-100 rounded-lg p-4 flex gap-3 mb-6">
                        <Info className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-indigo-900 leading-relaxed font-medium">
                            Services offering group events should use a new schedule to reduce the available hours that can be booked by clients online.
                        </p>
                    </div>

                    <div className="flex gap-4 border-b border-slate-100 mb-6">
                        <div className="flex items-center gap-1 pb-3 px-1 border-b-2 border-indigo-600">
                            <span className="text-sm font-bold text-indigo-600">Working Hours</span>
                        </div>
                        <button className="pb-3 text-sm font-bold text-slate-400 px-1 flex items-center gap-1 hover:text-slate-600">
                            <Plus className="w-4 h-4" /> New
                        </button>
                    </div>

                    <div className="space-y-4 font-sans mb-8">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Schedule name</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-slate-800">Working Hours</span>
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase">Active</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Start date</label>
                                <div className="text-sm font-medium text-slate-700">No date set</div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">End date</label>
                                <div className="text-sm font-medium text-slate-700">No date set</div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Repeats</label>
                                <div className="text-sm font-medium text-slate-700">Weekly</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Timezone</label>
                                <div className="text-sm font-medium text-slate-700">(EST) America/New_York</div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Service</label>
                                <div className="text-sm font-medium text-slate-700">All services</div>
                            </div>
                        </div>
                    </div>

                    {/* Weekly Schedule Table */}
                    <div className="space-y-3 pt-4 border-t border-slate-50">
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
                            <div key={day} className="flex items-center justify-between group py-1">
                                <div className="text-sm font-bold text-slate-800 w-32">{day}</div>
                                <div className="flex flex-1 items-center gap-12">
                                    <span className="text-sm font-medium text-slate-600">09:00am — 05:00pm</span>
                                    <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Video className="w-3 h-3" /> Video call
                                    </span>
                                </div>
                            </div>
                        ))}
                        {['Saturday', 'Sunday'].map(day => (
                            <div key={day} className="flex items-center justify-between py-1">
                                <div className="text-sm font-bold text-slate-400 w-32">{day}</div>
                                <div className="flex-1 text-sm font-medium text-slate-400 italic">Unavailable</div>
                            </div>
                        ))}
                    </div>

                    <button className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:underline mt-8">
                        <Plus className="w-4 h-4" /> New schedule
                    </button>
                </section>
            </div>
        </div>
    );

    const renderConnectedApps = () => (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-2 mb-2">
                <Layout className="w-5 h-5 text-indigo-600" />
                <h2 className="text-xl font-bold text-slate-800">Connected apps</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                    { name: 'Gmail', desc: 'Add Gmail accounts or Google group list', icon: '/google-icon.png', color: 'bg-red-50' },
                    { name: 'Google Calendar', desc: 'Add calendars accounts or Google group list', icon: '/gcal-icon.png', color: 'bg-indigo-50' },
                    { name: 'Microsoft Outlook', desc: 'Add a Outlook, Office365 or Exchange account', icon: '/outlook-icon.png', color: 'bg-blue-50' },
                    { name: 'Microsoft Calendar', desc: 'Add a Outlook, Office365 or Exchange account', icon: '/ms-icon.png', color: 'bg-blue-100' },
                    { name: 'Zoom', desc: 'Zoom', icon: '/zoom-icon.png', color: 'bg-sky-50' }
                ].map(app => (
                    <div key={app.name} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col h-full hover:border-indigo-300 transition-all group">
                        <div className="flex gap-4 mb-auto">
                            <div className={`w-12 h-12 rounded-lg ${app.color} flex items-center justify-center font-bold text-xl`}>
                                {app.name[0]}
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-bold text-slate-800">{app.name}</h3>
                                <p className="text-xs text-slate-400 leading-relaxed font-medium">{app.desc}</p>
                            </div>
                        </div>
                        <button className="mt-6 w-full py-2.5 rounded-lg border border-slate-200 text-sm font-bold text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all flex items-center justify-center gap-2">
                            Connect <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderNotifications = () => (
        <div className="animate-in fade-in duration-500">
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-5xl">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-2">
                        <Bell className="w-5 h-5 text-slate-400" />
                        <h2 className="text-lg font-bold text-slate-800">Notification preferences</h2>
                    </div>
                    <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700">Edit</button>
                </div>

                <p className="text-xs text-slate-400 mb-8 font-medium italic">
                    Choose the notifications you\'d like to receive for activities and recommendations.
                </p>

                <div className="space-y-8">
                    {[
                        {
                            title: 'Scheduling',
                            type: 'In-app',
                            desc: 'Receive notifications when a team member or client books, reschedules, or cancels their appointment.',
                            icon: <Calendar className="w-4 h-4" />,
                            inApp: 'Yes', email: null
                        },
                        {
                            title: 'Practitioner scheduling',
                            type: 'Email',
                            desc: 'Receive notifications for appointments that you have created, rescheduled, or cancelled yourself.',
                            icon: <Calendar className="w-4 h-4" />,
                            inApp: 'No', email: 'Yes'
                        },
                        {
                            title: 'Billing and payment',
                            type: 'In-app',
                            desc: 'Receive notifications for client payment updates and reminders.',
                            icon: <CreditCard className="w-4 h-4" />,
                            inApp: 'Yes', email: null
                        },
                        {
                            title: 'Client and documentation',
                            type: 'In-app',
                            desc: 'Receive notifications for client assignments, form responses, shared notes, file uploads, and transcription updates.',
                            icon: <User className="w-4 h-4" />,
                            inApp: 'Yes', email: null
                        },
                        {
                            title: 'Workspace',
                            type: 'In-app',
                            desc: 'Receive notifications for system changes, issues, data transfers and subscription reminders.',
                            icon: <Monitor className="w-4 h-4" />,
                            inApp: 'Yes', email: null
                        },
                        {
                            title: 'Communications',
                            type: 'In-app',
                            desc: 'Receive notifications for inbox and updates from your connected channels',
                            icon: <MessageSquare className="w-4 h-4" />,
                            inApp: 'Yes', email: null
                        },
                    ].map(item => (
                        <div key={item.title} className="flex gap-4">
                            <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 flex-shrink-0">
                                {item.icon}
                            </div>
                            <div className="flex-1 space-y-4">
                                <div>
                                    <h3 className="text-[15px] font-bold text-indigo-700 flex items-center gap-2">
                                        {item.title}
                                        <span className="text-[10px] text-slate-300">•</span>
                                        <span className="text-[13px] font-medium text-indigo-600">{item.type}</span>
                                    </h3>
                                    <p className="text-[13px] text-slate-400 font-medium leading-relaxed max-w-3xl mt-0.5">
                                        {item.desc}
                                    </p>
                                </div>

                                <div className="flex gap-12">
                                    <div className="space-y-1">
                                        <div className="text-[11px] font-bold text-slate-400 tracking-wider">In-app</div>
                                        <div className={`text-[13px] font-bold ${item.inApp === 'Yes' ? 'text-emerald-500' : 'text-slate-300'}`}>
                                            {item.inApp}
                                        </div>
                                    </div>
                                    {item.email && (
                                        <div className="space-y-1">
                                            <div className="text-[11px] font-bold text-slate-400 tracking-wider font-sans uppercase">Email</div>
                                            <div className="text-[13px] font-bold text-emerald-500">
                                                {item.email}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );

    return (
        <div className="font-sans text-slate-900 max-w-7xl mx-auto px-4 lg:px-8 py-8">

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-6 font-bold uppercase tracking-widest">
                <Link href="/settings" className="hover:text-indigo-600 transition-colors">Settings</Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-slate-900">My Profile</span>
            </div>

            {/* Page Header */}
            <div className="flex items-center gap-4 mb-8">
                <div className="p-2.5 bg-slate-100 rounded-xl text-slate-600 shadow-sm border border-slate-200">
                    <User className="w-6 h-6" />
                </div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">My Profile</h1>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 mb-10 overflow-x-auto">
                <div className="flex gap-10 whitespace-nowrap">
                    {['Details', 'Services and availability', 'Connected apps', 'Notifications'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-4 text-sm font-bold border-b-2 transition-all px-1 tracking-tight ${activeTab === tab
                                ? 'border-indigo-600 text-indigo-600 translate-y-[1px]'
                                : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <main className="min-h-[600px] mb-20">
                {activeTab === 'Details' && renderDetails()}
                {activeTab === 'Services and availability' && renderServicesAvailability()}
                {activeTab === 'Connected apps' && renderConnectedApps()}
                {activeTab === 'Notifications' && renderNotifications()}
            </main>
        </div>
    );
}
