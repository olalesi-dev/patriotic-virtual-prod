import * as admin from 'firebase-admin';

function getAdminApp() {
    if (admin.apps.length > 0) {
        return admin.apps[0];
    }

    try {
        return admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'patriotic-virtual-prod',
        });
    } catch (error) {
        // Fallback for build time where credentials might be missing
        if (process.env.NODE_ENV === 'production') {
            console.warn('Firebase Admin failed to initialize. If this is during build, it might be expected if credentials are not provided.');
        }
        return null;
    }
}

const app = getAdminApp();
const db = app ? app.firestore() : null;
const auth = app ? app.auth() : null;

export { db, auth };

