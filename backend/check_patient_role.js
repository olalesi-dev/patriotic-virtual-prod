const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require('c:\\Users\\dayoo\\Downloads\\patriotic-virtual-prod-firebase-adminsdk-fbsvc-ba0548c407.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function check() {
    const doc = await db.collection('patients').doc('test-patient-001').get();
    console.log('DATA:', JSON.stringify(doc.data()));
    process.exit(0);
}
check();
