const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require('c:\\Users\\dayoo\\Downloads\\patriotic-virtual-prod-firebase-adminsdk-fbsvc-ba0548c407.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const auth = admin.auth();

async function getInfo() {
    const uids = [
        'DF0fKs7ngmOBvfN7J06BXZwkUsE2',
        'Qw6uf6dXa3PSf8NR8luYtYR9Je33',
        'test-patient-001',
        'test-provider-001'
    ];

    for (const uid of uids) {
        try {
            const user = await auth.getUser(uid);
            console.log(`UID: ${uid} | Email: ${user.email} | Name: ${user.displayName}`);
        } catch (e) {
            console.log(`UID: ${uid} | Error: ${e.message}`);
        }
    }
    process.exit(0);
}

getInfo();
