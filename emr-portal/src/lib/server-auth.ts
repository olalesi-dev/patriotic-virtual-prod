import type { DecodedIdToken } from 'firebase-admin/auth';
import { NextResponse } from 'next/server';
import { auth, db, FIREBASE_ADMIN_SETUP_HINT } from '@/lib/firebase-admin';

export interface AuthenticatedUser {
    uid: string;
    email: string | null;
    role: string | null;
    token: DecodedIdToken;
}

interface AuthResult {
    user: AuthenticatedUser | null;
    errorResponse: NextResponse | null;
}

interface RequireUserOptions {
    resolveRole?: boolean;
}

export function normalizeRole(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 ? normalized : null;
}

function shouldCheckRevocation(): boolean {
    if (process.env.FIREBASE_VERIFY_REVOKED_TOKENS === 'true') return true;
    if (process.env.FIREBASE_VERIFY_REVOKED_TOKENS === 'false') return false;
    return process.env.NODE_ENV === 'production';
}

function isCredentialFailure(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const typed = error as Error & { code?: string };
    const code = typed.code ?? '';
    const message = typed.message.toLowerCase();

    return (
        code === 'app/invalid-credential' ||
        message.includes('could not load the default credentials') ||
        message.includes('failed to fetch a valid google oauth2 access token')
    );
}

export async function requireAuthenticatedUser(
    request: Request,
    options: RequireUserOptions = {}
): Promise<AuthResult> {
    const resolveRole = options.resolveRole ?? true;

    const authorizationHeader = request.headers.get('authorization') ?? '';
    if (!authorizationHeader.startsWith('Bearer ')) {
        return {
            user: null,
            errorResponse: NextResponse.json(
                { success: false, error: 'Missing Bearer token.' },
                { status: 401 }
            )
        };
    }

    const idToken = authorizationHeader.slice('Bearer '.length).trim();
    if (!idToken) {
        return {
            user: null,
            errorResponse: NextResponse.json(
                { success: false, error: 'Invalid Bearer token.' },
                { status: 401 }
            )
        };
    }

    if (!auth) {
        return {
            user: null,
            errorResponse: NextResponse.json(
                { success: false, error: `Firebase Admin auth is not initialized on server. ${FIREBASE_ADMIN_SETUP_HINT}` },
                { status: 500 }
            )
        };
    }

    try {
        const withRevocation = shouldCheckRevocation();
        let decodedToken: DecodedIdToken;

        try {
            decodedToken = await auth.verifyIdToken(idToken, withRevocation);
        } catch (verifyError) {
            if (withRevocation && process.env.NODE_ENV !== 'production' && isCredentialFailure(verifyError)) {
                decodedToken = await auth.verifyIdToken(idToken, false);
            } else {
                throw verifyError;
            }
        }

        const tokenRole = normalizeRole(decodedToken.role);
        let resolvedRole = tokenRole;

        if (!resolvedRole && resolveRole && db) {
            const userDoc = await db.collection('users').doc(decodedToken.uid).get();
            const firestoreRole = userDoc.exists ? normalizeRole(userDoc.data()?.role) : null;
            resolvedRole = firestoreRole;
        }

        return {
            user: {
                uid: decodedToken.uid,
                email: decodedToken.email ?? null,
                role: resolvedRole,
                token: decodedToken
            },
            errorResponse: null
        };
    } catch (error) {
        const typedError = error as Error & { code?: string };
        if (typedError.code === 'auth/id-token-expired') {
            return {
                user: null,
                errorResponse: NextResponse.json(
                    { success: false, error: 'Session expired. Please sign in again.' },
                    { status: 401 }
                )
            };
        }

        if (typedError.code === 'auth/id-token-revoked') {
            return {
                user: null,
                errorResponse: NextResponse.json(
                    { success: false, error: 'Session was revoked. Please sign in again.' },
                    { status: 401 }
                )
            };
        }

        const detailedMessage = process.env.NODE_ENV !== 'production' && typedError.message
            ? `Token verification failed: ${typedError.message}`
            : 'Token verification failed.';

        return {
            user: null,
            errorResponse: NextResponse.json(
                { success: false, error: detailedMessage },
                { status: 401 }
            )
        };
    }
}

export function ensureProviderAccess(user: AuthenticatedUser, roleOverride?: string | null): NextResponse | null {
    const effectiveRole = normalizeRole(roleOverride ?? user.role);
    if (effectiveRole === 'patient') {
        return NextResponse.json(
            { success: false, error: 'Provider access required.' },
            { status: 403 }
        );
    }

    return null;
}
