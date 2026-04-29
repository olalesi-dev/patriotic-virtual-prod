import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

export type Db = PostgresJsDatabase<typeof schema>;

export * from './schema';
export * from './auth-schema';
export * from './identity-verifications';
export * from './notifications';
export * from './notification-events';
export * from './repositories/notification.repository';
export * from './repositories/dosespot.repository';
export {
  modules,
  permissions,
  rolePermissions,
  dosespotWebhookEvents,
  prescriptions,
  soapNotes,
  messages,
  systemSettings,
  shopProducts,
  shopOrders,
  shopOrderItems,
  shopPartners,
  shopDiscounts,
  broadcastLogs,
  moderationLogs,
  userSettings,
  vitalLogs,
  labOrders,
  subscriptions,
  aiActionItems,
  clinicalProtocols,
} from './schema';
