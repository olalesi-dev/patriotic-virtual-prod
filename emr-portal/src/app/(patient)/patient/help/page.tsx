"use client";

import React from 'react';

export default function HelpPage() {
    return (
        <div className="p-8">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-4">Support & Help</h1>
            <div className="bg-white p-12 rounded-[40px] shadow-xl border border-slate-100 text-center">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mx-auto mb-6">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Need Assistance?</h2>
                <p className="text-slate-500 font-medium">Please reach out to our 24/7 support line at support@patriotic-emr.io or check our documentation.</p>
            </div>
        </div>
    );
}
