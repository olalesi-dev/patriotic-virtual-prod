"use client";

import React, { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle2, MapPin, Phone } from 'lucide-react';
import { logAuditEvent } from '@/lib/audit';
import { syncDoseSpotPatientBestEffort } from '@/lib/dosespot-patient-sync';
import { US_STATE_OPTIONS } from '@/lib/us-states';

const INPUT_CLASS_NAME = 'w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-xl py-4 pl-12 pr-4 text-slate-900 dark:text-white font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-brand/20 transition-all';
const SELECT_CLASS_NAME = 'w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-xl py-4 px-4 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-brand/20 transition-all';

function normalizeUsPhone(value: string): string | null {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 10) return digits;
    if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
    return null;
}

function normalizeUsZip(value: string): string | null {
    const digits = value.replace(/\D/g, '');
    return digits.length >= 5 ? digits.slice(0, 5) : null;
}

function isAdult(dateOfBirth: string): boolean {
    const birthDate = new Date(dateOfBirth);
    if (Number.isNaN(birthDate.getTime())) return false;

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDelta = today.getMonth() - birthDate.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) {
        age -= 1;
    }

    return age >= 18;
}

export default function SignupPage() {
    const [formData, setFormData] = useState({
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
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const normalizedPhone = normalizeUsPhone(formData.phone);
        const normalizedZipCode = normalizeUsZip(formData.zipCode);
        const firstName = formData.firstName.trim();
        const lastName = formData.lastName.trim();
        const address1 = formData.address1.trim();
        const city = formData.city.trim();
        const email = formData.email.trim();
        const displayName = `${firstName} ${lastName}`.trim();

        if (!firstName || !lastName) {
            setError('First name and last name are required');
            return;
        }

        if (!formData.dob || !isAdult(formData.dob)) {
            setError('You must be at least 18 years old to create an account');
            return;
        }

        if (!formData.sex) {
            setError('Sex is required');
            return;
        }

        if (!address1 || !city || !formData.state) {
            setError('Address, city, and state are required');
            return;
        }

        if (!normalizedZipCode) {
            setError('ZIP code must be a valid 5-digit US ZIP');
            return;
        }

        if (!normalizedPhone) {
            setError('Phone number must be a valid 10-digit US phone number');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setLoading(true);

        try {
            // 1. Create User in Auth
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                email,
                formData.password
            );
            const user = userCredential.user;

            // 2. Update Auth Profile
            await updateProfile(user, {
                displayName
            });

            // 3. Create Patient Record in Firestore
            // We use the 'patients' collection which is shared with the provider side
            const patientRecord = {
                uid: user.uid,
                email,
                name: displayName,
                displayName,
                firstName,
                lastName,
                dob: formData.dob || null,
                dateOfBirth: formData.dob || null,
                sex: formData.sex || null,
                sexAtBirth: formData.sex || null,
                gender: formData.sex || null,
                address: address1 || null,
                address1: address1 || null,
                city: city || null,
                state: formData.state || null,
                zip: normalizedZipCode,
                zipCode: normalizedZipCode,
                phone: normalizedPhone,
                phoneNumber: normalizedPhone,
                role: 'patient',
                status: 'active',
                emailVerified: false,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            await Promise.all([
                setDoc(doc(db, 'patients', user.uid), patientRecord),
                setDoc(doc(db, 'users', user.uid), patientRecord, { merge: true })
            ]);

            // 4. Send Verification Email
            await sendEmailVerification(user);

            // 5. Log Audit Event
            await logAuditEvent({
                userId: user.uid,
                userEmail: user.email!,
                action: 'ACCOUNT_CREATED',
                details: { role: 'patient' }
            });

            void syncDoseSpotPatientBestEffort(user, {
                patientUid: user.uid,
                updateExisting: false
            });

            setSuccess(true);
            setTimeout(() => {
                router.push('/login');
            }, 5000);

        } catch (err: any) {
            console.error('Signup Error:', err);
            setError(err.message || 'Failed to create account. Please try again.');
        } finally {
            setLoading(false);
        }
    };

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
                        Please verify your email before logging in.
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
