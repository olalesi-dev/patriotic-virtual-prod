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

        // EMR PHASE 1: Create/Update Patient Record
        const patientRef = db.collection('patients').doc(uid);
        await patientRef.set({
            uid,
            firstName: intake.firstName || 'Unknown',
            lastName: intake.lastName || '',
            email: intake.email || '',
            dob: intake.dateOfBirth || '',
            state: intake.state || '',
            lastVisit: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

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
        const uids = new Set();

        snapshot.forEach(doc => {
            const data = doc.data();
            consultations.push({ id: doc.id, ...data });
            if (data.uid) uids.add(data.uid);
        });

        // Fetch user details from Firebase Auth
        let userMap = {};
        if (uids.size > 0) {
            try {
                const uidList = [...uids].map(uid => ({ uid }));
                const userRecords = await admin.auth().getUsers(uidList);
                userRecords.users.forEach(user => {
                    userMap[user.uid] = {
                        name: user.displayName || 'Unknown',
                        email: user.email || ''
                    };
                });
            } catch (authError) {
                console.error('Error fetching auth users:', authError);
            }
        }

        // Attach user details to consultations
        const enrichedConsultations = consultations.map(c => {
            const user = userMap[c.uid] || {};
            return {
                ...c,
                patientName: user.name || user.email || 'Unknown',
                patientEmail: user.email || c.patientEmail || ''
            };
        });

        res.json({ consultations: enrichedConsultations });
    } catch (error) {
        console.error('Error fetching admin consultations:', error);
        res.status(500).json({ error: error.message });
    }
});

// 1.6.5 EMR: Get Single Patient Chart
app.get('/api/v1/doctor/patients/:uid', async (req, res) => {
    try {
        const { uid } = req.params;
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).send('Unauthorized');

        // Verify token
        const idToken = authHeader.split('Bearer ')[1];
        await admin.auth().verifyIdToken(idToken);
        // (Add role check here in Phase 5)

        // 1. Fetch Profile
        const profileSnap = await db.collection('patients').doc(uid).get();
        let profile = profileSnap.exists ? profileSnap.data() : { uid, name: 'Unknown' };

        // 2. Fetch Consultations History
        const consultsSnap = await db.collection('consultations')
            .where('uid', '==', uid)
            .orderBy('createdAt', 'desc')
            .get();

        const history = [];
        consultsSnap.forEach(doc => {
            history.push({ id: doc.id, ...doc.data() });
        });

        // 3. Fallback: If no profile exists yet (legacy user), try to build one from Auth or first consult
        if (!profileSnap.exists && history.length > 0) {
            const last = history[0].intake || {};
            profile = {
                uid,
                firstName: last.firstName || 'Unknown',
                lastName: last.lastName || '',
                dob: last.dateOfBirth || '',
                state: last.state || '',
                email: last.email || ''
            };
        }

        // 4. Fetch SOAP Notes (New in Phase 2)
        const notesSnap = await db.collection('soap_notes')
            .where('patientId', '==', uid)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();

        const notes = [];
        notesSnap.forEach(doc => notes.push({ id: doc.id, ...doc.data() }));

        // 5. Fetch Lab Orders (New in Phase 4)
        const labsSnap = await db.collection('lab_orders')
            .where('patientId', '==', uid)
            .orderBy('createdAt', 'desc')
            .get();

        const labs = [];
        labsSnap.forEach(doc => labs.push({ id: doc.id, ...doc.data() }));

        res.json({ profile, history, notes, labs });
    } catch (error) {
        console.error('Error fetching patient chart:', error);
        res.status(500).json({ error: error.message });
    }
});

// 1.6.6 EMR: Save SOAP Note
app.post('/api/v1/doctor/soap', async (req, res) => {
    try {
        const {
            patientId,
            consultationId,
            subjective,
            objective,
            assessment,
            plan,
            diagnosis,      // New in Phase 3
            prescription    // New in Phase 3 (Object: { name, dosage, frequency, quantity })
        } = req.body;

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).send('Unauthorized');

        const idToken = authHeader.split('Bearer ')[1];
        const decoded = await admin.auth().verifyIdToken(idToken);
        const providerId = decoded.uid;

        const noteRef = await db.collection('soap_notes').add({
            patientId,
            consultationId: consultationId || null,
            providerId,
            subjective: subjective || '',
            objective: objective || '',
            assessment: assessment || '',
            plan: plan || '',
            diagnosis: diagnosis || '',
            prescription: prescription || null,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ success: true, id: noteRef.id, message: 'SOAP note saved' });
    } catch (error) {
        console.error('Error saving SOAP note:', error);
        res.status(500).json({ error: error.message });
    }
});

