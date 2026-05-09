import { Router } from 'express';
import { z } from 'zod';
import { admin } from '../config/firebase';
import { startTelnyxPhoneVerification, verifyTelnyxPhoneCode } from '../services/telnyx';
import { logger } from '../utils/logger';
import { getPhoneVerificationErrorStatus } from '../utils/phone-verification-errors';

const router = Router();

const requestSchema = z.object({
    phoneNumber: z.string().trim().min(7).optional(),
});

const verifySchema = z.object({
    phoneNumber: z.string().trim().min(7),
    code: z.string().trim().min(3).max(10),
});

function readPhoneNumber(data: Record<string, unknown> | undefined): string | null {
    const phone = typeof data?.phone === 'string' ? data.phone.trim() : '';
    if (phone) return phone;
    const phoneNumber = typeof data?.phoneNumber === 'string' ? data.phoneNumber.trim() : '';
    return phoneNumber || null;
}

function shouldIncludePatientRecord(role: unknown): boolean {
    return typeof role === 'string' && role.trim().toLowerCase() === 'patient';
}

router.post('/request', async (req, res) => {
    const uid = req.user?.uid;
    if (!uid) {
        return res.status(401).json({ error: 'Unauthorized.' });
    }

    try {
        const parsed = requestSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid phone verification request.' });
        }

        const includePatientRecord = shouldIncludePatientRecord(req.user?.role);
        let phoneNumber = parsed.data.phoneNumber?.trim() || null;

        if (!phoneNumber) {
            const userDocPromise = admin.firestore().collection('users').doc(uid).get();
            const patientDocPromise = includePatientRecord
                ? admin.firestore().collection('patients').doc(uid).get()
                : Promise.resolve(null);
            const [userDoc, patientDoc] = await Promise.all([userDocPromise, patientDocPromise]);
            phoneNumber = readPhoneNumber(userDoc.exists ? userDoc.data() as Record<string, unknown> : undefined)
                ?? readPhoneNumber(patientDoc?.exists ? patientDoc.data() as Record<string, unknown> : undefined);
        }

        if (!phoneNumber) {
            return res.status(400).json({ error: 'Phone number is required before verification can start.' });
        }

        logger.info('Phone verification API request received', {
            uid,
            phoneNumber,
            includePatientRecord,
        });

        const result = await startTelnyxPhoneVerification(uid, phoneNumber, { includePatientRecord });
        return res.json({ success: true, verification: result });
    } catch (error) {
        return res
            .status(getPhoneVerificationErrorStatus(error))
            .json({ error: error instanceof Error ? error.message : 'Failed to start phone verification.' });
    }
});

router.post('/verify', async (req, res) => {
    const uid = req.user?.uid;
    if (!uid) {
        return res.status(401).json({ error: 'Unauthorized.' });
    }

    try {
        const parsed = verifySchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid verification code payload.' });
        }

        const includePatientRecord = shouldIncludePatientRecord(req.user?.role);

        logger.info('Phone verification code submit received', {
            uid,
            phoneNumber: parsed.data.phoneNumber,
            includePatientRecord,
        });

        const result = await verifyTelnyxPhoneCode(uid, parsed.data.phoneNumber, parsed.data.code, { includePatientRecord });
        return res.json({ success: true, verification: result });
    } catch (error) {
        return res
            .status(getPhoneVerificationErrorStatus(error))
            .json({ error: error instanceof Error ? error.message : 'Failed to verify phone number.' });
    }
});

export default router;
