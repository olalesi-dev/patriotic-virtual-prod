import { Router, Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { logger } from '../utils/logger';

const router = Router();

// Your Vouched Private Key
const VOUCHED_PRIVATE_KEY = process.env.VOUCHED_PRIVATE_KEY || '-qio3DiQ9oJwFM#o1cjtKgZ2sCwUJC';

/**
 * POST /api/v1/vouched/webhook
 * Public endpoint that receives status updates from Vouched.id
 */
router.post('/webhook', async (req: Request, res: Response) => {
    try {
        const payload = req.body;
        const jobId = payload.id; // Vouched usually sends the job ID under 'id'

        if (!jobId) {
            return res.status(400).json({ error: 'Missing Job ID in webhook payload' });
        }

        logger.info(`Received Vouched webhook for Job ID: ${jobId}`);

        // 1. Securely fetch the official job status directly from Vouched
        // This prevents spoofed webhook payloads
        const vouchedRes = await fetch(`https://verify.vouched.id/api/jobs/${jobId}`, {
            headers: {
                'X-Api-Key': VOUCHED_PRIVATE_KEY,
                'Content-Type': 'application/json'
            }
        });

        if (!vouchedRes.ok) {
            logger.error(`Failed to verify Job ID ${jobId} with Vouched API. Status: ${vouchedRes.status}`);
            return res.status(400).json({ error: 'Invalid Job ID or failed verification' });
        }

        const jobData = await vouchedRes.json();
        const isVerified = jobData.status === 'completed' && jobData.result?.success === true;

        // 2. Find the patient in Firestore who has this Job ID
        const patientsRef = admin.firestore().collection('patients');
        const snapshot = await patientsRef.where('vouchedJobId', '==', jobId).limit(1).get();

        if (snapshot.empty) {
            logger.warn(`No patient found matching Vouched Job ID: ${jobId}`);
            return res.status(404).json({ error: 'Patient not found' });
        }

        const patientDoc = snapshot.docs[0];

        // 3. Update the patient's identity verification status
        await patientDoc.ref.update({
            isIdentityVerified: isVerified,
            vouchedStatus: jobData.status,
            vouchedVerificationDate: admin.firestore.FieldValue.serverTimestamp(),
        });

        logger.info(`Successfully processed Vouched webhook for patient UID: ${patientDoc.id}`);
        return res.status(200).json({ success: true, verified: isVerified });

    } catch (error: any) {
        logger.error('Error processing Vouched webhook:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
