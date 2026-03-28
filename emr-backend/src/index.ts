
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
import { ensureDoseSpotPatientForUid } from './services/dosespot-patients';
import * as admin from 'firebase-admin';

// Initialize firebase admin if not already
if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey
            })
        });
    } else {
        admin.initializeApp();
    }
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
        let patientDoseSpotId = req.query.patientDoseSpotId
            ? parseInt(req.query.patientDoseSpotId as string, 10)
            : undefined;
        const patientUid = typeof req.query.patientUid === 'string' && req.query.patientUid.trim().length > 0
            ? req.query.patientUid.trim()
            : undefined;

        const onBehalfOfUserId = req.query.onBehalfOfUserId
            ? parseInt(req.query.onBehalfOfUserId as string, 10)
            : undefined;

        const encounterId = req.query.encounterId
            ? (req.query.encounterId as string)
            : undefined;

        const refillsErrors = req.query.refillsErrors === 'true';

        let ensuredPatientContext: Awaited<ReturnType<typeof ensureDoseSpotPatientForUid>> | null = null;

        if (patientUid) {
            ensuredPatientContext = await ensureDoseSpotPatientForUid(patientUid, {
                updateExisting: false,
                onBehalfOfClinicianId: Number.isFinite(doseSpotClinicianId) ? doseSpotClinicianId : undefined
            });

            if (!ensuredPatientContext.doseSpotPatientId || ensuredPatientContext.syncStatus !== 'ready') {
                return res.status(200).json(ensuredPatientContext);
            }

            patientDoseSpotId = ensuredPatientContext.doseSpotPatientId;
        }

        const ssoUrl = generateSSOUrl({
            clinicianDoseSpotId: doseSpotClinicianId,
            patientDoseSpotId,
            onBehalfOfUserId,
            encounterId,
            refillsErrors,
        });

        return res.json({
            status: 'ready',
            syncStatus: 'ready',
            patientUid: patientUid ?? null,
            doseSpotPatientId: patientDoseSpotId ?? null,
            missingFields: ensuredPatientContext?.missingFields ?? [],
            candidatePatientIds: ensuredPatientContext?.candidatePatientIds ?? [],
            matchSource: ensuredPatientContext?.matchSource ?? null,
            message: ensuredPatientContext?.message ?? (
                patientDoseSpotId
                    ? 'DoseSpot SSO URL generated for the requested patient.'
                    : 'DoseSpot SSO URL generated.'
            ),
            ssoUrl
        });
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
