const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require('c:\\Users\\dayoo\\Downloads\\patriotic-virtual-prod-firebase-adminsdk-fbsvc-ba0548c407.json');

try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (e) {
    // If already initialized
}

async function verifyEmail(email) {
    try {
        const user = await admin.auth().getUserByEmail(email);
        console.log(`Found user: ${user.uid}. Current emailVerified: ${user.emailVerified}`);

        await admin.auth().updateUser(user.uid, {
            emailVerified: true
        });

        console.log(`✅ Successfully updated ${email} to be verified!`);
    } catch (error) {
        console.error('Error verifying email:', error.message);
    }
}

verifyEmail('joex@test.com');
