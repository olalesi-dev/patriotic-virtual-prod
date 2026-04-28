import { createId } from '@paralleldrive/cuid2';
import {
  pgTable,
  text,
  timestamp,
  jsonb,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const generateId = () => createId();

export const roles = pgTable('roles', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const organizations = pgTable('organizations', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const users = pgTable(
  'users',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    email: text('email').notNull().unique(),
    name: text('name').notNull(),
    phone: text('phone'),
    emailVerified: boolean('emailVerified').notNull().default(false),
    image: text('image'),
    roleId: text('role_id').references(() => roles.id),
    organizationId: text('organization_id').references(() => organizations.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('users_role_id_idx').on(table.roleId),
    index('users_organization_id_idx').on(table.organizationId),
  ],
);

export const patients = pgTable(
  'patients',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    userId: text('user_id')
      .unique()
      .references(() => users.id),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    phone: text('phone'),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    isIdentityVerified: boolean('is_identity_verified').default(false).notNull(),
    latestVerificationId: text('latest_verification_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('patients_organization_id_idx').on(table.organizationId),
  ],
);

export const providers = pgTable(
  'providers',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    userId: text('user_id')
      .unique()
      .references(() => users.id),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    phone: text('phone'),
    npi: text('npi').unique(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('providers_organization_id_idx').on(table.organizationId),
  ],
);

export const appointments = pgTable(
  'appointments',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    patientId: text('patient_id')
      .notNull()
      .references(() => patients.id),
    providerId: text('provider_id')
      .notNull()
      .references(() => providers.id),
    scheduledTime: timestamp('scheduled_time', { withTimezone: true }).notNull(),
    verificationId: text('verification_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('appointments_patient_id_idx').on(table.patientId),
    index('appointments_provider_id_idx').on(table.providerId),
    index('appointments_scheduled_time_idx').on(table.scheduledTime),
  ],
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    tableName: text('table_name').notNull(),
    recordId: text('record_id').notNull(),
    action: text('action').notNull(),
    summary: text('summary').notNull(),
    actorRole: text('actor_role'),
    organizationId: text('organization_id').references(() => organizations.id),
    details: jsonb('details'),
    oldData: jsonb('old_data'),
    newData: jsonb('new_data'),
    hash: text('hash'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('audit_logs_organization_id_idx').on(table.organizationId),
    index('audit_logs_record_idx').on(table.tableName, table.recordId),
  ],
);

export const auditTriggerSQL = sql`
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION audit_log_trigger()
RETURNS TRIGGER AS $$
DECLARE
  old_data_json JSONB := NULL;
  new_data_json JSONB := NULL;
  record_id TEXT;
  hash_val TEXT;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    old_data_json = row_to_json(OLD)::JSONB;
    record_id = OLD.id;
  ELSIF (TG_OP = 'UPDATE') THEN
    old_data_json = row_to_json(OLD)::JSONB;
    new_data_json = row_to_json(NEW)::JSONB;
    record_id = NEW.id;
  ELSIF (TG_OP = 'INSERT') THEN
    new_data_json = row_to_json(NEW)::JSONB;
    record_id = NEW.id;
  END IF;

  hash_val = encode(digest(COALESCE(old_data_json::TEXT, '') || COALESCE(new_data_json::TEXT, ''), 'sha256'), 'hex');

  INSERT INTO audit_logs (id, table_name, record_id, action, old_data, new_data, hash)
  VALUES (substr(md5(random()::text), 1, 24), TG_TABLE_NAME, record_id, TG_OP, old_data_json, new_data_json, hash_val);

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER users_audit_trigger
AFTER INSERT ON users
FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
`;
