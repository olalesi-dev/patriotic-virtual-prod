import { db, auth } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export type AuditAction =
    | 'VIEW_PATIENT_PHI'
    | 'EDIT_PATIENT_PHI'
    | 'SIGN_ENCOUNTER'
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILURE'
    | 'REFILL_APPROVED'
    | 'ORDER_PLACED'
    | 'DOC_DOWNLOAD'
    | 'CONSENT_RECORDED';

interface AuditLog {
    userId: string;
    userName: string;
    action: AuditAction;
    resourceId?: string; // e.g., patientId or encounterId
    details: string;
    ipAddress: string;
    userAgent: string;
    timestamp: any;
}

/**
 * Log a HIPAA-compliant audit event to Firestore.
 * This collection should have Firestore Rules that prevent deletion or modification.
 */
export async function logHIPAAEvent(
    action: AuditAction,
    details: string,
    resourceId?: string
) {
    try {
        const user = auth.currentUser;
        const auditLogsRef = collection(db, 'audit_logs');

        const logEntry: AuditLog = {
            userId: user?.uid || 'SYSTEM',
            userName: user?.email || 'Anonymous/System',
            action,
            resourceId,
            details,
            ipAddress: '0.0.0.0', // In a real app, capture via API call or header
            userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server',
            timestamp: serverTimestamp()
        };

        await addDoc(auditLogsRef, logEntry);
        console.log(`[HIPAA Audit] ${action}: ${details}`);
    } catch (error) {
        console.error('Failed to log HIPAA event:', error);
        // In production, consider a fallback logging mechanism if Firestore is down
    }
}
