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

export default router;
