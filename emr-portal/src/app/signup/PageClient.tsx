"use client";

import React, { useState } from 'react';
import { createUserWithEmailAndPassword, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle2, MapPin, Phone } from 'lucide-react';
import { VouchedVerification } from '@/components/auth/VouchedVerification';
import { runVouchedStepUpWorkflow, type VouchedCompletionResponse } from '@/lib/identity-verification';
import { finalizePatientRegistration, type PatientRegistrationFormValues, type ValidatedPatientRegistration, validatePatientRegistration } from '@/lib/patient-registration';
import { recordSignupFlowTrace } from '@/lib/signup-flow-trace';
import { US_STATE_OPTIONS } from '@/lib/us-states';

const INPUT_CLASS_NAME = 'w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-xl py-4 pl-12 pr-4 text-slate-900 dark:text-white font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-brand/20 transition-all';
const SELECT_CLASS_NAME = 'w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-xl py-4 px-4 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-brand/20 transition-all';

export default function SignupPage() {
    const [formData, setFormData] = useState<PatientRegistrationFormValues>({
        firstName: '',
        lastName: '',
        dob: '',
        sex: '',
        address1: '',
        city: '',
        state: '',
        zipCode: '',
        phone: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState<string | null>(null);
    const [verificationNotice, setVerificationNotice] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState('Please verify your email before logging in.');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [visualVerificationUser, setVisualVerificationUser] = useState<FirebaseUser | null>(null);
    const [visualVerificationRegistration, setVisualVerificationRegistration] = useState<ValidatedPatientRegistration | null>(null);
    const router = useRouter();
    const signupTraceSource = 'signup_page' as const;

    const asErrorMessage = React.useCallback((error: unknown, fallback: string): string => {
        return error instanceof Error ? error.message : fallback;
    }, []);

    const finishSignup = React.useCallback((message?: string) => {
        if (message) {
            setSuccessMessage(message);
        }
        setVisualVerificationUser(null);
        setVisualVerificationRegistration(null);
        setVerificationNotice(null);
        setSuccess(true);
        setTimeout(() => {
            router.push('/login');
        }, 5000);
    }, [router]);

    const runSignupVerification = React.useCallback(async (
        user: FirebaseUser,
        registration: ValidatedPatientRegistration,
    ) => {
        const workflowPayload = {
            firstName: registration.firstName,
            lastName: registration.lastName,
            email: registration.email,
            phone: registration.phone,
            dob: registration.dob,
            address: {
                streetAddress: registration.address1,
                city: registration.city,
                state: registration.state,
                postalCode: registration.zipCode,
                country: 'US',
            },
        };

        try {
            const workflow = await runVouchedStepUpWorkflow(user, workflowPayload);
            await recordSignupFlowTrace({
                source: signupTraceSource,
                step: 'vouched_workflow',
                status: 'success',
                user,
                payload: workflowPayload,
                response: workflow,
            });

            if (workflow.nextStep === 'visual_id') {
                setVerificationNotice(workflow.warningMessage || 'We could not verify your identity with passive checks. Complete secure ID verification to continue.');
                setVisualVerificationUser(user);
                setVisualVerificationRegistration(registration);
                return;
            }

            finishSignup('Your account was created and identity verification is complete. Please verify your email before logging in.');
        } catch (error) {
            await recordSignupFlowTrace({
                source: signupTraceSource,
                step: 'vouched_workflow',
                status: 'error',
                user,
                payload: workflowPayload,
                error: asErrorMessage(error, 'Vouched step-up workflow failed.'),
            });
            throw error;
        }
    }, [asErrorMessage, finishSignup, signupTraceSource]);

    const handleSignup = React.useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setVerificationNotice(null);

        const validation = validatePatientRegistration(formData);
        if (validation.error || !validation.data) {
            setError(validation.error ?? 'Failed to validate account details.');
            return;
        }

        setLoading(true);

        try {
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                validation.data.email,
                formData.password ?? ''
            );
            try {
                const dbResult = await finalizePatientRegistration(userCredential.user, validation.data, {
                    sendVerificationEmail: true,
                    auditAction: 'ACCOUNT_CREATED'
                });
                await recordSignupFlowTrace({
                    source: signupTraceSource,
                    step: 'db_write',
                    status: 'success',
                    user: userCredential.user,
                    response: dbResult,
                });
            } catch (error) {
                await recordSignupFlowTrace({
                    source: signupTraceSource,
                    step: 'db_write',
                    status: 'error',
                    user: userCredential.user,
                    error: asErrorMessage(error, 'Failed to persist patient/user signup records.'),
                });
                throw error;
            }

            await runSignupVerification(userCredential.user, validation.data);

        } catch (err: any) {
            console.error('Signup Error:', err);
            setError(err.message || 'Failed to create account. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [asErrorMessage, formData, runSignupVerification, signupTraceSource]);

    const handleVisualVerificationCompleted = React.useCallback((result: VouchedCompletionResponse) => {
        if (result.verified) {
            finishSignup('Your account was created and identity verification is complete. Please verify your email before logging in.');
            return;
        }

        if (result.status === 'review_required') {
            finishSignup(result.warningMessage || 'Your account was created and identity verification is pending manual review. Please verify your email before logging in.');
            return;
        }

        setError(result.failureReason || 'Identity verification failed. Please try again or contact support.');
    }, [finishSignup]);

    const handleVisualVerificationError = React.useCallback((message: string) => {
        setError(message);
    }, []);

    if (success) {
        return (
            <div className="min-h-screen bg-[#F0F9FF] flex items-center justify-center p-6">
                <div className="w-full max-w-md bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 text-center space-y-6 animate-in fade-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Account Created!</h2>
                    <p className="text-slate-500 font-medium">
                        We've sent a verification email to <span className="text-brand font-bold">{formData.email}</span>.
                        {successMessage ? ` ${successMessage}` : ''}
                    </p>
                    <div className="pt-4">
                        <Link
                            href="/login"
                            className="text-brand font-bold hover:underline inline-flex items-center gap-2"
                        >
                            Return to Login <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (visualVerificationUser && visualVerificationRegistration) {
        return (
            <div className="min-h-screen bg-[#F0F9FF] flex items-center justify-center p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-brand/5 rounded-full blur-3xl -mr-48 -mt-48 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-50 rounded-full blur-3xl -ml-48 -mb-48 pointer-events-none"></div>

                <div className="relative z-10 w-full max-w-3xl">
                    <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="mb-6 text-center">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                                <CheckCircle2 className="h-7 w-7" />
                            </div>
                            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Complete Identity Verification</h2>
                            <p className="mx-auto mt-2 max-w-xl text-sm font-medium text-slate-500">
                                Your account was created. Complete this secure ID check now so future appointment booking does not ask for the same verification again.
                            </p>
                        </div>

                        {error ? (
                            <div className="mb-5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-600">
                                {error}
                            </div>
                        ) : null}
                        {verificationNotice ? (
                            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                                {verificationNotice}
                            </div>
                        ) : null}

                        <VouchedVerification
                            user={visualVerificationUser}
                            firstName={visualVerificationRegistration.firstName}
                            lastName={visualVerificationRegistration.lastName}
                            email={visualVerificationRegistration.email}
                            phone={visualVerificationRegistration.phone}
                            birthDate={visualVerificationRegistration.dob}
                            onCompleted={handleVisualVerificationCompleted}
                            onError={handleVisualVerificationError}
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F0F9FF] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-brand/5 rounded-full blur-3xl -mr-48 -mt-48 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-50 rounded-full blur-3xl -ml-48 -mb-48 pointer-events-none"></div>

            <div className="relative z-10 w-full max-w-2xl">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-6">
                            <div className="p-3 bg-brand/5 rounded-2xl">
                                <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-brand/10 flex items-center justify-center">
                                    <span className="text-2xl font-black text-brand italic">P</span>
                                </div>
                            </div>
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Join Patriotic</h2>
                        <p className="text-slate-500 mt-2 text-sm font-medium">Create your secure patient portal account</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSignup} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">First Name</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="John"
                                        value={formData.firstName}
                                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                        className={INPUT_CLASS_NAME}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Last Name</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Doe"
                                        value={formData.lastName}
                                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                        className={INPUT_CLASS_NAME}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Date of Birth</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={formData.dob}
                                        onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                                        className={SELECT_CLASS_NAME}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Sex</label>
                                <div className="relative">
                                    <select
                                        value={formData.sex}
                                        onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                                        className={SELECT_CLASS_NAME}
                                        required
                                    >
                                        <option value="" disabled>Select...</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Unknown">Unknown</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="email"
                                    placeholder="your@email.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className={INPUT_CLASS_NAME}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Address Line 1</label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="2798 Parsifal St NE"
                                    value={formData.address1}
                                    onChange={(e) => setFormData({ ...formData, address1: e.target.value })}
                                    className={INPUT_CLASS_NAME}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">City</label>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Albuquerque"
                                        value={formData.city}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        className={INPUT_CLASS_NAME}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">State</label>
                                <div className="relative">
                                    <select
                                        value={formData.state}
                                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                        className={SELECT_CLASS_NAME}
                                        required
                                    >
                                        <option value="" disabled>Select state</option>
                                        {US_STATE_OPTIONS.map((state) => (
                                            <option key={state.code} value={state.code}>
                                                {state.name} ({state.code})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">ZIP Code</label>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="87112"
                                        value={formData.zipCode}
                                        onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                                        className={INPUT_CLASS_NAME}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Phone Number</label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="tel"
                                    placeholder="(505) 293-6547"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className={INPUT_CLASS_NAME}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className={INPUT_CLASS_NAME}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Confirm</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        className={INPUT_CLASS_NAME}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-brand text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-xl shadow-brand/20 hover:bg-brand-600 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                        >
                            {loading ? 'Creating Account...' : 'Get Started'}
                            {!loading && <UserPlus className="w-4 h-4" />}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-50 text-center">
                        <p className="text-xs text-slate-400 font-medium">
                            Already have an account? <Link href="/login" className="text-brand font-bold hover:underline">Sign In</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
