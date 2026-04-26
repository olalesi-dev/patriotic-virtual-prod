"use client";

import React from 'react';
import { X } from 'lucide-react';
import { formatDateForInput, formatTimeForInput, validateFutureAppointmentInput } from '@/lib/provider-appointment-actions';

interface ProviderRescheduleModalProps {
    open: boolean;
    appointmentLabel: string;
    initialDateTime: string | Date | null | undefined;
    submitting: boolean;
    error: string | null;
    onClose: () => void;
    onSubmit: (payload: { date: string; time: string }) => Promise<void> | void;
}

function todayDateInput(): string {
    return formatDateForInput(new Date());
}

export function ProviderRescheduleModal({
    open,
    appointmentLabel,
    initialDateTime,
    submitting,
    error,
    onClose,
    onSubmit,
}: ProviderRescheduleModalProps) {
    const [date, setDate] = React.useState('');
    const [time, setTime] = React.useState('');
    const [localError, setLocalError] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (!open) return;
        setDate(formatDateForInput(initialDateTime));
        setTime(formatTimeForInput(initialDateTime));
        setLocalError(null);
    }, [initialDateTime, open]);

    if (!open) return null;

    const handleSubmit = async () => {
        const validationError = validateFutureAppointmentInput(date, time);
        if (validationError) {
            setLocalError(validationError);
            return;
        }

        setLocalError(null);
        await onSubmit({ date, time });
    };

    return (
        <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm"
            onClick={(event) => {
                if (event.target === event.currentTarget && !submitting) {
                    onClose();
                }
            }}
        >
            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-start justify-between bg-indigo-600 px-6 py-5 text-white">
                    <div>
                        <h2 className="text-lg font-black">Reschedule Appointment</h2>
                        <p className="mt-1 text-sm text-indigo-100">{appointmentLabel}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="rounded-lg p-1 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-4 px-6 py-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-700">Date</label>
                            <input
                                type="date"
                                min={todayDateInput()}
                                value={date}
                                onChange={(event) => setDate(event.target.value)}
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-700">Time</label>
                            <input
                                type="time"
                                value={time}
                                onChange={(event) => setTime(event.target.value)}
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                        </div>
                    </div>

                    {(localError || error) && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                            {localError ?? error}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleSubmit()}
                        disabled={submitting}
                        className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-100 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {submitting ? 'Saving...' : 'Save Reschedule'}
                    </button>
                </div>
            </div>
        </div>
    );
}
