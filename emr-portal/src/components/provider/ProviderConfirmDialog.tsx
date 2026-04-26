"use client";

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ProviderConfirmDialogProps {
    open: boolean;
    title: string;
    description: string;
    confirming: boolean;
    confirmLabel?: string;
    cancelLabel?: string;
    onClose: () => void;
    onConfirm: () => Promise<void> | void;
}

export function ProviderConfirmDialog({
    open,
    title,
    description,
    confirming,
    confirmLabel = 'Proceed',
    cancelLabel = 'Cancel',
    onClose,
    onConfirm,
}: ProviderConfirmDialogProps) {
    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm"
            onClick={(event) => {
                if (event.target === event.currentTarget && !confirming) {
                    onClose();
                }
            }}
        >
            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-start justify-between bg-rose-600 px-6 py-5 text-white">
                    <div className="flex items-start gap-3">
                        <span className="mt-0.5 rounded-full bg-white/15 p-2">
                            <AlertTriangle className="h-5 w-5" />
                        </span>
                        <div>
                            <h2 className="text-lg font-black">{title}</h2>
                            <p className="mt-1 text-sm text-rose-100">{description}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={confirming}
                        className="rounded-lg p-1 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={confirming}
                        className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={() => void onConfirm()}
                        disabled={confirming}
                        className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-100 transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {confirming ? 'Processing...' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
