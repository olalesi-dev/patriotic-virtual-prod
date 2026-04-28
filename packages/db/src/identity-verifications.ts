import { index, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { generateId, patients, appointments } from './schema';

export const identityVerifications = pgTable(
  'identity_verifications',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    patientId: text('patient_id')
      .notNull()
      .references(() => patients.id),
    appointmentId: text('appointment_id').references(() => appointments.id),
    provider: text('provider').default('vouched').notNull(),
    jobId: text('job_id'),
    status: text('status'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    failureReason: text('failure_reason'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('identity_verifications_patient_id_idx').on(table.patientId),
    index('identity_verifications_appointment_id_idx').on(table.appointmentId),
    uniqueIndex('identity_verifications_provider_job_uidx').on(
      table.provider,
      table.jobId,
    ),
  ],
);
