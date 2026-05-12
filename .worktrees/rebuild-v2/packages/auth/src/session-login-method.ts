import { eq } from 'drizzle-orm';
import * as authSchema from '@workspace/db/auth-schema';

export const LOGIN_METHOD_UNKNOWN = 'unknown';

const authPathLoginMethods = new Map<string, string>([
  ['/sign-in/email', 'password'],
  ['/sign-in/social', 'social'],
  ['/sign-in/magic-link', 'magic_link'],
  ['/magic-link/verify', 'magic_link'],
  ['/email-otp/verify-email', 'email_otp'],
  ['/email-otp/sign-in', 'email_otp'],
  ['/phone-number/verify', 'sms_otp'],
  ['/phone-number/sign-in', 'sms_otp'],
  ['/two-factor/verify-totp', 'totp'],
  ['/two-factor/verify-otp', 'email_otp'],
  ['/two-factor/verify-backup-code', 'backup_code'],
  ['/passkey/verify-authentication', 'passkey'],
  ['/passkey/sign-in', 'passkey'],
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const pickString = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value : undefined;

export const resolveLoginMethodFromAuthPath = (path: string) =>
  authPathLoginMethods.get(path) ?? undefined;

export const extractSessionIdFromAuthContext = (context: unknown) => {
  if (!isRecord(context)) {
    return undefined;
  }

  const { session } = context;
  if (isRecord(session)) {
    const nestedSession = session.session;
    const id =
      pickString(session.id) ||
      (isRecord(nestedSession) ? pickString(nestedSession.id) : undefined);
    if (id) {
      return id;
    }
  }

  const { newSession } = context;
  if (isRecord(newSession)) {
    const nestedSession = newSession.session;
    const id =
      pickString(newSession.id) ||
      (isRecord(nestedSession) ? pickString(nestedSession.id) : undefined);
    if (id) {
      return id;
    }
  }

  const { returned } = context;
  if (isRecord(returned)) {
    const returnedSession = returned.session;
    if (isRecord(returnedSession)) {
      const nestedSession = returnedSession.session;
      const id =
        pickString(returnedSession.id) ||
        (isRecord(nestedSession) ? pickString(nestedSession.id) : undefined);
      if (id) {
        return id;
      }
    }
  }

  return undefined;
};

export const markSessionLoginMethod = async (
  db: {
    update: (table: unknown) => {
      set: (values: Record<string, unknown>) => {
        where: (condition: unknown) => Promise<unknown>;
      };
    };
  },
  sessionId: string,
  loginMethod: string,
) =>
  await db
    .update(authSchema.sessions)
    .set({ loginMethod })
    .where(eq(authSchema.sessions.id, sessionId));
