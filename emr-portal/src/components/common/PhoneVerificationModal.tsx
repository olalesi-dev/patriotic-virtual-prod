"use client";

import React from 'react';
import { Loader2, ShieldCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import { auth } from '@/lib/firebase';
import { getApiUrl } from '@/lib/api-origin';

interface PhoneVerificationModalProps {
    open: boolean;
    phoneNumber: string;
    onClose: () => void;
    onVerified: () => void;
}

async function authedFetch(path: string, body: Record<string, unknown>) {
    const token = await auth.currentUser?.getIdToken();
    const response = await fetch(getApiUrl(path), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token ?? ''}`
        },
        body: JSON.stringify(body)
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error || 'Phone verification request failed.');
    }

    return payload;
}

export function PhoneVerificationModal({ open, phoneNumber, onClose, onVerified }: PhoneVerificationModalProps) {
    const [code, setCode] = React.useState('');
    const [sending, setSending] = React.useState(false);
    const [verifying, setVerifying] = React.useState(false);
    const [codeSent, setCodeSent] = React.useState(false);

    React.useEffect(() => {
        if (!open) {
            setCode('');
            setSending(false);
            setVerifying(false);
            setCodeSent(false);
        }
    }, [open]);

    if (!open) return null;

    const handleSendCode = async () => {
        setSending(true);
        try {
            await authedFetch('/api/v1/phone-verification/request', { phoneNumber });
            setCodeSent(true);
            toast.success('Verification code sent.');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to send verification code.');
        } finally {
            setSending(false);
        }
    };

    const handleVerify = async () => {
        setVerifying(true);
        try {
            await authedFetch('/api/v1/phone-verification/verify', { phoneNumber, code });
            toast.success('Phone number verified.');
            onVerified();
            onClose();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Verification failed.');
        } finally {
            setVerifying(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Phone Verification</p>
                        <h2 className="mt-1 text-xl font-black text-slate-900">Verify your phone number</h2>
                        <p className="mt-2 text-sm font-medium text-slate-500">We’ll send a verification code to `{phoneNumber}`.</p>
                    </div>
                    <button onClick={onClose} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="space-y-4 px-6 py-5">
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm font-medium text-slate-600">
                        Changing your phone number requires a new verification before SMS reminders can be sent.
                    </div>

                    {codeSent && (
                        <label className="block space-y-2">
                            <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Verification Code</span>
                            <input
                                value={code}
                                onChange={(event) => setCode(event.target.value)}
                                placeholder="Enter the code"
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
                            />
                        </label>
                    )}
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-5">
                    <button
                        onClick={handleSendCode}
                        disabled={sending || !phoneNumber}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                        {codeSent ? 'Resend Code' : 'Send Code'}
                    </button>
                    <button
                        onClick={handleVerify}
                        disabled={!codeSent || code.trim().length === 0 || verifying}
                        className="inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand/90 disabled:opacity-50"
                    >
                        {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                        Verify Number
                    </button>
                </div>
            </div>
        </div>
    );
}
