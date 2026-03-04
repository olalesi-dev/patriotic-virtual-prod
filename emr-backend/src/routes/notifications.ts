import { Router } from 'express';
import { sendSms } from '../services/twilio';
import { sendEmail } from '../services/sendgrid';
import { logger } from '../utils/logger';
import admin from 'firebase-admin';

const router = Router();

router.post('/appointment-bucket-alert', async (req, res) => {
    const { patientName, service, appointmentId } = req.body;

    if (!patientName) {
        return res.status(400).json({ error: 'Patient name is required' });
    }

    try {
        // 1. Fetch Appointment Data for more details (phone/email)
        let patientPhone = '';
        let patientEmail = '';
        if (appointmentId) {
            const apptDoc = await admin.firestore().collection('appointments').doc(appointmentId).get();
            if (apptDoc.exists) {
                const data = apptDoc.data();
                patientPhone = data?.patientPhone || '';
                patientEmail = data?.patientEmail || '';
            }
        }

        // 2. Notify Patient (SMS + Email)
        const patientSubject = `Priority Queue Confirmed: ${service || 'Your Consultation'}`;
        const patientMessage = `Hi ${patientName}, your payment for ${service || 'your consultation'} was successful. You are now in our Priority Queue. A provider will contact you shortly to finalize your appointment time.`;

        if (patientPhone) {
            await sendSms(patientPhone, patientMessage);
            logger.info(`SMS Confirmation sent to patient: ${patientName} (${patientPhone})`);
        }
        if (patientEmail) {
            await sendEmail(patientEmail, patientSubject, patientMessage);
            logger.info(`Email Confirmation sent to patient: ${patientName} (${patientEmail})`);
        }

        // 3. Notify Providers (SMS + Email + Portal)
        const providerMessage = `🚨 NEW WAITLIST: ${patientName} just paid for ${service || 'a consultation'} and is in the waiting bucket. Please schedule outreach.`;

        // Fetch all providers/admin to notify
        const providerSnapshot = await admin.firestore().collection('users')
            .where('role', 'in', ['provider', 'doctor', 'admin'])
            .get();

        const providers = providerSnapshot.docs.map(doc => doc.data());

        const notifications = providers.map(async (p) => {
            // SMS Alert
            if (p.phone) {
                await sendSms(p.phone, providerMessage);
            }

            // Email Alert
            if (p.email) {
                await sendEmail(p.email, 'Action Required: New Patient in Waiting Bucket', providerMessage);
            }

            // In-App Portal Notification
            await admin.firestore().collection('notifications').add({
                userId: p.uid || p.id,
                title: 'New Patient in Waiting Bucket',
                message: `${patientName} is awaiting scheduling for ${service}.`,
                type: 'bucket_new',
                status: 'unread',
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });

        await Promise.allSettled(notifications);

        res.json({ success: true, message: 'Patient and providers notified via SMS and Email' });
    } catch (error) {
        logger.error('Failed to notify of new bucket item', error);
        res.status(500).json({ error: 'Failed to notify' });
    }
});

export default router;
