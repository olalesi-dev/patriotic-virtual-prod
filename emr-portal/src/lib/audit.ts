import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export interface AuditLogEntry {
    userId: string;
    userEmail?: string;
    action: string;
    resourceId?: string;
    resourceType?: string;
    details?: any;
    timestamp?: any;
}

/**
 * Log a security or data access event to Firestore Audit Logs.
 * Designed for HIPAA compliance to track all PHI access and key system events.
 */
export async function logAuditEvent(entry: AuditLogEntry) {
    try {
        const auditRef = collection(db, 'audit_logs');
        await addDoc(auditRef, {
            ...entry,
            timestamp: serverTimestamp(),
            userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server',
        });
    } catch (error) {
        console.error('Failed to log audit event:', error);
        // We don't throw here to avoid breaking the main UI flow if logging fails
        // but in a strict HIPAA environment, you might want to block the action.
    }
}
