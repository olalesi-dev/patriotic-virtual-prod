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

async function resetPatient() {
    const email = 'patient@test.com';
    const password = 'Password123!';
    const uid = 'test-patient-001';

    try {
        // 1. Try to delete existing to ensure clean slate (and force UID)
        try {
            await auth.deleteUser(uid);
            console.log('Deleted old uid:', uid);
        } catch (e) { /* ignore if not found */ }

        try {
            const u = await auth.getUserByEmail(email);
            if (u.uid !== uid) {
                await auth.deleteUser(u.uid);
                console.log('Deleted old email user with wrong uid:', u.uid);
            }
        } catch (e) { /* ignore */ }

        // 2. Create new
        const user = await auth.createUser({
            uid,
            email,
            password,
            displayName: 'Test Patient',
            emailVerified: true
        });
        console.log('Created/Reset Test Patient:', user.email, user.uid);

    } catch (e) {
        console.error('Error:', e);
    }
}

resetPatient();
