const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(), // Uses GOOGLE_APPLICATION_CREDENTIALS or default service account
        projectId: process.env.FIREBASE_PROJECT_ID || 'patriotic-virtual-prod'
    });
}
const db = admin.firestore();

const app = express();

// Middleware
app.use(morgan('dev'));

// MANUAL CORS AND PREFLIGHT
app.use((req, res, next) => {
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use(helmet());

// Webhook handling needs raw body, others need JSON
app.use('/api/v1/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use(express.json());

// Routes
// 1. Consultation Intake
app.post('/api/v1/consultations', async (req, res) => {
    try {
        const { serviceKey, intake, stripeProductId } = req.body;
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).send('Unauthorized');
        }
        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;

        const consultRef = await db.collection('consultations').add({
            uid,
            serviceKey,
            intake,
            stripeProductId,
            status: 'pending',
            paymentStatus: 'unpaid',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ id: consultRef.id, message: 'Consultation created' });
    } catch (error) {
        console.error('Error creating consultation:', error);
        res.status(500).json({ error: error.message });
    }
});

// 1.5 Get MY Consultations
app.get('/api/v1/consultations/mine', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).send('Unauthorized');
        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;

        const snapshot = await db.collection('consultations').where('uid', '==', uid).orderBy('createdAt', 'desc').get();
        const consultations = [];
        snapshot.forEach(doc => consultations.push({ id: doc.id, ...doc.data() }));
        res.json({ consultations });
    } catch (error) {
        console.error('Error fetching consultations:', error);
        res.status(500).json({ error: error.message });
    }
});

// 1.6 ADMIN: Get ALL Consultations
app.get('/api/v1/admin/consultations', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).send('Unauthorized');
        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);

        // Simple Admin Check (Replace with claims in prod)
        // allowing all authenticated users for this sprint ONLY as requested by user to "just work"
        // In real prod, check: if (decodedToken.email !== 'dr.o@patriotic...') return res.status(403).send('Forbidden');

        const snapshot = await db.collection('consultations').orderBy('createdAt', 'desc').limit(50).get();
        const consultations = [];
        snapshot.forEach(doc => consultations.push({ id: doc.id, ...doc.data() }));
        res.json({ consultations });
    } catch (error) {
        console.error('Error fetching admin consultations:', error);
        res.status(500).json({ error: error.message });
    }
});

// 1.7 ADMIN: Update Consultation Status
app.patch('/api/v1/admin/consultations/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, doctorNotes } = req.body;
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).send('Unauthorized');

        // Verify token again
        const idToken = authHeader.split('Bearer ')[1];
        await admin.auth().verifyIdToken(idToken);

        await db.collection('consultations').doc(id).update({
            status,
            doctorNotes,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ message: 'Consultation updated' });
    } catch (error) {
        console.error('Error updating consultation:', error);
        res.status(500).json({ error: error.message });
    }
});


// 2. Stripe Checkout
const stripeKey = process.env.STRIPE_SECRET_KEY;
let stripe;
if (stripeKey) {
    stripe = require('stripe')(stripeKey);
} else {
    console.warn("WARNING: STRIPE_SECRET_KEY is missing. Stripe functionality will be disabled.");
}

// BACKEND CATALOG (Mirrors Frontend)
// We use this to construct price_data dynamically so we don't need hardcoded Stripe Price IDs
const CATALOG = {
    'general_visit': { name: 'General Visit', amount: 7900 }, // in cents
    'weight_loss': { name: 'GLP-1 & Weight Loss', amount: 12900 },
    'erectile_dysfunction': { name: 'Erectile Dysfunction', amount: 7900 },
    'premature_ejaculation': { name: 'Premature Ejaculation', amount: 7900 },
    'testosterone_hrt': { name: 'Testosterone / HRT', amount: 14900 },
    'ai_imaging': { name: 'AI-Powered Imaging Analysis', amount: 9900 },
    'report_interpretation': { name: 'Report Interpretation', amount: 14900 },
    'standard_imaging': { name: 'Standard Imaging Review', amount: 24900 },
    'imaging_video': { name: 'Imaging + Video Consult', amount: 44900 },
    'diagnostic_single': { name: 'Single Study Read', amount: 7500 },
    'diagnostic_second': { name: 'Diagnostic Second Opinion', amount: 25000 },
    // Subscription tiers
    'ai_assistant': { name: 'AI Health Assistant', amount: 2900, interval: 'month' },
    'digital_platform': { name: 'Digital Health Platform', amount: 1900, interval: 'month' },
    'membership_elite': { name: 'All Access — Elite', amount: 19900, interval: 'month' },
    'membership_plus': { name: 'All Access — Plus', amount: 14900, interval: 'month' },
    'membership_core': { name: 'All Access — Core', amount: 9900, interval: 'month' },
    'telehealth_premium': { name: 'Telehealth Premium', amount: 9900, interval: 'month' },
    'telehealth_standard': { name: 'Telehealth Standard', amount: 5900, interval: 'month' },
    'telehealth_basic': { name: 'Telehealth Basic', amount: 2900, interval: 'month' }
};