// 1.8 Lab Orders
const PDFDocument = require('pdfkit');

// Helper to generate Lab Requisition PDF
const generateLabReq = async (patient, panels, diagnosis, orderId) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument();
            let buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            // Header
            doc.fontSize(20).text('Patriotic Health - Lab Requisition', { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).text(`Date: ${new Date().toLocaleDateString()}`);
            doc.text(`Order ID: ${orderId}`);
            doc.moveDown();

            // Patient Info
            doc.text(`Patient: ${patient.firstName} ${patient.lastName}`);
            doc.text(`DOB: ${patient.dob || 'N/A'}`);
            doc.text(`Gender: ${patient.gender || 'N/A'}`);
            doc.moveDown();

            // Diagnosis
            doc.text(`Diagnosis (ICD-10): ${diagnosis || 'None'}`);
            doc.moveDown();

            // Panels
            doc.text('Requested Panels:', { underline: true });
            panels.forEach(p => doc.text(`- ${p}`));

            doc.moveDown(2);
            doc.text('Provider Signature: __________________________');

            doc.end();
        } catch (e) {
            reject(e);
        }
    });
};

app.post('/api/v1/doctor/labs', async (req, res) => {
    try {
        const { patientId, panels, diagnosisCode } = req.body;
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).send('Unauthorized');

        const idToken = authHeader.split('Bearer ')[1];
        const decoded = await admin.auth().verifyIdToken(idToken);
        const providerId = decoded.uid;

        // 1. Create Order Doc
        const orderRef = await db.collection('lab_orders').add({
            patientId,
            providerId,
            panels,
            diagnosisCode,
            status: 'ordered',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // 2. Fetch Patient for PDF
        const pSnap = await db.collection('patients').doc(patientId).get();
        const patient = pSnap.exists ? pSnap.data() : { firstName: 'Unknown', lastName: '', dob: 'N/A' };

        // 3. Generate PDF
        const pdfBuffer = await generateLabReq(patient, panels, diagnosisCode, orderRef.id);

        // 4. Upload to Storage
        const bucket = admin.storage().bucket(); // Default bucket
        const file = bucket.file(`labs/${patientId}/${orderRef.id}_req.pdf`);

        await file.save(pdfBuffer, {
            metadata: { contentType: 'application/pdf' }
        });

        // 5. Get Signed URL (valid for 7 days)
        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 7 * 24 * 60 * 60 * 1000
        });

        // 6. Update Order with PDF URL
        await orderRef.update({ requisitionUrl: url });

        res.json({ success: true, orderId: orderRef.id, pdfUrl: url });

    } catch (error) {
        console.error('Error creating lab order:', error);
        res.status(500).json({ error: error.message });
    }
});

// 1.9 Lab Results Upload
const labUpload = require('multer')({ storage: require('multer').memoryStorage() });

app.post('/api/v1/doctor/labs/upload', labUpload.single('file'), async (req, res) => {
    try {
        const { orderId } = req.body;
        const file = req.file;
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).send('Unauthorized');

        if (!file || !orderId) return res.status(400).send('Missing file or orderId');

        // 1. Validate Order
        const orderRef = db.collection('lab_orders').doc(orderId);
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) return res.status(404).send('Order not found');

        // 2. Upload Result PDF
        const bucket = admin.storage().bucket();
        const blob = bucket.file(`labs/results/${orderId}_${file.originalname}`);

        await blob.save(file.buffer, {
            metadata: { contentType: file.mimetype }
        });

        // 3. Get URL
        const [url] = await blob.getSignedUrl({
            action: 'read',
            expires: Date.now() + 365 * 24 * 60 * 60 * 1000 // 1 year
        });

        // 4. Update Order Status
        await orderRef.update({
            resultUrl: url,
            status: 'needs_review',
            resultUploadedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ success: true, message: 'Result uploaded', url });

    } catch (error) {
        console.error('Error uploading lab result:', error);
        res.status(500).json({ error: error.message });
    }
});

