'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    AlertCircle,
    CheckCircle2,
    Clock3,
    ExternalLink,
    FileText,
    Loader2,
    RefreshCw,
    Shield,
    ShieldAlert,
    UnlockKeyhole
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthUser } from '@/hooks/useAuthUser';
import {
    acceptDoseSpotIdpDisclaimer,
    acceptDoseSpotLegalAgreement,
    fetchDoseSpotClinicianReadiness,
    fetchDoseSpotIdpDisclaimer,
    fetchDoseSpotLegalAgreements,
    initDoseSpotIdp,
    startDoseSpotIdp,
    submitDoseSpotIdpAnswers,
    submitDoseSpotIdpOtp,
    type DoseSpotClinicianActionResponse,
    type DoseSpotClinicianReadiness,
    type DoseSpotClinicianReadinessStatus,
    type DoseSpotIdpQuestion
} from '@/lib/dosespot-clinician-readiness';

function readinessTone(status: DoseSpotClinicianReadinessStatus) {
    if (status === 'ready') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (status === 'locked' || status === 'pin_reset_required') return 'bg-rose-100 text-rose-700 border-rose-200';
    if (status === 'otp_required' || status === 'idp_questions') return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-sky-100 text-sky-700 border-sky-200';
}

function readinessLabel(status: DoseSpotClinicianReadinessStatus) {
    switch (status) {
        case 'agreements_pending':
            return 'Agreements Pending';
        case 'clinician_confirmation_pending':
            return 'Clinician Confirmation Pending';
        case 'idp_pending':
            return 'IDP In Progress';
        case 'idp_questions':
            return 'Questions Required';
        case 'otp_required':
            return 'OTP Required';
        case 'tfa_pending':
            return 'TFA Pending';
        case 'pin_reset_required':
            return 'PIN Reset Required';
        case 'locked':
            return 'Locked';
        case 'ready':
            return 'Ready';
        default:
            return 'Not Started';
    }
}

function nextStepText(readiness: DoseSpotClinicianReadiness) {
    switch (readiness.readinessStatus) {
        case 'agreements_pending':
            return 'Load and accept the outstanding DoseSpot legal agreements.';
        case 'clinician_confirmation_pending':
            return 'DoseSpot clinician confirmation is still pending. Confirm the account configuration with DoseSpot if this does not clear.';
        case 'idp_pending':
            return 'Initialize or continue the identity-proofing flow.';
        case 'idp_questions':
            return 'Answer the outstanding IDP questions returned by DoseSpot.';
        case 'otp_required':
            return 'Submit the one-time passcode to finish identity proofing.';
        case 'tfa_pending':
            return 'Complete two-factor activation in DoseSpot before EPCS use.';
        case 'pin_reset_required':
            return 'Reset the DoseSpot signing PIN before controlled-substance workflows.';
        case 'locked':
            return 'The prescribing account is locked. Resolve the lockout before continuing.';
        case 'ready':
            return 'Clinician readiness is in a usable state. Continue with staging validation and controlled-substance rehearsal.';
        default:
            return 'Start by loading agreements and initializing identity proofing.';
    }
}

function formatDateTime(value: string | null) {
    if (!value) return 'Not recorded';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;

    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    }).format(parsed);
}

function parseJsonInput(input: string): Record<string, unknown> {
    const trimmed = input.trim();
    if (!trimmed) return {};
    const parsed = JSON.parse(trimmed) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Advanced request JSON must be an object.');
    }
    return parsed as Record<string, unknown>;
}

