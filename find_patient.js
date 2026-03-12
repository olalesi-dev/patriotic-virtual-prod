
const admin = require('firebase-admin');
const serviceAccount = require('c:\\Users\\dayoo\\Downloads\\patriotic-virtual-prod-firebase-adminsdk-fbsvc-ba0548c407.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

async function findPatient() {
    const db = admin.firestore();
    const email = 'joep6@test.com';

    console.log(`Searching for patient with email: ${email}`);

    // Try patients collection
    const patientsRef = db.collection('patients');
    const snapshot = await patientsRef.where('email', '==', email).limit(1).get();

    if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        console.log('Found in patients collection:');
        console.log(JSON.stringify({ id: doc.id, ...doc.data() }, null, 2));
        return;
    }

    // Try users collection (some patients might be in users)
    const usersRef = db.collection('users');
    const userSnapshot = await usersRef.where('email', '==', email).limit(1).get();

    if (!userSnapshot.empty) {
        const doc = userSnapshot.docs[0];
        console.log('Found in users collection:');
        console.log(JSON.stringify({ id: doc.id, ...doc.data() }, null, 2));
        return;
    }

    console.log('Patient not found in Firestore.');
}

findPatient().catch(console.error);
