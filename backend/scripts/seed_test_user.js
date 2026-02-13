const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const serviceAccount = require('c:\\Users\\dayoo\\Downloads\\patriotic-virtual-prod-firebase-adminsdk-fbsvc-ba0548c407.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID || 'patriotic-virtual-prod'
    });
}

const auth = admin.auth();
const db = admin.firestore();

async function seed() {
    try {
        console.log('Seeding Test Data...');

        // 1. Create/Get Provider
        const email = 'test@patriotic.health';
        const password = 'Password123!';
        let user;
        try {
            user = await auth.getUserByEmail(email);
            console.log('Test provider exists:', user.uid);
        } catch (e) {
            user = await auth.createUser({
                uid: 'test-provider-001', // FORCE UID
                email,
                password,
                displayName: 'Dr. Test'
            });
            console.log('Created test provider:', user.uid);
        }

        // 2. Set Custom Claim (Optional, if needed for RBAC)
        await auth.setCustomUserClaims(user.uid, { role: 'doctor' });

        // 3. Create/Get Patient Auth User
        const patientEmail = 'patient@test.com';
        const patientPassword = 'Password123!';
        let patientUser;
        try {
            patientUser = await auth.getUserByEmail(patientEmail);
            console.log('Test patient exists:', patientUser.uid);
        } catch (e) {
            patientUser = await auth.createUser({
                uid: 'test-patient-001',
                email: patientEmail,
                password: patientPassword,
                displayName: 'Test Patient',
                emailVerified: true
            });
            console.log('Created test patient:', patientUser.uid);
        }

        // 4. Create/Get Patient Document
        const patientRef = db.collection('patients').doc('test-patient-001');
        await patientRef.set({
            uid: 'test-patient-001',
            firstName: 'Test',
            lastName: 'Patient',
            dob: '1980-01-01',
            email: patientEmail,
            state: 'TX',
            gender: 'Male',
            allergies: ['Penicillin', 'Sulfa'], // Added mock allergies for safety check
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log('Created/Updated test patient doc: test-patient-001');

        // 5. Create Consultation (Required for Dashboard visibility)
        const consultRef = db.collection('consultations').doc('test-consult-001');
        await consultRef.set({
            consultationId: 'test-consult-001',
            uid: 'test-patient-001', // REQUIRED: Matches auth/patient UID
            patientId: 'test-patient-001',
            providerId: 'test-provider-001',
            serviceKey: 'testosterone_hrt',
            status: 'pending_review',
            paymentStatus: 'paid',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            intake: {
                symptoms: 'Fatigue and low energy',
                gender: 'Male',
                hasRecentLabs: false
            }
        }, { merge: true });
        console.log('Created/Updated test consultation: test-consult-001');

        console.log('Seeding Complete! Login with:', email, password);
        process.exit(0);
    } catch (error) {
        console.error('Seeding Error:', error);
        process.exit(1);
    }
}

seed();
