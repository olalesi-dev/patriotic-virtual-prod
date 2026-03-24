
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { enforceMfaForStaff, loadUserContext, verifyFirebaseToken } from './middleware/auth';
import { errorHandler } from './middleware/error';
import healthRoutes from './routes/health';
import appointmentRoutes from './routes/appointments';
import patientRoutes from './routes/patients';
import notificationRoutes from './routes/notifications';
import dosespotRoutes from './routes/dosespot';
import vouchedRoutes from './routes/vouched';
import { logger } from './utils/logger';
import { generateSSOUrl } from './utils/dosespot';
import * as admin from 'firebase-admin';

// Initialize firebase admin if not already
if (!admin.apps.length) {
    admin.initializeApp();
}

const app = express();
const PORT = process.env.PORT || 8080;

// Security & Metrics
app.use(helmet());

const allowedOrigins = [
    'https://patriotic-virtual-emr.web.app',
    'https://patriotictelehealth.com',
    'http://localhost:3000',
    'http://localhost:5173',
];

app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

app.options('*', cors());
app.use(morgan('combined'));
app.use(express.json());

// Public Routes (No Auth)
app.get('/', (_req, res) => {
    res.json({ service: 'emr-backend', status: 'UP', health: '/health' });
});
app.use('/health', healthRoutes);

// DoseSpot Webhook (Public - server-to-server from DoseSpot infrastructure)
app.use('/api/v1/dosespot', dosespotRoutes);

// Vouched Webhook (Public)
app.use('/api/v1/vouched', vouchedRoutes);

// DoseSpot Routes (Firestore Only - Bypasses Postgres loadUserContext)
app.get('/api/v1/dosespot/sso-url', verifyFirebaseToken, async (req, res) => {
    try {
        const uid = req['user']?.uid;
        if (!uid) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const providerDoc = await admin.firestore().collection('users').doc(uid).get();
        if (!providerDoc.exists) {
            return res.status(400).json({ error: 'Provider not configured for eRx. Contact admin.' });
        }

        const data = providerDoc.data();
        const doseSpotClinicianId = data?.doseSpotClinicianId;

        if (!doseSpotClinicianId) {
            return res.status(400).json({ error: 'Provider not configured for eRx. Contact admin.' });
        }

        // Parse all supported query parameters
        const patientDoseSpotId = req.query.patientDoseSpotId
            ? parseInt(req.query.patientDoseSpotId as string, 10)
            : undefined;

        const onBehalfOfUserId = req.query.onBehalfOfUserId
            ? parseInt(req.query.onBehalfOfUserId as string, 10)
            : undefined;

        const encounterId = req.query.encounterId
            ? (req.query.encounterId as string)
            : undefined;

        const refillsErrors = req.query.refillsErrors === 'true';

        const ssoUrl = generateSSOUrl({
            clinicianDoseSpotId: doseSpotClinicianId,
            patientDoseSpotId,
            onBehalfOfUserId,
            encounterId,
            refillsErrors,
        });

        return res.json({ ssoUrl });
    } catch (error: any) {
        logger.error('Error generating DoseSpot SSO URL:', error);
        return res.status(500).json({ error: 'Failed to build SSO link' });
    }
});

app.get('/api/v1/dosespot/notification-count', verifyFirebaseToken, async (req, res) => {
    try {
        const uid = req['user']?.uid;
        if (!uid) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Return all zeros if doc doesn't exist
        const defaultCounts = {
            pendingPrescriptions: 0,
            transmissionErrors: 0,
            refillRequests: 0,
            changeRequests: 0,
            total: 0
        };

        const snapshot = await admin.firestore()
            .collection('users')
            .doc(uid)
            .collection('dosespot')
            .doc('notifications')
            .get();

        if (!snapshot.exists) {
            return res.json(defaultCounts);
        }

        const data = snapshot.data();
        if (!data) return res.json(defaultCounts);

        const pendingPrescriptions = data.pendingPrescriptions || 0;
        const transmissionErrors = data.transmissionErrors || 0;
        const refillRequests = data.refillRequests || 0;
        const changeRequests = data.changeRequests || 0;
        const total = pendingPrescriptions + transmissionErrors + refillRequests + changeRequests;

        return res.json({
            pendingPrescriptions,
            transmissionErrors,
            refillRequests,
            changeRequests,
            total
        });
    } catch (error: any) {
        logger.error('Error fetching DoseSpot notification count:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin User Extension Route
app.post('/api/v1/admin/users', verifyFirebaseToken, async (req, res) => {
    try {
        const doseSpotClinicianId = req.body.doseSpotClinicianId;
        const targetUid = req.body.uid;

        const userToUpdate = targetUid || req['user']?.uid;
        if (!userToUpdate) {
            return res.status(400).json({ error: 'Missing uid' });
        }

        if (doseSpotClinicianId) {
            await admin.firestore().collection('users').doc(userToUpdate).set({
                doseSpotClinicianId: parseInt(doseSpotClinicianId, 10)
            }, { merge: true });
        }

        return res.json({ success: true, updated: true });
    } catch (error: any) {
        logger.error('Error updating admin user:', error);
        return res.status(500).json({ error: 'Failed to update user' });
    }
});

// Protected EMR Routes (Require Auth + MFA)
app.use('/api', verifyFirebaseToken, loadUserContext, enforceMfaForStaff); // Global MFA Gate

// Routes
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/notifications', notificationRoutes);



// Error Handling
app.use(errorHandler);

app.listen(PORT, () => {
    logger.info(`EMR Backend listening on port ${PORT}`);
});
