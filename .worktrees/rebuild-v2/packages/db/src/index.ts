import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import * as authSchema from './auth-schema';
import * as identitySchema from './identity-verifications';
import * as notificationSchema from './notifications';
import * as notificationEventSchema from './notification-events';

export const dbSchema = {
  ...schema,
  ...authSchema,
  ...identitySchema,
  ...notificationSchema,
  ...notificationEventSchema,
};

export type Db = PostgresJsDatabase<typeof dbSchema>;

export * from './schema';
export * from './auth-schema';
export * from './identity-verifications';
export * from './notifications';
export * from './notification-events';
export * from './repositories/notification.repository';
export * from './repositories/dosespot.repository';