export default function DoseSpotReadinessPage() {
    const { user, isReady } = useAuthUser();
    const [readiness, setReadiness] = useState<DoseSpotClinicianReadiness | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pendingAction, setPendingAction] = useState<string | null>(null);
    const [latestMessage, setLatestMessage] = useState<string | null>(null);
    const [lastRawResponse, setLastRawResponse] = useState<Record<string, unknown> | unknown[] | null>(null);
    const [idpStartJson, setIdpStartJson] = useState('{}');
    const [answersOverrideJson, setAnswersOverrideJson] = useState('{}');
    const [otpCode, setOtpCode] = useState('');
    const [answerValues, setAnswerValues] = useState<Record<string, string>>({});

    const visibleQuestions = useMemo(
        () => readiness?.idp.questions ?? [],
        [readiness]
    );

    const loadReadiness = async () => {
        if (!user) {
            setLoading(false);
            setReadiness(null);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const nextReadiness = await fetchDoseSpotClinicianReadiness(user);
            setReadiness(nextReadiness);
        } catch (loadError) {
            const message = loadError instanceof Error ? loadError.message : 'Failed to load DoseSpot readiness.';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isReady) return;
        void loadReadiness();
    }, [isReady, user]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!visibleQuestions.length) return;

        setAnswerValues((current) => {
            const next = { ...current };
            visibleQuestions.forEach((question) => {
                if (!(question.questionId in next)) {
                    next[question.questionId] = '';
                }
            });
            return next;
        });
    }, [visibleQuestions]);

    const applyActionResult = (result: DoseSpotClinicianActionResponse) => {
        setReadiness(result.readiness);
        setLatestMessage(result.message);
        setLastRawResponse(result.rawResponse ?? null);
        if (result.message) {
            toast.success(result.message);
        }
    };

    const runAction = async (
        actionKey: string,
        action: () => Promise<DoseSpotClinicianActionResponse>
    ) => {
        setPendingAction(actionKey);
        setError(null);
        try {
            const result = await action();
            applyActionResult(result);
        } catch (actionError) {
            const message = actionError instanceof Error ? actionError.message : 'DoseSpot request failed.';
            setError(message);
            toast.error(message);
        } finally {
            setPendingAction(null);
        }
    };

    const handleSubmitAnswers = async () => {
        if (!user) return;

        const answers = visibleQuestions.reduce<Array<{ QuestionId: string; AnswerId: string } | { QuestionId: string; AnswerText: string }>>((acc, question) => {
                const selectedValue = answerValues[question.questionId]?.trim() ?? '';
                if (!selectedValue) {
                    return acc;
                }

                if (question.options.length > 0) {
                    acc.push({
                        QuestionId: question.questionId,
                        AnswerId: selectedValue
                    });
                    return acc;
                }

                acc.push({
                    QuestionId: question.questionId,
                    AnswerText: selectedValue
                });
                return acc;
            }, []);

        if (answers.length === 0) {
            toast.error('Add at least one answer before submitting.');
            return;
        }

        let overrides: Record<string, unknown> = {};
        try {
            overrides = parseJsonInput(answersOverrideJson);
        } catch (jsonError) {
            const message = jsonError instanceof Error ? jsonError.message : 'Invalid JSON.';
            toast.error(message);
            return;
        }

        await runAction('answers', () => submitDoseSpotIdpAnswers(user, {
            Answers: answers,
            ...overrides
        }));
    };

    const readinessSummary = useMemo(() => {
        if (!readiness) return null;

        return [
            {
                label: 'Clinician',
                value: readiness.clinicianId ? `#${readiness.clinicianId}` : 'Not linked',
                hint: readiness.clinicianConfirmed === true ? 'Confirmed in DoseSpot' : readiness.clinicianConfirmed === false ? 'Confirmation pending' : 'Confirmation unknown'
            },
            {
                label: 'Agreements',
                value: readiness.agreementsAccepted ? 'Accepted' : 'Pending',
                hint: readiness.legalAgreements.length > 0 ? `${readiness.legalAgreements.filter((agreement) => agreement.accepted).length}/${readiness.legalAgreements.length} accepted` : 'Load from DoseSpot'
            },
            {
                label: 'Identity Proofing',
                value: readiness.idp.completedAt ? 'Completed' : readiness.idp.otpRequired ? 'OTP needed' : readiness.idp.pendingQuestionsCount > 0 ? 'Questions pending' : readiness.idp.initializedAt ? 'Started' : 'Not started',
                hint: readiness.idp.completedAt ? `Completed ${formatDateTime(readiness.idp.completedAt)}` : readiness.idp.initializedAt ? `Started ${formatDateTime(readiness.idp.initializedAt)}` : 'Initialize from this page'
            },
            {
                label: 'Security',
                value: readiness.accountLocked ? 'Locked' : readiness.tfa.enabled ? 'TFA enabled' : readiness.pin.resetRequired ? 'PIN reset required' : 'Needs setup',
                hint: readiness.accountLocked ? 'Resolve lockout in DoseSpot' : readiness.lastEventType ? `Last event: ${readiness.lastEventType}` : 'Waiting for DoseSpot events'
            }
        ];
    }, [readiness]);

    if (loading) {
        return (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky-50">
                    <Loader2 className="h-7 w-7 animate-spin text-sky-500" />
                </div>
                <p className="mt-4 text-sm font-semibold text-slate-600">Loading DoseSpot clinician readiness…</p>
            </div>
        );
    }

    return (
        <div className="mx-auto flex max-w-6xl flex-col gap-6 pb-12">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-slate-600">
                            <Shield className="h-3.5 w-3.5" />
                            DoseSpot EPCS Readiness
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-slate-900">Clinician readiness and webhook-driven status</h1>
                            <p className="mt-2 max-w-3xl text-sm font-medium text-slate-600">
                                Use this page to track DoseSpot agreements, identity proofing, OTP, TFA, PIN reset state, and the latest clinician security events before EPCS rehearsal.
                            </p>
                        </div>
                        {readiness && (
                            <div className="flex flex-wrap items-center gap-3">
                                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-widest ${readinessTone(readiness.readinessStatus)}`}>
                                    {readiness.readinessStatus === 'ready' ? <CheckCircle2 className="h-3.5 w-3.5" /> : readiness.readinessStatus === 'locked' ? <ShieldAlert className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
                                    {readinessLabel(readiness.readinessStatus)}
                                </span>
                                <p className="text-sm font-medium text-slate-600">{nextStepText(readiness)}</p>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => void loadReadiness()}
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Refresh
                        </button>
                        <Link
                            href="/orders/erx?refillsErrors=true"
                            className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-700 transition hover:bg-amber-100"
                        >
                            Queue Summary
                            <ExternalLink className="h-4 w-4" />
                        </Link>
                        <Link
                            href="/orders/erx"
                            className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-4 py-3 text-sm font-black text-white transition hover:bg-teal-700"
                        >
                            Open eRx
                            <ExternalLink className="h-4 w-4" />
                        </Link>
                    </div>
                </div>

                {error && (
                    <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
                        {error}
                    </div>
                )}
                {latestMessage && (
                    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                        {latestMessage}
                    </div>
                )}
            </section>

            {readinessSummary && (
                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {readinessSummary.map((item) => (
                        <article key={item.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{item.label}</p>
                            <p className="mt-3 text-xl font-black text-slate-900">{item.value}</p>
                            <p className="mt-2 text-sm font-medium text-slate-600">{item.hint}</p>
                        </article>
                    ))}
                </section>
            )}

            <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
                <section className="space-y-6">
                    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Legal Agreements</p>
                                <h2 className="mt-2 text-xl font-black text-slate-900">Load and accept the current DoseSpot agreements</h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => user && void runAction('agreements', () => fetchDoseSpotLegalAgreements(user))}
                                disabled={!user || pendingAction === 'agreements'}
                                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {pendingAction === 'agreements' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                Load agreements
                            </button>
                        </div>

                        <div className="mt-5 space-y-3">
                            {readiness?.legalAgreements.length ? readiness.legalAgreements.map((agreement) => (
                                <div key={agreement.agreementId} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                        <div>
                                            <p className="text-sm font-black text-slate-900">{agreement.title}</p>
                                            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
                                                {agreement.version ? `Version ${agreement.version}` : 'DoseSpot agreement'}
                                            </p>
                                            {agreement.acceptedAt && (
                                                <p className="mt-2 text-sm text-slate-600">Accepted {formatDateTime(agreement.acceptedAt)}</p>
                                            )}
                                        </div>
                                        {agreement.accepted ? (
                                            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-emerald-700">
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                Accepted
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => user && void runAction(`accept-${agreement.agreementId}`, () => acceptDoseSpotLegalAgreement(user, { AgreementId: agreement.agreementId }))}
                                                disabled={!user || pendingAction === `accept-${agreement.agreementId}`}
                                                className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-4 py-3 text-sm font-black text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {pendingAction === `accept-${agreement.agreementId}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                                Accept
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )) : (
                                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-medium text-slate-600">
                                    No agreements are loaded yet. Use the button above to fetch them from DoseSpot.
                                </div>
                            )}
                        </div>
                    </article>

                    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Identity Proofing</p>
                                <h2 className="mt-2 text-xl font-black text-slate-900">Drive disclaimer, IDP start, questions, and OTP from one screen</h2>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={() => user && void runAction('idp-init', () => initDoseSpotIdp(user))}
                                    disabled={!user || pendingAction === 'idp-init'}
                                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {pendingAction === 'idp-init' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                    Init IDP
                                </button>
                                <button
                                    type="button"
                                    onClick={() => user && void runAction('disclaimer', () => fetchDoseSpotIdpDisclaimer(user))}
                                    disabled={!user || pendingAction === 'disclaimer'}
                                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {pendingAction === 'disclaimer' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                                    Load disclaimer
                                </button>
                            </div>
                        </div>

                        <div className="mt-6 grid gap-6 lg:grid-cols-2">
                            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-black text-slate-900">Disclaimer</p>
                                        <p className="mt-1 text-sm text-slate-600">Load the current DoseSpot disclaimer before acceptance.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => user && void runAction('accept-disclaimer', () => acceptDoseSpotIdpDisclaimer(user))}
                                        disabled={!user || pendingAction === 'accept-disclaimer'}
                                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-black uppercase tracking-widest text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {pendingAction === 'accept-disclaimer' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                        Accept
                                    </button>
                                </div>

                                {readiness?.idp.disclaimer ? (
                                    <div className="space-y-2">
                                        <p className="text-sm font-black text-slate-900">{readiness.idp.disclaimer.title ?? 'DoseSpot disclaimer'}</p>
                                        <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                                            {readiness.idp.disclaimer.body ?? 'DoseSpot returned an empty disclaimer body.'}
                                        </div>
                                        {readiness.idp.disclaimerAcceptedAt && (
                                            <p className="text-sm font-medium text-emerald-700">Accepted {formatDateTime(readiness.idp.disclaimerAcceptedAt)}</p>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-600">No disclaimer is loaded yet.</p>
                                )}
                            </div>

                            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                                <div>
                                    <p className="text-sm font-black text-slate-900">Start IDP request</p>
                                    <p className="mt-1 text-sm text-slate-600">Submit a basic IDP request, or add advanced request fields if DoseSpot requires them.</p>
                                </div>
                                <textarea
                                    value={idpStartJson}
                                    onChange={(event) => setIdpStartJson(event.target.value)}
                                    rows={6}
                                    className="w-full rounded-2xl border border-slate-200 bg-white p-3 font-mono text-xs text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                />
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (!user) return;
                                        try {
                                            const body = parseJsonInput(idpStartJson);
                                            await runAction('idp-start', () => startDoseSpotIdp(user, body));
                                        } catch (jsonError) {
                                            toast.error(jsonError instanceof Error ? jsonError.message : 'Invalid JSON.');
                                        }
                                    }}
                                    disabled={!user || pendingAction === 'idp-start'}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-4 py-3 text-sm font-black text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {pendingAction === 'idp-start' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                                    Submit IDP request
                                </button>
                            </div>
                        </div>

                        <div className="mt-6 grid gap-6 lg:grid-cols-2">
                            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                                <div>
                                    <p className="text-sm font-black text-slate-900">Questions</p>
                                    <p className="mt-1 text-sm text-slate-600">Answer the current IDP question set. Use the override JSON if DoseSpot expects extra envelope fields.</p>
                                </div>

                                {visibleQuestions.length > 0 ? (
                                    <div className="space-y-4">
                                        {visibleQuestions.map((question: DoseSpotIdpQuestion) => (
                                            <div key={question.questionId} className="rounded-2xl border border-slate-200 bg-white p-4">
                                                <p className="text-sm font-black text-slate-900">{question.prompt}</p>
                                                {question.options.length > 0 ? (
                                                    <div className="mt-3 space-y-2">
                                                        {question.options.map((option) => (
                                                            <label key={option.optionId} className="flex items-start gap-3 text-sm text-slate-700">
                                                                <input
                                                                    type="radio"
                                                                    name={question.questionId}
                                                                    checked={answerValues[question.questionId] === option.optionId}
                                                                    onChange={() => setAnswerValues((current) => ({ ...current, [question.questionId]: option.optionId }))}
                                                                    className="mt-1 h-4 w-4 border-slate-300 text-sky-600 focus:ring-sky-500"
                                                                />
                                                                <span>{option.label}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <textarea
                                                        value={answerValues[question.questionId] ?? ''}
                                                        onChange={(event) => setAnswerValues((current) => ({ ...current, [question.questionId]: event.target.value }))}
                                                        rows={3}
                                                        className="mt-3 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                                        placeholder="Enter your answer"
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                                        No IDP questions are currently stored on the provider record.
                                    </div>
                                )}

                                <textarea
                                    value={answersOverrideJson}
                                    onChange={(event) => setAnswersOverrideJson(event.target.value)}
                                    rows={5}
                                    className="w-full rounded-2xl border border-slate-200 bg-white p-3 font-mono text-xs text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                />
                                <button
                                    type="button"
                                    onClick={() => void handleSubmitAnswers()}
                                    disabled={!user || pendingAction === 'answers'}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {pendingAction === 'answers' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                    Submit answers
                                </button>
                            </div>

                            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                                <div>
                                    <p className="text-sm font-black text-slate-900">OTP verification</p>
                                    <p className="mt-1 text-sm text-slate-600">Use this once DoseSpot marks the workflow as OTP-required.</p>
                                </div>
                                <input
                                    type="text"
                                    value={otpCode}
                                    onChange={(event) => setOtpCode(event.target.value)}
                                    className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                    placeholder="Enter one-time passcode"
                                />
                                <button
                                    type="button"
                                    onClick={() => user && void runAction('otp', () => submitDoseSpotIdpOtp(user, { OtpCode: otpCode }))}
                                    disabled={!user || pendingAction === 'otp' || otpCode.trim().length === 0}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-4 py-3 text-sm font-black text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {pendingAction === 'otp' ? <Loader2 className="h-4 w-4 animate-spin" /> : <UnlockKeyhole className="h-4 w-4" />}
                                    Submit OTP
                                </button>

                                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
                                    <div className="flex items-center gap-2 text-slate-700">
                                        {readiness?.accountLocked ? <ShieldAlert className="h-4 w-4 text-rose-500" /> : <Shield className="h-4 w-4 text-slate-400" />}
                                        <span className="font-semibold">Account lockout:</span>
                                        <span>{readiness?.accountLocked ? 'Locked' : 'Not locked'}</span>
                                    </div>
                                    <div className="mt-3 flex items-center gap-2 text-slate-700">
                                        {readiness?.pin.resetRequired ? <AlertCircle className="h-4 w-4 text-amber-500" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                                        <span className="font-semibold">PIN state:</span>
                                        <span>{readiness?.pin.resetRequired ? 'Reset required' : 'No reset flagged'}</span>
                                    </div>
                                    <div className="mt-3 flex items-center gap-2 text-slate-700">
                                        {readiness?.tfa.enabled ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Clock3 className="h-4 w-4 text-amber-500" />}
                                        <span className="font-semibold">Two-factor:</span>
                                        <span>{readiness?.tfa.enabled ? 'Enabled' : 'Not yet enabled'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </article>
                </section>

                <aside className="space-y-6">
                    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Read model and events</p>
                        <h2 className="mt-2 text-xl font-black text-slate-900">Most recent DoseSpot state</h2>
                        <div className="mt-5 space-y-4 text-sm">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                                <p className="font-black text-slate-900">Last webhook event</p>
                                <p className="mt-2 font-semibold text-slate-700">{readiness?.lastEventType ?? 'No clinician event recorded yet'}</p>
                                <p className="mt-1 text-slate-600">{formatDateTime(readiness?.lastEventAt ?? null)}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                                <p className="font-black text-slate-900">Last operation</p>
                                <p className="mt-2 font-semibold text-slate-700">{readiness?.lastOperation ?? 'No readiness action submitted yet'}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                                <p className="font-black text-slate-900">Last error</p>
                                <p className="mt-2 text-slate-700">{readiness?.lastError ?? 'No stored DoseSpot readiness error.'}</p>
                            </div>
                        </div>
                    </article>

                    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Raw response</p>
                        <h2 className="mt-2 text-xl font-black text-slate-900">Latest DoseSpot payload</h2>
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-950 p-4 text-xs text-slate-100">
                            <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-words">
                                {JSON.stringify(lastRawResponse ?? readiness?.idp.lastResponse ?? { message: 'No DoseSpot response stored yet.' }, null, 2)}
                            </pre>
                        </div>
                    </article>
                </aside>
            </div>
        </div>
    );
}
