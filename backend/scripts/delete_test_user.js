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

async function deleteUser() {
    try {
        const user = await auth.getUserByEmail('test@patriotic.health');
        console.log('Found user:', user.uid);
        await auth.deleteUser(user.uid);
        console.log('Deleted user:', user.email);
    } catch (e) {
        console.log('User not found or error:', e.message);
    }
}

deleteUser();
