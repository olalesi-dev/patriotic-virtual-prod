const admin = require('firebase-admin');

const serviceAccount = require('c:\\Users\\dayoo\\Downloads\\patriotic-virtual-prod-firebase-adminsdk-fbsvc-ba0548c407.json');

try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (e) { }

async function checkUser(email) {
    try {
        const user = await admin.auth().getUserByEmail(email);
        console.log(`Auth Info for ${email}:`, {
            uid: user.uid,
            displayName: user.displayName,
            email: user.email
        });

        const db = admin.firestore();
        const userDoc = await db.collection('users').doc(user.uid).get();
        console.log(`Firestore 'users' doc:`, userDoc.exists ? userDoc.data() : 'Does not exist');

        const providerDoc = await db.collection('providers').doc(user.uid).get();
        console.log(`Firestore 'providers' doc:`, providerDoc.exists ? providerDoc.data() : 'Does not exist');

        // just in case
        const patientDoc = await db.collection('patients').doc(user.uid).get();
        console.log(`Firestore 'patients' doc:`, patientDoc.exists ? patientDoc.data() : 'Does not exist');

    } catch (e) {
        console.error(e);
    }
}

checkUser('joex@test.com');
