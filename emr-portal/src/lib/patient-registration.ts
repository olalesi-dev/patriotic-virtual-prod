import type { User as FirebaseUser } from 'firebase/auth';
import { sendEmailVerification, updateProfile } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { logAuditEvent } from '@/lib/audit';
import { syncDoseSpotPatientBestEffort } from '@/lib/dosespot-patient-sync';
import { db } from '@/lib/firebase';

export interface PatientRegistrationFormValues {
    firstName: string;
    lastName: string;
    dob: string;
    sex: string;
    address1: string;
    city: string;
    state: string;
    zipCode: string;
    phone: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
}

export interface ValidatedPatientRegistration {
    firstName: string;
    lastName: string;
    displayName: string;
    dob: string;
    sex: string;
    address1: string;
    city: string;
    state: string;
    zipCode: string;
    phone: string;
    email: string;
}

interface ValidatePatientRegistrationOptions {
    requireEmail?: boolean;
    requirePassword?: boolean;
}

interface FinalizePatientRegistrationOptions {
    sendVerificationEmail?: boolean;
    mergePatientRecord?: boolean;
    doseSpotUpdateExisting?: boolean;
    auditAction?: string | null;
    emailOverride?: string | null;
}

export function normalizeUsPhone(value: string): string | null {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 10) return digits;
    if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
    return null;
}

export function normalizeUsZip(value: string): string | null {
    const digits = value.replace(/\D/g, '');
    return digits.length >= 5 ? digits.slice(0, 5) : null;
}

export function isAdult(dateOfBirth: string): boolean {
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

export function validatePatientRegistration(
    values: PatientRegistrationFormValues,
    options: ValidatePatientRegistrationOptions = {}
): { error: string | null; data: ValidatedPatientRegistration | null } {
    const requireEmail = options.requireEmail ?? true;
    const requirePassword = options.requirePassword ?? true;
    const normalizedPhone = normalizeUsPhone(values.phone);
    const normalizedZipCode = normalizeUsZip(values.zipCode);
    const firstName = values.firstName.trim();
    const lastName = values.lastName.trim();
    const address1 = values.address1.trim();
    const city = values.city.trim();
    const email = values.email?.trim() ?? '';
    const displayName = `${firstName} ${lastName}`.trim();

    if (!firstName || !lastName) {
        return { error: 'First name and last name are required', data: null };
    }

    if (!values.dob || !isAdult(values.dob)) {
        return { error: 'You must be at least 18 years old to create an account', data: null };
    }

    if (!values.sex) {
        return { error: 'Sex is required', data: null };
    }

    if (!address1 || !city || !values.state) {
        return { error: 'Address, city, and state are required', data: null };
    }

    if (!normalizedZipCode) {
        return { error: 'ZIP code must be a valid 5-digit US ZIP', data: null };
    }

    if (!normalizedPhone) {
        return { error: 'Phone number must be a valid 10-digit US phone number', data: null };
    }

    if (requireEmail && !email) {
        return { error: 'Email is required', data: null };
    }

    if (requirePassword) {
        if ((values.password ?? '').length < 8) {
            return { error: 'Password must be at least 8 characters', data: null };
        }

        if (values.password !== values.confirmPassword) {
            return { error: 'Passwords do not match', data: null };
        }
    }

    return {
        error: null,
        data: {
            firstName,
            lastName,
            displayName,
            dob: values.dob,
            sex: values.sex,
            address1,
            city,
            state: values.state,
            zipCode: normalizedZipCode,
            phone: normalizedPhone,
            email
        }
    };
}

export async function finalizePatientRegistration(
    user: FirebaseUser,
    registration: ValidatedPatientRegistration,
    options: FinalizePatientRegistrationOptions = {}
): Promise<void> {
    const mergePatientRecord = options.mergePatientRecord ?? false;
    const doseSpotUpdateExisting = options.doseSpotUpdateExisting ?? false;
    const sendVerificationEmailOption = options.sendVerificationEmail ?? false;
    const email = (options.emailOverride ?? user.email ?? registration.email).trim();

    if (!email) {
        throw new Error('Unable to determine patient email address.');
    }

    const patientRecord: Record<string, unknown> = {
        uid: user.uid,
        email,
        name: registration.displayName,
        displayName: registration.displayName,
        firstName: registration.firstName,
        lastName: registration.lastName,
        dob: registration.dob || null,
        dateOfBirth: registration.dob || null,
        sex: registration.sex || null,
        sexAtBirth: registration.sex || null,
        gender: registration.sex || null,
        address: registration.address1 || null,
        address1: registration.address1 || null,
        city: registration.city || null,
        state: registration.state || null,
        zip: registration.zipCode,
        zipCode: registration.zipCode,
        phone: registration.phone,
        phoneNumber: registration.phone,
        role: 'patient',
        status: 'active',
        isIdentityVerified: false,
        identityVerification: {
            provider: 'vouched',
            status: 'not_started',
            verified: false,
            jobId: null,
            internalId: null,
            verifiedAt: null,
            lastUpdatedAt: serverTimestamp(),
            failureReason: null,
            warningCode: null,
            warningMessage: null,
        },
        emailVerified: user.emailVerified,
        updatedAt: serverTimestamp()
    };

    if (!mergePatientRecord) {
        patientRecord.createdAt = serverTimestamp();
    }

    await updateProfile(user, {
        displayName: registration.displayName
    });

    const patientWrite = mergePatientRecord
        ? setDoc(doc(db, 'patients', user.uid), patientRecord, { merge: true })
        : setDoc(doc(db, 'patients', user.uid), patientRecord);

    await Promise.all([
        patientWrite,
        setDoc(doc(db, 'users', user.uid), patientRecord, { merge: true })
    ]);

    if (sendVerificationEmailOption && !user.emailVerified) {
        await sendEmailVerification(user);
    }

    if (options.auditAction) {
        await logAuditEvent({
            userId: user.uid,
            userEmail: email,
            action: options.auditAction,
            details: { role: 'patient' }
        });
    }

    void syncDoseSpotPatientBestEffort(user, {
        patientUid: user.uid,
        updateExisting: doseSpotUpdateExisting
    });
}
