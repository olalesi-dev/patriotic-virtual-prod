"use client";

import React from 'react';

export default function ProviderProfilePage() {
    return (
        <div className="p-8">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-4">Provider Profile</h1>
            <div className="bg-white p-12 rounded-[40px] shadow-xl border border-indigo-50 text-center">
                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500 mx-auto mb-6">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">My Professional Profile</h2>
                <p className="text-slate-500 font-medium">Coming soon: manage your credentials, clinical specialty, and linked organizations.</p>
            </div>
        </div>
    );
}