app.post('/api/v1/payments/create-checkout-session', async (req, res) => {
    try {
        if (!stripe) return res.status(503).json({ error: "Payment service unavailable (Configuration missing)" });

        const { serviceKey, consultationId } = req.body;

        // Lookup item in catalog
        const item = CATALOG[serviceKey];
        if (!item) return res.status(400).json({ error: `Invalid service key: ${serviceKey}` });

        const sessionConfig = {
            payment_method_types: ['card'],
            allow_promotion_codes: true, // Enable coupons
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: item.name,
                    },
                    unit_amount: item.amount,
                },
                quantity: 1,
            }],
            mode: item.interval ? 'subscription' : 'payment',
            success_url: `${process.env.FRONTEND_URL || 'https://patriotic-virtual-prod.web.app'}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL || 'https://patriotic-virtual-prod.web.app'}?payment=cancelled`,
            metadata: {
                serviceKey,
                consultationId
            }
        };

        // Add recurring config if subscription
        if (item.interval) {
            sessionConfig.line_items[0].price_data.recurring = { interval: item.interval };
        }

        const session = await stripe.checkout.sessions.create(sessionConfig);
        res.json({ sessionId: session.id, url: session.url });
    } catch (error) {
        console.error('Stripe error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 3. Stripe Webhook
app.post('/api/v1/webhooks/stripe', async (req, res) => {
    if (!stripe) return res.status(503).json({ error: "Payment service unavailable" });
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const { consultationId } = session.metadata;
        if (consultationId) {
            await db.collection('consultations').doc(consultationId).update({
                paymentStatus: 'paid',
                stripeSessionId: session.id,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
    }

    res.json({ received: true });
});

// 4. Radiology / Orthanc Proxy (Placeholder for now)
app.get('/api/v1/radiology/studies', async (req, res) => {
    // In production, this would proxy to the Orthanc instance via internal URL
    // For now, return a mock response to confirm connectivity
    res.json({ message: 'Orthanc proxy active', studies: [] });
});


// Health Check
app.get('/', (req, res) => {
    res.send('Patriotic Telehealth API v1 is running.');
});

// --- FILE UPLOAD (PACS) ---
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/v1/radiology/upload', upload.single('dicom'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send('No file uploaded.');
        console.log('Uploading DICOM to PACS...', req.file.originalname);

        // Proxy to Orthanc
        const orthancUrl = 'http://136.111.99.153/instances'; // Internal/Cloud IP
        // Orthanc expects raw binary for /instances
        const response = await axios.post(orthancUrl, req.file.buffer, {
            headers: { 'Content-Type': 'application/dicom' },
            maxBodyLength: Infinity,
            maxContentLength: Infinity
        });

        console.log('Orthanc Response:', response.data);
        // Orthanc returns: { "ID": "...", "Path": "...", "Status": "Success", ... }
        res.json({
            success: true,
            orthancId: response.data.ID,
            parentStudy: response.data.ParentStudy,
            parentPatient: response.data.ParentPatient
        });
    } catch (error) {
        console.error('PACS Upload Error:', error.message);
        // Fallback: If PACS is offline, we can still accept the intake but flag it
        // For now, return error so user knows retry is needed
        res.status(502).json({ error: 'PACS Server Unavailable or Invalid File' });
    }
});

// Local testing & Cloud Run
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
