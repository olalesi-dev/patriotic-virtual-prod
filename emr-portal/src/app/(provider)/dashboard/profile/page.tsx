"use client";

import React from 'react';
import { User } from 'lucide-react';

export default function ProviderProfilePage() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 italic uppercase">Provider Profile</h1>

            <div className="bg-white dark:bg-slate-800 p-12 rounded-2xl border border-indigo-50 dark:border-slate-700 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-500">
                    <User className="w-10 h-10" />
                </div>
                <div className="space-y-1">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 uppercase italic">Coming soon</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">We are currently building this profile experience.</p>
                </div>
            </div>
        </div>
    );
}
