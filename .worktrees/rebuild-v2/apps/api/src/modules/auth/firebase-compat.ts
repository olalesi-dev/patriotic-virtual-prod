import { createPublicKey, verify } from 'node:crypto';
import { eq, or, sql } from 'drizzle-orm';
import { getUserPermissionsAndModules } from '@workspace/auth/permissions';
import {
  getUserTokenState,
  isJwtIssuedAfterTokenVersionUpdate,
} from '@workspace/auth/session-security';
import * as schema from '@workspace/db/schema';
import { env } from '@workspace/env';
import { db } from '../../db';
import { UnauthorizedException } from '../../utils/errors';

interface JwtHeader {
  alg?: string;
  kid?: string;
}

export interface FirebaseTokenPayload {
  aud?: string;
  auth_time?: number;
  email?: string;
  email_verified?: boolean;
  exp?: number;
  iat?: number;
  iss?: string;
  name?: string;
  picture?: string;
  sub?: string;
  user_id?: string;
}

interface FirebaseCertCache {
  expiresAt: number;
  certs: Record<string, string>;
}

interface FirebaseAccountLookupResponse {
  users?: {
    disabled?: boolean;
    localId?: string;
    validSince?: string;
  }[];
}

const DEFAULT_FIREBASE_CERT_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

let certCache: FirebaseCertCache | null = null;

const decodeBase64Url = (value: string): Buffer => {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), '=');
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
};

const parseJwtPart = <T>(part: string): T => {
  try {
    return JSON.parse(decodeBase64Url(part).toString('utf8')) as T;
  } catch {
    throw new UnauthorizedException('Invalid Firebase token');
  }
};

export const getBearerToken = (headers: Headers): string | null => {
  const authorization = headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  const token = authorization.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
};

export const decodeFirebaseJwt = (token: string) => {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new UnauthorizedException('Invalid Firebase token');
  }

  return {
    data: `${parts[0]}.${parts[1]}`,
    signature: decodeBase64Url(parts[2]),
    header: parseJwtPart<JwtHeader>(parts[0]),
    payload: parseJwtPart<FirebaseTokenPayload>(parts[1]),
  };
};

export const validateFirebasePayload = (
  payload: FirebaseTokenPayload,
  projectId: string,
  nowSeconds = Math.floor(Date.now() / 1000),
) => {
  const expectedIssuer = `https://securetoken.google.com/${projectId}`;

  if (payload.aud !== projectId || payload.iss !== expectedIssuer) {
    throw new UnauthorizedException('Firebase token project mismatch');
  }
  if (!payload.sub || payload.sub.length > 128) {
    throw new UnauthorizedException('Firebase token subject is invalid');
  }
  if (!payload.iat || payload.iat > nowSeconds) {
    throw new UnauthorizedException('Firebase token issued-at is invalid');
  }
  if (!payload.exp || payload.exp <= nowSeconds) {
    throw new UnauthorizedException('Firebase token has expired');
  }
};

const getCacheTtlMs = (cacheControl: string | null): number => {
  const match = cacheControl?.match(/max-age=(\d+)/i);
  return match ? Number(match[1]) * 1000 : 60 * 60 * 1000;
};

const fetchFirebaseCerts = async () => {
  if (certCache && certCache.expiresAt > Date.now()) {
    return certCache.certs;
  }

  const response = await fetch(
    env.FIREBASE_TOKEN_CERT_URL ?? DEFAULT_FIREBASE_CERT_URL,
  );
  if (!response.ok) {
    throw new UnauthorizedException('Unable to verify Firebase token');
  }

  const certs = (await response.json()) as Record<string, string>;
  certCache = {
    certs,
    expiresAt: Date.now() + getCacheTtlMs(response.headers.get('cache-control')),
  };
  return certs;
};

const verifyFirebaseTokenNotRevoked = async (
  token: string,
  payload: FirebaseTokenPayload,
) => {
  if (!env.FIREBASE_WEB_API_KEY?.trim()) {
    throw new UnauthorizedException(
      'Firebase revocation checks are not configured',
    );
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${env.FIREBASE_WEB_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token }),
    },
  );

  if (!response.ok) {
    throw new UnauthorizedException('Firebase token has been revoked');
  }

  const lookup = (await response.json()) as FirebaseAccountLookupResponse;
  const account = lookup.users?.[0];
  if (!account || account.localId !== payload.sub || account.disabled) {
    throw new UnauthorizedException('Firebase account is not active');
  }

  const validSince = Number(account.validSince ?? 0);
  const authenticatedAt = payload.auth_time ?? payload.iat ?? 0;
  if (validSince > 0 && authenticatedAt < validSince) {
    throw new UnauthorizedException('Firebase token has been revoked');
  }
};

const verifyFirebaseJwtSignature = async (
  tokenData: string,
  signature: Buffer,
  header: JwtHeader,
) => {
  if (header.alg !== 'RS256' || !header.kid) {
    throw new UnauthorizedException('Invalid Firebase token header');
  }

  const certs = await fetchFirebaseCerts();
  const cert = certs[header.kid];
  if (!cert) {
    certCache = null;
    throw new UnauthorizedException('Firebase token key is unknown');
  }

  const isValid = verify(
    'RSA-SHA256',
    Buffer.from(tokenData),
    createPublicKey(cert),
    signature,
  );

  if (!isValid) {
    throw new UnauthorizedException('Invalid Firebase token signature');
  }
};

const resolveMigratedUser = async (payload: FirebaseTokenPayload) => {
  const email = payload.email?.trim().toLowerCase();
  const subject = payload.sub ?? payload.user_id;

  if (!email && !subject) {
    throw new UnauthorizedException('Firebase token is missing user identity');
  }

  const [user] = await db
    .select()
    .from(schema.users)
    .where(
      or(
        subject ? eq(schema.users.id, subject) : undefined,
        email ? sql`lower(${schema.users.email}) = ${email}` : undefined,
      ),
    )
    .limit(1);

  if (!user) {
    throw new UnauthorizedException('Firebase user is not migrated');
  }

  const tokenState = await getUserTokenState(db as never, user.id);
  if (
    !tokenState ||
    tokenState.disabled ||
    !isJwtIssuedAfterTokenVersionUpdate(payload, tokenState)
  ) {
    throw new UnauthorizedException('Firebase token has been locally revoked');
  }

  return { user, tokenState };
};

export const resolveFirebaseCompatAuth = async (headers: Headers) => {
  const token = getBearerToken(headers);
  const projectId = env.FIREBASE_PROJECT_ID?.trim();
  if (!token || !projectId) {
    return null;
  }

  const decoded = decodeFirebaseJwt(token);
  validateFirebasePayload(decoded.payload, projectId);
  await verifyFirebaseTokenNotRevoked(token, decoded.payload);
  await verifyFirebaseJwtSignature(
    decoded.data,
    decoded.signature,
    decoded.header,
  );

  const { user, tokenState } = await resolveMigratedUser(decoded.payload);
  const { role, permissions, allowedModules } =
    await getUserPermissionsAndModules(db as never, user.id);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      role,
      organizationId: user.organizationId,
    },
    session: {
      id: `firebase:${decoded.payload.sub ?? user.id}`,
      userId: user.id,
      tokenVersion: tokenState.tokenVersion,
      role,
      permissions,
      allowedModules,
    },
  };
};
