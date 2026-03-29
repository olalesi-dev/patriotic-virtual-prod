'use client';

import React, { useDeferredValue, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useRouter, useSearchParams } from 'next/navigation';
import { Bell, ExternalLink, Loader2, Pill, Search, ShieldCheck, UserRound, Users } from 'lucide-react';
import { DoseSpotFrame } from '@/components/telehealth/DoseSpotFrame';
import { useAuthUser } from '@/hooks/useAuthUser';
import { auth } from '@/lib/firebase';
import { db } from '@/lib/firebase';
import { apiFetchJson } from '@/lib/api-client';
import { getDoseSpotApiUrl } from '@/lib/dosespot-client';
import type { PatientRegistryResponse, PatientRegistryRow } from '@/lib/patient-registry-types';

interface PatientSearchResponse {
    success?: boolean;
    results?: PatientRegistryRow[];
    error?: string;
}

export default function ErxPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user: activeUser, isReady } = useAuthUser();
    const patientUidParam = searchParams.get('patientUid');
    const patientIdParam = searchParams.get('patientId');
    const fallbackLegacyDoseSpotIdParam = searchParams.get('patientDoseSpotId');
    const refillsErrorsMode = searchParams.get('refillsErrors') === 'true';
    const resolvedPatientUid = patientUidParam
        ?? (patientIdParam && !/^\d+$/.test(patientIdParam) ? patientIdParam : undefined)
        ?? undefined;
    const resolvedLegacyDoseSpotIdParam = !resolvedPatientUid
        ? (fallbackLegacyDoseSpotIdParam ?? patientIdParam)
        : null;
    const patientDoseSpotId = resolvedLegacyDoseSpotIdParam && /^\d+$/.test(resolvedLegacyDoseSpotIdParam)
        ? parseInt(resolvedLegacyDoseSpotIdParam, 10)
        : undefined;
    const hasPatientContext = Boolean(resolvedPatientUid || patientDoseSpotId);
    const hasLaunchContext = hasPatientContext || refillsErrorsMode;

    const [notificationCount, setNotificationCount] = useState<number>(0);
    const [patientQuery, setPatientQuery] = useState('');
    const deferredPatientQuery = useDeferredValue(patientQuery.trim());
    const [availablePatients, setAvailablePatients] = useState<PatientRegistryRow[]>([]);
    const [patientPickerLoading, setPatientPickerLoading] = useState(false);
    const [patientPickerError, setPatientPickerError] = useState<string | null>(null);
    const [selectingPatientId, setSelectingPatientId] = useState<string | null>(null);

    useEffect(() => {
        let unsubscribeSnapshot: (() => void) | null = null;
        let cancelled = false;

        const fetchNotificationsFallback = async (uid: string) => {
            try {
                const user = auth.currentUser;
                if (!user || user.uid !== uid) return;

                const data = await apiFetchJson<{ total?: number }>(getDoseSpotApiUrl('/api/v1/dosespot/notification-count'), {
                    user
                });

                if (!cancelled) {
                    setNotificationCount(data.total || 0);
                }
            } catch (error) {
                console.error('Failed to fetch dosespot notification count:', error);
            }
        };

        const unsubscribeAuth = auth.onAuthStateChanged((user) => {
            if (unsubscribeSnapshot) {
                unsubscribeSnapshot();
                unsubscribeSnapshot = null;
            }

            if (!user) {
                setNotificationCount(0);
                return;
            }

            const countsRef = doc(db, 'users', user.uid, 'dosespot', 'notifications');
            unsubscribeSnapshot = onSnapshot(countsRef, (snapshot) => {
                if (!snapshot.exists()) {
                    setNotificationCount(0);
                    return;
                }

                const data = snapshot.data() as { total?: unknown };
                const total = typeof data.total === 'number' ? data.total : 0;
                setNotificationCount(total);
            }, (error) => {
                console.warn('DoseSpot notification listener unavailable, falling back to API fetch.', error);
                void fetchNotificationsFallback(user.uid);
            });

            void fetchNotificationsFallback(user.uid);
        });

        return () => {
            cancelled = true;
            unsubscribeAuth();
            if (unsubscribeSnapshot) {
                unsubscribeSnapshot();
            }
        };
    }, []);

    useEffect(() => {
        if (hasLaunchContext || !isReady) {
            return;
        }

        if (!activeUser) {
            setAvailablePatients([]);
            setPatientPickerLoading(false);
            return;
        }

        let cancelled = false;

        const loadPatients = async () => {
            setPatientPickerLoading(true);
            setPatientPickerError(null);

            try {
                if (deferredPatientQuery) {
                    const payload = await apiFetchJson<PatientSearchResponse>(
                        `/api/patients/search?q=${encodeURIComponent(deferredPatientQuery)}&limit=12`,
                        {
                            method: 'GET',
                            user: activeUser,
                            cache: 'no-store'
                        }
                    );

                    if (!payload.success || !payload.results) {
                        throw new Error(payload.error || 'Failed to search patients.');
                    }

                    if (!cancelled) {
                        setAvailablePatients(payload.results);
                    }
                    return;
                }

                const payload = await apiFetchJson<PatientRegistryResponse>(
                    '/api/patients/list?pageSize=12&sortField=lastActivityAt&sortDir=desc',
                    {
                        method: 'GET',
                        user: activeUser,
                        cache: 'no-store'
                    }
                );

                if (!payload.success) {
                    throw new Error(payload.error || 'Failed to load patients.');
                }

                if (!cancelled) {
                    setAvailablePatients(payload.patients);
                }
            } catch (error) {
                console.error('Failed to load provider patients for DoseSpot:', error);
                if (!cancelled) {
                    setAvailablePatients([]);
                    setPatientPickerError(error instanceof Error ? error.message : 'Failed to load patients.');
                }
            } finally {
                if (!cancelled) {
                    setPatientPickerLoading(false);
                }
            }
        };

        void loadPatients();

        return () => {
            cancelled = true;
        };
    }, [activeUser, deferredPatientQuery, hasLaunchContext, isReady]);

    const handleSelectPatient = (patient: PatientRegistryRow) => {
        setSelectingPatientId(patient.id);
        router.push(`/orders/erx?patientUid=${encodeURIComponent(patient.id)}`);
    };

    const handleChooseDifferentPatient = () => {
        setSelectingPatientId(null);
        router.replace('/orders/erx');
    };

    const handleOpenRefillsErrors = () => {
        setSelectingPatientId(null);
        router.push('/orders/erx?refillsErrors=true');
    };

    return (
        <div className="flex flex-col gap-6 w-full max-w-[1400px] mx-auto pb-10">
            {/* Header Row */}
            <div className="flex justify-between items-center bg-white dark:bg-slate-800 dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center border border-teal-100">
                        <Pill className="w-6 h-6 text-teal-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">E-Prescribing</h1>
                        <p className="text-sm font-bold text-slate-400 mt-0.5 uppercase tracking-widest">Powered by DoseSpot</p>
                    </div>
                </div>

                {/* Notification Badge */}
                <button
                    type="button"
                    onClick={() => router.push('/notifications')}
                    className="relative flex items-center justify-center gap-2 p-3 bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    aria-label="Open notifications"
                    title="Open notifications"
                >
                    <Bell className="w-6 h-6 text-slate-600 dark:text-slate-300 dark:text-slate-400" />
                    <span className="hidden sm:inline text-xs font-bold uppercase tracking-widest text-slate-500">
                        Alerts
                    </span>
                    <ExternalLink className="hidden sm:block w-3.5 h-3.5 text-slate-400" />
                    {notificationCount > 0 && (
                        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[11px] font-black w-6 h-6 flex items-center justify-center rounded-full shadow-lg border-2 border-white animate-in zoom-in">
                            {notificationCount > 99 ? '99+' : notificationCount}
                        </div>
                    )}
                </button>
            </div>

            {hasLaunchContext ? (
                <>
                    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
                        <div className="space-y-1">
                            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-slate-600">
                                {refillsErrorsMode ? <Bell className="h-3.5 w-3.5" /> : <UserRound className="h-3.5 w-3.5" />}
                                {refillsErrorsMode ? 'Refills & Errors Summary' : 'Patient Context Ready'}
                            </div>
                            <p className="text-sm font-medium text-slate-600">
                                {refillsErrorsMode
                                    ? 'This view opens the clinician queue summary instead of a patient chart, using the DoseSpot refills/errors launch mode.'
                                    : 'DoseSpot SSO is generated only after a patient is selected. Use a different patient if you want to switch charts.'}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {!refillsErrorsMode && (
                                <button
                                    type="button"
                                    onClick={handleOpenRefillsErrors}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-700 transition hover:bg-amber-100"
                                >
                                    <Bell className="h-4 w-4" />
                                    Open Queue Summary
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={handleChooseDifferentPatient}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                            >
                                <Users className="h-4 w-4" />
                                {refillsErrorsMode ? 'Back to Patient Picker' : 'Choose Different Patient'}
                            </button>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 dark:bg-slate-800 rounded-[24px] shadow-sm border border-slate-200 dark:border-slate-700 dark:border-slate-700 overflow-hidden w-full">
                        <DoseSpotFrame
                            patientUid={resolvedPatientUid}
                            patientDoseSpotId={patientDoseSpotId}
                            refillsErrors={refillsErrorsMode}
                            height="85vh"
                        />
                    </div>
                </>
            ) : (
                <div className="bg-white rounded-[24px] shadow-sm border border-slate-200 overflow-hidden w-full">
                    <div className="border-b border-slate-100 bg-gradient-to-br from-teal-50 via-white to-sky-50 p-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <div className="space-y-3">
                                <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-widest text-teal-700 shadow-sm">
                                    <Users className="h-3.5 w-3.5" />
                                    Select Patient First
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black tracking-tight text-slate-900">
                                        Choose a patient before launching DoseSpot
                                    </h2>
                                    <p className="max-w-3xl text-sm font-medium text-slate-600">
                                        This page now waits for an explicit patient selection before generating the DoseSpot SSO URL and mounting the prescribing iframe.
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    <button
                                        type="button"
                                        onClick={handleOpenRefillsErrors}
                                        className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-black uppercase tracking-widest text-amber-700 transition hover:bg-amber-100"
                                    >
                                        <Bell className="h-4 w-4" />
                                        Open Refills & Errors
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => router.push('/orders/erx/readiness')}
                                        className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs font-black uppercase tracking-widest text-sky-700 transition hover:bg-sky-100"
                                    >
                                        <ShieldCheck className="h-4 w-4" />
                                        Clinician Readiness
                                    </button>
                                </div>
                            </div>

                            <div className="relative w-full max-w-xl">
                                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    value={patientQuery}
                                    onChange={(event) => setPatientQuery(event.target.value)}
                                    placeholder="Search by patient name, MRN, DOB, phone, or email..."
                                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        {!isReady ? (
                            <div className="flex min-h-[320px] items-center justify-center">
                                <div className="flex flex-col items-center gap-3 text-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                                    <p className="text-sm font-semibold text-slate-600">Loading your patient access…</p>
                                </div>
                            </div>
                        ) : !activeUser ? (
                            <div className="flex min-h-[320px] items-center justify-center">
                                <div className="max-w-md text-center">
                                    <p className="text-sm font-semibold text-slate-700">
                                        Sign in with a provider account to load provider-scoped patients for eRx.
                                    </p>
                                </div>
                            </div>
                        ) : patientPickerLoading ? (
                            <div className="flex min-h-[320px] items-center justify-center">
                                <div className="flex flex-col items-center gap-3 text-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                                    <p className="text-sm font-semibold text-slate-600">
                                        {deferredPatientQuery ? 'Searching patients…' : 'Loading recent patients…'}
                                    </p>
                                </div>
                            </div>
                        ) : patientPickerError ? (
                            <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-red-100 bg-red-50/70 p-6 text-center">
                                <div className="max-w-lg space-y-3">
                                    <p className="text-sm font-black uppercase tracking-widest text-red-700">Patient Picker Unavailable</p>
                                    <p className="text-sm font-semibold text-red-700">{patientPickerError}</p>
                                </div>
                            </div>
                        ) : availablePatients.length === 0 ? (
                            <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50/70 p-6 text-center">
                                <div className="max-w-lg space-y-3">
                                    <p className="text-sm font-black uppercase tracking-widest text-slate-500">
                                        {deferredPatientQuery ? 'No Matching Patients' : 'No Patients Available'}
                                    </p>
                                    <p className="text-sm font-semibold text-slate-600">
                                        {deferredPatientQuery
                                            ? `No provider-scoped patients matched "${deferredPatientQuery}".`
                                            : 'There are no provider-scoped patients available to launch into DoseSpot yet.'}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                                        {deferredPatientQuery ? `Search results (${availablePatients.length})` : 'Recently active patients'}
                                    </p>
                                    <p className="text-xs font-semibold text-slate-500">
                                        Select a patient to generate the DoseSpot SSO URL.
                                    </p>
                                </div>

                                <div className="grid gap-4 xl:grid-cols-2">
                                    {availablePatients.map((patient) => (
                                        <button
                                            key={patient.id}
                                            type="button"
                                            onClick={() => handleSelectPatient(patient)}
                                            disabled={selectingPatientId === patient.id}
                                            className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md disabled:cursor-wait disabled:opacity-70"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="space-y-3">
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <h3 className="text-lg font-black tracking-tight text-slate-900 group-hover:text-teal-700">
                                                                {patient.name}
                                                            </h3>
                                                            <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${patient.statusColor}`}>
                                                                {patient.statusLabel}
                                                            </span>
                                                        </div>
                                                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                                            MRN {patient.mrn}
                                                        </p>
                                                    </div>

                                                    <div className="grid gap-2 text-sm font-medium text-slate-600 sm:grid-cols-2">
                                                        <span>DOB: {patient.dob ?? '—'}</span>
                                                        <span>Sex: {patient.sex ?? '—'}</span>
                                                        <span>Email: {patient.email ?? '—'}</span>
                                                        <span>Phone: {patient.phone ?? '—'}</span>
                                                        <span>State: {patient.state ?? '—'}</span>
                                                        <span>Service: {patient.serviceLine || 'General'}</span>
                                                    </div>
                                                </div>

                                                <div className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-teal-600 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-white shadow-sm">
                                                    {selectingPatientId === patient.id ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                            Opening…
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Pill className="h-4 w-4" />
                                                            Open eRx
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
