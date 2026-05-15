import { Router } from 'express';
import admin from 'firebase-admin';
import { notifyPriorityQueuePaymentSuccess } from '../modules/notifications/producers';

const router = Router();

router.post('/appointment-bucket-alert', async (req, res) => {
    const { patientName, service, appointmentId } = req.body;

    if (!patientName) {
        return res.status(400).json({ error: 'Patient name is required' });
    }

    try {
        let patientId = '';
        if (appointmentId) {
            const apptDoc = await admin.firestore().collection('appointments').doc(appointmentId).get();
            if (apptDoc.exists) {
                const data = apptDoc.data();
                patientId = typeof data?.patientUid === 'string'
                    ? data.patientUid
                    : (typeof data?.patientId === 'string' ? data.patientId : '');
            }
        }

        await notifyPriorityQueuePaymentSuccess({
            appointmentId: appointmentId || `priority-${Date.now()}`,
            patientId: patientId || null,
            patientName,
            serviceName: service || 'Consultation',
        });

        res.json({ success: true, message: 'Priority queue notifications enqueued.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to notify' });
    }
});

import { sendEmail } from '../services/sendgrid';

router.post('/raw-email', async (req, res) => {
    const { to, subject, text, html } = req.body;
    if (!to || !subject || !text) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Convert 'to' to an array if it's a string
    const recipients = Array.isArray(to) ? to : [to];

    try {
        await Promise.all(recipients.map(recipient => sendEmail(recipient, subject, text, html)));
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
