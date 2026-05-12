import { createId } from '@paralleldrive/cuid2';
import {
  pgTable,
  text,
  timestamp,
  jsonb,
  boolean,
  index,
  integer,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const generateId = () => createId();

export const organizations = pgTable('organizations', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const modules = pgTable(
  'modules',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    parentId: text('parent_id').references((): any => modules.id, {
      onDelete: 'cascade',
    }),
    name: text('name').notNull(),
    key: text('key').notNull().unique(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('modules_parent_id_idx').on(table.parentId)],
);

export const permissions = pgTable(
  'permissions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    moduleId: text('module_id')
      .notNull()
      .references(() => modules.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    key: text('key').notNull().unique(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('permissions_module_id_idx').on(table.moduleId)],
);

export const rolePermissions = pgTable(
  'role_permissions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    roleId: text('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: text('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('role_permissions_role_permission_uidx').on(
      table.roleId,
      table.permissionId,
    ),
    index('role_permissions_role_id_idx').on(table.roleId),
    index('role_permissions_permission_id_idx').on(table.permissionId),
  ],
);

export const users = pgTable(
  'users',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    email: text('email').notNull().unique(),
    name: text('name').notNull(),
    phone: text('phone'),
    phoneVerified: boolean('phone_verified').default(false).notNull(),
    phoneVerification: jsonb('phone_verification')
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    tokenVersion: integer('token_version').default(0).notNull(),
    tokenVersionUpdatedAt: timestamp('token_version_updated_at', {
      withTimezone: true,
    })
      .default(sql`'1970-01-01 00:00:00+00'::timestamptz`)
      .notNull(),
    disabled: boolean('disabled').default(false).notNull(),
    mustChangePassword: boolean('must_change_password')
      .default(false)
      .notNull(),
    passwordChangedAt: timestamp('password_changed_at', { withTimezone: true }),
    adminCreatedById: text('admin_created_by_id').references(
      (): any => users.id,
    ),
    emailVerified: boolean('emailVerified').notNull().default(false),
    twoFactorEnabled: boolean('twoFactorEnabled').default(false).notNull(),
    failedLoginAttempts: integer('failed_login_attempts').default(0).notNull(),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    lastFailedLoginAt: timestamp('last_failed_login_at', {
      withTimezone: true,
    }),
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
    index('users_email_idx').on(table.email),
    index('users_organization_id_idx').on(table.organizationId),
  ],
);

export const adminPasswordResetRequests = pgTable(
  'admin_password_reset_requests',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    requestedEmail: text('requested_email').notNull(),
    requestedByUserId: text('requested_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    requestedIpAddress: text('requested_ip_address').notNull(),
    requestedUserAgent: text('requested_user_agent'),
    status: text('status').default('pending').notNull(),
    reason: text('reason'),
    approvedById: text('approved_by_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    rejectedById: text('rejected_by_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    rejectedAt: timestamp('rejected_at', { withTimezone: true }),
    decisionReason: text('decision_reason'),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('admin_password_reset_requests_user_status_idx').on(
      table.userId,
      table.status,
    ),
    index('admin_password_reset_requests_org_status_idx').on(
      table.organizationId,
      table.status,
    ),
    index('admin_password_reset_requests_created_at_idx').on(table.createdAt),
  ],
);

export const breakGlassAccessGrants = pgTable(
  'break_glass_access_grants',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    grantedById: text('granted_by_id').references(() => users.id),
    activatedById: text('activated_by_id').references(() => users.id),
    reason: text('reason').notNull(),
    activationReason: text('activation_reason'),
    compensatingControl: text('compensating_control'),
    status: text('status').default('granted').notNull(),
    scopes: jsonb('scopes')
      .$type<string[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    activatedAt: timestamp('activated_at', { withTimezone: true }),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('break_glass_access_grants_user_idx').on(table.userId),
    index('break_glass_access_grants_org_status_idx').on(
      table.organizationId,
      table.status,
    ),
    index('break_glass_access_grants_expires_at_idx').on(table.expiresAt),
  ],
);

export const delegatedAccessSessions = pgTable(
  'delegated_access_sessions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    actorUserId: text('actor_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    targetUserId: text('target_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    targetPatientId: text('target_patient_id').references(() => patients.id, {
      onDelete: 'set null',
    }),
    targetProviderId: text('target_provider_id').references(
      () => providers.id,
      {
        onDelete: 'set null',
      },
    ),
    grantedById: text('granted_by_id').references(() => users.id),
    reason: text('reason').notNull(),
    status: text('status').default('active').notNull(),
    scopes: jsonb('scopes')
      .$type<string[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    activatedAt: timestamp('activated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('delegated_access_actor_status_idx').on(
      table.actorUserId,
      table.status,
      table.expiresAt,
    ),
    index('delegated_access_org_status_idx').on(
      table.organizationId,
      table.status,
    ),
    index('delegated_access_target_user_idx').on(table.targetUserId),
    index('delegated_access_target_patient_idx').on(table.targetPatientId),
    index('delegated_access_target_provider_idx').on(table.targetProviderId),
    index('delegated_access_scopes_gin_idx').using('gin', table.scopes),
  ],
);

export const roles = pgTable('roles', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

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
    dateOfBirth: text('date_of_birth'), // Format: YYYY-MM-DD
    gender: text('gender'), // Male, Female, Unknown
    email: text('email'),
    address1: text('address1'),
    address2: text('address2'),
    city: text('city'),
    state: text('state'),
    zipCode: text('zip_code'),
    phone: text('phone'),
    phoneVerified: boolean('phone_verified').default(false).notNull(),
    phoneVerification: jsonb('phone_verification')
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    mrn: text('mrn'),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    isIdentityVerified: boolean('is_identity_verified')
      .default(false)
      .notNull(),
    latestVerificationId: text('latest_verification_id'),
    acquisitionSource: text('acquisition_source'),
    doseSpotPatientId: text('dosespot_patient_id'),
    doseSpotSyncStatus: text('dosespot_sync_status')
      .default('pending')
      .notNull(),
    doseSpotSyncError: text('dosespot_sync_error'),
    doseSpotLastSyncAt: timestamp('dosespot_last_sync_at', {
      withTimezone: true,
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('patients_organization_id_idx').on(table.organizationId),
    index('patients_dosespot_id_idx').on(table.doseSpotPatientId),
    index('patients_name_trgm_idx').using(
      'gist',
      table.firstName.op('gist_trgm_ops'),
      table.lastName.op('gist_trgm_ops'),
    ),
    index('patients_email_trgm_idx').using(
      'gist',
      table.email.op('gist_trgm_ops'),
    ),
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
    title: text('title'),
    specialty: text('specialty'),
    bio: text('bio'),
    yearsOfExperience: integer('years_of_experience'),
    doseSpotClinicianId: text('dosespot_clinician_id'),
    doseSpotData: jsonb('dosespot_data').$type<Record<string, any>>(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('providers_organization_id_idx').on(table.organizationId),
    index('providers_dosespot_id_idx').on(table.doseSpotClinicianId),
  ],
);

export const consultations = pgTable(
  'consultations',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    patientId: text('patient_id').references(() => patients.id),
    serviceKey: text('service_key').notNull(),
    intakeAnswers: jsonb('intake_answers')
      .$type<Record<string, any>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    status: text('status').default('pending_payment').notNull(),
    paymentStatus: text('payment_status').default('pending').notNull(),
    stripeSessionId: text('stripe_session_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('consultations_patient_id_idx').on(table.patientId)],
);

export const appointments = pgTable(
  'appointments',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    patientId: text('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    providerId: text('provider_id').references(() => providers.id, {
      onDelete: 'set null',
    }),
    consultationId: text('consultation_id').references(() => consultations.id, {
      onDelete: 'set null',
    }),
    type: text('type').default('Telehealth').notNull(),
    status: text('status').default('pending_scheduling').notNull(),
    reason: text('reason'),
    scheduledTime: timestamp('scheduled_time', { withTimezone: true }),
    meetingUrl: text('meeting_url'),
    verificationId: text('verification_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('appointments_patient_id_idx').on(table.patientId),
    index('appointments_provider_id_idx').on(table.providerId),
    index('appointments_consultation_id_idx').on(table.consultationId),
    index('appointments_scheduled_time_idx').on(table.scheduledTime),
  ],
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    actorId: text('actor_id').references(() => users.id),
    actorName: text('actor_name').notNull(),
    actorRole: text('actor_role').notNull(),
    action: text('action').notNull(),
    tableName: text('table_name').notNull(),
    recordId: text('record_id').notNull(),
    summary: text('summary').notNull(),
    details: jsonb('details'),
    oldData: jsonb('old_data'),
    newData: jsonb('new_data'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    previousHash: text('previous_hash'),
    hash: text('hash'),
    hashAlgorithm: text('hash_algorithm').default('sha256').notNull(),
    exportStatus: text('export_status').default('not_required').notNull(),
    exportedAt: timestamp('exported_at', { withTimezone: true }),
    exportAttempts: integer('export_attempts').default(0).notNull(),
    lastExportError: text('last_export_error'),
    externalSinkId: text('external_sink_id'),
    isPhiAccess: boolean('is_phi_access').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('audit_logs_organization_id_idx').on(table.organizationId),
    index('audit_logs_actor_id_idx').on(table.actorId),
    index('audit_logs_record_idx').on(table.tableName, table.recordId),
    index('audit_logs_export_status_idx').on(
      table.exportStatus,
      table.createdAt,
    ),
    index('audit_logs_details_gin_idx').using('gin', table.details),
  ],
);

export const dosespotWebhookEvents = pgTable(
  'dosespot_webhook_events',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    dedupeKey: text('dedupe_key').notNull().unique(),
    eventType: text('event_type').notNull(),
    payload: jsonb('payload').notNull(),
    status: text('status').default('pending').notNull(), // pending, processing, success, failed
    errorMessage: text('error_message'),
    receivedAt: timestamp('received_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('dosespot_webhook_events_status_idx').on(table.status),
    index('dosespot_webhook_events_event_type_idx').on(table.eventType),
    index('dosespot_webhook_events_payload_gin_idx').using(
      'gin',
      table.payload,
    ),
  ],
);

export const prescriptions = pgTable(
  'prescriptions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    doseSpotPrescriptionId: integer('dosespot_prescription_id').unique(),
    patientId: text('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    providerId: text('provider_id')
      .notNull()
      .references(() => providers.id, { onDelete: 'set null' }),
    medicationName: text('medication_name').notNull(),
    dosage: text('dosage'),
    quantity: text('quantity'),
    refills: integer('refills').default(0).notNull(),
    status: text('status').default('Pending').notNull(),
    lastStatusUpdate: timestamp('last_status_update', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('prescriptions_patient_id_idx').on(table.patientId),
    index('prescriptions_provider_id_idx').on(table.providerId),
    index('prescriptions_dosespot_id_idx').on(table.doseSpotPrescriptionId),
  ],
);

export const soapNotes = pgTable(
  'soap_notes',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    appointmentId: text('appointment_id')
      .notNull()
      .references(() => appointments.id, { onDelete: 'cascade' }),
    patientId: text('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    providerId: text('provider_id')
      .notNull()
      .references(() => providers.id, { onDelete: 'set null' }),
    subjective: text('subjective'),
    objective: text('objective'),
    assessment: text('assessment'),
    plan: text('plan'),
    isLocked: boolean('is_locked').default(false).notNull(),
    lockedAt: timestamp('locked_at', { withTimezone: true }),
    lockedBy: text('locked_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('soap_notes_appointment_id_idx').on(table.appointmentId),
    index('soap_notes_patient_id_idx').on(table.patientId),
  ],
);

export const messages = pgTable(
  'messages',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    senderId: text('sender_id')
      .notNull()
      .references(() => users.id),
    recipientId: text('recipient_id')
      .notNull()
      .references(() => users.id),
    subject: text('subject'),
    body: text('body').notNull(),
    encryptionMode: text('encryption_mode').default('plain').notNull(),
    encryptedPayload:
      jsonb('encrypted_payload').$type<Record<string, unknown>>(),
    encryptedKeyRecipients: jsonb('encrypted_key_recipients')
      .$type<Record<string, unknown>[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    isRead: boolean('is_read').default(false).notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
    threadId: text('thread_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('messages_sender_id_idx').on(table.senderId),
    index('messages_recipient_id_idx').on(table.recipientId),
    index('messages_thread_id_idx').on(table.threadId),
    index('messages_encryption_mode_idx').on(table.encryptionMode),
  ],
);

export const encryptionKeyRegistry = pgTable(
  'encryption_key_registry',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    keyId: text('key_id').notNull().unique(),
    provider: text('provider').notNull(),
    purpose: text('purpose').notNull(),
    status: text('status').default('active').notNull(),
    metadata: jsonb('metadata')
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    rotatedAt: timestamp('rotated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('encryption_key_registry_provider_idx').on(table.provider),
    index('encryption_key_registry_purpose_status_idx').on(
      table.purpose,
      table.status,
    ),
  ],
);

export const encryptedDocumentUploads = pgTable(
  'encrypted_document_uploads',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    ownerUserId: text('owner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    storageProvider: text('storage_provider').notNull(),
    storageObjectKey: text('storage_object_key').notNull(),
    encryptionMode: text('encryption_mode').default('client_e2ee').notNull(),
    encryptedPayload: jsonb('encrypted_payload')
      .$type<Record<string, unknown>>()
      .notNull(),
    encryptedKeyRecipients: jsonb('encrypted_key_recipients')
      .$type<Record<string, unknown>[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    encryptedMetadata:
      jsonb('encrypted_metadata').$type<Record<string, unknown>>(),
    mimeType: text('mime_type'),
    sizeBytes: integer('size_bytes'),
    checksumSha256: text('checksum_sha256'),
    status: text('status').default('pending').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('encrypted_document_uploads_owner_idx').on(table.ownerUserId),
    index('encrypted_document_uploads_org_status_idx').on(
      table.organizationId,
      table.status,
    ),
    index('encrypted_document_uploads_storage_uidx').on(
      table.storageProvider,
      table.storageObjectKey,
    ),
  ],
);

export const systemSettings = pgTable(
  'system_settings',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    key: text('key').notNull(),
    value: jsonb('value').notNull(),
    description: text('description'),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('system_settings_org_key_uidx').on(
      table.organizationId,
      table.key,
    ),
  ],
);

export const shopProducts = pgTable(
  'shop_products',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    sku: text('sku').notNull().unique(),
    shortDescription: text('short_description'),
    longDescription: text('long_description'),
    price: integer('price').notNull(),
    compareAtPrice: integer('compare_at_price'),
    inventoryLevel: integer('inventory_level').default(0).notNull(),
    lowStockThreshold: integer('low_stock_threshold').default(5).notNull(),
    images: jsonb('images')
      .$type<string[]>()
      .default(sql`'[]'::jsonb`),
    status: text('status').default('Draft').notNull(),
    category: text('category').notNull(),
    stripeLink: text('stripe_link'),
    iframeUrl: text('iframe_url'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('shop_products_status_idx').on(table.status),
    index('shop_products_category_idx').on(table.category),
    index('shop_products_organization_id_idx').on(table.organizationId),
  ],
);

export const shopOrders = pgTable(
  'shop_orders',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    orderNumber: text('order_number').notNull().unique(),
    patientId: text('patient_id')
      .notNull()
      .references(() => patients.id),
    total: integer('total').notNull(),
    paymentStatus: text('payment_status').notNull(),
    fulfillmentStatus: text('fulfillment_status').default('Pending').notNull(),
    stripeSessionId: text('stripe_session_id'),
    shippingAddress: jsonb('shipping_address'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('shop_orders_patient_id_idx').on(table.patientId),
    index('shop_orders_status_idx').on(table.fulfillmentStatus),
    index('shop_orders_organization_id_idx').on(table.organizationId),
  ],
);

export const shopOrderItems = pgTable('shop_order_items', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  orderId: text('order_id')
    .notNull()
    .references(() => shopOrders.id, { onDelete: 'cascade' }),
  productId: text('product_id').references(() => shopProducts.id),
  productName: text('product_name').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: integer('unit_price').notNull(),
});

export const shopPartners = pgTable(
  'shop_partners',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    name: text('name').notNull(),
    category: text('category').notNull(),
    logo: text('logo'),
    shortDescription: text('short_description'),
    longDescription: text('long_description'),
    affiliateUrl: text('affiliate_url'),
    status: text('status').default('Active').notNull(),
    isFeatured: boolean('is_featured').default(false).notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('shop_partners_organization_id_idx').on(table.organizationId),
  ],
);

export const shopDiscounts = pgTable('shop_discounts', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  code: text('code').notNull().unique(),
  type: text('type').notNull(),
  value: integer('value').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const broadcastLogs = pgTable(
  'broadcast_logs',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    subject: text('subject').notNull(),
    body: text('body').notNull(),
    priority: text('priority').notNull(),
    targetFilters: jsonb('target_filters').notNull(),
    recipientCount: integer('recipient_count').notNull(),
    senderId: text('sender_id')
      .notNull()
      .references(() => users.id),
    timestamp: timestamp('timestamp', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('broadcast_logs_organization_id_idx').on(table.organizationId),
  ],
);

export const moderationLogs = pgTable(
  'moderation_logs',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    documentId: text('document_id').notNull(),
    collectionName: text('collection_name').notNull(),
    content: text('content').notNull(),
    authorName: text('author_name').notNull(),
    authorId: text('author_id').notNull(),
    aiRiskLevel: text('ai_risk_level').notNull(),
    category: text('category'),
    reason: text('reason'),
    actionTaken: text('action_taken'),
    resolved: boolean('resolved').default(false).notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('moderation_logs_organization_id_idx').on(table.organizationId),
  ],
);

export const userSettings = pgTable(
  'user_settings',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    value: jsonb('value').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('user_settings_user_key_uidx').on(table.userId, table.key),
  ],
);

export const clinicalProtocols = pgTable(
  'clinical_protocols',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    title: text('title').notNull(),
    type: text('type').notNull(),
    content: text('content'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('clinical_protocols_org_idx').on(table.organizationId)],
);

export const services = pgTable(
  'services',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    name: text('name').notNull(),
    description: text('description'),
    price: integer('price').notNull(),
    category: text('category').notNull(),
    status: text('status').default('Active').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('services_org_idx').on(table.organizationId),
    index('services_category_idx').on(table.category),
  ],
);

export const imagingOrders = pgTable(
  'imaging_orders',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    patientId: text('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    providerId: text('provider_id')
      .notNull()
      .references(() => providers.id, { onDelete: 'set null' }),
    type: text('type').notNull(),
    status: text('status').default('Ordered').notNull(),
    notes: text('notes'),
    orderedAt: timestamp('ordered_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('imaging_orders_patient_idx').on(table.patientId),
    index('imaging_orders_org_idx').on(table.organizationId),
  ],
);

export const socialPosts = pgTable(
  'social_posts',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    text: text('text').notNull(),
    status: text('status').default('draft').notNull(),
    authorId: text('author_id')
      .notNull()
      .references(() => users.id),
    platforms: jsonb('platforms')
      .$type<string[]>()
      .default(sql`'[]'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('social_posts_org_idx').on(table.organizationId)],
);

export const communityProfiles = pgTable('community_profiles', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  journeyTag: text('journey_tag'),
  streak: integer('streak').default(0).notNull(),
  score: integer('score').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const communityPosts = pgTable(
  'community_posts',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    authorId: text('author_id')
      .notNull()
      .references(() => users.id),
    text: text('text').notNull(),
    mediaUrl: text('media_url'),
    mediaType: text('media_type'),
    likesCount: integer('likes_count').default(0).notNull(),
    repliesCount: integer('replies_count').default(0).notNull(),
    isHidden: boolean('hidden').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('community_posts_org_idx').on(table.organizationId),
    index('community_posts_author_idx').on(table.authorId),
  ],
);

export const communityLikes = pgTable(
  'community_likes',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    postId: text('post_id')
      .notNull()
      .references(() => communityPosts.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('community_likes_uidx').on(table.userId, table.postId),
  ],
);

export const communityReplies = pgTable(
  'community_replies',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    postId: text('post_id')
      .notNull()
      .references(() => communityPosts.id, { onDelete: 'cascade' }),
    authorId: text('author_id')
      .notNull()
      .references(() => users.id),
    text: text('text').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('community_replies_post_idx').on(table.postId)],
);

export const facilities = pgTable(
  'facilities',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    name: text('name').notNull(),
    type: text('type').notNull(),
    address: text('address'),
    city: text('city'),
    state: text('state'),
    zipCode: text('zip_code'),
    phone: text('phone'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('facilities_org_idx').on(table.organizationId)],
);

export const vendors = pgTable(
  'vendors',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    name: text('name').notNull(),
    contactName: text('contact_name'),
    email: text('email'),
    phone: text('phone'),
    category: text('category'),
    contractEndDate: timestamp('contract_end_date', { withTimezone: true }),
    status: text('status').default('Active').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('vendors_org_idx').on(table.organizationId)],
);

export const campaigns = pgTable(
  'campaigns',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    name: text('name').notNull(),
    type: text('type').notNull(),
    status: text('status').default('Planning').notNull(),
    startDate: timestamp('start_date', { withTimezone: true }),
    endDate: timestamp('end_date', { withTimezone: true }),
    budget: integer('budget'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('campaigns_org_idx').on(table.organizationId)],
);

export const grantProposals = pgTable(
  'grant_proposals',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    title: text('title').notNull(),
    agency: text('agency').notNull(),
    amount: integer('amount'),
    status: text('status').default('Draft').notNull(),
    deadline: timestamp('deadline', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('grant_proposals_org_idx').on(table.organizationId)],
);

export const timeSheets = pgTable(
  'time_sheets',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    date: timestamp('date', { withTimezone: true }).notNull(),
    hours: integer('hours').notNull(),
    description: text('description'),
    status: text('status').default('Submitted').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('time_sheets_user_idx').on(table.userId),
    index('time_sheets_org_idx').on(table.organizationId),
  ],
);

export const complianceDocuments = pgTable(
  'compliance_documents',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    title: text('title').notNull(),
    category: text('category').notNull(),
    status: text('status').default('Draft').notNull(),
    effectiveDate: timestamp('effective_date', { withTimezone: true }),
    expirationDate: timestamp('expiration_date', { withTimezone: true }),
    version: text('version'),
    parties: jsonb('parties')
      .$type<string[]>()
      .default(sql`'[]'::jsonb`),
    summary: text('summary'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('compliance_documents_org_idx').on(table.organizationId),
    index('compliance_documents_category_idx').on(table.category),
  ],
);

export const availability = pgTable(
  'availability',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    providerId: text('provider_id')
      .notNull()
      .references(() => providers.id, { onDelete: 'cascade' }),
    type: text('type').default('block').notNull(), // block, recurring
    dayOfWeek: integer('day_of_week'), // 0-6 for recurring
    startTime: timestamp('start_time', { withTimezone: true }),
    endTime: timestamp('end_time', { withTimezone: true }),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('availability_provider_idx').on(table.providerId)],
);

export const supportTickets = pgTable(
  'support_tickets',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    subject: text('subject').notNull(),
    message: text('message').notNull(),
    status: text('status').default('Open').notNull(), // Open, In Progress, Resolved, Closed
    priority: text('priority').default('medium').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('support_tickets_user_idx').on(table.userId),
    index('support_tickets_org_idx').on(table.organizationId),
  ],
);

export const vitalLogs = pgTable(
  'vital_logs',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    patientId: text('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    value: text('value').notNull(),
    unit: text('unit'),
    recordedAt: timestamp('recorded_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('vital_logs_patient_type_idx').on(table.patientId, table.type),
  ],
);

export const labOrders = pgTable(
  'lab_orders',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    patientId: text('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    providerId: text('provider_id')
      .notNull()
      .references(() => providers.id),
    testName: text('test_name').notNull(),
    status: text('status').default('Ordered').notNull(),
    orderedAt: timestamp('ordered_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('lab_orders_patient_id_idx').on(table.patientId),
    index('lab_orders_status_idx').on(table.status),
  ],
);

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    patientId: text('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    planId: text('plan_id').notNull(),
    status: text('status').notNull(),
    currentPeriodStart: timestamp('current_period_start', {
      withTimezone: true,
    }),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    stripeSubscriptionId: text('stripe_subscription_id').unique(),
    mrr: integer('mrr').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('subscriptions_patient_id_idx').on(table.patientId),
    index('subscriptions_status_idx').on(table.status),
  ],
);

export const aiActionItems = pgTable(
  'ai_action_items',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    patientId: text('patient_id')
      .notNull()
      .references(() => patients.id),
    type: text('type').notNull(),
    suggestion: text('suggestion').notNull(),
    status: text('status').default('Pending Review').notNull(),
    group: text('group'),
    priority: text('priority').default('medium').notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('ai_action_items_org_idx').on(table.organizationId),
    index('ai_action_items_status_idx').on(table.status),
  ],
);

export const auditTriggerSQL = sql`
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION audit_log_trigger()
RETURNS TRIGGER AS $$
DECLARE
  old_data_json JSONB := NULL;
  new_data_json JSONB := NULL;
  record_id TEXT;
  hash_val TEXT;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    old_data_json := to_jsonb(OLD);
    record_id := OLD.id::TEXT;
  ELSIF (TG_OP = 'UPDATE') THEN
    old_data_json := to_jsonb(OLD);
    new_data_json := to_jsonb(NEW);
    record_id := NEW.id::TEXT;
  ELSIF (TG_OP = 'INSERT') THEN
    new_data_json := to_jsonb(NEW);
    record_id := NEW.id::TEXT;
  END IF;

  hash_val := encode(digest(coalesce(old_data_json::text, '') || coalesce(new_data_json::text, ''), 'sha256'), 'hex');

  INSERT INTO audit_logs (id, table_name, record_id, action, old_data, new_data, hash)
  VALUES (substr(md5(random()::text), 1, 24), TG_TABLE_NAME, record_id, TG_OP, old_data_json, new_data_json, hash_val);

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER users_audit_trigger
AFTER INSERT ON users
FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
`;
