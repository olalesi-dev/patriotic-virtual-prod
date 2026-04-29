import { Router } from 'express';
import { admin, firebaseAuth, firestore } from '../config/firebase';
import { logger } from '../utils/logger';

const router = Router();

router.post('/', async (req, res) => {
    try {
        const uid = req.user?.uid;
        if (!uid) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { serviceKey, intake, stripeProductId } = req.body as {
            serviceKey?: string;
            intake?: Record<string, unknown>;
            stripeProductId?: string | null;
        };

        let realFirst = '';
        let realLast = '';
        let realEmail = '';

        try {
            const userRecord = await firebaseAuth.getUser(uid);
            realEmail = userRecord.email || '';
            if (userRecord.displayName) {
                const parts = userRecord.displayName.split(' ');
                realFirst = parts[0] || '';
                realLast = parts.slice(1).join(' ') || '';
            }
        } catch (error) {
            logger.warn('Auth fetch failed in consultations route', { uid, error });
        }

        const firstName = String((intake?.firstName || intake?.first_name || realFirst || 'Patient') ?? 'Patient');
        const lastName = String((intake?.lastName || intake?.last_name || realLast || '') ?? '');
        const email = String((intake?.email || realEmail || '') ?? '');

        const consultationRef = await firestore.collection('consultations').add({
            uid,
            patient: `${firstName} ${lastName}`.trim(),
            patientEmail: email,
            serviceKey: serviceKey || 'unknown',
            intake: intake || {},
            stripeProductId: stripeProductId || null,
            status: 'pending',
            paymentStatus: 'unpaid',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        await firestore.collection('patients').doc(uid).set({
            uid,
            firstName,
            lastName,
            name: `${firstName} ${lastName}`.trim(),
            email,
            dob: intake?.dateOfBirth || '',
            state: intake?.state || '',
            lastVisit: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        return res.json({ id: consultationRef.id, message: 'Consultation created' });
    } catch (error) {
        logger.error('Error creating consultation', { error });
        return res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
    }
});

export default router;
