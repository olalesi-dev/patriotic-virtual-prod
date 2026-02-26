"use client";

import React from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { ShieldCheck } from 'lucide-react';

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-brand/5 rounded-full blur-3xl -mr-48 -mt-48 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-50 rounded-full blur-3xl -ml-48 -mb-48 pointer-events-none"></div>

            <div className="relative z-10 w-full flex flex-col items-center">
                <LoginForm />

                {/* Footer labels */}
                <div className="mt-12 flex items-center gap-6 opacity-30 grayscale saturate-0 pointer-events-none">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">AES-256 Encryption</span>
                    </div>
                    <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">HITRUST Certified</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
