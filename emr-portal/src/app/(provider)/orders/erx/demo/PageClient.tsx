'use client';

import React, { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Clock3, Loader2, PlayCircle, RefreshCw, UserRound, XCircle } from 'lucide-react';
import { useAuthUser } from '@/hooks/useAuthUser';
import { apiFetchJson } from '@/lib/api-client';
import { getDoseSpotApiUrl } from '@/lib/dosespot-client';

type DemoCheckStatus = 'idle' | 'running' | 'pass' | 'fail' | 'skip';

interface DemoCheckState {
    key: string;
    title: string;
    status: DemoCheckStatus;
    detail: string;
}

interface DoseSpotValidationCheckResponse {
    key?: string;
    title?: string;
    status?: DemoCheckStatus;
    detail?: string;
}

interface DoseSpotValidationRunResponse {
    checks?: DoseSpotValidationCheckResponse[];
}

const CHECKS: Array<Pick<DemoCheckState, 'key' | 'title'>> = [
    { key: 'sso-patient', title: 'SSO patient launch URL ready' },
    { key: 'sso-queue', title: 'SSO refills/errors launch URL ready' },
    { key: 'med-history', title: 'Medication history endpoint returns' },
    { key: 'eligibility', title: 'Eligibility summary endpoint returns' },
    { key: 'refills-queue', title: 'Refills queue endpoint returns' },
    { key: 'rxchange-queue', title: 'RxChange queue endpoint returns' },
    { key: 'notifications', title: 'Notification count endpoint returns' },
    { key: 'webhook-outbound', title: 'DoseSpot outbound webhook delivery observed' }
];

function createInitialChecks(): DemoCheckState[] {
    return CHECKS.map((check) => ({
        ...check,
        status: 'idle',
        detail: 'Not run yet.'
    }));
}

function statusClasses(status: DemoCheckStatus) {
    if (status === 'pass') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    if (status === 'fail') return 'border-rose-200 bg-rose-50 text-rose-700';
    if (status === 'running') return 'border-sky-200 bg-sky-50 text-sky-700';
    if (status === 'skip') return 'border-amber-200 bg-amber-50 text-amber-700';
    return 'border-slate-200 bg-slate-50 text-slate-600';
}

function statusIcon(status: DemoCheckStatus) {
    if (status === 'pass') return <CheckCircle2 className="h-4 w-4" />;
    if (status === 'fail') return <XCircle className="h-4 w-4" />;
    if (status === 'running') return <Loader2 className="h-4 w-4 animate-spin" />;
    if (status === 'skip') return <AlertCircle className="h-4 w-4" />;
    return <Clock3 className="h-4 w-4" />;
}

export default function DoseSpotDemoRunnerPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, isReady } = useAuthUser();
    const [patientUid, setPatientUid] = useState(searchParams.get('patientUid') ?? '');
    const [checks, setChecks] = useState<DemoCheckState[]>(() => createInitialChecks());
    const [running, setRunning] = useState(false);
    const [runnerError, setRunnerError] = useState<string | null>(null);

    const summary = useMemo(() => {
        const total = checks.length;
        const passed = checks.filter((check) => check.status === 'pass').length;
        const failed = checks.filter((check) => check.status === 'fail').length;
        const skipped = checks.filter((check) => check.status === 'skip').length;
        return { total, passed, failed, skipped };
    }, [checks]);

    const runAllChecks = async () => {
        if (!user) {
            setRunnerError('Sign in as a provider to run the DoseSpot demo checks.');
            return;
        }

        const normalizedPatientUid = patientUid.trim();
        setRunnerError(null);
        setRunning(true);
        setChecks(createInitialChecks());

        setChecks(createInitialChecks().map((check) => ({
            ...check,
            status: 'running',
            detail: 'Running...'
        })));

        try {
            const response = await apiFetchJson<DoseSpotValidationRunResponse>(
                getDoseSpotApiUrl('/api/v1/dosespot/screen-demo/validation'),
                {
                    method: 'POST',
                    user,
                    body: {
                        ...(normalizedPatientUid ? { patientUid: normalizedPatientUid } : {}),
                        clinicId: 'Current'
                    }
                }
            );

            const apiChecks = Array.isArray(response.checks) ? response.checks : [];
            const nextChecks = createInitialChecks().map((baseCheck) => {
                const matched = apiChecks.find((item) => item.key === baseCheck.key);
                if (!matched) {
                    return {
                        ...baseCheck,
                        status: 'skip',
                        detail: 'Check was not returned by backend validation.'
                    };
                }

                const status = matched.status;
                const normalizedStatus: DemoCheckStatus = status === 'pass' || status === 'fail' || status === 'skip'
                    ? status
                    : 'fail';
                return {
                    ...baseCheck,
                    title: matched.title ?? baseCheck.title,
                    status: normalizedStatus,
                    detail: matched.detail ?? 'No details returned.'
                };
            });

            setChecks(nextChecks);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unexpected error.';
            setRunnerError(message);
            setChecks(createInitialChecks().map((check) => ({
                ...check,
                status: 'fail',
                detail: message
            })));
        } finally {
            setRunning(false);
        }
    };

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-10">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-indigo-700">
                            <PlayCircle className="h-3.5 w-3.5" />
                            Screen Demo Runner
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-slate-900">DoseSpot non-EPCS validation checks</h1>
                            <p className="mt-2 max-w-3xl text-sm font-medium text-slate-600">
                                Run these checks before rehearsal to verify SSO launch paths, patient-context APIs, and queue endpoints used in the certification demo flow.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => router.push('/orders/erx')}
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100"
                        >
                            Back To eRx
                        </button>
                        <button
                            type="button"
                            onClick={runAllChecks}
                            disabled={!isReady || !user || running}
                            className="inline-flex items-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-black text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            Run All Checks
                        </button>
                    </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr,1fr]">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                            Patient UID (optional for patient-specific checks)
                        </label>
                        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                            <div className="relative flex-1">
                                <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    value={patientUid}
                                    onChange={(event) => setPatientUid(event.target.value)}
                                    placeholder="Enter patient UID for chart/history checks"
                                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => setPatientUid('')}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-black uppercase tracking-widest text-slate-700 transition hover:bg-slate-100"
                            >
                                Clear
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Passed</p>
                            <p className="mt-1 text-lg font-black text-emerald-800">{summary.passed}</p>
                        </div>
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-2 py-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-rose-700">Failed</p>
                            <p className="mt-1 text-lg font-black text-rose-800">{summary.failed}</p>
                        </div>
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-2 py-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Skipped</p>
                            <p className="mt-1 text-lg font-black text-amber-800">{summary.skipped}</p>
                        </div>
                    </div>
                </div>

                {runnerError && (
                    <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{runnerError}</span>
                    </div>
                )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-black tracking-tight text-slate-900">Check Results</h2>
                <p className="mt-1 text-sm font-medium text-slate-600">
                    Each check maps to a non-EPCS screen-demo dependency. Total checks: {summary.total}.
                </p>

                <div className="mt-4 grid gap-3">
                    {checks.map((check) => (
                        <article
                            key={check.key}
                            className={`rounded-2xl border px-4 py-3 ${statusClasses(check.status)}`}
                        >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div className="flex items-center gap-2">
                                    {statusIcon(check.status)}
                                    <p className="text-sm font-black tracking-tight">{check.title}</p>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest">
                                    {check.status}
                                </span>
                            </div>
                            <p className="mt-2 text-sm font-medium">{check.detail}</p>
                        </article>
                    ))}
                </div>
            </section>
        </div>
    );
}
