import * as admin from 'firebase-admin';

type PartialServiceAccount = {
    projectId?: string;
    clientEmail?: string;
    privateKey?: string;
};

function normalizePrivateKey(value: string): string {
    return value.replace(/\\n/g, '\n');
}

function parseServiceAccountJson(rawValue: string): PartialServiceAccount | null {
    try {
        const parsed = JSON.parse(rawValue) as {
            project_id?: string;
            client_email?: string;
            private_key?: string;
        };

        if (!parsed.client_email || !parsed.private_key) return null;
        return {
            projectId: parsed.project_id,
            clientEmail: parsed.client_email,
            privateKey: normalizePrivateKey(parsed.private_key),
        };
    } catch {
        return null;
    }
}

function readServiceAccountFromJsonEnv(): PartialServiceAccount | null {
    const jsonCandidates = [
        process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
        process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
    ];

    for (const rawJson of jsonCandidates) {
        if (!rawJson) continue;

        const directParsed = parseServiceAccountJson(rawJson);
        if (directParsed) return directParsed;

        try {
            const decoded = Buffer.from(rawJson, 'base64').toString('utf8');
            const decodedParsed = parseServiceAccountJson(decoded);
            if (decodedParsed) return decodedParsed;
        } catch {
            // Ignore invalid base64 and continue to the next candidate.
        }
    }

    return null;
}

function readServiceAccountFromSplitEnv(): PartialServiceAccount | null {
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const projectId = process.env.FIREBASE_PROJECT_ID;

    if (!clientEmail || !privateKey) return null;

    return {
        projectId,
        clientEmail,
        privateKey: normalizePrivateKey(privateKey),
    };
}

function resolveServiceAccount(): PartialServiceAccount | null {
    return readServiceAccountFromJsonEnv() ?? readServiceAccountFromSplitEnv();
}

function initializeAdminApp() {
    if (admin.apps.length > 0) {
        return admin.apps[0];
    }

    const serviceAccount = resolveServiceAccount();

    if (serviceAccount?.clientEmail && serviceAccount.privateKey) {
        return admin.initializeApp({
            credential: admin.credential.cert({
                projectId: serviceAccount.projectId,
                clientEmail: serviceAccount.clientEmail,
                privateKey: serviceAccount.privateKey,
            }),
            projectId: serviceAccount.projectId ?? process.env.FIREBASE_PROJECT_ID,
        });
    }

    return admin.initializeApp();
}

export const firebaseApp = initializeAdminApp();
export const firestore = admin.firestore();
export const firebaseAuth = admin.auth();
export { admin };
