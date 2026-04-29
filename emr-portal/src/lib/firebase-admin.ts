import * as admin from "firebase-admin";
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export const FIREBASE_ADMIN_SETUP_HINT =
	"Configure Firebase Admin credentials using FIREBASE_SERVICE_ACCOUNT_JSON, FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY (+ FIREBASE_PROJECT_ID), GOOGLE_APPLICATION_CREDENTIALS_JSON, or GOOGLE_APPLICATION_CREDENTIALS.";

type PartialServiceAccount = {
	projectId?: string;
	clientEmail?: string;
	privateKey?: string;
};

function normalizePrivateKey(value: string): string {
	return value.replace(/\\n/g, "\n");
}

function parseServiceAccountJson(
	rawValue: string,
): PartialServiceAccount | null {
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
			const decoded = Buffer.from(rawJson, "base64").toString("utf8");
			const decodedParsed = parseServiceAccountJson(decoded);
			if (decodedParsed) return decodedParsed;
		} catch {}
	}

	return null;
}

function readServiceAccountFromSplitEnv(): PartialServiceAccount | null {
	const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
	const privateKey = process.env.FIREBASE_PRIVATE_KEY;
	const projectId =
		process.env.FIREBASE_PROJECT_ID ??
		process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

	if (!clientEmail || !privateKey) return null;
	return {
		projectId,
		clientEmail,
		privateKey: normalizePrivateKey(privateKey),
	};
}

function getLikelyAdcPath(): string | null {
	const homePath = homedir();
	if (!homePath) return null;
	return join(
		homePath,
		".config",
		"gcloud",
		"application_default_credentials.json",
	);
}

function hasRuntimeCredentialSource(): boolean {
	if (
		process.env.GOOGLE_APPLICATION_CREDENTIALS ||
		process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
	) {
		return true;
	}

	const likelyAdcPath = getLikelyAdcPath();
	if (likelyAdcPath && existsSync(likelyAdcPath)) {
		return true;
	}

	if (
		process.env.K_SERVICE ||
		process.env.FUNCTION_TARGET ||
		process.env.GAE_ENV ||
		process.env.GCP_PROJECT
	) {
		return true;
	}

	return false;
}

function resolveServiceAccount(): PartialServiceAccount | null {
	return readServiceAccountFromJsonEnv() ?? readServiceAccountFromSplitEnv();
}

function getAdminApp() {
	if (admin.apps.length > 0) {
		return admin.apps[0];
	}

	const serviceAccount = resolveServiceAccount();
	const shouldUseAdc = !serviceAccount;

	if (
		shouldUseAdc &&
		!hasRuntimeCredentialSource() &&
		process.env.NODE_ENV !== "production"
	) {
		console.warn(`Firebase Admin disabled: ${FIREBASE_ADMIN_SETUP_HINT}`);
		return null;
	}

	try {
		return admin.initializeApp({
			credential: serviceAccount
				? admin.credential.cert({
						projectId: serviceAccount.projectId,
						clientEmail: serviceAccount.clientEmail,
						privateKey: serviceAccount.privateKey,
					})
				: admin.credential.applicationDefault(),
			projectId:
				serviceAccount?.projectId ??
				process.env.FIREBASE_PROJECT_ID ??
				process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
				"patriotic-virtual-prod",
		});
	} catch (error) {
		console.warn(
			`Firebase Admin failed to initialize. ${FIREBASE_ADMIN_SETUP_HINT}`,
		);
		return null;
	}
}

const app = getAdminApp();
const db = app ? app.firestore() : null;
const auth = app ? app.auth() : null;
const messaging = app ? app.messaging() : null;

export { db, auth, messaging };