// 1.10 Review Lab Result
app.patch('/api/v1/doctor/labs/:orderId/review', async (req, res) => {
    try {
        const { orderId } = req.params;
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).send('Unauthorized');

        await db.collection('lab_orders').doc(orderId).update({
            status: 'reviewed',
            reviewedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ success: true, message: 'Lab result marked as reviewed' });
    } catch (error) {
        console.error('Error reviewing lab result:', error);
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

        console.log('PATCH body:', req.body);
        const updateData = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        if (status) updateData.status = status;
        if (doctorNotes !== undefined) updateData.doctorNotes = doctorNotes;

        await db.collection('consultations').doc(id).update(updateData);

        res.json({ message: 'Consultation updated' });
    } catch (error) {
        console.error('Error updating consultation:', error);
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});


// 2. Stripe Checkout
const stripeKey = process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.trim() : null;
let stripe;
if (stripeKey) {
    // Log masked key for debugging
    console.log(`Stripe Key Configured: ${stripeKey.substring(0, 8)}...${stripeKey.substring(stripeKey.length - 4)}`);
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
        const { serviceKey, consultationId } = req.body;

        // MOCK PAYMENT FLOW (If Stripe Key is missing)
        if (!stripe) {
            console.warn("⚠️  Stripe key missing. Using MOCK checkout session for testing.");

            // Auto-complete payment in DB for mock flow so backend state is consistent
            if (consultationId) {
                await db.collection('consultations').doc(consultationId).update({
                    paymentStatus: 'paid',
                    stripeSessionId: 'mock_session_' + Date.now(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }

            // Return success URL immediately
            const mockUrl = `${process.env.FRONTEND_URL || 'https://patriotic-virtual-prod.web.app'}?payment=success&session_id=mock_session_${Date.now()}&consultationId=${consultationId}`;
            return res.json({ sessionId: 'mock_session_' + Date.now(), url: mockUrl });
        }

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
            success_url: `${process.env.FRONTEND_URL || 'https://patriotic-virtual-prod.web.app'}?payment=success&session_id={CHECKOUT_SESSION_ID}&consultationId=${consultationId}`,
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

// 3. APPOINTMENTS (New)
app.post('/api/v1/appointments/book', async (req, res) => {
    try {
        const { consultationId, startTime } = req.body;
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).send('Unauthorized');
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        const uid = decodedToken.uid;

        if (!consultationId || !startTime) {
            console.error('Booking failed: Missing fields', req.body);
            return res.status(400).send('Missing fields');
        }

        const requestedTime = new Date(startTime);
        console.log(`Attempting to book for: ${requestedTime.toISOString()} (${startTime})`);

        // Collision Check: Range query (Start time match)
        // Note: In Firestore, exact Date object equality can be tricky if ms differ.
        // We'll query for appointments starting at the exact same minute.
        const snap = await db.collection('appointments')
            .where('startTime', '==', admin.firestore.Timestamp.fromDate(requestedTime))
            .get();

        if (!snap.empty) {
            return res.status(409).send('Slot taken');
        }

        const aptRef = db.collection('appointments').doc();
        await aptRef.set({
            id: aptRef.id,
            consultationId,
            patientId: uid,
            providerId: 'test-provider-001', // Assigned to Dr. Test for now
            startTime: admin.firestore.Timestamp.fromDate(new Date(startTime)),
            durationMinutes: 30,
            status: 'confirmed',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ success: true, id: aptRef.id });
    } catch (error) {
        console.error('Booking error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/v1/doctor/appointments', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).send('Unauthorized');

        // Return all appointments for demo (or filter by provider in real app)
        const snap = await db.collection('appointments').get();
        const appointments = [];
        snap.forEach(doc => {
            const d = doc.data();
            appointments.push({
                id: doc.id,
                ...d,
                startTime: d.startTime.toDate().toISOString()
            });
        });

        res.json(appointments);
    } catch (error) {
        console.error('Fetch appointments error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Local testing & Cloud Run
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
