import type { User as FirebaseUser } from 'firebase/auth';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type SignupTraceSource = 'signup_page' | 'landing_modal';
type SignupTraceStep = 'db_write' | 'vouched_workflow';
type SignupTraceStatus = 'success' | 'error';

interface SignupFlowTraceParams {
    source: SignupTraceSource;
    step: SignupTraceStep;
    status: SignupTraceStatus;
    user?: FirebaseUser | null;
    payload?: Record<string, unknown>;
    response?: unknown;
    error?: string | null;
}

export async function recordSignupFlowTrace({
    source,
    step,
    status,
    user,
    payload,
    response,
    error,
}: SignupFlowTraceParams): Promise<void> {
    try {
        await addDoc(collection(db, 'audit_logs'), {
            action: 'SIGNUP_FLOW_TRACE',
            source,
            step,
            status,
            userId: user?.uid ?? null,
            userEmail: user?.email ?? null,
            payload: payload ?? null,
            response: response ?? null,
            error: error ?? null,
            timestamp: serverTimestamp(),
            userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server',
        });
    } catch (traceError) {
        console.warn('Failed to record signup flow trace:', traceError);
    }
}
